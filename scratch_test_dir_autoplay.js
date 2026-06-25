const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'capture_dir_autoplay');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

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
            id: 'dir-autoplay-test',
            name: 'DirAutoBot',
            classId: 'knight',
            level: 1,
            playTime: 0,
            lastSaved: Date.now(),
            isNewGame: false,
            currentZone: 0
        });
    });

    console.log('Waiting for player to initialize...');
    await page.waitForFunction(() => {
        const s = window.game && window.game.scene && window.game.scene.scenes[0];
        return s && s.player && s.player.sprite && s.platforms && s.platforms.getChildren().length > 0;
    }, { timeout: 15000 });

    // Enable Autoplay
    console.log('Enabling Autoplay...');
    await page.evaluate(() => {
        const apBtn = document.getElementById('btn-auto-play');
        if (apBtn) apBtn.click();
    });

    // Close any chats
    await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        s.npcs.forEach(n => {
            if (n.isChatOpen) n.closeChat();
            if (n.isShopOpen) n.closeShop();
        });
        s.player.companionAI._lastChatClosedTime = 0;
    });

    // Teleport player near the Angel Statue (x = 640)
    console.log('Teleporting player near the Angel Statue...');
    await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        const p = s.player;
        p.sprite.x = 600;
        p.sprite.y = 600;
        // Force the AI to want to travel
        p.companionAI._wantsToTravel = true;
        p.companionAI._wantsToAdventure = false;
        p.companionAI._lastDirTime = 0;
    });

    // Monitor for 10 seconds to see if it opens and clicks
    console.log('Monitoring autoplay behavior for 10 seconds...');
    for (let i = 0; i < 20; i++) {
        const state = await page.evaluate(() => {
            const s = window.game.scene.scenes[0];
            const p = s.player;
            const dirUI = document.getElementById('ui-town-directory');
            const locContainer = document.getElementById('directory-locations-container');
            return {
                x: Math.round(p.sprite.x),
                y: Math.round(p.sprite.y),
                isAI: p.isAI,
                wantsToTravel: p.companionAI._wantsToTravel,
                lastDirTime: p.companionAI._lastDirTime,
                isDirOpen: dirUI && dirUI.style.display !== 'none',
                cardsCount: locContainer ? locContainer.children.length : 0,
                isIndoors: s.isIndoors,
                indoorLocationId: s.indoorLocationId
            };
        });
        console.log(`Step ${i}: x=${state.x}, wantsToTravel=${state.wantsToTravel}, isDirOpen=${state.isDirOpen}, cards=${state.cardsCount}, isIndoors=${state.isIndoors}, indoor=${state.indoorLocationId}, lastDirTime=${state.lastDirTime}`);
        await page.screenshot({ path: path.join(OUT, `step_${i}.png`) });
        if (state.isIndoors) {
            console.log("SUCCESS: Autoplay entered indoor location!");
            break;
        }
        await new Promise(r => setTimeout(r, 500));
    }

    await browser.close();
    console.log('Done.');
}

run().catch(err => {
    console.error("Test error:", err);
    process.exit(1);
});
