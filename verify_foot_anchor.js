// Verifies the per-frame foot anchoring: an NPC whose WALK frames have their feet at a
// different in-frame position than the IDLE frames must keep its visible feet (and physics
// body bottom) on the floor in BOTH animations, and must never sink through.
//
// The canonical art has feet at the row bottom in every row, so a clean float can't be made
// from row heights alone (the frame would bleed into the next row's head). Instead we override
// window.npcFootData[key] after spawn to declare the walk-row frames' feet 34px higher in-frame
// than the idle-row frames -- exactly the condition the user's tuned slice data produces. The
// fix anchors body.bottom to each frame's declared foot line while holding the body's world
// position fixed, so body.bottom must stay on the floor (~672) through the idle<->walk swap.
const puppeteer = require('puppeteer');

const FLOOR_TOP = 672;

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
        try { localStorage.clear(); } catch (e) {}
    });
    page.on('pageerror', e => console.log('[pageerror]', e.message));

    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 20000 });
    await page.evaluate(() => {
        window.startGame({
            id: 'foot-test', name: 'FootBot', classId: 'knight', level: 1,
            playTime: 0, lastSaved: Date.now(), isNewGame: false, currentZone: 0
        });
    });
    await page.waitForFunction(() => {
        const s = window.game && window.game.scene && window.game.scene.scenes[0];
        return s && s.player && s.player.sprite && s.platforms && s.platforms.getChildren().length > 0 &&
            s.npcs && s.npcs.some(n => n.spriteKey && n.spriteKey.startsWith('custom_npc_'));
    }, { timeout: 30000 });

    // Confirm foot detection actually ran during composite creation.
    const detected = await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        const n = s.npcs.find(n => n.spriteKey && n.spriteKey.startsWith('custom_npc_'));
        const fd = window.npcFootData && window.npcFootData[n.spriteKey];
        return { key: n.spriteKey, idleFoot: fd ? fd[0] : null, walkFoot: fd ? fd[8] : null, len: fd ? fd.length : 0 };
    });
    console.log('Foot detection populated:', detected);

    // Override the walk-row frames (indices 8..15) to declare feet 34px higher in-frame than idle.
    await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        s.npcs.filter(n => n.spriteKey && n.spriteKey.startsWith('custom_npc_')).forEach((n, idx) => {
            const fd = window.npcFootData[n.spriteKey];
            if (!fd) return;
            for (let i = 0; i < fd.length; i++) {
                const row = Math.floor(i / 8);
                fd[i] = (row === 1) ? 40 : 63; // walk row feet high in-frame, others at bottom
            }
            // Force them to wander/walk left or right for the first half of the test
            n.wanderState = (idx % 2 === 0) ? 1 : 2;
            n.wanderTimer = 99999999;
        });
    });

    const snapshot = () => page.evaluate((FLOOR) => {
        const s = window.game.scene.scenes[0];
        return s.npcs.filter(n => n.spriteKey && n.spriteKey.startsWith('custom_npc_')).map(n => {
            const sp = n.sprite, b = sp.body, f = sp.frame;
            const idx = (typeof f.name === 'number') ? f.name : parseInt(f.name, 10);
            const fd = window.npcFootData[n.spriteKey];
            const footY = fd && fd[idx] != null ? fd[idx] + 1 : f.height;
            const footWorld = sp.y + (sp.scaleY || 1.5) * (footY - f.height / 2);
            return {
                name: n.npcName,
                anim: sp.anims && sp.anims.currentAnim ? sp.anims.currentAnim.key.replace(/^custom_npc_\d+/, '') : null,
                frameIdx: idx,
                frameH: f.height,
                spriteY: Math.round(sp.y),
                offsetY: Math.round(b.offset.y),
                bodyBottom: Math.round(b.bottom),
                footWorld: Math.round(footWorld),
                bodyVsFloor: Math.round(b.bottom - FLOOR),
                feetVsFloor: Math.round(footWorld - FLOOR),
                floor: b.blocked.down || b.touching.down
            };
        });
    }, FLOOR_TOP);

    const printReport = (label, rep) => {
        console.log(`\n=== ${label} ===`);
        rep.forEach(n => {
            const fell = n.bodyBottom > 760 ? '  <-- FELL THROUGH' : '';
            console.log(`"${n.name}" anim=${n.anim} frame=${n.frameIdx} frameH=${n.frameH} spriteY=${n.spriteY} offsetY=${n.offsetY} bodyBottom=${n.bodyBottom}(${n.bodyVsFloor >= 0 ? '+' : ''}${n.bodyVsFloor}) feetWorld=${n.footWorld}(${n.feetVsFloor >= 0 ? '+' : ''}${n.feetVsFloor}) floor=${n.floor}${fell}`);
        });
        return rep;
    };

    await new Promise(r => setTimeout(r, 3000));
    const idleRep = printReport('AFTER LANDING (idle frames)', await snapshot());

    await new Promise(r => setTimeout(r, 4000));
    printReport('AFTER WANDERING STARTS (walk frames)', await snapshot());

    await new Promise(r => setTimeout(r, 5000));
    const finalRep = printReport('STILL WANDERING (12s)', await snapshot());

    // Aggregate a verdict over a few seconds, capturing both idle and walk states.
    const samples = [];
    for (let i = 0; i < 12; i++) {
        if (i === 6) {
            // Force them to idle for the second half of the loop
            await page.evaluate(() => {
                const s = window.game.scene.scenes[0];
                s.npcs.filter(n => n.spriteKey && n.spriteKey.startsWith('custom_npc_')).forEach(n => {
                    n.wanderState = 0;
                    n.wanderTimer = 99999999;
                });
            });
        }
        samples.push(...await snapshot());
        await new Promise(r => setTimeout(r, 400));
    }
    const idleSamples = samples.filter(s => s.anim === '_idle');
    const walkSamples = samples.filter(s => s.anim === '_walk');
    const maxAbs = (arr, key) => arr.reduce((m, s) => Math.max(m, Math.abs(s[key])), 0);
    const fell = samples.filter(s => s.bodyBottom > 760).length;

    console.log('\n=== SUMMARY ===');
    console.log('Idle samples:', idleSamples.length, ' max |feet - floor| =', maxAbs(idleSamples, 'feetVsFloor'), 'px');
    console.log('Walk samples:', walkSamples.length, ' max |feet - floor| =', maxAbs(walkSamples, 'feetVsFloor'), 'px');
    console.log('Max |body.bottom - floor| (all):', maxAbs(samples, 'bodyVsFloor'), 'px');
    console.log('Sink-through events:', fell);

    const idleOk = idleSamples.length === 0 || maxAbs(idleSamples, 'feetVsFloor') <= 3;
    const walkOk = walkSamples.length === 0 || maxAbs(walkSamples, 'feetVsFloor') <= 3;
    const bodyOk = maxAbs(samples, 'bodyVsFloor') <= 3;
    const pass = idleOk && walkOk && bodyOk && fell === 0 && walkSamples.length > 0;
    console.log(pass ? 'PASS: feet stay on the floor in idle AND walk, body never sinks.'
                     : 'FAIL: feet drift off the floor or the body sinks.');

    await browser.close();
}

run().catch(err => { console.error('Verify error:', err); process.exit(1); });
