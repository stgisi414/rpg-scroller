const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        page.on('requestfailed', request => {
            console.log(`[REQUEST FAILED] URL: ${request.url()} | Error: ${request.failure() ? request.failure().errorText : 'unknown'}`);
        });

        page.on('response', response => {
            if (response.status() === 404) {
                console.log(`[404 NOT FOUND] URL: ${response.url()}`);
            }
        });

        page.on('console', msg => {
            console.log(`[PAGE LOG] ${msg.type().toUpperCase()}: ${msg.text()}`);
        });

        console.log("Navigating to game...");
        await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });

        console.log("Clicking New Game...");
        await page.waitForSelector('#btn-new-game');
        await page.click('#btn-new-game');

        console.log("Typing character name...");
        await page.waitForSelector('#character-name-input');
        await page.evaluate(() => {
            const input = document.getElementById('character-name-input');
            if (input) {
                input.value = 'DiagHero';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        console.log("Selecting Priest...");
        await page.evaluate(() => {
            const el = document.querySelector('.class-btn[data-class="priest"]');
            if (el) el.click();
        });

        console.log("Allocating starting points...");
        await page.waitForSelector('#create-skills-grid .create-skill-icon-box');
        await page.evaluate(() => {
            const boxes = document.querySelectorAll('#create-skills-grid .create-skill-icon-box');
            if (boxes && boxes.length > 0) {
                boxes[0].click();
                boxes[0].click();
                boxes[0].click();
            }
        });

        console.log("Clicking Awaken...");
        await page.evaluate(() => {
            const btn = document.getElementById('btn-awaken');
            if (btn) btn.click();
        });

        console.log("Waiting for canvas...");
        await page.waitForSelector('#game-container canvas', { timeout: 30000 });
        console.log("Canvas mounted. Waiting 2s for scene initialization...");
        await new Promise(r => setTimeout(r, 2000));

        console.log("Transitioning to zone 1...");
        await page.evaluate(() => {
            if (window._gameScene) {
                window._gameScene.transitionZone(1);
            } else {
                console.error("window._gameScene is not defined!");
            }
        });

        console.log("Waiting 3s for transition to complete...");
        await new Promise(r => setTimeout(r, 3000));
        console.log("Done.");

    } finally {
        await browser.close();
    }
}

run().catch(err => {
    console.error("Diagnostic error:", err);
});
