const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== STARTING RPG-SCROLLER VERIFICATION TESTS ===");

// 1. Read files
const srcDir = path.join(__dirname, '..', '..', 'src');
const npcControllerCode = fs.readFileSync(path.join(srcDir, 'NPCController.js'), 'utf8');
const inputManagerCode = fs.readFileSync(path.join(srcDir, 'InputManager.js'), 'utf8');
const playerControllerCode = fs.readFileSync(path.join(srcDir, 'PlayerController.js'), 'utf8');

// 2. Set up sandbox environment
const results = {
    npcEventListeners: { passed: false, detail: "" },
    spacebarMapping: { passed: false, detail: "" },
    fallbackPotions: { passed: false, detail: "" },
    tempStatsLogic: { passed: false, detail: "" }
};

// Define Phaser mock
const PhaserMock = {
    Input: {
        Keyboard: {
            KeyCodes: {
                W: 87, A: 65, S: 83, D: 68, F: 70, I: 73,
                PERIOD: 190, ONE: 49, TWO: 50, THREE: 51,
                FOUR: 52, FIVE: 53, SIX: 54, COMMA: 188, SPACE: 32
            },
            Key: class {
                constructor(keyCode) {
                    this.keyCode = keyCode;
                    this.isDown = false;
                }
            },
            JustDown: (key) => {
                return key ? key.isDown : false;
            }
        }
    },
    Math: {
        Distance: {
            Between: (x1, y1, x2, y2) => Math.sqrt((x1-x2)**2 + (y1-y2)**2)
        },
        Angle: {
            Between: (x1, y1, x2, y2) => Math.atan2(y2-y1, x2-x1)
        }
    }
};

// Helper to construct mock DOM element
function createMockElement(id) {
    const listeners = {};
    return {
        id,
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
        },
        innerText: '',
        value: '',
        disabled: false,
        addEventListener: (event, cb) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(cb);
        },
        removeEventListener: (event, cb) => {
            if (listeners[event]) {
                const beforeCount = listeners[event].length;
                listeners[event] = listeners[event].filter(x => x !== cb);
                const afterCount = listeners[event].length;
                // Track removal for diagnostics
                this._removedCount = (this._removedCount || 0) + (beforeCount - afterCount);
            }
        },
        appendChild: () => {},
        listeners,
        _removedCount: 0
    };
}

// Helper to construct mock sprite
function createMockSprite() {
    const s = {
        setScale: () => {},
        setDepth: () => {},
        setCollideWorldBounds: () => {},
        setFlipX: () => {},
        play: () => {},
        destroy: () => {},
        setVelocityX: () => {},
        setVelocityY: () => {},
        setPosition: () => {},
        body: {
            width: 24,
            height: 48,
            offset: { x: 28, y: 16 },
            setSize: () => {},
            setOffset: () => {},
            immovable: true,
            velocity: { x: 0, y: 0 }
        }
    };
    s.setVelocityX = s.setVelocityX.bind(s);
    s.setVelocityY = s.setVelocityY.bind(s);
    s.setPosition = s.setPosition.bind(s);
    s.body.setSize = s.body.setSize.bind(s.body);
    s.body.setOffset = s.body.setOffset.bind(s.body);
    return s;
}

// Set up JSDOM-like elements map
const elementsMap = {};
const documentMock = {
    getElementById: (id) => {
        if (!elementsMap[id]) {
            elementsMap[id] = createMockElement(id);
        }
        return elementsMap[id];
    },
    createElement: (tag) => {
        return {
            tagName: tag,
            style: {},
            innerHTML: '',
            appendChild: () => {},
            scrollTop: 0,
            scrollHeight: 0
        };
    }
};

