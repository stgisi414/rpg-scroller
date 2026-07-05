# Handoff Report — Empirical Verification of the Dynamic Dialogue Parser

## 1. Observation

### A. Production Code Paths & Verbatim Implementation
In `src/scene_modules/CutsceneController.js`, the placeholder replacement helper is implemented as follows:
```javascript
28:     substitutePlaceholders(str, context) {
29:         if (typeof str !== 'string') return str;
30:         return str.replace(/\{(\w+)\}/g, (match, key) => {
31:             return context[key] !== undefined ? context[key] : match;
32:         });
33:     }
```

The category selection and non-repetition algorithm inside `playCutscene` is implemented as:
```javascript
95:             if (patterns && patterns.length > 0) {
96:                 let chosenIndex = 0;
97:                 if (patterns.length > 1) {
98:                     const lastIndex = this.lastPlayedIndices[category];
99:                     const availableIndices = [];
100:                     for (let i = 0; i < patterns.length; i++) {
101:                         if (i !== lastIndex) {
102:                             availableIndices.push(i);
103:                         }
104:                     }
105:                     if (availableIndices.length > 0) {
106:                         chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
107:                     } else {
108:                         chosenIndex = Math.floor(Math.random() * patterns.length);
109:                     }
110:                 } else {
111:                     chosenIndex = 0;
112:                 }
113:                 this.lastPlayedIndices[category] = chosenIndex;
```

### B. Unit Test Coverage in `test_logic_constraints.js`
In the root directory, `test_logic_constraints.js` contains a dedicated test (`TEST 7: CutsceneController dialogue patterns & placeholders`) spanning lines 860 to 939. This test:
1. Mocks a Phased-based scene configuration.
2. Injects a hardcoded dialogue pattern dictionary.
3. Tests happy path placeholder replacement (`Guard of {kingdomName}` -> `Guard of Elden Soul`).
4. Invokes `playCutscene` consecutively for category `town_entrance` (length 2) and asserts:
   `assert(index1 !== index2, "Non-repetition logic failed to select a different pattern index");`
5. Tests backwards compatibility using raw lines.

### C. Custom Empirical Test Execution
We created and executed `test_dialogue_parser_verification.js` in the root directory to test edge-cases and extreme placeholder/non-repetition configurations. Both `test_logic_constraints.js` and `test_dialogue_parser_verification.js` completed with exit code `0` (success). 
Verbatim output from running `node test_dialogue_parser_verification.js`:
```
=== STARTING DYNAMIC DIALOGUE PARSER EMPIRICAL VERIFICATION ===

--- Verification 1: Non-Repetition Selection Algorithm ---
Passed: Verified non-repetition with 2 patterns over 1000 iterations.
Passed: Verified non-repetition with 3 patterns over 1000 iterations.
Passed: Verified non-repetition with 5 patterns over 1000 iterations.
Passed: Verified non-repetition with 10 patterns over 1000 iterations.
Passed: Verified non-repetition with 100 patterns over 1000 iterations.
Testing interleaved category calls...
Passed: Interleaved category non-repetition is robust.

--- Verification 2: Placeholder Replacement Under Extreme Conditions ---
Passed: [Missing Keys (Empty Context)] -> "Hello {playerName}, welcome to {kingdomName}."
Passed: [Missing Keys (Partial Context)] -> "Hello Alice, welcome to {kingdomName}."
Passed: [Falsy Value: Number 0] -> "Level: 0"
Passed: [Falsy Value: Boolean false] -> "Is Active: false"
Passed: [Falsy Value: null] -> "Standing: null"
Passed: [Falsy Value: Empty String] -> "Status: []"
Passed: [Undefined Value Treated as Missing Key] -> "Score: {score}"
Passed: [Special Characters in Keys (Invalid Word Characters: Hyphen)] -> "Contact {support-email}"
Passed: [Special Characters in Keys (Invalid Word Characters: Dot)] -> "Value is {user.name}"
Passed: [Special Characters in Keys (Invalid Word Characters: Space)] -> "Value is {user name}"
Passed: [Special Characters in Keys (Valid Word Characters: Underscore)] -> "System status: OK"
Passed: [Special Characters in Keys (Valid Word Characters: Digits)] -> "Class: Mage"
Passed: [Special Characters in Context Values (Regex substitution patterns)] -> "Player $$ is here."
Passed: [Special Characters in Context Values (Regex group substitution)] -> "Player $1 is here."
Passed: [Special Characters in Context Values (Regex pre/post-match substitution)] -> "Player $` is here."
Passed: [Nested Brackets (Double Brackets)] -> "Welcome {John}!"
Passed: [Malformed Brackets: Unclosed] -> "Unclosed {bracket"
Passed: [Malformed Brackets: Unopened] -> "Unopened bracket}"
Passed: [Nested Brackets (Complex)] -> "Test: {aXc}"

