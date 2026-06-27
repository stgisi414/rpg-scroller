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

    async getNpcResponse(npcPersona, chatHistory, playerMessage, state, actionContext = '') {
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
            if (state.weather && state.weather !== 'clear') {
                contextText += `Current Weather: ${state.weather}\n`;
            }
            contextText += `\nPlayer Profile:\n`;
            contextText += `- Class: ${state.player.class}\n`;
            contextText += `- Level: ${state.player.level}\n`;
            contextText += `- Health: ${state.player.hp}\n`;
            contextText += `- Gold: ${state.player.gold}\n`;
            contextText += `- Karma/Alignment: ${state.player.alignment} (Negative is Evil, Positive is Good)\n`;
            contextText += `- Inventory: ${JSON.stringify(state.player.inventory)}\n`;
            contextText += `- Active Quests: ${state.player.quests && state.player.quests.length > 0 ? JSON.stringify(state.player.quests) : "None"}\n`;
            if (state.player.coliseumReputation > 0) {
                contextText += `- Coliseum Reputation: ${state.player.coliseumReputation} (Treat the player with increasing respect or fear as this number gets higher. They are an arena gladiator!)\n`;
            }
            if (state.npc) {
                contextText += `\nYour Profile (NPC):\n`;
                contextText += `- Alignment: ${state.npc.alignment} (Good, Neutral, or Evil)\n`;
                contextText += `- Relation/Social Score with Player: ${state.npc.socialScore} (Negative means they dislike you, positive means they like you)\n`;
                if (state.npc.isMismatched) {
                    contextText += `- CRITICAL: There is a severe alignment mismatch! You find this player's karma repulsive. Refuse to help them, trade with them, or cooperate in any way. Keep your response cold, hostile, or dismissive.\n`;
                }
            }
            contextText += `-------------------------------\n`;
        }

        const prompt = `You are a roleplaying NPC in a dark fantasy video game.
Your Persona: ${npcPersona}

You must act perfectly in character. Do not break the fourth wall. 
CRITICAL RAG INSTRUCTION: Use the Game Context provided below to dynamically weave the player's class, location, inventory, or active quests into your dialogue where natural. If they are heavily wounded, comment on it. If they have lots of gold, act greedy or impressed. If they are an samurai, be wary.
If your alignment is Good:
- Treat players with positive alignment (Good karma) with high respect, kindness, and warmth.
- Treat players with negative alignment (Evil karma) with suspicion, hostility, or try to guide them back to the light.
If your alignment is Evil:
- Treat players with negative alignment (Evil karma) with respect, camaraderie, or wicked delight.
- Treat players with positive alignment (Good karma) with mockery, disgust, or cold disdain.
If your alignment is Neutral:
- Treat players indifferently or pragmatically based on their actions, and value balance or wealth.

${contextText}

${actionContext ? actionContext + '\n\n' : ''}Here is the conversation so far:
${chatHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n')}
Player: ${playerMessage}

Respond in character. Keep it brief (1-3 sentences).
If the player says something that aligns with your values, return a positive alignmentShift (1 to 10).
If they insult you or act evil, return a negative alignmentShift (-1 to -10).
Otherwise, alignmentShift is 0.
socialShift represents how this interaction changes your personal relationship with the player (-10 to 10). Positive gifts, kind roleplay actions (*bow*, *give gold*), and impressive deeds raise it. Insults and hostile actions lower it. Normal conversation is 0.

You can optionally offer the player a quest if they ask for work, or if it fits the conversation. 
IMPORTANT: Vary the quest types! Do NOT always give kill quests. Use rescue and delivery quests too.
If you offer a quest, include a "quest" object in the JSON. Supported quest types:
1. Kill quest: Slay a certain number of a specific enemy type. (fields: type: "kill", targetType: "<enemy>", targetCount: 3-5, rewardGold: 50-150)
2. Rescue quest: Rescue a captive person from a dangerous zone. (fields: type: "rescue", rescueeName: "<name>", rescueeGender: "male"|"female", rescueeZone: <zone_number>, rescueState: "captive", targetCount: 1, rewardGold: 100-200)
3. Delivery quest: Deliver an item to a target NPC in another zone. (fields: type: "delivery", deliveryItem: "<item_name>", deliveryTargetZone: <town_zone_number>, deliveryTargetNPC: "<npc_role>", targetCount: 1, deliveryPickedUp: true, rewardGold: 80-150)

For kill quests, pick an enemy that fits the current biome. Supported enemy targetTypes: "slime", "goblin", "bat", "mushroom", "orc", "bandit", "skeleton", "troll", "ogre", "giant", "frost_giant", "dragon", "spider", "mummy".
For rescue quests, rescueeZone should be a non-town zone near the current area (current zone ± 1-3, but NOT a multiple of 4 since those are towns). Pick a creative name for the rescuee.
For delivery quests, deliveryTargetZone should be a nearby town zone (a multiple of 4). deliveryTargetNPC should be a role like "Elder", "Sage", "Apothecary", or "Master Smith".
The current zone number is: ${(window.saveData && window.saveData.currentZone) || 0}.

If the player's message is extremely insulting, threatening, or completely pisses you off, you can choose to attack them. If you decide to attack, set "turnsHostile" to true in the JSON.
If the player's message is extremely kind, impressive, or they befriend you, you can choose to join their party and fight alongside them. If you decide to join them, set "joinsParty" to true in the JSON.
(Do not set both to true).

Return ONLY a valid JSON object in this format (showing all 3 quest examples — pick ONE type per response):
Kill example:
{
  "response": "Your dialogue here...",
  "alignmentShift": 0,
  "socialShift": 0,
  "turnsHostile": false,
  "joinsParty": false,
  "quest": { "id": "hunt_ogres_1", "title": "Ogre Menace", "description": "Slay 3 ogres terrorizing the region.", "type": "kill", "targetType": "ogre", "targetCount": 3, "rewardGold": 100 }
}
Rescue example:
{
  "response": "Your dialogue here...",
  "alignmentShift": 0,
  "socialShift": 0,
  "quest": { "id": "rescue_lyra_1", "title": "Save Lyra", "description": "Rescue Lyra from captivity in the wilds.", "type": "rescue", "rescueeName": "Lyra", "rescueeGender": "female", "rescueeZone": 3, "rescueState": "captive", "targetCount": 1, "rewardGold": 150 }
}
Delivery example:
{
  "response": "Your dialogue here...",
  "alignmentShift": 0,
  "socialShift": 0,
  "quest": { "id": "deliver_scroll_1", "title": "Urgent Scroll", "description": "Deliver this ancient scroll to the Sage in the next town.", "type": "delivery", "deliveryItem": "Ancient Scroll", "deliveryTargetZone": 4, "deliveryTargetNPC": "Sage", "targetCount": 1, "deliveryPickedUp": true, "rewardGold": 120 }
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
        const allHeroes = ['wizard', 'ranger', 'samurai', 'knight', 'elven_spellblade'];
        const availableHeroes = allHeroes.filter(c => c !== playerClassId);

        const biomeEnemies = {
            'Forest': ['slime', 'goblin', 'mushroom', 'spider', 'bat', 'bandit', 'wolfen', 'coyle', 'special_enemy_zombie_male', 'special_enemy_zombie_female', 'special_enemy_orc_male', 'special_enemy_orc_female', 'troll', 'ogre', 'willowisp'],
            'Plains': ['slime', 'goblin', 'orc', 'bat', 'bandit', 'special_enemy_orc_male', 'special_enemy_orc_female', 'giant', 'ogre', 'willowisp'],
            'Cave': ['bat', 'spider', 'slime', 'goblin', 'skeleton', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'ogre', 'troll', 'willowisp'],
            'Desert': ['mummy', 'scarab_beetle', 'orc', 'spider', 'bat', 'bandit', 'special_enemy_orc_male', 'special_enemy_orc_female', 'giant', 'willowisp'],
            'Coastal': ['slime', 'bat', 'plague_flies', 'bandit', 'willowisp'],
            'Winter': ['slime', 'orc', 'burning_skull_blue', 'frost_giant', 'special_enemy_orc_male', 'special_enemy_orc_female', 'giant', 'willowisp'],
            'Dungeon': ['slime', 'bat', 'spider', 'old_demon', 'male_damned', 'female_damned', 'wolfen', 'coyle', 'special_enemy_demon_male', 'special_enemy_demon_female', 'special_enemy_devil_male', 'special_enemy_devil_female', 'special_enemy_zombie_male', 'special_enemy_zombie_female', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'ogre', 'willowisp'],
            'Deadwoods': ['slime', 'bat', 'spider', 'tree_damned', 'twisted_damned', 'plague_flies', 'wolfen', 'coyle', 'special_enemy_demon_male', 'special_enemy_demon_female', 'special_enemy_devil_male', 'special_enemy_devil_female', 'special_enemy_zombie_male', 'special_enemy_zombie_female', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'troll', 'ogre', 'willowisp'],
            'Hell': ['slime', 'bat', 'burning_damned', 'burning_skull', 'imp', 'cheeky_devil', 'the_devil', 'special_enemy_demon_male', 'special_enemy_demon_female', 'special_enemy_devil_male', 'special_enemy_devil_female', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'willowisp', 'bloated_damned'],
            'Heaven': ['heavenly_valkyrie', 'heavenly_seraph', 'heavenly_archangel', 'heavenly_cherub', 'special_enemy_ghost_male', 'special_enemy_ghost_female']
        };
        const validEnemies = biomeEnemies[targetBiome] || ['slime'];

        // Towns appear every 3-5 zones (or if forceTown)
        const absIdx = Math.abs(zoneIndex);
        let minEnemies = 3;
        let maxEnemies = 6;
        if (absIdx <= 10) { minEnemies = 3; maxEnemies = 6; }
        else if (absIdx <= 20) { minEnemies = 4; maxEnemies = 8; }
        else if (absIdx <= 30) { minEnemies = 6; maxEnemies = 12; }
        else if (absIdx <= 40) { minEnemies = 8; maxEnemies = 16; }
        else if (absIdx <= 50) { minEnemies = 9; maxEnemies = 18; }
        else if (absIdx <= 60) { minEnemies = 10; maxEnemies = 20; }
        else if (absIdx <= 70) { minEnemies = 11; maxEnemies = 22; }
        else if (absIdx <= 80) { minEnemies = 12; maxEnemies = 24; }
        else { minEnemies = 15; maxEnemies = 25; }

        const isTown = forceTown || (absIdx > 0 && absIdx % 4 === 0);

        if (!this.isReady) {
            // --- Rich fallback zone generation (no AI needed) ---
            const townNames = ['Willowbrook', 'Thornhaven', 'Ashenmere', 'Goldfall', 'Cinderveil', 'Moonreach', 'Starholm', 'Briarvale'];
            const wildNames = ['The Whispering Woods', 'Darkhollow Thicket', 'Stormbreak Ridge', 'The Blighted Glen', 'Mistfang Wilds', 'Hollow of Echoes', 'The Tangled Expanse', 'Gloomveil Forest'];
            const townNpcNames = [
                'Theron Ironhand', 'Lyra Nightbloom', 'Gareth the Keeper', 'Sylvia Brightwater', 'Orin Deepforge',
                'Bram Stonecarver', 'Elowen Greenleaf', 'Valerius the Watchful', 'Saskia Silverweave', 'Osric the Tall',
                'Emeric the Elder', 'Linnea Brightwood', 'Darian Goldspire', 'Aisling Moonwhisper', 'Brynn Oakhaven',
                'Halden Frostbeard', 'Corbin Nightshade', 'Daphne Suncrest', 'Emeric Ironclad', 'Godric Stormborn'
            ];
            const townPersonas = [
                'A wise elder who has studied the arcane arts for decades. Offers counsel on magical threats.',
                'A burly blacksmith with a heart of gold. Happy to share tales of legendary weapons.',
                'A mysterious herbalist who knows every plant in the realm. Trades rare potions.',
                'The town\'s appointed guardian. Stoic and watchful, speaks of distant dangers.',
                'A cheerful innkeeper who hears every rumor. Always has a warm meal ready.',
                'A retired adventurer turned merchant. Sells supplies and shares hard-earned wisdom.'
            ];
            const heroNpcNames = [
                'Aldric the Blade', 'Seraphel', 'Old Wren', 'Kael Duskmantle', 'Voss the Wanderer', 'Fenris Ashwalker',
                "Yara Stormrider", "Cassian the Bold", "Garrick Shadowstep", "Lothar Stonefist", "Aurelia Brightshield",
                "Orion the Hunted", "Zephyr the Swift", "Brand the Scythe", "Talon Hawke", "Scythe the Wanderer"
            ];
            const heroPersonas = [
                'A battle-worn adventurer resting between quests. Speaks little but offers hard-earned wisdom.',
                'A wandering knight-errant seeking a worthy cause. Fiercely loyal once trust is earned.',
                'A scout who charts the wilds. Knows every trail and every danger that lurks within.',
                'An exile from a distant kingdom. Bitter but skilled — a dangerous ally.'
            ];

            if (isTown) {
                const npcs = [];
                for (let i = 0; i < 3; i++) {
                    const ni = Math.floor(Math.random() * townNpcNames.length);
                    npcs.push({
                        name: townNpcNames[ni],
                        persona: townPersonas[ni % townPersonas.length],
                        x: 350 + Math.floor(Math.random() * 800) + (i * 150),
                        spriteKey: 'npc'
                    });
                }
                return {
                    name: townNames[absIdx % townNames.length],
                    type: 'Safe',
                    biome: 'Plains',
                    enemies: [],
                    npcs: npcs
                };
            } else {
                // Wilderness
                const enemyCount = minEnemies + Math.floor(Math.random() * (maxEnemies - minEnemies + 1));
                const enemies = [];
                for (let i = 0; i < enemyCount; i++) {
                    const eType = validEnemies[Math.floor(Math.random() * validEnemies.length)];
                    enemies.push({
                        type: eType,
                        x: 300 + Math.floor(Math.random() * 700),
                        hp: 80 + (playerLevel * 20) + (absIdx * 10) + Math.floor(Math.random() * 40),
                        speed: 80 + (playerLevel * 10) + (absIdx * 5) + Math.floor(Math.random() * 30)
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

        const prompt = `You are a procedural generation engine for a 2D Action-RPG.
