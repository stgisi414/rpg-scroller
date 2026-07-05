const puppeteer = require('puppeteer');
const http = require('http');

function waitPort(port, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            const req = http.request({ port, host: '127.0.0.1', path: '/' }, () => {
                resolve();
            });
            req.on('error', () => {
                if (Date.now() - start > timeout) {
                    reject(new Error(`Timeout waiting for port ${port}`));
                } else {
                    setTimeout(check, 200);
                }
            });
            req.end();
        };
        check();
    });
}

async function clickElement(page, selector) {
    await page.waitForSelector(selector);
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
            el.click();
        } else {
            throw new Error(`Element not found for selector: ${sel}`);
        }
    }, selector);
}

async function run() {
    let port = 3000;
    try {
        await waitPort(port, 2000);
        console.log("Found running server on port 3000.");
    } catch (e) {
        console.error("No server found on port 3000. Please ensure the server is running.");
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    let consoleErrors = [];
    let page404s = [];
    
    page.on('response', response => {
        if (response.status() === 404) {
            console.log(`[404 NOT FOUND] URL: ${response.url()}`);
            page404s.push(response.url());
        }
    });

    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        if (type === 'error' || text.toLowerCase().includes('typeerror') || text.toLowerCase().includes('uncaught')) {
            consoleErrors.push(text);
            console.error(`PAGE CONSOLE ERROR: ${text}`);
        } else {
            console.log(`PAGE CONSOLE: ${text}`);
        }
    });

    page.on('pageerror', err => {
        const stackStr = err.stack ? err.stack.toString() : err.toString();
        consoleErrors.push(stackStr);
        console.error(`PAGE UNCAUGHT ERROR: ${stackStr}`);
    });

    // Clear localStorage first and stub window.prompt
    await page.evaluateOnNewDocument(() => {
        localStorage.clear();
        window.prompt = () => "";
    });

    console.log("Navigating to local game...");
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });

    console.log("Clicking New Game button...");
    await page.waitForSelector('#btn-new-game');
    await page.click('#btn-new-game');

    console.log("Typing character name...");
    await page.waitForSelector('#character-name-input');
    await page.evaluate(() => {
        const input = document.getElementById('character-name-input');
        if (input) {
            input.value = 'RefactorHero';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    console.log("Selecting Priest class...");
    await page.waitForSelector('.class-btn[data-class="priest"]');
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

    console.log("Clicking Awaken to start game...");
    await page.evaluate(() => {
        const btn = document.getElementById('btn-awaken');
        if (btn) btn.click();
    });

    console.log("Waiting for game canvas to mount...");
    await page.waitForSelector('#game-container canvas', { timeout: 45000 });
    console.log("Game canvas is loaded.");

    // Let physics settle
    await new Promise(r => setTimeout(r, 2000));

    console.log("Simulating rapid actions (attacks, deaths, zone transitions)...");
    for (let i = 0; i < 5; i++) {
        console.log(`--- Iteration ${i + 1} ---`);

        // 1. Character sheet interactions
        console.log("Testing Character Sheet Modal...");
        await page.waitForSelector('#btn-char-sheet');
        await page.evaluate(() => document.getElementById('btn-char-sheet').click());
        await new Promise(r => setTimeout(r, 500));
        
        const modalDisplay = await page.evaluate(() => {
            const modal = document.getElementById('char-sheet-modal');
            return modal ? modal.style.display : 'not_found';
        });
        if (modalDisplay === 'none' || modalDisplay === 'not_found') {
            throw new Error(`Character sheet modal is not visible! Display: ${modalDisplay}`);
        }
        
        if (i % 2 === 0) {
            console.log("Closing character sheet via ESC key...");
            await page.keyboard.press('Escape');
        } else {
            console.log("Closing character sheet via Close button click...");
            await page.evaluate(() => document.getElementById('cs-close').click());
        }
        await new Promise(r => setTimeout(r, 500));

        // 2. Test Spacebar mapping and isUpDown
        console.log("Testing Spacebar key mapping...");
        await page.evaluate(() => {
            if (window._gameScene) {
                window._gameScene.npcs.forEach(n => {
                    if (n.closeChat) n.closeChat();
                    if (n.closeShop) n.closeShop();
                });
                if (window._gameScene.inputManager) {
                    window._gameScene.inputManager.enableForInput();
                }
            }
        });
        
        // Simulating attacks
        console.log("Simulating attacks...");
        await page.evaluate(() => {
            if (window._gameScene && window._gameScene.player) {
                window._gameScene.player.attack();
                window._gameScene.player.superComboSpell();
            }
        });
        await new Promise(r => setTimeout(r, 1000));

        // 3. Zone Transitions
        console.log("Triggering zone transition...");
        await page.evaluate(() => {
            if (window._gameScene) {
                window._gameScene.transitionZone(1);
            }
        });
        await new Promise(r => setTimeout(r, 2000));

        // 4. Player Death
        console.log("Testing death sequence...");
        await page.evaluate(() => {
            if (window._gameScene && window._gameScene.player) {
                window._gameScene.player.hp = 0;
                window._gameScene.player.die();
            }
        });
        await new Promise(r => setTimeout(r, 2000));
    }

    // Clean up
    await browser.close();

    console.log("=== FINAL 404 SUMMARY ===");
    console.log(page404s);
    process.exit(0);
}

run().catch(err => {
    console.error("Error in test runner:", err);
    process.exit(1);
});