const windowMock = {
    saveData: {
        level: 1,
        gold: 100,
        alignment: 0,
        isSavior: false,
        inventory: {
            weapon: { key: 'weapon-stick', iconSrc: 'src/assets/wooden_staff.png', name: 'Stick', damageBonus: 0, desc: 'A basic stick.' },
            potions: 5,
            scrolls: 2,
            artifacts: [],
            equippedArtifact: -1
        },
        quests: [],
        zones: {
            0: { name: 'Willowbrook', type: 'Safe', npcs: [] }
        },
        currentZone: 0
    },
    selectedClass: {
        id: 'knight',
        stats: { vit: 10, str: 10, dex: 10, int: 10 },
        frameWidth: 80,
        frameHeight: 64,
        isSheet: true,
        idleRow: 0,
        idleFrames: 5
    },
    localStorage: {
        getItem: () => '[]',
        setItem: () => {}
    },
    ARTIFACTS_DATA: {}
};

// Sandbox context
const sandbox = {
    Phaser: PhaserMock,
    document: documentMock,
    window: windowMock,
    localStorage: windowMock.localStorage,
    console: {
        log: console.log,
        error: console.error,
        warn: console.warn
    },
    setTimeout: setTimeout,
    Date: Date,
    Math: Math,
    NPCController: null,
    InputManager: null,
    PlayerController: null
};

vm.createContext(sandbox);

// Evaluate scripts in the sandbox
try {
    vm.runInContext(npcControllerCode, sandbox, { filename: 'NPCController.js' });
    sandbox.NPCController = vm.runInContext('NPCController', sandbox);
    vm.runInContext(inputManagerCode, sandbox, { filename: 'InputManager.js' });
    sandbox.InputManager = vm.runInContext('InputManager', sandbox);
    vm.runInContext(playerControllerCode, sandbox, { filename: 'PlayerController.js' });
    sandbox.PlayerController = vm.runInContext('PlayerController', sandbox);
} catch (e) {
    console.error("Syntax or top-level reference error while evaluating scripts:", e);
    process.exit(1);
}

// ----------------------------------------------------
// TEST 1: NPCController event listeners stored & removed
// ----------------------------------------------------
try {
    const mockKeyboardListeners = {};
    let keyboardOffCalled = false;
    let keyboardOffHandler = null;

    const mockScene = {
        physics: {
            add: {
                sprite: createMockSprite
            }
        },
        anims: {
            exists: () => true
        },
        add: {
            text: () => ({
                setOrigin: () => {},
                setDepth: () => {},
                setVisible: () => {},
                setPosition: () => {},
                destroy: () => {}
            })
        },
        input: {
            keyboard: {
                on: (event, cb) => {
                    mockKeyboardListeners[event] = cb;
                },
                off: (event, cb) => {
                    if (event === 'keydown-ESC') {
                        keyboardOffCalled = true;
                        keyboardOffHandler = cb;
                    }
                }
            }
        },
        npcs: []
    };

    const mockPlayer = {
        sprite: { x: 0, y: 0 },
        inputManager: {
            keys: {
                interact: { isDown: false }
            },
            disableForInput: () => {},
            enableForInput: () => {}
        }
    };

    const mockGeminiService = {};

    // Clear element maps
    for (const key in elementsMap) delete elementsMap[key];

    // Instantiate NPCController
    const npc = new sandbox.NPCController(
        mockScene,
        100, 100,
        mockPlayer,
        mockGeminiService,
        "TestNPC",
        "TestPersona",
        "npc"
    );

    // Get elements
    const submitBtn = elementsMap['chat-submit'];
    const chatInput = elementsMap['chat-input'];
    const tradeBtn = elementsMap['chat-trade'];
    const activityBtn = elementsMap['chat-activity'];

    // Check if listeners are registered
    const isSubmitRegistered = submitBtn && submitBtn.listeners['click'] && submitBtn.listeners['click'].includes(npc.onSubmitClick);
    const isInputRegistered = chatInput && chatInput.listeners['keypress'] && chatInput.listeners['keypress'].includes(npc.onKeyPress);
    const isTradeRegistered = tradeBtn && tradeBtn.listeners['click'] && tradeBtn.listeners['click'].includes(npc.onTradeClick);
    const isActivityRegistered = activityBtn && activityBtn.listeners['click'] && activityBtn.listeners['click'].includes(npc.onActivityClick);
    const isEscRegistered = mockKeyboardListeners['keydown-ESC'] === npc.onEscKeyDown;

    // Call destroy
    npc.destroy();

    // Verify removal
    const isSubmitRemoved = !submitBtn.listeners['click'] || !submitBtn.listeners['click'].includes(npc.onSubmitClick);
    const isInputRemoved = !chatInput.listeners['keypress'] || !chatInput.listeners['keypress'].includes(npc.onKeyPress);
    const isTradeRemoved = !tradeBtn.listeners['click'] || !tradeBtn.listeners['click'].includes(npc.onTradeClick);
    const isActivityRemoved = !activityBtn.listeners['click'] || !activityBtn.listeners['click'].includes(npc.onActivityClick);
    const isEscRemoved = keyboardOffCalled && keyboardOffHandler === npc.onEscKeyDown;

    if (isSubmitRegistered && isInputRegistered && isTradeRegistered && isActivityRegistered && isEscRegistered &&
        isSubmitRemoved && isInputRemoved && isTradeRemoved && isActivityRemoved && isEscRemoved) {
        results.npcEventListeners.passed = true;
        results.npcEventListeners.detail = "All event listeners in NPCController.js are correctly stored as properties and successfully removed on destroy().";
    } else {
        results.npcEventListeners.passed = false;
        results.npcEventListeners.detail = `Listener integrity check failed. Registered: [submit:${isSubmitRegistered}, input:${isInputRegistered}, trade:${isTradeRegistered}, activity:${isActivityRegistered}, esc:${isEscRegistered}]. Removed: [submit:${isSubmitRemoved}, input:${isInputRemoved}, trade:${isTradeRemoved}, activity:${isActivityRemoved}, esc:${isEscRemoved}].`;
    }
} catch (err) {
    results.npcEventListeners.passed = false;
    results.npcEventListeners.detail = "Exception during NPCController test: " + err.stack;
}