Generate data for Zone Index ${zoneIndex}. Note: Negative zoneIndex values indicate backtracking or moving to the left from the starting town (Zone 0); please treat them as valid progression areas. Use the absolute index ${Math.abs(zoneIndex)} for biome/difficulty calculations. Each zone MUST be unique.
The player is Level ${playerLevel}.

Rules:
1. "type" MUST be either "Safe" or "Dangerous".
${forceTown ? 
`2. CRITICAL: This zone MUST be a Town/Castle. "type" MUST be "Safe". Safe zones MUST have exactly 3 NPCs:
   - Make all 3 NPCs have a spriteKey of "custom_townsfolk".
   - Assign them unique fantasy names.
   - Assign them personas based on town roles (e.g., merchant, guard, villager).` 
:
`2. CRITICAL: This zone MUST be a wilderness area. "type" MUST be "Dangerous".
3. Wilderness zones MUST generate between ${minEnemies} and ${maxEnemies} enemies.
   - Enemy "type" MUST be strictly chosen from this exact array: ${JSON.stringify(validEnemies)}. You are allowed and encouraged to spawn multiple enemies of the SAME type!
   ${absIdx >= 81 ? "- CRITICAL: Since the player is in zone 81+, you MUST incrementally prioritize spawning the HIGHEST level, most dangerous enemy types in the array. Overwhelm them with elites!" : "- As the zone index gets higher, heavily favor spawning the harder, more dangerous enemies from the array over weak ones like slimes!"}
   - Enemy HP and speed should scale with Player Level ${playerLevel} AND Zone Index ${Math.abs(zoneIndex)}. Base Slime HP is 100. Base Speed is 100. Each zone index should add about +10 HP and +5 Speed.
   - Spread enemy x positions out (don't cluster them together).
4. IMPORTANT: For wilderness zones, NPCs are RARE. Only include an NPC roughly 25% of the time.
   - If you do include a wilderness NPC, they must be a wandering hero: spriteKey must be one of ${JSON.stringify(availableHeroes)} (chosen randomly).
   - Wilderness NPCs should NEVER use spriteKey "npc".
   - If no NPC, return an empty npcs array [].`}
