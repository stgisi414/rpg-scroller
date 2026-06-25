// Verifies Bug 3 fix: boots the starting town through the real WorldManager path
// (no manual NPC spawning) and reports the resulting scene.npcs so we can confirm
// the Goddess ('npc') / Sage are preserved, 2-3 ambient custom villagers spawn,
// and none of them fall through the floor.
const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.evaluateOnNewDocument(() => {
        window.prompt = () => '';
        window.alert = () => {};
        window.confirm = () => true;
        // Force a fresh save so the town regenerates from the fallback NPC list.
        try { localStorage.clear(); } catch (e) {}
    });
    page.on('pageerror', e => console.log('[pageerror]', e.message));

    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 20000 });
    await page.evaluate(() => {
        window.startGame({
            id: 'verify-test', name: 'VerifyBot', classId: 'knight', level: 1,
            playTime: 0, lastSaved: Date.now(), isNewGame: false, currentZone: 0
        });
    });
    await page.waitForFunction(() => {
        const s = window.game && window.game.scene && window.game.scene.scenes[0];
        return s && s.player && s.player.sprite && s.platforms && s.platforms.getChildren().length > 0 && s.npcs && s.npcs.length > 0;
    }, { timeout: 30000 });

    // Snapshot helper
    const snapshot = () => page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        return s.npcs.map(n => ({
            name: n.npcName,
            spriteKey: n.spriteKey,
            isCustom: n.spriteKey && n.spriteKey.startsWith('custom_npc_'),
            x: Math.round(n.sprite.x),
            y: Math.round(n.sprite.y),
            floor: n.sprite.body ? (n.sprite.body.blocked.down || n.sprite.body.touching.down) : null,
            velY: n.sprite.body ? Math.round(n.sprite.body.velocity.y) : null,
            wanderState: n.wanderState || 0
        }));
    });

    const printReport = (label, report) => {
        console.log(`\n=== ${label} ===`);
        report.forEach(n => {
            const tag = n.isCustom ? '[custom]' : '[fixed ]';
            const fell = n.y > 760 ? '  <-- FELL THROUGH' : '';
            const recovered = n.y > 700 && n.y < 760 ? '  <-- RECOVERING' : '';
            console.log(`${tag} ${String(n.spriteKey).padEnd(22)} "${n.name}" x=${n.x} y=${n.y} floor=${n.floor} velY=${n.velY} wander=${n.wanderState}${fell}${recovered}`);
        });
    };

    // Phase 1: Let NPCs fall from y=100 and land (3 seconds)
    await new Promise(r => setTimeout(r, 3000));
    const snap1 = await snapshot();
    printReport('AFTER LANDING (3s)', snap1);

    // Phase 2: Wait for wandering to kick in (1-3s delay + movement)
    await new Promise(r => setTimeout(r, 4000));
    const snap2 = await snapshot();
    printReport('AFTER WANDERING STARTS (7s)', snap2);

    // Phase 3: Continue wandering
    await new Promise(r => setTimeout(r, 5000));
    const snap3 = await snapshot();
    printReport('STILL WANDERING (12s)', snap3);

    const report = snap3;
    const goddess = report.find(n => n.spriteKey === 'npc');
    const sage = report.find(n => n.spriteKey === 'sage');
    const customCount = report.filter(n => n.isCustom).length;
    const fellCount = report.filter(n => n.y > 760).length;

    console.log('\n=== SUMMARY (12s) ===');
    console.log('Goddess (spriteKey "npc") present & preserved:', !!goddess);
    console.log('Sage present:', !!sage);
    console.log('Ambient custom villagers:', customCount, '(expected 2-3)');
    console.log('NPCs that fell through:', fellCount, '(expected 0)');

    await browser.close();
}

run().catch(err => { console.error('Verify error:', err); process.exit(1); });