// ----------------------------------------------------
// TEST 2: InputManager spacebar mapping and PlayerController.js isUpDown check
// ----------------------------------------------------
try {
    const mockScene = {
        input: {
            keyboard: {
                addKeys: (config) => {
                    const keys = {};
                    for (const [k, code] of Object.entries(config)) {
                        keys[k] = { isDown: false, keyCode: code };
                    }
                    return keys;
                },
                on: () => {},
                removeCapture: () => {},
                addCapture: () => {}
            },
            activePointer: {
                leftButtonDown: () => false,
                rightButtonDown: () => false
            }
        }
    };

    // Instantiate InputManager
    const inputManager = new sandbox.InputManager(mockScene);

    // Verify keycode mapping for space
    const spaceKeyObj = inputManager.keys.space;
    const spaceCodeMatched = spaceKeyObj && spaceKeyObj.keyCode === PhaserMock.Input.Keyboard.KeyCodes.SPACE;

    // Now test PlayerController isUpDown check behavior
    const mockPlayerScene = {
        ...mockScene,
        textures: {
            exists: () => true
        },
        physics: {
            add: {
                sprite: createMockSprite
            }
        },
        anims: {
            exists: () => true,
            create: () => {}
        },
        add: {
            text: () => ({
                setOrigin: () => {},
                setDepth: () => {},
                setVisible: () => {},
                setPosition: () => {},
                destroy: () => {}
            }),
            graphics: () => ({
                fillStyle: () => {},
                fillRect: () => {},
                setVisible: () => {},
                clear: () => {},
                lineStyle: () => {},
                strokeCircle: () => {},
                destroy: () => {}
            })
        }
    };

    // PlayerController expects HUD elements
    for (const key in elementsMap) delete elementsMap[key];
    
    const player = new sandbox.PlayerController(mockPlayerScene, 0, 0, inputManager, { isAI: false });

    // Set keys to not pressed
    inputManager.keys.up.isDown = false;
    inputManager.keys.space.isDown = false;

    // Call isUpDown
    const resultUpDownNoPress = player.isUpDown();

    // Set space to pressed
    inputManager.keys.space.isDown = true;
    const resultUpDownSpacePress = player.isUpDown();

    // Check if resultUpDownNoPress is truthy.
    // If the bug exists (isUpDown returns the key object directly instead of key.isDown),
    // resultUpDownNoPress will be the Space Key object, which is truthy!
    if (spaceCodeMatched) {
        if (resultUpDownNoPress) {
            results.spacebarMapping.passed = false;
            results.spacebarMapping.detail = `CRITICAL BUG FOUND: InputManager maps Space correctly to KeyCodes.SPACE, but PlayerController.js:isUpDown() returns a truthy value (the Space Key object) even when spacebar is NOT pressed! Return value when not pressed: ${JSON.stringify(resultUpDownNoPress)}. This causes continuous jumping.`;
        } else {
            results.spacebarMapping.passed = true;
            results.spacebarMapping.detail = "Spacebar maps correctly to KeyCodes.SPACE and PlayerController.js:isUpDown() evaluates it correctly.";
        }
    } else {
        results.spacebarMapping.passed = false;
        results.spacebarMapping.detail = `Spacebar key mapping failed: space code did not match KeyCodes.SPACE.`;
    }
} catch (err) {
    results.spacebarMapping.passed = false;
    results.spacebarMapping.detail = "Exception during Spacebar test: " + err.stack;
}

