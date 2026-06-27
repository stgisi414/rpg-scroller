const puppeteer = require('puppeteer');

async function run() {
    console.log("Launching browser...");
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

    page.on('console', m => console.log('[page]', m.text()));
    page.on('pageerror', e => console.log('[pageerror]', e.message));

    console.log('Navigating to http://127.0.0.1:3000/ ...');
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });

    console.log('Waiting for window.startGame...');
    await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 10000 });

    console.log('Starting game...');
    await page.evaluate(() => {
        window.startGame({
            id: 'dump-anims-test',
            name: 'DumpAnimsBot',
            classId: 'knight',
            level: 1,
            playTime: 0,
            lastSaved: Date.now(),
            isNewGame: false,
            currentZone: 0
        });
    });

    console.log('Waiting for player and NPCs to initialize...');
    await page.waitForFunction(() => {
        const s = window.game && window.game.scene && window.game.scene.scenes[0];
        return s && s.npcs && s.npcs.length > 0;
    }, { timeout: 15000 });

    const animDataStr = await page.evaluate(() => {
        try {
            const s = window.game.scene.scenes[0];
            const results = [];
            
            // Go through all animation keys
            const keys = s.anims.anims.keys();
            for (const key of keys) {
                const anim = s.anims.anims.get(key);
                const frames = [];
                if (anim && anim.frames) {
                    for (const f of anim.frames) {
                        if (f && f.frame) {
                            frames.push(f.frame.name);
                        }
                    }
                }
                results.push({
                    key: key,
                    frameNames: frames,
                    frameRate: anim ? anim.frameRate : 0,
                    repeat: anim ? anim.repeat : 0
                });
            }
            
            // Also dump the NPCS' current animation and state
            const npcStates = s.npcs.map(n => ({
                name: n.npcName,
                spriteKey: n.spriteKey,
                wanderState: n.wanderState,
                currentAnim: (n.sprite && n.sprite.anims && n.sprite.anims.currentAnim) ? n.sprite.anims.currentAnim.key : null,
                velX: (n.sprite && n.sprite.body) ? n.sprite.body.velocity.x : 0
            }));
            
            return JSON.stringify({ anims: results, npcs: npcStates });
        } catch (e) {
            return JSON.stringify({ error: e.message + "\n" + e.stack });
        }
    });

    const animData = JSON.parse(animDataStr);
    if (animData.error) {
        console.error("Browser error:", animData.error);
        await browser.close();
        process.exit(1);
    }

    console.log("\n--- REGISTERED ANIMATIONS ---");
    animData.anims.forEach(a => {
        if (a.key.includes('custom_npc_') || a.key.includes('_walk') || a.key.includes('_idle') || a.key.includes('npc')) {
            console.log(`Key: ${a.key}, Frames: [${a.frameNames.join(', ')}], frameRate: ${a.frameRate}, repeat: ${a.repeat}`);
        }
    });

    console.log("\n--- ACTIVE NPCS ---");
    animData.npcs.forEach(n => {
        console.log(`NPC Name: ${n.name}, Key: ${n.spriteKey}, wanderState: ${n.wanderState}, currentAnim: ${n.currentAnim}, velX: ${n.velX}`);
    });

    await browser.close();
    console.log('Done.');
}

run().catch(err => {
    console.error("Test error:", err);
    process.exit(1);
});
