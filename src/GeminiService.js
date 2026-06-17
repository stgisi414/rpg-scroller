// GeminiService.js - Handles communication with Google Generative AI

class GeminiService {
    constructor() {
        let key = localStorage.getItem("gemini_api_key");
        if (!key) {
            key = window.prompt("Please enter your Gemini API Key to enable AI features:");
            if (key) {
                localStorage.setItem("gemini_api_key", key);
            }
        }
        this.apiKey = key || "";
        this.ai = null;
        this.model = null;
        this.isReady = false;
    }

    async init() {
        if (!this.apiKey) {
            console.warn("GeminiService: No API key found. Operating in offline/fallback mode.");
            this.isReady = false;
            return;
        }
        try {
            // Dynamically import the ES module so we don't have to rewrite all our scripts to modules yet
            const { GoogleGenerativeAI } = await import('https://esm.run/@google/generative-ai');
            this.ai = new GoogleGenerativeAI(this.apiKey);
            
            // We use the JSON response mimeType to ensure structured data back to our game engine
            this.model = this.ai.getGenerativeModel({ 
                model: "gemini-3.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });
            this.isReady = true;
            console.log("GeminiService: Successfully connected to Gemini API.");
        } catch (e) {
            console.error("GeminiService: Failed to initialize AI SDK", e);
        }
    }

    async getEnemyTactic(battleState) {
        if (!this.isReady) {
            return { tactic: "IDLE", dialogue: "" };
        }

        const prompt = `You are an advanced Director AI controlling an enemy (${battleState.enemyType}) in an Action-RPG game.
You must choose the best tactical action based on the current battle state and roleplay as this enemy by providing a short taunt or piece of battle chatter.
The available actions are:
- "MELEE_ATTACK": Use a close-range melee attack.
- "RANGED_ATTACK": Fire a projectile or spell from a distance.
- "SUPER_ATTACK": Use a devastating combo spell or special move (Costs MP/SP).
- "BLOCK": Hold a defensive stance to mitigate incoming damage.
- "DASH_EVADE": Quickly dash backward or jump to dodge an incoming attack.
- "CHASE": Move aggressively towards the player to close distance.
- "FLEE": Run away from the player (best when low on HP).
- "HEAL": Drink a potion to restore health (if available).
- "IDLE": Stand still and do nothing.

Current Battle State:
- Enemy Type: ${battleState.enemyType}
- Distance to Player: ${Math.round(battleState.distance)} pixels (Close is < 100, Mid is 100-300, Far is > 300)
- Player Action: ${battleState.playerAction} (e.g., Attacking, Idle, Moving)
- Player HP: ${battleState.playerHp}/${battleState.playerMaxHp}
- Enemy HP: ${battleState.enemyHp}/${battleState.enemyMaxHp}
- Enemy MP/SP: ${battleState.enemyMp} / ${battleState.enemySp}

Return ONLY a valid JSON object in this exact format:
{ 
  "tactic": "RANGED_ATTACK",
  "dialogue": "You cannot escape my magic, fool!" 
}
(If no dialogue is appropriate, return an empty string for dialogue).`;

        try {
            const result = await Promise.race([
                this.model.generateContent(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
            ]);
            const text = result.response.text();
            return JSON.parse(text);
        } catch (e) {
            console.error("GeminiService: Failed to get tactic", e);
            return { tactic: "CHASE", dialogue: "" };
        }
    }

    async getGameMasterDecision(gameState) {
        if (!this.isReady) {
            return { action: "NONE", announcement: "" };
        }

        const prompt = `You are the cruel, omnipotent AI Game Master of a dark fantasy RPG.
You observe the player's progress and randomly intervene to make the game more interesting, chaotic, or difficult.

Player Status:
- Level: ${gameState.player.level}
- HP: ${gameState.player.hp}/${gameState.player.maxHp}
- Zone: ${gameState.zone.name} (Biome: ${gameState.zone.biome})
- Current Enemies Alive: ${gameState.activeEnemies}

Choose ONE intervention:
- "AMBUSH": Spawn 2-3 extra powerful enemies (like rivals or heavy knights).
- "WEATHER_RAIN": Start a heavy rainstorm (reduces visibility).
- "WEATHER_FOG": Blanket the area in thick fog.
- "HEAL": Fully restore the player's HP (rarely, if you feel pity).
- "GOLD_RUSH": Drop a massive pile of gold on the player.
- "NONE": Do nothing this time.

Return ONLY a valid JSON object:
{
  "action": "AMBUSH",
  "announcement": "The Game Master deems your journey too easy... face my assassins!"
}`;

        try {
            const result = await Promise.race([
                this.model.generateContent(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
            ]);
            const text = result.response.text();
            console.log("Game Master Decision:", text);
            return JSON.parse(text);
        } catch (e) {
            console.error("GeminiService: GM failed", e);
            return { action: "NONE", announcement: "" };
        }
    }

    async getNpcResponse(npcPersona, chatHistory, playerMessage, state) {
        if (!this.isReady) {
            return { response: "I cannot speak right now, my mind is disconnected.", alignmentShift: 0 };
        }

        let contextText = "";
        if (state) {
            contextText += `\n--- GAME CONTEXT (RAG DATA) ---\n`;
            if (state.zone) {
                contextText += `Current Location: ${state.zone.name} (Biome: ${state.zone.biome})\nZone Lore: ${state.zone.lore}\n`;
            } else {
                contextText += `Current Location: An unknown land\n`;
            }
            contextText += `\nPlayer Profile:\n`;
            contextText += `- Class: ${state.player.class}\n`;
            contextText += `- Level: ${state.player.level}\n`;
            contextText += `- Health: ${state.player.hp}\n`;
            contextText += `- Gold: ${state.player.gold}\n`;
            contextText += `- Karma/Alignment: ${state.player.alignment} (Negative is Evil, Positive is Good)\n`;
            contextText += `- Inventory: ${JSON.stringify(state.player.inventory)}\n`;
            contextText += `- Active Quests: ${state.player.quests && state.player.quests.length > 0 ? JSON.stringify(state.player.quests) : "None"}\n`;
            contextText += `-------------------------------\n`;
        }

        const prompt = `You are a roleplaying NPC in a dark fantasy video game.
Your Persona: ${npcPersona}

You must act perfectly in character. Do not break the fourth wall. 
CRITICAL RAG INSTRUCTION: Use the Game Context provided below to dynamically weave the player's class, location, inventory, or active quests into your dialogue where natural. If they are heavily wounded, comment on it. If they have lots of gold, act greedy or impressed. If they are an samurai, be wary.
${contextText}

Here is the conversation so far:
${chatHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n')}
Player: ${playerMessage}

Respond in character. Keep it brief (1-3 sentences).
If the player says something that aligns with your values, return a positive alignmentShift (1 to 10).
If they insult you or act evil, return a negative alignmentShift (-1 to -10).
Otherwise, alignmentShift is 0.

You can optionally offer the player a quest if they ask for work, or if it fits the conversation. 
If you offer a quest, include a "quest" object in the JSON. The only supported quest objective currently is to kill a certain number of a specific enemy type. 
Supported enemy targetTypes: "slime", "goblin", "bat", "mushroom", "orc".

If the player's message is extremely insulting, threatening, or completely pisses you off, you can choose to attack them. If you decide to attack, set "turnsHostile" to true in the JSON.
If the player's message is extremely kind, impressive, or they befriend you, you can choose to join their party and fight alongside them. If you decide to join them, set "joinsParty" to true in the JSON.
(Do not set both to true).

Return ONLY a valid JSON object in this format:
{
  "response": "Your dialogue here...",
  "alignmentShift": 0,
  "turnsHostile": false,
  "joinsParty": false,
  "quest": {
    "id": "purge_goblins",
    "title": "A Nuisance in the Wilds",
    "description": "Kill 3 goblins and return to me.",
    "targetType": "goblin",
    "targetCount": 3,
    "rewardGold": 50
  }
}
If you do NOT want to give a quest, simply omit the "quest" field.`;

        try {
            const result = await Promise.race([
                this.model.generateContent(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
            ]);
            const text = result.response.text();
            console.log("Gemini NPC Decision:", text);
            return JSON.parse(text);
        } catch (e) {
            console.error("GeminiService: Failed to get NPC response", e);
            return { response: "... *stares blankly*", alignmentShift: 0 };
        }
    }

    async generateZoneData(zoneIndex, playerLevel, forceTown, playerClassId, targetBiome) {
        const allHeroes = ['wizard', 'ranger', 'samurai', 'knight'];
        const availableHeroes = allHeroes.filter(c => c !== playerClassId);

        // Towns appear every 3-5 zones (or if forceTown)
        const absIdx = Math.abs(zoneIndex);
        const isTown = forceTown || (absIdx > 0 && absIdx % 4 === 0);

        if (!this.isReady) {
            // --- Rich fallback zone generation (no AI needed) ---
            const townNames = ['Willowbrook', 'Thornhaven', 'Ashenmere', 'Goldfall', 'Cinderveil', 'Moonreach', 'Starholm', 'Briarvale'];
            const wildNames = ['The Whispering Woods', 'Darkhollow Thicket', 'Stormbreak Ridge', 'The Blighted Glen', 'Mistfang Wilds', 'Hollow of Echoes', 'The Tangled Expanse', 'Gloomveil Forest'];
            const townNpcNames = ['Elara the Sage', 'Theron Ironhand', 'Lyra Nightbloom', 'Gareth the Keeper', 'Sylvia Brightwater', 'Orin Deepforge'];
            const townPersonas = [
                'A wise elder who has studied the arcane arts for decades. Offers counsel on magical threats.',
                'A burly blacksmith with a heart of gold. Happy to share tales of legendary weapons.',
                'A mysterious herbalist who knows every plant in the realm. Trades rare potions.',
                'The town\'s appointed guardian. Stoic and watchful, speaks of distant dangers.',
                'A cheerful innkeeper who hears every rumor. Always has a warm meal ready.',
                'A retired adventurer turned merchant. Sells supplies and shares hard-earned wisdom.'
            ];
            const heroNpcNames = ['Aldric the Blade', 'Seraphel', 'Old Wren', 'Kael Duskmantle', 'Voss the Wanderer', 'Fenris Ashwalker'];
            const heroPersonas = [
                'A battle-worn adventurer resting between quests. Speaks little but offers hard-earned wisdom.',
                'A wandering knight-errant seeking a worthy cause. Fiercely loyal once trust is earned.',
                'A scout who charts the wilds. Knows every trail and every danger that lurks within.',
                'An exile from a distant kingdom. Bitter but skilled — a dangerous ally.'
            ];

            if (isTown) {
                const ni = Math.floor(Math.random() * townNpcNames.length);
                return {
                    name: townNames[absIdx % townNames.length],
                    type: 'Safe',
                    biome: 'Plains',
                    enemies: [],
                    npcs: [{ name: townNpcNames[ni], persona: townPersonas[ni % townPersonas.length], x: 350 + Math.floor(Math.random() * 300), spriteKey: 'npc' }]
                };
            } else {
                // Wilderness
                const enemyCount = 1 + Math.floor(Math.random() * 3); // 1-3 enemies
                const enemies = [];
                for (let i = 0; i < enemyCount; i++) {
                    enemies.push({
                        type: 'slime',
                        x: 300 + Math.floor(Math.random() * 700),
                        hp: 80 + (playerLevel * 20) + Math.floor(Math.random() * 40),
                        speed: 80 + (playerLevel * 10) + Math.floor(Math.random() * 30)
                    });
                }
                // 25% chance of a hero NPC
                const wildNpcs = Math.random() < 0.25 ? [{
                    name: heroNpcNames[Math.floor(Math.random() * heroNpcNames.length)],
                    persona: heroPersonas[Math.floor(Math.random() * heroPersonas.length)],
                    x: 500 + Math.floor(Math.random() * 300),
                    spriteKey: availableHeroes[Math.floor(Math.random() * availableHeroes.length)]
                }] : [];
                return {
                    name: wildNames[absIdx % wildNames.length],
                    type: 'Dangerous',
                    biome: targetBiome,
                    enemies: enemies,
                    npcs: wildNpcs
                };
            }
        }

        const suggestedBiome = targetBiome;

        const biomeEnemies = {
            'Forest': ['slime', 'goblin', 'mushroom', 'spider', 'bat', 'bandit'],
            'Plains': ['slime', 'goblin', 'orc', 'bat', 'bandit'],
            'Cave': ['bat', 'spider', 'slime', 'goblin', 'skeleton'],
            'Desert': ['mummy', 'scarab_beetle', 'orc', 'spider', 'bat', 'bandit'],
            'Coastal': ['slime', 'bat', 'plague_flies', 'bandit'],
            'Winter': ['slime', 'orc', 'burning_skull_blue', 'frost_giant'],
            'Dungeon': ['slime', 'bat', 'spider', 'old_demon', 'male_damned', 'female_damned'],
            'Deadwoods': ['slime', 'bat', 'spider', 'tree_damned', 'twisted_damned', 'plague_flies'],
            'Hell': ['slime', 'bat', 'burning_damned', 'burning_skull', 'imp', 'cheeky_devil', 'the_devil']
        };
        const validEnemies = biomeEnemies[targetBiome] || ['slime'];

        const prompt = `You are a procedural generation engine for a 2D Action-RPG.
Generate data for Zone Index ${zoneIndex}. Note: Negative zoneIndex values indicate backtracking or moving to the left from the starting town (Zone 0); please treat them as valid progression areas. Use the absolute index ${Math.abs(zoneIndex)} for biome/difficulty calculations. Each zone MUST be unique.
The player is Level ${playerLevel}.

Rules:
1. "type" MUST be either "Safe" or "Dangerous".
${forceTown ? 
`2. CRITICAL: This zone MUST be a Town/Castle. "type" MUST be "Safe". Safe zones MUST have exactly 3 NPCs:
   - One with spriteKey "npc" (the Sage/Elder who offers lore and quests).
   - One with spriteKey "blacksmith" (a weapon merchant).
   - One with spriteKey "alchemist" (a potion and mystery chest merchant).
   Assign them unique fantasy names and personas based on their role.` 
:
`2. CRITICAL: This zone MUST be a wilderness area. "type" MUST be "Dangerous".
3. Wilderness zones MUST generate 1 to 4 enemies.
   - Enemy "type" MUST be strictly chosen from this exact array: ${JSON.stringify(validEnemies)}. You are allowed and encouraged to spawn multiple enemies of the SAME type!
   - Enemy HP and speed should scale with Player Level ${playerLevel}. Base Slime HP is 100. Base Speed is 100.
   - Spread enemy x positions out (don't cluster them together).
4. IMPORTANT: For wilderness zones, NPCs are RARE. Only include an NPC roughly 25% of the time.
   - If you do include a wilderness NPC, they must be a wandering hero: spriteKey must be one of ${JSON.stringify(availableHeroes)} (chosen randomly).
   - Wilderness NPCs should NEVER use spriteKey "npc".
   - If no NPC, return an empty npcs array [].`}
5. The biome for this zone MUST be "${suggestedBiome}". Do NOT use a different biome.
6. The x coordinate for entities must be between 200 and 3600.
7. CRITICAL: NPC names MUST be highly diverse. Do NOT overuse names like "Kaelen", "Elara", "Lyra", or "Kael". Invent entirely unique and distinct names each time (e.g. "Brom the Stout", "Vespera", "Gareth of the Ash").
8. NPC personas must be 1-2 sentences describing their personality and role in the world.
9. Town NPC personas should be merchants, sages, or village folk. Wilderness NPC personas should be adventurers, scouts, or exiles.
10. CRITICAL: The zone "name" MUST be unique and thematic to the biome. Examples:
   - Forest: "The Whispering Woods", "Darkhollow Thicket", "Gloomveil Forest", "Mistfang Wilds"
   - Plains: "Stormbreak Ridge", "The Windswept Heath", "Greenvale Crossing", "The Open March"
   - Cave: "The Gloomy Depths", "Echoless Caverns", "Stonefang Grotto", "The Underhollow"
   - Desert: "The Scorched Expanse", "Sunblight Wastes", "Dunefall Passage", "Ashen Barrens"
   - Winter: "The Frozen Reach", "Glacial Peaks", "Frostfall Tundra", "The Shivering Pines"
   - Coastal: "The Coral Sands", "Sunken Cove", "Whispering Shores", "Tidefall Beach"
   - Dungeon: "Hollow of Echoes", "The Shattered Crypt", "Deepstone Ruins", "The Sunken Vault"
   - Deadwoods: "The Ashen Grove", "Withered Thicket", "Blighted Woods", "The Silent Copse"
   - Hell: "The Obsidian Crags", "Brimstone Wastes", "The Demon's Maw", "Lake of Fire"
   - Town: "Willowbrook", "Thornhaven", "Ashenmere", "Goldfall", "Cinderveil"
   Do NOT reuse "Whispering Thicket" or any name you have used before.
11. Add a "lore" property. This should be 1-2 sentences of dark fantasy background lore about this specific zone.

Return ONLY a valid JSON object in this exact format:
{
  "name": "Zone Name Here",
  "lore": "A brief, atmospheric description of the zone's history or current dark state.",
  "type": "Dangerous",
  "biome": "${suggestedBiome}",
  "enemies": [
    { "type": "goblin", "x": 400, "hp": 150, "speed": 110 },
    { "type": "slime", "x": 600, "hp": 100, "speed": 90 }
  ],
  "npcs": [
    { "name": "NPC Name", "persona": "NPC Background/Personality", "x": 800, "spriteKey": "ranger" }
  ]
}`;

        try {
            const result = await Promise.race([
                this.model.generateContent(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 20000))
            ]);
            const text = result.response.text();
            console.log("Gemini Generated Zone:", text);
            return JSON.parse(text);
        } catch (e) {
            console.error("GeminiService: Failed to generate zone", e);
            // Use the rich fallback instead of a bare error stub
            const isTownFallback = forceTown || (Math.abs(zoneIndex) > 0 && Math.abs(zoneIndex) % 4 === 0);
            const wildNames = ['The Whispering Woods', 'Darkhollow Thicket', 'Stormbreak Ridge', 'The Blighted Glen', 'Mistfang Wilds', 'Hollow of Echoes', 'The Tangled Expanse', 'Gloomveil Forest'];
            const townNames = ['Willowbrook', 'Thornhaven', 'Ashenmere', 'Goldfall', 'Cinderveil', 'Moonreach', 'Starholm', 'Briarvale'];
            const aIdx = Math.abs(zoneIndex);
            
            const fallbackTownNpcs = [
                { name: "Elara the Sage", persona: "A wise elder who offers counsel on magical threats.", x: 300, spriteKey: "npc" },
                { name: "Brom the Hammer", persona: "A gruff blacksmith who forged his weapons in dragon fire.", x: 600, spriteKey: "blacksmith" },
                { name: "Vespera", persona: "An enigmatic alchemist selling curious concoctions.", x: 900, spriteKey: "alchemist" }
            ];

            return {
                name: isTownFallback ? townNames[aIdx % townNames.length] : wildNames[aIdx % wildNames.length],
                type: isTownFallback ? "Safe" : "Dangerous",
                biome: suggestedBiome,
                enemies: isTownFallback ? [] : [{ type: "slime", x: 600, hp: 80 + playerLevel * 20, speed: 80 + playerLevel * 10 }],
                npcs: isTownFallback ? fallbackTownNpcs : []
            };
        }
    }

    async getGameMasterResponse(player, promptText, zoneData) {
        if (!this.model) return { storyText: "Prepare to die!" }; // Fallback

        const playerLevel = window.saveData ? (window.saveData.level || 1) : 1;
        const className = player.classData ? player.classData.id : 'adventurer';
        const isSavior = window.saveData && window.saveData.isSavior ? 'Savior of the Realm' : 'Unknown wanderer';
        const zoneName = zoneData ? zoneData.name : 'Unknown lands';

        const prompt = `You are an AI Game Master in a dark fantasy 2D RPG.
Current Context:
- Player Level: ${playerLevel}
- Player Class: ${className}
- Player Status: ${isSavior}
- Current Zone: ${zoneName}

Task: ${promptText}

Output your response as JSON in this exact format:
{
  "storyText": "Your dialogue or narration here."
}
Keep it short, punchy, and atmospheric.`;

        try {
            const result = await Promise.race([
                this.model.generateContent(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
            ]);
            let text = result.response.text();
            // Clean up any markdown code blocks
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
        } catch (e) {
            console.error("GeminiService: Failed GM response", e);
            return { storyText: "Prepare to meet your doom!" };
        }
    }
}