// ----------------------------------------------------
// TEST 3: Fallback potions initialized in AI inventory
// ----------------------------------------------------
try {
    const mockScene = {
        textures: {
            exists: () => true
        },
        input: {
            keyboard: {
                addKeys: () => ({}),
                on: () => {}
            }
        },
        physics: {
            add: {
                sprite: createMockSprite
            }
        },
        anims: {
            exists: () => true,
            create: () => {}
        },
        add: {
            text: () => ({
                setOrigin: () => {},
                setDepth: () => {},
                setVisible: () => {},
                setPosition: () => {}
            }),
            graphics: () => ({
                fillStyle: () => {},
                fillRect: () => {},
                setVisible: () => {},
                clear: () => {},
                lineStyle: () => {},
                strokeCircle: () => {},
                destroy: () => {}
            })
        }
    };

    const aiPlayer = new sandbox.PlayerController(mockScene, 0, 0, null, { isAI: true, classId: 'knight_rival' });
    const realPlayer = new sandbox.PlayerController(mockScene, 0, 0, { keys: { attack: {}, superSpell: {} } }, { isAI: false });

    const aiHasInventory = aiPlayer.inventory !== undefined;
    const aiHasFallbackPotions = aiPlayer.inventory && aiPlayer.inventory.potions === 2;
    const aiHasWeapon = aiPlayer.inventory && aiPlayer.inventory.weapon && aiPlayer.inventory.weapon.key === 'weapon-stick' && aiPlayer.inventory.weapon.damageBonus === 5;

    const realHasInventoryFromSave = realPlayer.inventory && realPlayer.inventory.potions === 5;

    if (aiHasInventory && aiHasFallbackPotions && aiHasWeapon && realHasInventoryFromSave) {
        results.fallbackPotions.passed = true;
        results.fallbackPotions.detail = `AI inventory correctly fallback-initialized with potions: 2 and weapon damageBonus: 5. Real player correctly loaded potions: 5 from saveData.`;
    } else {
        results.fallbackPotions.passed = false;
        results.fallbackPotions.detail = `AI/Player inventory fallback test failed. AI inventory: ${JSON.stringify(aiPlayer.inventory)}. Real player inventory: ${JSON.stringify(realPlayer.inventory)}.`;
    }
} catch (err) {
    results.fallbackPotions.passed = false;
    results.fallbackPotions.detail = "Exception during inventory test: " + err.stack;
}

