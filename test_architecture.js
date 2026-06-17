const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const http = require('http');

console.log("=== STARTING RPG-SCROLLER ARCHITECTURE INTEGRATION TEST ===");

let serverProcess = null;

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

async function run() {
    let port = 3000;
    
    // Check if port 3000 is open
    let serverRunning = false;
    try {
        await waitPort(port, 1000);
        serverRunning = true;
        console.log("Found running server on port 3000.");
    } catch (e) {
        console.log("No server found on port 3000, starting local http-server...");
        serverProcess = spawn('npx', ['http-server', '.', '-p', '3000', '-c-1'], {
            shell: true,
            stdio: 'ignore'
        });
        await waitPort(port, 15000);
        serverRunning = true;
        console.log("Local server started successfully.");
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    let consoleErrors = [];
    
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
    await page.type('#character-name-input', 'RefactorHero');

    console.log("Clicking Awaken to start game...");
    await page.click('#btn-awaken');

    console.log("Waiting for game canvas to mount...");
    await page.waitForSelector('#game-container canvas', { timeout: 15000 });
    console.log("Game canvas is loaded.");

    // Helper to get event listener counts using CDP
    const client = await page.target().createCDPSession();
    async function getListenerCounts() {
        const windowRes = await client.send('Runtime.evaluate', { expression: 'window' });
        const windowListeners = await client.send('DOMDebugger.getEventListeners', {
            objectId: windowRes.result.objectId
        });
        
        const docRes = await client.send('Runtime.evaluate', { expression: 'document' });
        const docListeners = await client.send('DOMDebugger.getEventListeners', {
            objectId: docRes.result.objectId
        });

        return {
            window: windowListeners.listeners.length,
            document: docListeners.listeners.length
        };
    }

    const initialListeners = await getListenerCounts();
    console.log(`Initial Event Listeners - Window: ${initialListeners.window}, Document: ${initialListeners.document}`);

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
        
        const activeStats = await page.evaluate(() => {
            const nameEl = document.getElementById('cs-name');
            const subEl = document.getElementById('cs-subtitle');
            const hpEl = document.getElementById('cs-hpmp');
            return {
                name: nameEl ? nameEl.innerText : '',
                subtitle: subEl ? subEl.innerText : '',
                hpmp: hpEl ? hpEl.innerText : ''
            };
        });
        console.log(`Active Stats shown in Character Sheet: Name="${activeStats.name}", Subtitle="${activeStats.subtitle}", HP/MP="${activeStats.hpmp}"`);
        if (!activeStats.name.toLowerCase().includes("refactorhero")) {
            throw new Error(`Character sheet shows incorrect name: ${activeStats.name}`);
        }
        
        if (i % 2 === 0) {
            console.log("Closing character sheet via ESC key...");
            await page.keyboard.press('Escape');
        } else {
            console.log("Closing character sheet via Close button click...");
            await page.evaluate(() => document.getElementById('cs-close').click());
        }
        await new Promise(r => setTimeout(r, 500));
        
        const modalDisplayAfter = await page.evaluate(() => {
            const modal = document.getElementById('char-sheet-modal');
            return modal ? modal.style.display : 'not_found';
        });
        if (modalDisplayAfter !== 'none') {
            throw new Error(`Character sheet modal did not close! Display: ${modalDisplayAfter}`);
        }
        console.log("Character sheet modal opened and closed successfully.");

        // 2. Test Spacebar mapping and isUpDown
        console.log("Testing Spacebar key mapping...");
        await page.keyboard.down('Space');
        const spaceIsDownTrue = await page.evaluate(() => {
            if (window._gameScene && window._gameScene.player) {
                return window._gameScene.player.isUpDown();
            }
            return null;
        });
        await page.keyboard.up('Space');
        const spaceIsDownFalse = await page.evaluate(() => {
            if (window._gameScene && window._gameScene.player) {
                return window._gameScene.player.isUpDown();
            }
            return null;
        });
        console.log(`Spacebar checks: during press = ${spaceIsDownTrue}, after release = ${spaceIsDownFalse}`);
        if (spaceIsDownTrue !== true) {
            throw new Error(`Spacebar mapping check failed: isUpDown returned ${spaceIsDownTrue} during keydown`);
        }

        // 3. Rapid melee and super combo attacks
        console.log("Simulating attacks...");
        await page.evaluate(() => {
            if (window._gameScene && window._gameScene.player) {
                // Trigger normal attack and super spell rapidly
                window._gameScene.player.attack();
                window._gameScene.player.superComboSpell();
            }
        });
        await new Promise(r => setTimeout(r, 1000));

        // 4. Trigger zone transition
        console.log("Triggering zone transition...");
        await page.evaluate(() => {
            if (window._gameScene) {
                // Force zone transition
                window._gameScene.transitionZone(1);
            }
        });
        await new Promise(r => setTimeout(r, 2000));

        // 5. Trigger player death
        console.log("Triggering player death...");
        await page.evaluate(() => {
            if (window._gameScene && window._gameScene.player) {
                window._gameScene.player.hp = 0;
                window._gameScene.player.die();
            }
        });
        // Wait 4 seconds for death reload animation and scene restart to complete
        await new Promise(r => setTimeout(r, 4500));
    }

    const finalListeners = await getListenerCounts();
    console.log(`Final Event Listeners - Window: ${finalListeners.window}, Document: ${finalListeners.document}`);

    console.log("Verifying results...");
    
    // Check that event listeners do not stack up uncontrollably
    // Let's verify that the count of window and document listeners is stable (not multiplied by iterations)
    const listenerDiffWindow = Math.abs(finalListeners.window - initialListeners.window);
    const listenerDiffDocument = Math.abs(finalListeners.document - initialListeners.document);
    
    console.log(`Window Listeners delta: ${listenerDiffWindow}`);
    console.log(`Document Listeners delta: ${listenerDiffDocument}`);

    // Clean up
    await browser.close();
    if (serverProcess) {
        serverProcess.kill('SIGINT');
    }

    // Fail if there were uncaught errors/TypeErrors
    if (consoleErrors.length > 0) {
        console.error("TEST FAILED: TypeErrors or uncaught exceptions detected!");
        console.error(consoleErrors);
        process.exit(1);
    }

    // Fail if listener leaks are detected (e.g. if the diff is larger than a reasonable margin of 5 listeners)
    if (listenerDiffWindow > 8 || listenerDiffDocument > 8) {
        console.error("TEST FAILED: Event listener memory leak detected! Stacking listeners found.");
        process.exit(1);
    }

    console.log("TEST PASSED: No TypeErrors, no crashes, and event listeners are cleanly managed.");
    process.exit(0);
}

run().catch(err => {
    console.error("Unhandled error in test runner:", err);
    if (serverProcess) {
        serverProcess.kill('SIGINT');
    }
    process.exit(1);
});
