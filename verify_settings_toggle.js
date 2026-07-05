const puppeteer = require('puppeteer');
const http = require('http');

console.log("=== STARTING RPG-SCROLLER SETTINGS & VIDEO PLAYBACK INTEGRATION TEST ===");

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

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'error' || text.toLowerCase().includes('typeerror')) {
                console.error(`PAGE ERROR: ${text}`);
            } else {
                console.log(`PAGE LOG: ${text}`);
            }
        });

        // Add page dialog handler to auto-accept dialogs (alert, confirm, etc.)
        page.on('dialog', async dialog => {
            console.log(`DIALOG RECEIVED: type=${dialog.type()}, message="${dialog.message()}"`);
            await dialog.accept();
        });

        // Initialize clean stubs on new document (runs on every reload/load)
        await page.evaluateOnNewDocument(() => {
            window.prompt = () => "";
            window.alert = () => {};
            window.confirm = () => true; // fallback
        });

        console.log("Navigating to page...");
        await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

        // Clear localStorage ONLY ONCE at the start of the session
        await page.evaluate(() => {
            localStorage.clear();
        });

        // 1. Verify initial default setting of cutscene mode
        const initialLocalStorageVal = await page.evaluate(() => localStorage.getItem("cutscene_mode"));
        console.log(`Initial localStorage cutscene_mode: ${initialLocalStorageVal}`);
        if (initialLocalStorageVal !== null) {
            throw new Error(`Expected initial cutscene_mode to be null/empty, got ${initialLocalStorageVal}`);
        }

        // Open settings modal
        console.log("Opening settings modal...");
        await clickElement(page, '#btn-menu-settings');
        await new Promise(r => setTimeout(r, 500));

        // Check select element default value
        const initialSelectVal = await page.evaluate(() => {
            const select = document.getElementById('select-setting-cutscene-mode');
            return select ? select.value : 'not_found';
        });
        console.log(`Initial select element cutscene_mode: ${initialSelectVal}`);
        if (initialSelectVal !== 'traditional') {
            throw new Error(`Expected select element value to default to 'traditional', got ${initialSelectVal}`);
        }

        // 2. Set cutscene mode to "omni"
        console.log("Toggling cutscene mode to 'omni'...");
        await page.select('#select-setting-cutscene-mode', 'omni');

        console.log("Saving settings...");
        await clickElement(page, '#btn-save-settings');
        await new Promise(r => setTimeout(r, 500));

        // Check localStorage is saved
        const afterSaveLocalStorageVal = await page.evaluate(() => localStorage.getItem("cutscene_mode"));
        console.log(`localStorage cutscene_mode after save: ${afterSaveLocalStorageVal}`);
        if (afterSaveLocalStorageVal !== 'omni') {
            throw new Error(`Expected cutscene_mode in localStorage to be 'omni', got ${afterSaveLocalStorageVal}`);
        }

        // 3. Reload page and check persistence
        console.log("Reloading page to test persistence...");
        await page.reload({ waitUntil: 'domcontentloaded' });

        const afterReloadLocalStorageVal = await page.evaluate(() => localStorage.getItem("cutscene_mode"));
        console.log(`localStorage cutscene_mode after reload: ${afterReloadLocalStorageVal}`);
        if (afterReloadLocalStorageVal !== 'omni') {
            throw new Error(`Expected cutscene_mode in localStorage to persist as 'omni', got ${afterReloadLocalStorageVal}`);
        }

        // Open settings modal again to verify input field is populated correctly
        console.log("Opening settings modal again...");
        await clickElement(page, '#btn-menu-settings');
        await new Promise(r => setTimeout(r, 500));

        const afterReloadSelectVal = await page.evaluate(() => {
            return document.getElementById('select-setting-cutscene-mode').value;
        });
        console.log(`select element cutscene_mode after reload: ${afterReloadSelectVal}`);
        if (afterReloadSelectVal !== 'omni') {
            throw new Error(`Expected select element value to persist as 'omni', got ${afterReloadSelectVal}`);
        }

        // 4. Reset settings and check defaults
        console.log("Clicking reset settings button (Clear Keys)...");
        await clickElement(page, '#btn-reset-settings');
        await new Promise(r => setTimeout(r, 500));

        const afterResetLocalStorageVal = await page.evaluate(() => localStorage.getItem("cutscene_mode"));
        console.log(`localStorage cutscene_mode after reset: ${afterResetLocalStorageVal}`);
        if (afterResetLocalStorageVal !== 'traditional') {
            throw new Error(`Expected cutscene_mode in localStorage to default to 'traditional', got ${afterResetLocalStorageVal}`);
        }

        const afterResetSelectVal = await page.evaluate(() => {
            return document.getElementById('select-setting-cutscene-mode').value;
        });
        console.log(`select element cutscene_mode after reset: ${afterResetSelectVal}`);
        if (afterResetSelectVal !== 'traditional') {
            throw new Error(`Expected select element value to default to 'traditional' on reset, got ${afterResetSelectVal}`);
        }

        // Close settings modal
        await clickElement(page, '#btn-close-menu-settings');
        await new Promise(r => setTimeout(r, 500));

        // 5. Test Cutscene Video Playback and Fallback in game context
        console.log("Starting a new game to test cutscene video rendering...");
        await clickElement(page, '#btn-new-game');
        await page.waitForSelector('#character-name-input');
        
        await page.evaluate(() => {
            const input = document.getElementById('character-name-input');
            input.value = 'TestHero';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Select class
            window.selectClass('priest');

            // Force allocate 3 starting skill points directly in the state
            const classSkills = PASSIVE_SKILLS_DATA.filter(s => s.classId === 'priest');
            if (classSkills.length > 0) {
                window.creationAllocations[classSkills[0].id] = 3;
            }
            window.renderCreationSkillsGrid();
        });
        await new Promise(r => setTimeout(r, 500));
        console.log("Clicking Next Step...");
        await clickElement(page, '#btn-create-next');
        console.log("Clicking Awaken...");
        await clickElement(page, '#btn-awaken');

        console.log("Waiting for game canvas to mount...");
        await page.waitForSelector('#game-container canvas', { timeout: 45000 });
        console.log("Game canvas is loaded.");
        await page.waitForFunction(() => window._gameScene !== undefined && window._gameScene.cutsceneController !== undefined, { timeout: 15000 });

        // Spy on video load & play and test the omni mode playback
        await page.evaluate(() => {
            // Force settings to omni mode in localStorage
            localStorage.setItem("cutscene_mode", "omni");

            const video = document.getElementById('cutscene-video');
            window.playCalled = false;
            window.loadCalled = false;

            video.play = async function() {
                window.playCalled = true;
                return Promise.reject(new Error("Simulated autoplay restriction or load failure"));
            };

            video.load = function() {
                window.loadCalled = true;
            };
        });

        // Trigger a cutscene
        console.log("Triggering cutscene in 'omni' mode...");
        await page.evaluate(() => {
            const cutsceneController = window._gameScene.cutsceneController;
            // Use custom simple dialogue
            cutsceneController.playCutscene([
                { speaker: "Narrator", text: "This is a test line.", portrait: "priest", side: "left" }
            ], null, () => {});
        });

        await new Promise(r => setTimeout(r, 500));

        // Check if play was attempted and if fallback happened
        const playbackResults = await page.evaluate(() => {
            const videoContainer = document.getElementById('cutscene-video-container');
            const portLeft = document.getElementById('cutscene-portrait-left');
            const cutsceneController = window._gameScene.cutsceneController;

            return {
                loadCalled: window.loadCalled,
                playCalled: window.playCalled,
                videoContainerDisplay: videoContainer ? videoContainer.style.display : null,
                portraitDisplay: portLeft ? portLeft.style.display : null,
                videoFailed: cutsceneController.videoFailed
            };
        });

        console.log("Playback Results:", playbackResults);
        if (!playbackResults.loadCalled || !playbackResults.playCalled) {
            throw new Error(`Expected video.load() and video.play() to be called under 'omni' mode.`);
        }
        if (playbackResults.videoContainerDisplay !== 'none') {
            throw new Error(`Expected video container to be hidden after video load/play fails.`);
        }
        if (playbackResults.portraitDisplay !== 'flex') {
            throw new Error(`Expected fallback to show standard portraits (display='flex'), got '${playbackResults.portraitDisplay}'`);
        }
        if (playbackResults.videoFailed !== true) {
            throw new Error(`Expected cutsceneController.videoFailed to be true after failure.`);
        }

        console.log("=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY ===");

    } finally {
        await browser.close();
    }
}

run().catch(err => {
    console.error("TEST FAILED:", err);
    process.exit(1);
});