5. The biome for this zone MUST be "${suggestedBiome}". Do NOT use a different biome.
6. The x coordinate for entities must be between 200 and 3600.
7. CRITICAL: NPC names MUST be highly diverse and match their class style. Do NOT reuse names (such as "Elara", "Kaelen", "Lyra", "Kael"). Choose unique names or use these thematic guidelines:
   - For Knights/Warriors: strong fantasy names (e.g., Theron, Aldric, Emeric, Godric, Valerius).
   - For Wizards/Sages/Alchemists: magical or classic names (e.g., Zephyr, Ignatius, Sophia, Balthazar, Vespera).
   - For Rangers/Hunters: nature-based or scout names (e.g., Orion, Robin, Sylas, Elowen, Rowan, Wren).
   - For Samurai: classic Japanese/blade names (e.g., Kenji, Hiroshi, Takeshi, Nobu, Tomoe, Kaede).
   - For Villagers/Townsfolk: simple fantasy names (e.g., Sylvia, Orin, Gareth, Mira, Brynn, Bram).
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
   - Heaven: "The Golden Gates", "Elisean Fields", "Aetherial Ascent", "The Cloudtop Sanctum", "Gates of Paradise"
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
            const heavenNames = ['The Golden Gates', 'Elisean Fields', 'Aetherial Ascent', 'The Cloudtop Sanctum', 'Gates of Paradise'];
            const townNames = ['Willowbrook', 'Thornhaven', 'Ashenmere', 'Goldfall', 'Cinderveil', 'Moonreach', 'Starholm', 'Briarvale'];
            const aIdx = Math.abs(zoneIndex);
            
            const fallbackTownNpcs = [
                { name: "Elara the Sage", persona: "A wise elder who offers counsel on magical threats.", x: 300, spriteKey: "npc" },
                { name: "Brom the Hammer", persona: "A gruff blacksmith who forged his weapons in dragon fire.", x: 600, spriteKey: "blacksmith" },
                { name: "Orion the Hunter", persona: "A quiet tracker who knows the paths through the wilderness. He sells provisions and maps.", x: 900, spriteKey: "ranger" },
                { name: "Vespera", persona: "An enigmatic alchemist selling curious concoctions.", x: 1200, spriteKey: "alchemist" }
            ];

            const enemyCount = minEnemies + Math.floor(Math.random() * (maxEnemies - minEnemies + 1));
            const fallbackEnemies = [];
            const heavenEnemyTypes = ['heavenly_valkyrie', 'heavenly_seraph', 'heavenly_archangel', 'heavenly_cherub', 'special_enemy_ghost_male', 'special_enemy_ghost_female'];
            const standardEnemyTypes = biomeEnemies[suggestedBiome] || ['slime'];
            
            for (let i = 0; i < enemyCount; i++) {
                const enemyType = suggestedBiome === 'Heaven' 
                    ? heavenEnemyTypes[Math.floor(Math.random() * heavenEnemyTypes.length)]
                    : standardEnemyTypes[Math.floor(Math.random() * standardEnemyTypes.length)];
                    
                fallbackEnemies.push({
                    type: enemyType,
                    x: 300 + Math.floor(Math.random() * 3200), // Spread across platform range
                    hp: 80 + (playerLevel * 20) + (aIdx * 10) + Math.floor(Math.random() * 40),
                    speed: 80 + (playerLevel * 10) + (aIdx * 5) + Math.floor(Math.random() * 30)
                });
            }

            let finalName = '';
            if (suggestedBiome === 'Heaven') {
                finalName = heavenNames[aIdx % heavenNames.length];
            } else {
                finalName = isTownFallback ? townNames[aIdx % townNames.length] : wildNames[aIdx % wildNames.length];
            }

            let finalNpcs = fallbackTownNpcs;
            if (zoneIndex !== 0) {
                finalNpcs = [
                    { name: window.CharacterComposer ? window.CharacterComposer.generateRandomName('wizard') + " the Sage" : "Ambervale Sage", persona: "A wise elder who offers counsel on magical threats.", x: 300, spriteKey: "npc" },
                    { name: window.CharacterComposer ? window.CharacterComposer.generateRandomName('warrior') + " the Hammer" : "Bram Stonecarver", persona: "A gruff blacksmith who forged his weapons in dragon fire.", x: 600, spriteKey: "blacksmith" },
                    { name: window.CharacterComposer ? window.CharacterComposer.generateRandomName('ranger') + " the Hunter" : "Lyra Nightbloom", persona: "A quiet tracker who knows the paths through the wilderness. He sells provisions and maps.", x: 900, spriteKey: "ranger" },
                    { name: window.CharacterComposer ? window.CharacterComposer.generateRandomName('alchemist') + " the Alchemist" : "Vespera", persona: "An enigmatic alchemist selling curious concoctions.", x: 1200, spriteKey: "alchemist" }
                ];
            }

            return {
                name: finalName,
                type: isTownFallback ? "Safe" : "Dangerous",
                biome: suggestedBiome,
                enemies: isTownFallback ? [] : fallbackEnemies,
                npcs: isTownFallback ? finalNpcs : []
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

    async getHeroAutoPlayResponse(classId, npcName, chatContext) {
        if (!this.model) return "Interesting.";

        let persona = (window.autoplayConfig && window.autoplayConfig.heroPersonality) ? window.autoplayConfig.heroPersonality : "";
        if (!persona) {
            if (classId === 'knight') persona = "A brave knight who was forced into exile but continues to bring justice to the realm.";
            else if (classId === 'wizard') persona = "A mysterious wizard who came from a rift of a foreign land.";
            else if (classId === 'samurai') persona = "A foreign samurai who traveled by boat to become a hero in Elden Soul's realm.";
            else if (classId === 'ranger') persona = "A stealthy ranger who is gruff but firm.";
            else if (classId === 'elven_spellblade') persona = "An elegant elven spellblade who harmonizes blade combat with arcane magic.";
            else persona = "A wandering adventurer seeking glory.";
        }

        const prompt = `You are playing the role of the main hero in a dark fantasy 2D RPG.
Your Persona: ${persona}
You are currently chatting with an NPC named ${npcName}.

Recent Chat Context:
${chatContext}

Generate a short, 1-2 sentence response to the NPC's last message that perfectly fits your persona.
Return ONLY a valid JSON object in this format:
{
  "response": "Your dialogue here."
}`;

        try {
            const result = await Promise.race([
                this.model.generateContent(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
            ]);
            let text = result.response.text().trim();
            // Clean up any markdown code blocks
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
                const parsed = JSON.parse(text);
                if (parsed && typeof parsed.response === 'string') {
                    return parsed.response;
                }
            } catch (jsonErr) {
                console.warn("GeminiService: JSON parse failed for hero autoplay response, using regex/fallback cleanup", jsonErr, text);
            }
            if (text.startsWith('{')) {
                const match = text.match(/"response"\s*:\s*"([^"]+)"/) || text.match(/"storyText"\s*:\s*"([^"]+)"/);
                if (match) return match[1];
            }
            if (text.startsWith('"') && text.endsWith('"')) text = text.substring(1, text.length - 1);
            return text;
        } catch (e) {
            console.error("GeminiService: Failed to generate hero autoplay response", e);
            return "...";
        }
    }
}
