// Reproduces the ambient-NPC walk-float with PER-ROW FRAME-HEIGHT VARIANCE, using a
// realistic "good slice": every row's bottom edge sits on the art's foot line, but the
// rows have different heights. The idle row is 64px tall; the walk row is 56px tall
// (cropped from the top, feet still at the frame bottom). No adjacent-row bleed.
//
// With the old center-origin anchor, the 8px height difference renders the walk pose
// ~6px higher than idle -> feet float above the floor while walking. With the bottom-origin
// fix, sprite.y is the frame bottom for every frame, so the body bottom (and the visible
// feet) stay on the floor through the idle<->walk swap.
const puppeteer = require('puppeteer');

const FLOOR_TOP = 672;

// Row 0 (idle) 64px; row 1 (walk) 56px starting 8px lower so its bottom still lands on the
// walk pose's foot line (canvas y=127). Remaining rows canonical. Feet at frame bottom, no bleed.
const VARIANT_ROWS = [
    { y: 0,   h: 64 },  // idle  - feet at frame bottom (canvas 63)
    { y: 72,  h: 56 },  // walk  - shorter, feet still at frame bottom (canvas 127)
    { y: 128, h: 64 },
    { y: 192, h: 64 },
    { y: 256, h: 64 },
    { y: 320, h: 64 },
    { y: 384, h: 64 }
];