=== EMPIRICAL VERIFICATION COMPLETED SUCCESSFULLY ===
```

---

## 2. Logic Chain

### A. Non-Repetition Algorithm Proof
Let a category $C$ have a set of patterns $P = \{p_0, p_1, \dots, p_{n-1}\}$ with $n = |P|$.
- **Case $n = 1$:** The algorithm sets `chosenIndex = 0` (Line 111). Repetition is trivial as only one pattern exists.
- **Case $n > 1$:**
  1. The code retrieves `lastIndex` from `this.lastPlayedIndices[C]` (Line 98).
  2. It iterates through all index values $i \in [0, n-1]$. If $i \neq \text{lastIndex}$, it pushes $i$ to `availableIndices` (Lines 100-104).
  3. Consequently, the size of `availableIndices` is exactly $n - 1 \ge 1$.
  4. The code randomly selects an index from `availableIndices` using `Math.floor(Math.random() * availableIndices.length)` (Line 106).
  5. Since `lastIndex` was strictly excluded from `availableIndices`, the newly selected index is mathematically guaranteed to differ from `lastIndex`.
  6. The newly selected index is stored back in `this.lastPlayedIndices[C] = chosenIndex` (Line 113).
  7. Since `this.lastPlayedIndices` is an object keyed by `category`, each category tracks its last-played index independently. Interleaved calls to other categories do not pollute or reset the state of category $C$.
  8. Consecutive invocations of `playCutscene` for the same category will always result in distinct indices, validating that the non-repetition selection is robust.

### B. Placeholder Replacement Edge-Case Traces
The replacement logic relies on: `str.replace(/\{(\w+)\}/g, (match, key) => { ... })`
- **Missing Keys:**
  If `key` is matched but not present in `context`, `context[key]` evaluates to `undefined`. Line 31 specifies:
  `context[key] !== undefined ? context[key] : match`
  Since `context[key] === undefined`, it returns `match` (the original matched string `{key}`). Thus, missing keys are safely ignored and remain as placeholders.
- **Falsy Values:**
  If `context[key]` is `0`, `false`, `null`, or `""`, the check `context[key] !== undefined` remains `true` (since none of these values are `undefined`). Therefore, the function returns the value itself, which JavaScript coerces to a string. This confirms falsy values are successfully formatted into the dialogue text.
- **Special Characters in Keys:**
  The regex `/\{(\w+)\}/g` uses `\w+` to match characters between `{` and `}`. `\w` is shorthand for `[A-Za-z0-9_]`.
  - Keys containing hyphens (`-`), dots (`.`), spaces (` `), or exclamation points (`!`) contain non-word characters. The regex does not match them. Consequently, placeholders like `{support-email}` or `{user.name}` are bypassed entirely by `replace` and remain unchanged.
  - Keys containing underscores (`_`) and digits (`0-9`) are fully matched by `\w` and successfully replaced.
- **Special Characters in Values:**
  In JavaScript, when replacing via a string pattern, symbols like `$$`, `$&`, or `$1` trigger special matching rules. However, `substitutePlaceholders` uses a **callback function** as the second argument to `.replace()`. Under the ECMAScript specification, string values returned by a callback function are inserted literally and do not undergo regex pattern substitution. Thus, context values like `$$` or `$1` are inserted cleanly.
- **Nested Brackets:**
  - For `{{key}}`, the regex matches the inner `{key}` because `key` contains only word characters. It replaces `{key}` with the value, leaving the outer brackets. E.g., `{{playerName}}` with context `John` becomes `{John}`.
  - For `{a{b}c}`, the regex matches `{b}` (since `b` is `\w+`), replacing it with `X`. The outer section `{a...` does not match the regex because `{` is not a word character. This leaves the final string as `{aXc}`. Since `.replace()` is a single-pass scanner, the newly formed `{aXc}` is not parsed further, preventing infinite loops or nested evaluations.

---

## 3. Caveats

- **Key Formatting Limitations:** Dialogue pattern designers must be aware that keys containing hyphens (e.g., `{first-name}`), dots (e.g., `{player.level}`), or spaces (e.g., `{kingdom name}`) will **not** be replaced due to the `/\{(\w+)\}/g` regex constraint. All keys must strictly use letters, numbers, or underscores.
- **Single-Pass Evaluation:** Nested bracket expressions are not recursively resolved. An input of `{a{b}c}` where `b: 'X'` and `aXc: 'Y'` results in `{aXc}`, not `Y`.
- **Fetch Dependencies:** The unit tests in `test_logic_constraints.js` mock `fetch` and define `dialoguePatterns` manually. If patterns JSON files fail to load at runtime in the browser (e.g., network timeout or invalid JSON syntax), `dialoguePatterns` remains empty.

---

## 4. Conclusion

The dynamic dialogue parser is highly robust and conforms to all requirements:
1. The non-repetition selection algorithm is mathematically sound and guarantees that consecutive calls to a multi-pattern category will never select the same index. This holds both for consecutive runs of the same category and interleaved category execution.
2. The placeholder replacement system is robust against missing keys, correctly handles falsy values (like `0`, `false`, `null`, `""`), prevents regex injection bugs when values contain special characters (like `$` or `$1`), and degrades gracefully with nested/malformed brackets.
3. The unit tests in `test_logic_constraints.js` (Test 7) successfully cover the happy paths of non-repetition and substitution, confirming backwards compatibility.

---

## 5. Verification Method

To verify these results independently:
1. Run the project's logic constraints test suite to confirm the basic happy paths execute cleanly:
   ```powershell
   node test_logic_constraints.js
   ```
2. Run our custom extreme-conditions test suite to verify boundary behavior, falsy values, special characters, and non-repetition iterations:
   ```powershell
   node test_dialogue_parser_verification.js
   ```
3. Inspect `src/scene_modules/CutsceneController.js` to review the verbatim code blocks quoted in this report.
