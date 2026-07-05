const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log("=== STARTING DYNAMIC DIALOGUE PARSER EMPIRICAL VERIFICATION ===");

const srcDir = path.join(__dirname, 'src');
const cutsceneControllerCode = fs.readFileSync(path.join(srcDir, 'scene_modules', 'CutsceneController.js'), 'utf8');

// Set up mock Phaser and DOM environment
const PhaserMock = {
    Input: { Keyboard: { KeyCodes: {} } },
    Math: { Distance: {}, Angle: {}, Clamp: {} }
};

const elementsMap = {};
function createMockElement(id) {
    return {
        id,
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        innerText: '',
        value: '',
        disabled: false,
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        focus: () => {},
        blur: () => {}
    };
}

const sandbox = {
    console,
    process,
    setTimeout,
    setInterval,
    clearInterval,
    localStorage: {
        getItem: (key) => sandbox.localStorage[key] || null,
        setItem: (key, val) => { sandbox.localStorage[key] = val; },
        removeItem: (key) => { delete sandbox.localStorage[key]; }
    },
    document: {
        getElementById: (id) => {
            if (elementsMap[id]) return elementsMap[id];
            elementsMap[id] = createMockElement(id);
            return elementsMap[id];
        },
        createElement: (tag) => createMockElement(tag)
    },
    window: {
        addEventListener: () => {},
        removeEventListener: () => {},
        localStorage: null
    },
    fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
    Phaser: PhaserMock
};
sandbox.window.localStorage = sandbox.localStorage;

vm.createContext(sandbox);
vm.runInContext(cutsceneControllerCode, sandbox, { filename: 'CutsceneController.js' });
const CutsceneController = vm.runInContext('CutsceneController', sandbox);

const mockScene = {
    physics: {
        pause: () => {},
        resume: () => {}
    },
    isCutscene: false
};

const cc = new CutsceneController(mockScene);

// ==========================================
// 1. VERIFY NON-REPETITION SELECTION ALGORITHM
// ==========================================
console.log("\n--- Verification 1: Non-Repetition Selection Algorithm ---");

function runNonRepetitionTest(numPatterns, iterations = 1000) {
    const category = `test_cat_${numPatterns}`;
    
    // Generate dummy patterns
    const patterns = [];
    for (let i = 0; i < numPatterns; i++) {
        patterns.push([{ speaker: `Speaker ${i}`, text: `Text ${i}` }]);
    }
    
    cc.dialoguePatterns[category] = patterns;
    
    let previousIndex = -1;
    for (let i = 0; i < iterations; i++) {
        cc.playCutscene(category, {}, () => {});
        const chosenIndex = cc.lastPlayedIndices[category];
        
        // Assertions
        assert(chosenIndex >= 0 && chosenIndex < numPatterns, `Selected index ${chosenIndex} out of bounds for size ${numPatterns}`);
        
        if (numPatterns > 1 && previousIndex !== -1) {
            assert.notStrictEqual(
                chosenIndex, 
                previousIndex, 
                `Consecutive selection repetition detected for size ${numPatterns}: selected index ${chosenIndex} twice in a row (iteration ${i})`
            );
        }
        
        previousIndex = chosenIndex;
    }
    console.log(`Passed: Verified non-repetition with ${numPatterns} patterns over ${iterations} iterations.`);
}

// Test with different sizes of multi-pattern categories
runNonRepetitionTest(2);
runNonRepetitionTest(3);
runNonRepetitionTest(5);
runNonRepetitionTest(10);
runNonRepetitionTest(100);

// Test interleaved category calls to verify category-specific persistence
console.log("Testing interleaved category calls...");
const catA = "interleaved_A";
const catB = "interleaved_B";
cc.dialoguePatterns[catA] = [
    [{ text: "A1" }],
    [{ text: "A2" }]
];
cc.dialoguePatterns[catB] = [
    [{ text: "B1" }],
    [{ text: "B2" }]
];

// Play A, then B, then A, then B. Verify non-repetition applies per-category
let lastA = -1;
let lastB = -1;
for (let i = 0; i < 50; i++) {
    cc.playCutscene(catA, {}, () => {});
    const idxA = cc.lastPlayedIndices[catA];
    if (lastA !== -1) {
        assert.notStrictEqual(idxA, lastA, `Interleaved Category A repeated: ${idxA}`);
    }
    lastA = idxA;

    cc.playCutscene(catB, {}, () => {});
    const idxB = cc.lastPlayedIndices[catB];
    if (lastB !== -1) {
        assert.notStrictEqual(idxB, lastB, `Interleaved Category B repeated: ${idxB}`);
    }
    lastB = idxB;
}
console.log("Passed: Interleaved category non-repetition is robust.");