async function run() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.evaluateOnNewDocument((rows) => {
        window.prompt = () => '';
        window.alert = () => {};
        window.confirm = () => true;
        try {
            localStorage.clear();
            localStorage.setItem('sprite_slice_data', JSON.stringify({
                npc_male_skin1: rows,
                npc_female_skin1: rows
            }));
        } catch (e) {}
    }, VARIANT_ROWS);
    page.on('pageerror', e => console.log('[pageerror]', e.message));

    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 20000 });
    await page.evaluate(() => {
        window.startGame({
            id: 'variance-test', name: 'VarBot', classId: 'knight', level: 1,
            playTime: 0, lastSaved: Date.now(), isNewGame: false, currentZone: 0
        });
    });
    await page.waitForFunction(() => {
        const s = window.game && window.game.scene && window.game.scene.scenes[0];
        return s && s.player && s.player.sprite && s.platforms && s.platforms.getChildren().length > 0 &&
            s.npcs && s.npcs.some(n => n.spriteKey && n.spriteKey.startsWith('custom_npc_'));
    }, { timeout: 30000 });

    const variance = await page.evaluate(() => {
        const sd = window.sliceData && window.sliceData.npc_male_skin1;
        const n = window.game.scene.scenes[0].npcs.find(x => x.spriteKey && x.spriteKey.startsWith('custom_npc_'));
        const fd = n && window.npcFootData ? window.npcFootData[n.spriteKey] : null;
        return { rows: sd ? sd.map(r => r.h) : null, idleFoot: fd ? fd[0] : null, walkFoot: fd ? fd[8] : null };
    });
    console.log('Injected row heights:', variance.rows, ' detected idle/walk foot (in-frame y):', variance.idleFoot, '/', variance.walkFoot);

    // Nudge each NPC into a continuous walk so the walk-row (56px) frames are guaranteed to be
    // sampled while measuring (otherwise they idle for ~20s between short walk bursts).
    const forceWalk = (dir) => page.evaluate((d) => {
        window.game.scene.scenes[0].npcs.filter(n => n.spriteKey && n.spriteKey.startsWith('custom_npc_')).forEach(n => {
            n.wanderState = d; n.wanderTimer = window.game.getTime ? window.game.getTime() + 999999 : Number.MAX_SAFE_INTEGER;
        });
    }, dir);

    const snapshot = () => page.evaluate((FLOOR) => {
        const s = window.game.scene.scenes[0];
        return s.npcs.filter(n => n.spriteKey && n.spriteKey.startsWith('custom_npc_')).map(n => {
            const sp = n.sprite, b = sp.body, f = sp.frame;
            // Visible feet, independent of the physics body: with bottom origin (0.5,1) the frame
            // bottom is at sp.y, and the foot line sits (f.height - footY) source px above it.
            const idx = (typeof f.name === 'number') ? f.name : parseInt(f.name, 10);
            const fd = window.npcFootData && window.npcFootData[n.spriteKey];
            const footY = (fd && fd[idx] != null) ? fd[idx] + 1 : f.height;
            const scale = sp.scaleY || 1.5;
            const feetWorld = sp.y + scale * (footY - f.height / 2);
            return {
                name: n.npcName,
                anim: sp.anims && sp.anims.currentAnim ? sp.anims.currentAnim.key.replace(/^custom_npc_\d+/, '') : null,
                frameH: f.height,
                y: Math.round(sp.y),
                bodyBottom: Math.round(b.bottom),
                bodyVsFloor: Math.round(b.bottom - FLOOR),
                feetWorld: Math.round(feetWorld),
                feetVsFloor: Math.round(feetWorld - FLOOR),
                offsetY: Math.round(b.offset.y),
                floor: b.blocked.down || b.touching.down
            };
        });
    }, FLOOR_TOP);

    const printReport = (label, rep) => {
        console.log(`\n=== ${label} ===`);
        rep.forEach(n => {
            const fell = n.bodyBottom > 760 ? '  <-- FELL THROUGH' : '';
            console.log(`"${n.name}" anim=${n.anim} frameH=${n.frameH} y=${n.y} bodyBottom=${n.bodyBottom}(${n.bodyVsFloor >= 0 ? '+' : ''}${n.bodyVsFloor}) feetWorld=${n.feetWorld}(${n.feetVsFloor >= 0 ? '+' : ''}${n.feetVsFloor}) offsetY=${n.offsetY} floor=${n.floor}${fell}`);
        });
    };

    await new Promise(r => setTimeout(r, 3000));
    printReport('AFTER LANDING (idle frames)', await snapshot());

    await new Promise(r => setTimeout(r, 4000));
    printReport('AFTER WANDERING STARTS (walk frames)', await snapshot());

    await new Promise(r => setTimeout(r, 5000));
    printReport('STILL WANDERING (12s)', await snapshot());

    // Aggregate over a forced continuous walk so the 56px walk-row frames are sampled, then idle.
    const samples = [];
    forceWalk(2);
    for (let i = 0; i < 10; i++) { samples.push(...await snapshot()); await new Promise(r => setTimeout(r, 250)); }
    forceWalk(0);
    for (let i = 0; i < 6; i++) { samples.push(...await snapshot()); await new Promise(r => setTimeout(r, 250)); }

    // Group by frame height: the idle row is 64px, the walk row is 56px. The VISIBLE feet (not just
    // body.bottom) must stay on the floor in each — a buried/floating foot fails even if the body
    // anchors correctly.
    const byH = {};
    samples.forEach(s => { (byH[s.frameH] = byH[s.frameH] || []).push(Math.abs(s.feetVsFloor)); });
    const fell = samples.filter(s => s.bodyBottom > 760).length;

    console.log('\n=== SUMMARY ===');
    Object.keys(byH).sort().forEach(h => {
        console.log(`frameH=${h} (${h == 64 ? 'idle row' : h == 56 ? 'walk row' : 'other'}): ${byH[h].length} samples, max |visible feet - floor| = ${Math.max(...byH[h])}px`);
    });
    console.log('Sink-through events:', fell);
    const sawIdleRow = !!byH[64], sawWalkRow = !!byH[56];
    const allOnFloor = Object.values(byH).every(arr => Math.max(...arr) <= 3);
    const pass = sawIdleRow && sawWalkRow && allOnFloor && fell === 0;
    console.log(pass ? 'PASS: visible feet stay on the floor in idle (64px) AND walk (56px) frames.'
                     : 'FAIL: visible feet drift off the floor or sink, or a row was never sampled.');

    await browser.close();
}

run().catch(err => { console.error('Verify error:', err); process.exit(1); });