// ----------------------------------------------------
// TEST 4: Temporary stats / clearTempStats logic
// ----------------------------------------------------
try {
    let updateHUDCalled = false;
    const mockScene = {
        textures: {
            exists: () => true
        },
        input: {
            keyboard: {
                addKeys: () => ({}),
                on: () => {}
            }
        },
        physics: {
            add: {
                sprite: createMockSprite
            }
        },
        anims: {
            exists: () => true,
            create: () => {}
        },
        add: {
            text: () => ({
                setOrigin: () => {},
                setDepth: () => {},
                setVisible: () => {},
                setPosition: () => {}
            }),
            graphics: () => ({
                fillStyle: () => {},
                fillRect: () => {},
                setVisible: () => {},
                clear: () => {},
                lineStyle: () => {},
                strokeCircle: () => {},
                destroy: () => {}
            })
        },
        updateHUD: () => {
            updateHUDCalled = true;
        }
    };

    const player = new sandbox.PlayerController(mockScene, 0, 0, { keys: { attack: {}, superSpell: {} } }, { isAI: false });

    // Initial check
    const hasTempStats = player.tempStats !== undefined && player.tempStats.vit === 0 && player.tempStats.int === 0;

    // Apply temp stat buff
    player.tempStats.int += 5;
    player.tempStats.vit += 2;
    player.recalculateStats();

    const statsAfterBuff = {
        maxHp: player.maxHp,
        maxMp: player.maxMp
    };

    // Base values: vit = 10, int = 10
    // After buff: vit = 12 (maxHp = 120), int = 15 (maxMp = 50 + 15*2 = 80 since knight)
    const buffAppliedCorrectly = statsAfterBuff.maxHp === 120 && statsAfterBuff.maxMp === 50; // Wait, let's verify recalculateStats formula for knight mp.
    // Line 395: this.maxMp = 20 + (stats.int * 2); -> for int = 15: 20 + 30 = 50. Yes! Correct.

    // Clear temp stats
    updateHUDCalled = false;
    player.clearTempStats();

    const statsAfterClear = {
        maxHp: player.maxHp,
        maxMp: player.maxMp,
        tempStatsVit: player.tempStats.vit,
        tempStatsInt: player.tempStats.int
    };

    const clearSuccess = statsAfterClear.tempStatsVit === 0 && statsAfterClear.tempStatsInt === 0 && statsAfterClear.maxHp === 100 && statsAfterClear.maxMp === 40;

    if (hasTempStats && buffAppliedCorrectly && clearSuccess && updateHUDCalled) {
        results.tempStatsLogic.passed = true;
        results.tempStatsLogic.detail = `tempStats operates cleanly: initialized as zeros, recalculates stats correctly on changes, clearTempStats resets it and recalculates correctly, and triggers updateHUD. No syntax or reference errors encountered.`;
    } else {
        results.tempStatsLogic.passed = false;
        results.tempStatsLogic.detail = `Temp stats check failed. Initialized: ${hasTempStats}, Buff applied correctly: ${buffAppliedCorrectly} (MaxHP: ${statsAfterBuff.maxHp}, MaxMP: ${statsAfterBuff.maxMp}), Clear success: ${clearSuccess} (MaxHP: ${statsAfterClear.maxHp}, MaxMP: ${statsAfterClear.maxMp}), updateHUD called: ${updateHUDCalled}.`;
    }
} catch (err) {
    results.tempStatsLogic.passed = false;
    results.tempStatsLogic.detail = "Exception during temp stats test: " + err.stack;
}

// ----------------------------------------------------
// Print Results & Exit
// ----------------------------------------------------
console.log("\n=== TEST RESULTS ===");
for (const [testName, result] of Object.entries(results)) {
    console.log(`- ${testName}: ${result.passed ? "PASSED" : "FAILED"}`);
    console.log(`  Detail: ${result.detail}`);
}

const allPassed = Object.values(results).every(r => r.passed);
if (allPassed) {
    console.log("\nAll tests completed successfully.");
    process.exit(0);
} else {
    console.log("\nSome tests failed. Check details above.");
    process.exit(1); // Exit with failure code so the caller knows
}