// ==========================================
// 2. VERIFY PLACEHOLDER REPLACEMENT UNDER EXTREME CONDITIONS
// ==========================================
console.log("\n--- Verification 2: Placeholder Replacement Under Extreme Conditions ---");

const testCases = [
    {
        name: "Missing Keys (Empty Context)",
        str: "Hello {playerName}, welcome to {kingdomName}.",
        context: {},
        expected: "Hello {playerName}, welcome to {kingdomName}."
    },
    {
        name: "Missing Keys (Partial Context)",
        str: "Hello {playerName}, welcome to {kingdomName}.",
        context: { playerName: "Alice" },
        expected: "Hello Alice, welcome to {kingdomName}."
    },
    {
        name: "Falsy Value: Number 0",
        str: "Level: {level}",
        context: { level: 0 },
        expected: "Level: 0"
    },
    {
        name: "Falsy Value: Boolean false",
        str: "Is Active: {isActive}",
        context: { isActive: false },
        expected: "Is Active: false"
    },
    {
        name: "Falsy Value: null",
        str: "Standing: {standing}",
        context: { standing: null },
        expected: "Standing: null"
    },
    {
        name: "Falsy Value: Empty String",
        str: "Status: [{status}]",
        context: { status: "" },
        expected: "Status: []"
    },
    {
        name: "Undefined Value Treated as Missing Key",
        str: "Score: {score}",
        context: { score: undefined },
        expected: "Score: {score}"
    },
    {
        name: "Special Characters in Keys (Invalid Word Characters: Hyphen)",
        str: "Contact {support-email}",
        context: { "support-email": "support@game.com" },
        expected: "Contact {support-email}" // Hyphen is not \w, so not matched
    },
    {
        name: "Special Characters in Keys (Invalid Word Characters: Dot)",
        str: "Value is {user.name}",
        context: { "user.name": "Bob" },
        expected: "Value is {user.name}" // Dot is not \w, so not matched
    },
    {
        name: "Special Characters in Keys (Invalid Word Characters: Space)",
        str: "Value is {user name}",
        context: { "user name": "Bob" },
        expected: "Value is {user name}" // Space is not \w, so not matched
    },
    {
        name: "Special Characters in Keys (Valid Word Characters: Underscore)",
        str: "System status: {sys_status}",
        context: { sys_status: "OK" },
        expected: "System status: OK" // Underscore is \w, so matched
    },
    {
        name: "Special Characters in Keys (Valid Word Characters: Digits)",
        str: "Class: {class2}",
        context: { class2: "Mage" },
        expected: "Class: Mage" // Digits are \w, so matched
    },
    {
        name: "Special Characters in Context Values (Regex substitution patterns)",
        str: "Player {name} is here.",
        context: { name: "$$" },
        expected: "Player $$ is here." // Should be literal "$$"
    },
    {
        name: "Special Characters in Context Values (Regex group substitution)",
        str: "Player {name} is here.",
        context: { name: "$1" },
        expected: "Player $1 is here." // Should be literal "$1"
    },
    {
        name: "Special Characters in Context Values (Regex pre/post-match substitution)",
        str: "Player {name} is here.",
        context: { name: "$`" },
        expected: "Player $` is here." // Should be literal "$`"
    },
    {
        name: "Nested Brackets (Double Brackets)",
        str: "Welcome {{playerName}}!",
        context: { playerName: "John" },
        expected: "Welcome {John}!" // Inner {playerName} replaced, outer braces remain
    },
    {
        name: "Malformed Brackets: Unclosed",
        str: "Unclosed {bracket",
        context: { bracket: "value" },
        expected: "Unclosed {bracket"
    },
    {
        name: "Malformed Brackets: Unopened",
        str: "Unopened bracket}",
        context: { bracket: "value" },
        expected: "Unopened bracket}"
    },
    {
        name: "Nested Brackets (Complex)",
        str: "Test: {a{b}c}",
        context: { b: "X", aXc: "Y" },
        expected: "Test: {aXc}" // Single pass: first {b} -> X, leaving {aXc} which isn't evaluated
    }
];

let failed = false;
for (const tc of testCases) {
    const result = cc.substitutePlaceholders(tc.str, tc.context);
    try {
        assert.strictEqual(result, tc.expected);
        console.log(`Passed: [${tc.name}] -> "${result}"`);
    } catch (err) {
        failed = true;
        console.error(`FAILED: [${tc.name}]`);
        console.error(`  Input:    "${tc.str}"`);
        console.error(`  Expected: "${tc.expected}"`);
        console.error(`  Actual:   "${result}"`);
    }
}

if (failed) {
    console.error("\n=== EMPIRICAL VERIFICATION FAILED ===");
    process.exit(1);
} else {
    console.log("\n=== EMPIRICAL VERIFICATION COMPLETED SUCCESSFULLY ===");
    process.exit(0);
}
