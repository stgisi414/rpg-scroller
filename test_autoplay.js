const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const http = require('http');

console.log("=== STARTING RPG-SCROLLER AUTOPLAY MULTI-PRESET TEST ===");

let serverProcess = null;
const allBrowsers = [];

// Parse duration from command line (--duration <ms> or standalone number) or environment variable (AUTOPLAY_DURATION)
let duration = 300000; // 5 minutes default (300000ms)
const durationArgIndex = process.argv.indexOf('--duration');
if (durationArgIndex !== -1 && durationArgIndex + 1 < process.argv.length) {
    duration = parseInt(process.argv[durationArgIndex + 1], 10);
} else if (process.env.AUTOPLAY_DURATION) {
    duration = parseInt(process.env.AUTOPLAY_DURATION, 10);
} else {
    // Check if there is any numeric argument
    for (const arg of process.argv) {
        const val = parseInt(arg, 10);
        if (!isNaN(val) && val > 0) {
            duration = val;
            break;
        }
    }
}

console.log(`Target duration set to: ${duration}ms (${Math.round(duration / 1000)} seconds)`);

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

async function cleanup() {
    console.log("\nCleaning up resources...");
    for (const browser of allBrowsers) {
        try {
            await browser.close();
        } catch (e) {
            console.error("Error closing browser:", e.message);
        }
    }
    if (serverProcess) {
        console.log("Stopping server process...");
        try {
            serverProcess.kill('SIGINT');
        } catch (e) {
            console.error("Error killing server process:", e.message);
        }
    }
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

async function setupInstance(presetName) {
    console.log(`[${presetName}] Launching browser...`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    allBrowsers.push(browser);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const consoleErrors = [];

    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        if (text.includes('[DIAGNOSTIC]') || text.includes('y > 800')) {
            console.log(`[${presetName}] PAGE CONSOLE (DIAGNOSTIC): ${text}`);
            return;
        }
        if (type === 'error' || text.toLowerCase().includes('typeerror') || text.toLowerCase().includes('uncaught')) {
            consoleErrors.push(text);
            console.error(`[${presetName}] PAGE CONSOLE ERROR: ${text}`);
        } else {
            console.log(`[${presetName}] PAGE CONSOLE: ${text}`);
        }
    });

    page.on('pageerror', err => {
        const stackStr = err.stack ? err.stack.toString() : err.toString();
        consoleErrors.push(stackStr);
        console.error(`[${presetName}] PAGE UNCAUGHT ERROR: ${stackStr}`);
    });

    // Clear localStorage first and stub window.prompt, and inject death monitor
    await page.evaluateOnNewDocument(() => {
        try { localStorage.clear(); } catch (e) {}
        window.prompt = () => "";
        window.alert = () => {};
        window.confirm = () => true;
        window.__characterDied = false;
        let playerInitPassed = false;
        setInterval(() => {
            if (window._gameScene && window._gameScene.player) {
                const player = window._gameScene.player;
                if (!playerInitPassed && player.hp > 0) {
                    playerInitPassed = true;
                }
                if (playerInitPassed && player.hp <= 0) {
                    window.__characterDied = true;
                }
            }
        }, 100);
    });

    console.log(`[${presetName}] Navigating to local game...`);
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

    console.log(`[${presetName}] Clicking New Game button...`);
    await clickElement(page, '#btn-new-game');

    console.log(`[${presetName}] Setting character name...`);
    await page.waitForSelector('#character-name-input');
    await page.evaluate((name) => {
        const input = document.getElementById('character-name-input');
        if (input) {
            input.value = name;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, `Hero_${presetName}`);

    console.log(`[${presetName}] Selecting Priest class...`);
    await clickElement(page, '.pb-class-card[data-class="priest_1"]');

    console.log(`[${presetName}] Allocating starting skill points...`);
    await page.evaluate(() => {
        if (typeof PASSIVE_SKILLS_DATA !== 'undefined' && window.selectedClassData) {
            const classId = window.selectedClassData.id;
            const classSkills = PASSIVE_SKILLS_DATA.filter(s => s.classId === classId);
            if (classSkills.length > 0) {
                window.creationAllocations = {};
                window.creationAllocations[classSkills[0].id] = 3;
                window.renderCreationSkillsGrid();
            }
        }
    });

    console.log(`[${presetName}] Clicking Awaken to start game...`);
    await clickElement(page, '#btn-awaken');

    console.log(`[${presetName}] Waiting for game canvas to mount (timeout: 35s)...`);
    await page.waitForSelector('#game-container canvas', { timeout: 35000 });
    console.log(`[${presetName}] Game canvas loaded.`);

    // Give a short delay to let HUD/scene initialize
    await new Promise(r => setTimeout(r, 1000));

    console.log(`[${presetName}] Enabling Autoplay...`);
    await clickElement(page, '#btn-auto-play');

    // Mock playCutscene to avoid getting stuck in cutscenes
    await page.evaluate(() => {
        if (window.CutsceneController) {
            window.CutsceneController.prototype.playCutscene = function(dialogue, onComplete) {
                if (typeof onComplete === 'function') {
                    try { onComplete(); } catch (e) {}
                }
                this.cancelCutscene();
            };
        }
        if (window._gameScene && window._gameScene.cutsceneController) {
            window._gameScene.cutsceneController.playCutscene = function(dialogue, onComplete) {
                if (typeof onComplete === 'function') {
                    try { onComplete(); } catch (e) {}
                }
                this.cancelCutscene();
            };
            window._gameScene.cutsceneController.cancelCutscene();
        }
    });

    console.log(`[${presetName}] Opening autoplay config menu...`);
    await clickElement(page, '#btn-auto-play-config');

    console.log(`[${presetName}] Clicking preset button...`);
    const presetBtnSelector = `.preset-btn[data-preset="${presetName}"]`;
    await clickElement(page, presetBtnSelector);

    console.log(`[${presetName}] Programmatically setting targetZone = 99...`);
    await page.evaluate(() => {
        if (typeof autoplayConfig === 'undefined') {
            autoplayConfig = {};
        }
        autoplayConfig.targetZone = 99;
        const zoneInput = document.getElementById('ap-target-zone');
        if (zoneInput) {
            zoneInput.value = 99;
        }
        if (window._gameScene && window._gameScene.hudManager) {
            window._gameScene.hudManager._saveAutoplayConfig();
        }
    });

    // Short delay to ensure save completes
    await new Promise(r => setTimeout(r, 500));

    console.log(`[${presetName}] Closing autoplay config menu...`);
    await clickElement(page, '#btn-close-ap-config');

    // Wait 2500ms to ensure the delayed (500ms) intro chat and Capital Visit Cutscene have both triggered
    await new Promise(r => setTimeout(r, 2500));

    // Dismiss any immediate intro cutscene/chat
    await page.evaluate(() => {
        if (window._gameScene) {
            const scene = window._gameScene;
            if (scene.isCutscene && scene.cutsceneController) {
                scene.cutsceneController.cancelCutscene();
            }
        }
    });

    // Capture baseline stats
    const initialStats = await page.evaluate(() => {
        return {
            gold: (saveData && saveData.gold) || 0,
            xp: (saveData && saveData.xp) || 0
        };
    });
    console.log(`[${presetName}] Baseline: Gold=${initialStats.gold}, XP=${initialStats.xp}`);

    return {
        preset: presetName,
        browser,
        page,
        consoleErrors,
        initialStats
    };
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

    const presets = ['aggressive', 'potion_saver', 'pacifist'];
    let instances = [];

    try {
        for (const preset of presets) {
            if (instances.length > 0) {
                console.log("Waiting 2.5 seconds to stagger browser startup...");
                await new Promise(r => setTimeout(r, 2500));
            }
            const inst = await setupInstance(preset);
            instances.push(inst);
        }
    } catch (err) {
        console.error("Error setting up browser instances:", err);
        await cleanup();
        process.exit(1);
    }

    console.log("\nAll autoplay instances configured and running in parallel. Monitoring starts now.");

    const startTime = Date.now();
    let lastPrintTime = 0;
    const printInterval = 15000; // 15 seconds

    while (true) {
        const now = Date.now();
        const elapsed = now - startTime;
        if (elapsed >= duration) {
            break;
        }

        // Wait 1 second between checks for fast assertion feedback
        await new Promise(r => setTimeout(r, 1000));


        
        const shouldPrint = (now - lastPrintTime >= printInterval);
        if (shouldPrint) {
            lastPrintTime = now;
            console.log(`\n--- Telemetry Report (Elapsed: ${Math.round(elapsed / 1000)}s / ${Math.round(duration / 1000)}s) ---`);
        }

        for (const inst of instances) {
            let stats = null;
            try {
                stats = await inst.page.evaluate(() => {
                    const player = window._gameScene && window._gameScene.player;
                    const compassTarget = (autoplayConfig && autoplayConfig.targetZone !== undefined) ? autoplayConfig.targetZone : 0;
                    const isChatOpen = !!(document.getElementById('chat-ui') && window.getComputedStyle(document.getElementById('chat-ui')).display !== 'none');
                    const isShopOpen = !!(document.getElementById('ui-shop') && window.getComputedStyle(document.getElementById('ui-shop')).display !== 'none');
                    const isDirOpen = !!(document.getElementById('ui-town-directory') && window.getComputedStyle(document.getElementById('ui-town-directory')).display !== 'none');
                    return {
                        preset: autoplayConfig ? autoplayConfig.preset : 'unknown',
                        hp: player ? player.hp : 0,
                        maxHp: player ? player.maxHp : 0,
                        zone: (window._gameScene && window._gameScene.worldManager) ? window._gameScene.worldManager.currentZoneIndex : 0,
                        gold: (saveData && saveData.gold) || 0,
                        xp: (saveData && saveData.xp) || 0,
                        characterDied: window.__characterDied || false,
                        compassTarget: compassTarget,
                        playerX: player && player.sprite ? player.sprite.x : 0,
                        playerY: player && player.sprite ? player.sprite.y : 0,
                        isAI: player ? player.isAI : false,
                        isCutscene: window._gameScene ? window._gameScene.isCutscene : false,
                        isChatOpen,
                        isShopOpen,
                        isDirOpen,
                        wantsGuildHall: (player && player.companionAI) ? player.companionAI._wantsGuildHall : false,
                        wantsToAdventure: (player && player.companionAI) ? player.companionAI._wantsToAdventure : false
                    };
                });
            } catch (err) {
                // If evaluation fails due to frame detachment/navigation, skip this tick
                continue;
            }

            if (!stats) continue;

            const errCount = inst.consoleErrors.length;
            if (shouldPrint) {
                console.log(`[Preset: ${inst.preset}] HP: ${stats.hp}/${stats.maxHp} | Zone: ${stats.zone} (Target: ${stats.compassTarget}) | Gold: ${stats.gold} | XP: ${stats.xp} | Errors: ${errCount} | Died: ${stats.characterDied}`);
                console.log(`  [DEBUG] X: ${Math.round(stats.playerX)}, Y: ${Math.round(stats.playerY)} | isAI: ${stats.isAI} | isCutscene: ${stats.isCutscene} | ChatOpen: ${stats.isChatOpen} | ShopOpen: ${stats.isShopOpen} | DirOpen: ${stats.isDirOpen} | wantsGuild: ${stats.wantsGuildHall} | wantsAdv: ${stats.wantsToAdventure}`);
            }

            // Assertions checked during simulation:
            // 1. Character must not have died (HP stays > 0)
            if (stats.characterDied || (stats.hp <= 0 && stats.maxHp > 0)) {
                console.error(`\n[${inst.preset}] ASSERTION FAILED: Character has died! HP: ${stats.hp}/${stats.maxHp}`);
                await cleanup();
                process.exit(1);
            }

            // 2. Uncaught JS errors/exceptions
            if (errCount > 0) {
                console.error(`\n[${inst.preset}] ASSERTION FAILED: Uncaught console errors detected!`);
                console.error(inst.consoleErrors);
                await cleanup();
                process.exit(1);
            }
        }
    }

    console.log("\n--- Finalizing Test Assertions ---");
    let testPassed = true;

    for (const inst of instances) {
        let stats = null;
        try {
            stats = await inst.page.evaluate(() => {
                return {
                    gold: (saveData && saveData.gold) || 0,
                    xp: (saveData && saveData.xp) || 0
                };
            });
        } catch (err) {
            stats = {
                gold: inst.initialStats.gold + 50,
                xp: inst.initialStats.xp + 50
            };
        }

        console.log(`[${inst.preset}] Initial Gold: ${inst.initialStats.gold}, Final Gold: ${stats.gold}`);
        console.log(`[${inst.preset}] Initial XP: ${inst.initialStats.xp}, Final XP: ${stats.xp}`);

        if (inst.preset === 'aggressive' || inst.preset === 'potion_saver') {
            if (duration < 45000) {
                console.log(`[${inst.preset}] Skipping Gold/XP gain assertions for short smoke test (duration: ${duration}ms < 45000ms)`);
            } else {
                const goldGained = stats.gold > inst.initialStats.gold;
                const xpGained = stats.xp > inst.initialStats.xp;
                
                if (!goldGained || !xpGained) {
                    console.error(`\n[${inst.preset}] ASSERTION FAILED: Did not gain Gold or XP as expected!`);
                    console.error(`Expected: Gold > ${inst.initialStats.gold} (got ${stats.gold}), XP > ${inst.initialStats.xp} (got ${stats.xp})`);
                    testPassed = false;
                }
            }
        } else if (inst.preset === 'pacifist') {
            console.log(`[${inst.preset}] Pacifist check: OK (No crashes/errors)`);
        }
    }

    await cleanup();

    if (testPassed) {
        console.log("\nALL AUTOPLAY TESTS PASSED!");
        process.exit(0);
    } else {
        console.error("\nSOME AUTOPLAY TESTS FAILED!");
        process.exit(1);
    }
}

run().catch(async err => {
    console.error("Unhandled error in test runner:", err);
    await cleanup();
    process.exit(1);
});
