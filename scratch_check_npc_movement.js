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

    console.log('Starting game...');
    await page.evaluate(() => {
        window.startGame({
            id: 'check-movement',
            name: 'CheckMoveBot',
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
        return s && s.player && s.player.sprite && s.npcs && s.npcs.length > 0;
    }, { timeout: 15000 });

    console.log('Spawning a custom NPC in the party...');
    await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        // Generate a custom NPC using CharacterComposer
        const npcData = window.CharacterComposer.generateRandomNPC(s);
        // Spawn them as a party member
        s.spawnHeroAI(npcData.spriteKey, s.player.sprite.x + 80, s.player.sprite.y, 'party', 'PartyCompanion', 'A loyal companion.', 0, npcData.weaponType);
    });

    console.log('nudge town NPCs to walk...');
    await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        s.npcs.forEach(n => {
            n.wanderState = 2; // Walk right
            n.wanderTimer = Date.now() + 999999;
        });
    });

    console.log('Monitoring walk states for 3 seconds...');
    for (let i = 0; i < 15; i++) {
        const data = await page.evaluate(() => {
            const s = window.game.scene.scenes[0];
            const npcs = s.npcs.map(n => ({
                name: n.npcName,
                spriteKey: n.spriteKey,
                velX: n.sprite.body ? Math.round(n.sprite.body.velocity.x) : 0,
                currentAnim: n.sprite.anims.currentAnim ? n.sprite.anims.currentAnim.key : null,
                currentFrame: n.sprite.anims.currentFrame ? n.sprite.anims.currentFrame.index : null,
                frameName: n.sprite.frame ? n.sprite.frame.name : null
            }));

            const party = s.partyMembers.map(p => ({
                name: p.npcName || 'Unnamed',
                classId: p.classId,
                velX: p.sprite.body ? Math.round(p.sprite.body.velocity.x) : 0,
                currentAnim: p.sprite.anims.currentAnim ? p.sprite.anims.currentAnim.key : null,
                currentFrame: p.sprite.anims.currentFrame ? p.sprite.anims.currentFrame.index : null,
                frameName: p.sprite.frame ? p.sprite.frame.name : null
            }));

            // Force player/party companion input so they move
            s.player.sprite.setVelocityX(200);
            s.partyMembers.forEach(p => {
                p.sprite.setVelocityX(150); // mock walking velocity
            });

            return { npcs, party };
        });

        console.log(`\n--- Tick ${i} ---`);
        console.log("Town NPCs:");
        data.npcs.forEach(n => {
            console.log(`  Name: ${n.name.padEnd(16)} Key: ${n.spriteKey.padEnd(25)} velX: ${String(n.velX).padEnd(4)} anim: ${String(n.currentAnim).padEnd(30)} frameIdx: ${n.currentFrame} frameName: ${n.frameName}`);
        });
        console.log("Party Companions:");
        data.party.forEach(p => {
            console.log(`  Name: ${p.name.padEnd(16)} Key: ${p.classId.padEnd(25)} velX: ${String(p.velX).padEnd(4)} anim: ${String(p.currentAnim).padEnd(30)} frameIdx: ${p.currentFrame} frameName: ${p.frameName}`);
        });

        await new Promise(r => setTimeout(r, 200));
    }

    await browser.close();
    console.log('Done.');
}

run().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
