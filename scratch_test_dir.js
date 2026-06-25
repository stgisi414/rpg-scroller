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
            id: 'dir-test',
            name: 'DirBot',
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

    console.log('Opening town directory programmatically...');
    await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        s.indoorManager.openTownDirectory();
    });

    console.log('Waiting 1s for UI to render...');
    await new Promise(r => setTimeout(r, 1000));

    console.log('Checking directory UI and clicking Tavern...');
    const result = await page.evaluate(() => {
        const ui = document.getElementById('ui-town-directory');
        const container = document.getElementById('directory-locations-container');
        if (!ui || ui.style.display === 'none') {
            return { error: 'Town directory UI not visible' };
        }
        if (!container || container.children.length === 0) {
            return { error: 'No cards found in locations container' };
        }
        const cards = Array.from(container.children);
        const cardInfos = cards.map((c, idx) => ({
            index: idx,
            html: c.outerHTML.substring(0, 200) + '...',
            tag: c.tagName,
            onclick: c.getAttribute('onclick')
        }));

        // Try clicking the first card (Tavern)
        console.log("Clicking the first card div...");
        const firstCard = cards[0];
        firstCard.click();

        return {
            visible: true,
            cardCount: cards.length,
            cardInfos: cardInfos
        };
    });

    console.log('Result:', JSON.stringify(result, null, 2));

    console.log('Waiting 1s to see if scene transitioned...');
    await new Promise(r => setTimeout(r, 1000));

    const sceneState = await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        return {
            isIndoors: s.isIndoors,
            indoorLocationId: s.indoorLocationId,
            isTransitioning: s.isTransitioning,
            isDirOpen: document.getElementById('ui-town-directory').style.display !== 'none'
        };
    });
    console.log('Scene State after click:', sceneState);

    await browser.close();
}

run().catch(err => {
    console.error("Test error:", err);
    process.exit(1);
});
