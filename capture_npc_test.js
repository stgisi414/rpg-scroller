// Headless capture harness: boots the game to the starting town, spawns a custom
// modular NPC through the real code path, then records a burst of screenshots +
// per-frame physics/animation data so we can diagnose the blink + fall-through bugs.
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '_capture');
const FRAMES = 60;
const INTERVAL_MS = 80;

async function run() {
    if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Block prompts/alerts that would otherwise hang the headless run.
    await page.evaluateOnNewDocument(() => {
        window.prompt = () => '';
        window.alert = () => {};
        window.confirm = () => true;
    });

    page.on('console', m => console.log('[page]', m.text()));
    page.on('pageerror', e => console.log('[pageerror]', e.message));

    console.log('Navigating...');
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });

    // Wait for the title-screen scaffolding to be ready.
    // (classesData is a script-scope const, not on window — startGame closes over it.)
    await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 20000 });

    // Boot straight into the starting town (zone 0) as a knight, no intro cutscene.
    console.log('Starting game...');
    await page.evaluate(() => {
        window.startGame({
            id: 'capture-test',
            name: 'CaptureBot',
            classId: 'knight',
            level: 1,
            playTime: 0,
            lastSaved: Date.now(),
            isNewGame: false,
            currentZone: 0
        });
    });

    // Wait until the zone has finished building (player + platforms exist).
    console.log('Waiting for town to load...');
    await page.waitForFunction(() => {
        const s = window.game && window.game.scene && window.game.scene.scenes[0];
        return s && s.player && s.player.sprite && s.platforms && s.platforms.getChildren().length > 0;
    }, { timeout: 30000 });

    // Spawn several custom modular NPCs across the full town floor width (and one
    // beyond the right edge) exactly the way WorldManager does: from the sky at
    // y=100, with a collider against the platforms. This reproduces the real spawn
    // path so we can see whether any of them fall through the ground.
    console.log('Spawning custom NPCs across the floor...');
    const SPAWN_XS = [250, 700, 1100, 1500, 1800, 2200];
    const spawnInfo = await page.evaluate((xs) => {
        const s = window.game.scene.scenes[0];
        window.__testNpcs = [];

        // Report the floor extent so we know where ground exists.
        const tops = s.platforms.getChildren()
            .filter(b => b.body && b.body.top < 800)
            .map(b => Math.round(b.x));
        const floorMinX = tops.length ? Math.min(...tops) : null;
        const floorMaxX = tops.length ? Math.max(...tops) : null;

        const infos = xs.map((spawnX, i) => {
            const npcData = window.CharacterComposer.generateRandomNPC(s);
            const npc = new NPCController(s, spawnX, 100, s.player, s.geminiService, 'Fall' + i, 'A test villager.', npcData.spriteKey, npcData.weaponType);
            s.physics.add.collider(npc.sprite, s.platforms);
            s.npcs.push(npc);
            window.__testNpcs.push(npc);
            return {
                spawnX,
                spriteKey: npcData.spriteKey,
                frameW: npc.sprite.frame ? npc.sprite.frame.width : null,
                frameH: npc.sprite.frame ? npc.sprite.frame.height : null,
                bodyH: Math.round(npc.sprite.body.height),
                bodyOffsetY: Math.round(npc.sprite.body.offset.y)
            };
        });

        return { floorMinX, floorMaxX, worldBoundsBottom: s.physics.world.bounds.bottom, npcs: infos };
    }, SPAWN_XS);
    console.log('Spawn info:', JSON.stringify(spawnInfo, null, 2));

    // Capture a burst: screenshot + per-NPC physics sample each tick.
    const samples = [];
    for (let i = 0; i < FRAMES; i++) {
        const sample = await page.evaluate(() => {
            return (window.__testNpcs || []).map(npc => {
                if (!npc || !npc.sprite || !npc.sprite.body) return null;
                const b = npc.sprite.body;
                return {
                    x: Math.round(npc.sprite.x),
                    y: Math.round(npc.sprite.y),
                    bottom: Math.round(b.bottom),
                    vy: Math.round(b.velocity.y),
                    floor: b.blocked.down || b.touching.down,
                    vis: npc.sprite.visible
                };
            });
        });
        samples.push(sample);
        await page.screenshot({ path: path.join(OUT, `frame_${String(i).padStart(2, '0')}.png`) });
        await new Promise(r => setTimeout(r, INTERVAL_MS));
    }

    // Print one row per NPC summarizing its final resting state + whether it fell.
    console.log('\n=== FALL-THROUGH SUMMARY (final frame) ===');
    const last = samples[samples.length - 1];
    spawnInfo.npcs.forEach((info, n) => {
        const f = last[n];
        if (!f) { console.log(`#${n} x=${info.spawnX}: (npc gone)`); return; }
        const fellThrough = f.y > 760; // floor top ~672; anything well below = fell through
        console.log(`#${n} spawnX=${info.spawnX} -> finalY=${f.y} bottom=${f.bottom} vy=${f.vy} floor=${f.floor} ${fellThrough ? 'FELL THROUGH!' : 'OK'}`);
    });

    console.log('\n=== PER-FRAME Y (each col = one NPC) ===');
    console.log('frame | ' + spawnInfo.npcs.map(i => 'x' + i.spawnX).join('  '));
    samples.forEach((row, i) => {
        const cells = row.map(f => f ? String(f.y).padStart(5) : ' gone').join(' ');
        console.log('#' + String(i).padStart(2) + '   | ' + cells);
    });

    fs.writeFileSync(path.join(OUT, 'samples.json'), JSON.stringify({ spawnInfo, samples }, null, 2));
    await browser.close();
    console.log('\nDone. Screenshots in _capture/');
}

run().catch(err => { console.error('Capture error:', err); process.exit(1); });
