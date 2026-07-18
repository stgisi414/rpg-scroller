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

        // Seed user's Chartopia API Key if not already present from local untracked config or prompt
        let chartopiaKey = localStorage.getItem("chartopia_api_key");
        if (!chartopiaKey) {
            fetch('src/assets/chartopia_config.json')
                .then(res => res.json())
                .then(data => {
                    if (data && data.chartopia_api_key) {
                        localStorage.setItem("chartopia_api_key", data.chartopia_api_key);
                        console.log("Seeded Chartopia API key from local config.");
                    } else {
                        this.promptChartopiaKey();
                    }
                })
                .catch(err => {
                    this.promptChartopiaKey();
                });
        }

        this.ai = null;
        this.model = null;
        this.modelWithTools = null;
        this.isReady = false;
    }

    promptChartopiaKey() {
        let key = localStorage.getItem("chartopia_api_key");
        if (!key) {
            key = window.prompt("Please enter your Chartopia API Key to enable RPG faction name and lore generation:");
            if (key) {
                localStorage.setItem("chartopia_api_key", key.trim());
            }
        }
    }

    cleanAndParseJson(text) {
        if (!text) {
            throw new Error("Empty response received from AI");
        }
        let cleaned = text.trim();
        // Remove markdown JSON code blocks if present
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```(json)?\s*/i, "");
            cleaned = cleaned.replace(/\s*```$/, "");
        }
        cleaned = cleaned.trim();
        try {
            return JSON.parse(cleaned);
        } catch (err) {
            // Try to extract JSON if there's leading/trailing commentary
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const potentialJson = cleaned.substring(firstBrace, lastBrace + 1);
                try {
                    return JSON.parse(potentialJson);
                } catch (innerErr) {
                    // Fall back to original error
                }
            }
            throw new Error(`Failed to parse JSON: ${err.message}. Raw text: ${text}`);
        }
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
            const tools = [{
                functionDeclarations: [{
                    name: "rollFantasyName",
                    description: "Pulls a randomized selection of pre-generated high-quality fantasy names from the game's offline database. Use this tool whenever you need to generate a new name for a kingdom, town, NPC, or character. Pick your favorite name from the returned list and use it.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            category: { 
                                type: "STRING", 
                                description: "The category of names to pull. Valid options are: 'kingdoms', 'towns', 'elf_female', 'elf_male', 'human_male', 'human_female', 'dwarf_male', 'dwarf_female', 'human_last', 'elf_last', 'dwarf_last', 'high_sage', 'alchemist', 'blacksmith', 'merchant'." 
                            },
                            count: {
                                type: "INTEGER",
                                description: "The number of random names to pull to choose from (default is 10, max is 20)."
                            }
                        },
                        required: ["category"]
                    }
                }]
            }];

            this.model = this.ai.getGenerativeModel({ 
                model: "gemini-3.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });
            this.modelWithTools = this.ai.getGenerativeModel({ 
                model: "gemini-3.5-flash",
                tools: tools
            });
            this.isReady = true;
            console.log("GeminiService: Successfully connected to Gemini API.");
        } catch (e) {
            console.error("GeminiService: Failed to initialize AI SDK", e);
        }
    }

    rollFantasyName(category, count = 10) {
        if (!window.FANTASY_NAMES || !window.FANTASY_NAMES[category]) {
            return `Error: Category '${category}' not found in database.`;
        }
        
        const list = window.FANTASY_NAMES[category];
        if (list.length === 0) return "Error: Name database is empty. Waiting for user to populate it.";
        
        // Shuffle the array to ensure Gemini gets random options
        const shuffled = [...list].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(count, 20, list.length));
        
        return selected.join(", ");
    }

    async generateContentWithTools(prompt) {
        if (!this.isReady) throw new Error("GeminiService is not ready");
        
        let lastError = null;
        for (let retry = 0; retry < 3; retry++) {
            let result = null;
            try {
                console.log(`[GEMINI_DBG] startChat with modelWithTools (Attempt ${retry + 1}). Prompt starts with:`, prompt.substring(0, 150) + "...");
                const chat = this.modelWithTools.startChat();
                result = await chat.sendMessage(prompt);
                console.log("[GEMINI_DBG] Initial result:", result);
                
                let attempts = 0;
                const maxAttempts = 10;
                let gotEmptyResponse = false;
                
                while (attempts < maxAttempts) {
                    // Extract function calls manually for absolute reliability
                    const functionCalls = [];
                    if (result && result.response && result.response.candidates && result.response.candidates[0] && result.response.candidates[0].content && result.response.candidates[0].content.parts) {
                        result.response.candidates[0].content.parts.forEach(part => {
                            if (part.functionCall) {
                                functionCalls.push(part.functionCall);
                            }
                        });
                    }
                    
                    if (functionCalls.length > 0) {
                        const call = functionCalls[0];
                        console.log(`[GEMINI_DBG] Tool call requested (attempt ${attempts}): ${call.name} with args:`, call.args);
                        let resultStr = "";
                        if (call.name === "rollFantasyName") {
                            resultStr = this.rollFantasyName(call.args.category, call.args.count || 10);
                        }
                        console.log("[GEMINI_DBG] Tool execution result:", resultStr);
                        
                        result = await chat.sendMessage([{
                            functionResponse: {
                                name: call.name,
                                response: { result: resultStr }
                            }
                        }]);
                        console.log(`[GEMINI_DBG] Chat result after tool call response (attempt ${attempts}):`, result);
                        attempts++;
                    } else {
                        // Extract text parts manually for absolute reliability
                        let text = "";
                        if (result && result.response && result.response.candidates && result.response.candidates[0] && result.response.candidates[0].content && result.response.candidates[0].content.parts) {
                            result.response.candidates[0].content.parts.forEach(part => {
                                if (part.text) {
                                    text += part.text;
                                }
                            });
                        }
                        
                        if (!text || text.trim() === "") {
                            console.warn(`[GEMINI_DBG] Empty response text received (Attempt ${retry + 1}).\nPrompt Sent: ${prompt}\nFull Result Object:`, JSON.stringify(result, null, 2));
                            gotEmptyResponse = true;
                            break;
                        }
                        console.log("[GEMINI_DBG] Final non-tool result returned successfully.");
                        return result;
                    }
                }
                
                if (gotEmptyResponse) {
                    continue;
                }
                throw new Error("Max tool call attempts exceeded");
            } catch (e) {
                console.error(`[GEMINI_DBG] Error on attempt ${retry + 1}.\nPrompt Sent: ${prompt}\nFull Result Object:`, result ? JSON.stringify(result, null, 2) : "undefined", `\nException:`, e);
                lastError = e;
                if (window.isRateLimitErrorGlobal && window.isRateLimitErrorGlobal(e)) {
                    window.handleGeminiRateLimit(e.message || String(e), true);
                }
                // Wait briefly before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
            }
        }
        throw lastError || new Error("Failed after 3 attempts");
    }

    async getEnemyTactic(battleState) {
        if (!this.isReady) {
            return { tactic: "IDLE", dialogue: "" };
        }

        // Global Rate Limiting: prevent API exhaustion (max 1 request every 4s globally)
        const now = Date.now();
        if (!this.lastRequestTime) this.lastRequestTime = 0;
        if (now - this.lastRequestTime < 4000) {
            // Quietly fall back to CHASE without hitting the API
            return { tactic: "CHASE", dialogue: "" };
        }
        this.lastRequestTime = now;

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
                this.generateContentWithTools(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
            ]);
            const text = result.response.text();
            return this.cleanAndParseJson(text);
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
                this.generateContentWithTools(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
            ]);
            const text = result.response.text();
            console.log("Game Master Decision:", text);
            return this.cleanAndParseJson(text);
        } catch (e) {
            console.error("GeminiService: GM failed", e);
            return { action: "NONE", announcement: "" };
        }
    }

    async getNpcResponse(npcPersona, chatHistory, playerMessage, state, actionContext = '') {
        if (!this.isReady) {
            if (actionContext) {
                return { response: `Very well, let us proceed with the ${actionContext}. [ACTION_SUCCESS]`, alignmentShift: 0 };
            }
            return { response: "I cannot speak right now, my mind is disconnected.", alignmentShift: 0 };
        }

        let contextText = "";
        if (state) {
            contextText += `\n--- GAME CONTEXT (RAG DATA) ---\n`;
            if (saveData && saveData.narrativeJournal && saveData.narrativeJournal.length > 0) {
                contextText += `\nNarrative Memories (Persistent Campaign History):\n`;
                saveData.narrativeJournal.forEach(mem => {
                    contextText += `- ${mem}\n`;
                });
            }
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
                if (state.luckOverride) {
                    contextText += `- SPECIAL: Due to a massive stroke of player luck, you feel unexplainably warm, cooperative, and incredibly friendly toward the player, completely overlooking alignment mismatches or bad reputation!\n`;
                } else if (state.npc.isMismatched) {
                    contextText += `- CRITICAL: There is a severe alignment mismatch! You find this player's karma repulsive. Refuse to help them, trade with them, or cooperate in any way. Keep your response cold, hostile, or dismissive.\n`;
                }
            }
            if (state.politicalContext) {
                const pc = state.politicalContext;
                contextText += `\nPolitical Map Context:\n`;
                contextText += `- Kingdom/Domain: ${pc.kingdom}\n`;
                if (pc.rulingFaction) {
                    contextText += `- Ruling Faction: ${pc.rulingFaction.name} (${pc.rulingFaction.alignment})\n`;
                    contextText += `- Player's Standing with Ruling Faction: ${pc.rulingFactionReputation} Reputation\n`;
                }
                if (pc.npcFaction) {
                    contextText += `- Your Faction: ${pc.npcFaction.name} (${pc.npcFaction.alignment})\n`;
                    contextText += `- Your Faction Rank/Title: ${state.npc.factionRank} (${state.npc.politicalTitle || 'Commoner'})\n`;
                    contextText += `- Player's Standing with Your Faction: ${pc.npcFactionReputation} Reputation\n`;
                }
                if (pc.rulingFactionRelations && Object.keys(pc.rulingFactionRelations).length > 0) {
                    contextText += `- Ruling Faction Relations: ${JSON.stringify(pc.rulingFactionRelations)}\n`;
                }
                if (pc.discoveredFrontierKingdoms && pc.discoveredFrontierKingdoms.length > 0) {
                    contextText += `- Discovered Frontier Kingdoms (Rumors): ${pc.discoveredFrontierKingdoms.join(', ')}\n`;
                }
                if (window.getKingdomForZone && window.getKingdomTownName && state.zone && state.zone.zoneIndex !== undefined) {
                    const z = state.zone.zoneIndex;
                    const dir = z < 0 ? -4 : 4;
                    const baseZ = Math.floor(Math.abs(z) / 4) * 4 * (z < 0 ? -1 : 1);
                    const nearbyTowns = [baseZ, baseZ + dir, baseZ + dir * 2];
                    const k = window.getKingdomForZone(z);
                    if (k) {
                        const townStrs = nearbyTowns.map(tz => `Zone ${tz} is ${window.getKingdomTownName(k.id, tz)}`);
                        contextText += `- Known Nearby Towns (CRITICAL: You MUST use these exact names if you create a delivery quest): ${townStrs.join(', ')}\n`;
                    }
                }
            }
            contextText += `-------------------------------\n`;
        }

        let languageInstruction = "";
        if (state && state.npc && state.npc.languageInfo) {
            const lang = state.npc.languageInfo.language;
            const dialect = state.npc.languageInfo.dialect;
            const understands = state.npc.playerUnderstandsLanguage;

            if (!understands) {
                languageInstruction = `
CRITICAL LANGUAGE BARRIER INSTRUCTION: 
The player DOES NOT understand your language (${lang}) or dialect (${dialect}). 
You must speak EXCLUSIVELY and PURELY in your native fantasy language (${dialect}). 
- Do not write in English. Do not write translations. Do not write "Hello (Translated from Elvish)".
- Speak entirely in the fictional words of that tongue. E.g.:
  * If speaking Elvish (Sylvan): Use Sindarin/Tolkien-style words (e.g. "Mae govannen! Mellalon elen sil omentielvo...").
  * If speaking Celestial: Use melodic, high-latinate, Enochian-style words (e.g. "Sanctus et venerabilis, gloriam domini celestis...").
  * If speaking Infernal: Use guttural, harsh, demonic/abyssal sounds and dark words (e.g. "Kharash'tar, val'ghoul vor'taz abyssum...").
  * If speaking Dwarvish: Use runic, Norse-sounding, booming, harsh guttural words (e.g. "Khuzdul karad, baruk khazad, durnik dwergar...").
  * If speaking a regional human dialect (like Coastal Cant, High Volcanic, West Elden, High Northern, Old Spell, Desert Oasis Cant): Speak in its unique accent/words that make it unintelligible to outsiders.
- Stay 100% in this language. Keep it brief.
`;
            } else {
                languageInstruction = `
LANGUAGE DIALECT INSTRUCTION: 
The player understands your language (${lang}) and dialect (${dialect}). 
Write your response in English, but you must weave in characteristic speech patterns, accents, slang, greetings, or minor terms from the "${dialect}" dialect to make it authentic (e.g., "Mae govannen" for Elvish, nautical terms for Coastal Cant, formal/archaic words for West Elden, cold/harsh curt words for High Northern).
`;
            }
        }

        const npcName = (state && state.npc && state.npc.name) ? state.npc.name : 'Unknown';
        const prompt = `You are a roleplaying NPC in a dark fantasy video game.
Your Name: ${npcName}
Your Persona: ${npcPersona}

${languageInstruction}

You must act perfectly in character. Do not break the fourth wall. 
- CRITICAL NAME VOICE CONSTRAINT: Speak strictly as yourself (Your Name: ${npcName}). Do NOT prepend another character name (like Vespera or Brom) to your lines, nor speak in the voice of another vendor.
CRITICAL RAG INSTRUCTION: Use the Game Context and Political Map Context provided below to dynamically weave the player's class, location, inventory, active quests, or political alignment/standing into your dialogue where natural. Speak in-character matching your faction, rank, title, and relationships. If they are heavily wounded, comment on it. If they have lots of gold, act greedy or impressed. If they are an samurai, be wary.
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
rpXpReward represents a reward (0 to 20) for immersive in-character roleplaying or world/lore integration. If the player writes an expressive message, uses action text (e.g. *bows*, *hands over treaty*, *kneels*), stays in-character, or directly references world history, current kingdom status, or the local faction lore, reward them with a small amount of XP (5 to 20 depending on depth). If they write a generic message, speak out-of-character, or break immersion, reward 0.

You can optionally offer the player a quest if they ask for work, or if it fits the conversation. 
IMPORTANT: Vary the quest types! Do NOT always give kill quests. Use rescue and delivery quests too.
If you offer a quest, include a "quest" object in the JSON. Supported quest types:
1. Kill quest: Slay a certain number of a specific enemy type. (fields: type: "kill", targetType: "<enemy>", targetCount: 3-5, rewardGold: 50-150)
2. Rescue quest: Rescue a captive person from a dangerous zone. (fields: type: "rescue", rescueeName: "<name>", rescueeGender: "male"|"female", rescueeZone: <zone_number>, rescueState: "captive", targetCount: 1, rewardGold: 100-200)
3. Delivery quest: Deliver an item to a target NPC in another zone. (fields: type: "delivery", deliveryItem: "<item_name>", deliveryTargetZone: <town_zone_number>, deliveryTargetNPC: "<npc_role>", targetCount: 1, deliveryPickedUp: true, rewardGold: 80-150)
4. Espionage quest: Infiltrate another kingdom's capital. (fields: type: "espionage", targetKingdom: "<kingdom_id_e.g._duskveil/tidereach>", targetCount: 1, rewardGold: 150-300, rewardReputation: 25)
5. Assassination quest: Eliminate guards of a hostile faction. (fields: type: "assassination", targetFaction: "<faction_id_e.g._shadow_covenant>", targetCount: 1, rewardGold: 200-400, rewardReputation: 35)
6. Diplomacy quest: Deliver a treaty to another ruler. (fields: type: "diplomacy", targetKingdom: "<kingdom_id>", targetRuler: "<leader_name>", targetCount: 1, rewardGold: 120-250, rewardReputation: 20)
7. Intel Report quest: Report back news/details of discovered frontier areas. (fields: type: "intel_report", targetCount: 1, rewardGold: 100-300, rewardReputation: 15)

For kill quests, pick an enemy that fits the current biome. Supported enemy targetTypes: "slime", "goblin", "bat", "mushroom", "orc", "bandit", "skeleton", "troll", "ogre", "giant", "frost_giant", "dragon", "spider", "mummy".
For rescue quests, rescueeZone should be a non-town zone near the current area (current zone ± 1-3, but NOT a multiple of 4 since those are towns). Pick a creative name for the rescuee.
For delivery quests, deliveryTargetZone should be a nearby town zone (a multiple of 4). deliveryTargetNPC should be a role like "Elder", "Sage", "Apothecary", or "Master Smith".
The current zone number is: ${(saveData && saveData.currentZone) || 0}.

If the player's message is extremely insulting, threatening, or completely pisses you off, you can choose to attack them. If you decide to attack, set "turnsHostile" to true in the JSON.
If the player's message is extremely kind, impressive, or they befriend you, you can choose to join their party and fight alongside them. (Special Rule: If you are a King's Guard, you SHOULD join their party if they have high reputation with your faction and request your aid). If you decide to join them, set "joinsParty" to true in the JSON.
(Do not set both to true).

Return ONLY a valid JSON object in this format (showing all 3 quest examples — pick ONE type per response):
Kill example:
{
  "response": "Your dialogue here...",
  "alignmentShift": 0,
  "socialShift": 0,
  "rpXpReward": 0,
  "turnsHostile": false,
  "joinsParty": false,
  "quest": { "id": "hunt_ogres_1", "title": "Ogre Menace", "description": "Slay 3 ogres terrorizing the region.", "type": "kill", "targetType": "ogre", "targetCount": 3, "rewardGold": 100 }
}
Rescue example:
{
  "response": "Your dialogue here...",
  "alignmentShift": 0,
  "socialShift": 0,
  "rpXpReward": 15,
  "quest": { "id": "rescue_lyra_1", "title": "Save Lyra", "description": "Rescue Lyra from captivity in the wilds.", "type": "rescue", "rescueeName": "Lyra", "rescueeGender": "female", "rescueeZone": 3, "rescueState": "captive", "targetCount": 1, "rewardGold": 150 }
}
Delivery example:
{
  "response": "Your dialogue here...",
  "alignmentShift": 0,
  "socialShift": 0,
  "rpXpReward": 10,
  "quest": { "id": "deliver_scroll_1", "title": "Urgent Scroll", "description": "Deliver this ancient scroll to the Sage in the next town.", "type": "delivery", "deliveryItem": "Ancient Scroll", "deliveryTargetZone": 4, "deliveryTargetNPC": "Sage", "targetCount": 1, "deliveryPickedUp": true, "rewardGold": 120 }
}
If you do NOT want to give a quest, simply omit the "quest" field.`;

        try {
            const result = await Promise.race([
                this.generateContentWithTools(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
            ]);
            const text = result.response.text();
            console.log("Gemini NPC Decision:", text);
            return this.cleanAndParseJson(text);
        } catch (e) {
            console.error("GeminiService: Failed to get NPC response", e);
            return { response: "... *stares blankly*", alignmentShift: 0 };
        }
    }

    async summarizeConversation(chatHistory) {
        if (!this.isReady || !chatHistory || chatHistory.length === 0) return null;
        
        const historyText = chatHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
        const prompt = `You are the Game Master for a fantasy RPG.
Summarize the following short dialogue sequence between the player and an NPC into a single, concise, one-sentence memory in the third person. Focus on key actions, choices, agreements, details revealed, or relationship changes.
Do not include any formatting, markdown, or prefix (like "Summary:"). Keep it under 20 words.

Dialogue:
${historyText}

Memory:`;

        try {
            const result = await Promise.race([
                this.generateContentWithTools(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
            ]);
            const text = result.response.text().trim();
            console.log("Summarized conversation into memory:", text);
            return text;
        } catch (e) {
            console.error("GeminiService: Failed to summarize conversation", e);
            return null;
        }
    }

    async generateZoneData(zoneIndex, playerLevel, forceTown, playerClassId, targetBiome) {
        const allHeroes = [
            'wizard', 'ranger', 'samurai', 'knight', 'elven_spellblade',
            'witch_1', 'witch_2', 'witch_3',
            'priest_1', 'priest_2', 'priest_3',
            'pyromancer_1', 'pyromancer_2', 'pyromancer_3'
        ];
        const availableHeroes = allHeroes.filter(c => c !== playerClassId);

        const biomeEnemies = {
            'Forest': ['slime', 'goblin', 'mushroom', 'spider', 'bat', 'bandit', 'wolfen', 'coyle', 'special_enemy_zombie_male', 'special_enemy_zombie_female', 'special_enemy_orc_male', 'special_enemy_orc_female', 'troll', 'ogre', 'willowisp'],
            'Plains': ['slime', 'goblin', 'orc', 'bat', 'bandit', 'special_enemy_orc_male', 'special_enemy_orc_female', 'giant', 'ogre', 'willowisp'],
            'Cave': ['bat', 'spider', 'slime', 'goblin', 'skeleton', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'ogre', 'troll', 'willowisp', 'stone_golem', 'mimic_1', 'mimic_2', 'mimic_3'],
            'Desert': ['mummy', 'scarab_beetle', 'orc', 'spider', 'bat', 'bandit', 'special_enemy_orc_male', 'special_enemy_orc_female', 'giant', 'willowisp', 'copper_golem', 'gorgon_1', 'gorgon_2', 'gorgon_3'],
            'Coastal': ['slime', 'bat', 'plague_flies', 'bandit', 'willowisp'],
            'Winter': ['slime', 'orc', 'burning_skull_blue', 'frost_giant', 'special_enemy_orc_male', 'special_enemy_orc_female', 'giant', 'willowisp'],
            'Dungeon': ['slime', 'bat', 'spider', 'old_demon', 'male_damned', 'female_damned', 'wolfen', 'coyle', 'special_enemy_demon_male', 'special_enemy_demon_female', 'special_enemy_devil_male', 'special_enemy_devil_female', 'special_enemy_zombie_male', 'special_enemy_zombie_female', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'ogre', 'willowisp', 'mimic_1', 'mimic_2', 'mimic_3'],
            'Deadwoods': ['slime', 'bat', 'spider', 'tree_damned', 'twisted_damned', 'plague_flies', 'wolfen', 'coyle', 'special_enemy_demon_male', 'special_enemy_demon_female', 'special_enemy_devil_male', 'special_enemy_devil_female', 'special_enemy_zombie_male', 'special_enemy_zombie_female', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'troll', 'ogre', 'willowisp', 'mimic_1', 'mimic_2', 'mimic_3'],
            'Hell': ['slime', 'bat', 'burning_damned', 'burning_skull', 'imp', 'cheeky_devil', 'the_devil', 'special_enemy_demon_male', 'special_enemy_demon_female', 'special_enemy_devil_male', 'special_enemy_devil_female', 'special_enemy_ghost_male', 'special_enemy_ghost_female', 'willowisp', 'bloated_damned', 'lava_golem'],
            'Heaven': ['heavenly_valkyrie', 'heavenly_seraph', 'heavenly_archangel', 'heavenly_cherub', 'special_enemy_ghost_male', 'special_enemy_ghost_female'],
            'Dark Elf Outpost': ['dark_elf_guard', 'dark_elf_spellblade', 'dark_elf_longbowman', 'dark_elf_queen', 'mimic_1', 'mimic_2', 'mimic_3', 'gorgon_1', 'gorgon_2', 'gorgon_3', 'stone_golem', 'lava_golem', 'copper_golem']
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
                    name: window.getTownNameForZone ? window.getTownNameForZone(zoneIndex) : townNames[absIdx % townNames.length],
                    type: 'Safe',
                    biome: targetBiome || 'Plains',
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
        const suggestedTownName = (isTown && window.getTownNameForZone) ? window.getTownNameForZone(zoneIndex) : null;

        const currentKingdom = window.getKingdomForZone ? window.getKingdomForZone(zoneIndex) : null;
        const isElvenKingdom = currentKingdom && (
            (currentKingdom.biomes && currentKingdom.biomes.includes('Deadwoods')) || 
            currentKingdom.id === 'duskveil' || 
            currentKingdom.id === 'ashenmoor' || 
            (currentKingdom.name && currentKingdom.name.toLowerCase().includes('elven')) || 
            (currentKingdom.rulingFaction && currentKingdom.rulingFaction.toLowerCase().includes('elven'))
        );
        const isDwarvenKingdom = currentKingdom && (
            (currentKingdom.biomes && currentKingdom.biomes.includes('Cave')) || 
            (currentKingdom.name && currentKingdom.name.toLowerCase().includes('dwarf')) || 
            (currentKingdom.name && currentKingdom.name.toLowerCase().includes('dwarven')) || 
            (currentKingdom.name && currentKingdom.name.toLowerCase().includes('underrealm')) || 
            (currentKingdom.name && currentKingdom.name.toLowerCase().includes('stronghold')) || 
            (currentKingdom.rulingFaction && currentKingdom.rulingFaction.toLowerCase().includes('dwarf')) ||
            (currentKingdom.rulingFaction && currentKingdom.rulingFaction.toLowerCase().includes('dwarven'))
        );

        let elvenPromptInstruction = "";
        if (isElvenKingdom) {
            elvenPromptInstruction = `
CRITICAL ELVEN KINGDOM INSTRUCTION:
This zone belongs to an Elven Kingdom (${currentKingdom.name}).
- Safe Zone NPCs: Their descriptions/personas MUST explicitly mention their sylvan elf-like traits (pointed elven ears, slender stature, shimmering hair, elegant leaf clothing) and they should roleplay as elves.
- NPC names must be classic elven names (e.g., Elowen, Legolas, Elara, Galadriel, Celeborn, Haldir, Thranduil).
`;
        } else if (isDwarvenKingdom) {
            elvenPromptInstruction = `
CRITICAL DWARVEN KINGDOM INSTRUCTION:
This zone belongs to a Dwarven Kingdom (${currentKingdom.name}).
- Safe Zone NPCs: Their descriptions/personas MUST explicitly mention their dwarven traits (stout stature, stocky build, long braided beards, sturdy iron boots, speaking of mines, gold, and ale) and they should roleplay as dwarves.
- NPC names must be classic dwarven names (e.g., Thorin, Balin, Gimli, Bruenor, Dvalin, Gloin, Bofur, Dain).
`;
        }

        const prompt = `You are a procedural generation engine for a 2D Action-RPG.
Generate data for Zone Index ${zoneIndex}. Note: Negative zoneIndex values indicate backtracking or moving to the left from the starting town (Zone 0); please treat them as valid progression areas. Use the absolute index ${Math.abs(zoneIndex)} for biome/difficulty calculations. Each zone MUST be unique.
The player is Level ${playerLevel}.

TOOL INSTRUCTION:
You are equipped with the 'rollFantasyName' tool which pulls randomized names from our massive offline fantasy database.
You MUST call this tool whenever you need to name a Town, Kingdom, Region, or NPC.
Example: If you need to name an elven guard, call rollFantasyName with category="elf_male" and then call it again with category="elf_last". Combine the best first and last names from the returned lists and use it in your response.
DO NOT invent generic names yourself—always rely on the options returned by the 'rollFantasyName' tool!

${elvenPromptInstruction}

Rules:
1. "type" MUST be either "Safe" or "Dangerous".
${forceTown ? 
`2. CRITICAL: This zone MUST be a Town/Castle. "type" MUST be "Safe". Safe zones MUST have exactly 3 NPCs:
   - Make all 3 NPCs have a spriteKey of "custom_townsfolk".
   - Assign them unique fantasy names.
   - Assign them personas based on town roles (e.g., merchant, guard, villager).
   - The town name MUST be exactly "${suggestedTownName}".` 
:
`2. CRITICAL: This zone MUST be a wilderness area. "type" MUST be "Dangerous".
3. Wilderness zones MUST generate between ${minEnemies} and ${maxEnemies} enemies.
   - Enemy "type" MUST be strictly chosen from this exact array: ${JSON.stringify(validEnemies)}. You are allowed and encouraged to spawn multiple enemies of the SAME type!
   - If the biome is "Dark Elf Outpost", you MUST spawn exactly one "dark_elf_queen" (typically positioned around x = 1800) as the commander of the outpost, and fill the rest of the slots with dark_elf_guard, dark_elf_spellblade, dark_elf_longbowman, mimics, gorgons, or golems.
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
   - Dark Elf Outpost: "Dark Elf Outpost of Vael-Anar", "Nightfall Sentinel Outpost", "Shadowspire Outpost", "Obsidian Blade Garrison"
   - Town: "Willowbrook", "Thornhaven", "Ashenmere", "Goldfall", "Cinderveil"
   Do NOT reuse "Whispering Thicket" or any name you have used before.
 11. Add a "lore" property. This should be 1-2 sentences of dark fantasy background lore about this specific zone. For Dark Elf Outposts, the lore MUST mention that these entities and outposts emerged from the rifts.

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
                this.generateContentWithTools(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 20000))
            ]);
            const text = result.response.text();
            console.log("Gemini Generated Zone:", text);
            const parsed = this.cleanAndParseJson(text);

            // Log the generated zone and NPC details
            if (window.logGeneratedName) {
                if (parsed.type === "Safe" || (Math.abs(zoneIndex) > 0 && Math.abs(zoneIndex) % 4 === 0)) {
                    window.logGeneratedName("towns", {
                        name: parsed.name,
                        zoneIndex: zoneIndex,
                        lore: parsed.lore
                    });
                } else {
                    window.logGeneratedName("wilderness_zones", {
                        name: parsed.name,
                        zoneIndex: zoneIndex,
                        lore: parsed.lore
                    });
                }
                
                if (parsed.npcs && Array.isArray(parsed.npcs)) {
                    parsed.npcs.forEach(n => {
                        window.logGeneratedName("npcs", {
                            name: n.name,
                            persona: n.persona,
                            spriteKey: n.spriteKey,
                            zoneIndex: zoneIndex
                        });
                    });
                }
            }

            return parsed;
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
                finalName = isTownFallback 
                    ? (window.getTownNameForZone ? window.getTownNameForZone(zoneIndex) : townNames[aIdx % townNames.length]) 
                    : wildNames[aIdx % wildNames.length];
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

        const playerLevel = saveData ? (saveData.level || 1) : 1;
        const className = player.classData ? player.classData.id : 'adventurer';
        const isSavior = saveData && saveData.isSavior ? 'Savior of the Realm' : 'Unknown wanderer';
        const zoneName = zoneData ? zoneData.name : 'Unknown lands';

        const promptTextWithMemories = (saveData && saveData.narrativeJournal && saveData.narrativeJournal.length > 0)
            ? `\nNarrative Memories (Recent Campaign Events):\n` + saveData.narrativeJournal.map(mem => `- ${mem}`).join('\n') + '\n'
            : '';

        const prompt = `You are an AI Game Master in a dark fantasy 2D RPG.
Current Context:
- Player Level: ${playerLevel}
- Player Class: ${className}
- Player Status: ${isSavior}
- Current Zone: ${zoneName}
${promptTextWithMemories}
Task: ${promptText}

Output your response as JSON in this exact format:
{
  "storyText": "Your dialogue or narration here."
}
Keep it short, punchy, and atmospheric.`;

        try {
            const result = await Promise.race([
                this.generateContentWithTools(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
            ]);
            let text = result.response.text();
            return this.cleanAndParseJson(text);
        } catch (e) {
            console.error("GeminiService: Failed GM response", e);
            return { storyText: "Prepare to meet your doom!" };
        }
    }

    async getHeroAutoPlayResponse(classId, npcName, chatContext) {
        if (!this.model) return "Interesting.";

        let persona = (autoplayConfig && autoplayConfig.heroPersonality) ? autoplayConfig.heroPersonality : "";
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
                this.generateContentWithTools(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
            ]);
            let text = result.response.text().trim();
            try {
                const parsed = this.cleanAndParseJson(text);
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
    async generateFrontierKingdom(zoneRange) {
        const start = zoneRange[0];
        const end = zoneRange[1];
        const townZones = [];
        for (let z = start; z <= end; z++) {
            if (z === 0 || (Math.abs(z) > 0 && Math.abs(z) % 4 === 0)) {
                townZones.push(z);
            }
        }
        const townNamesTemplate = {};
        townZones.forEach(z => {
            townNamesTemplate[z] = "Themed Town Name";
        });
        const townNamesJsonStr = JSON.stringify(townNamesTemplate);

        const existingKingdomNames = [];
        for (const key in WORLD_KINGDOMS) {
            existingKingdomNames.push(WORLD_KINGDOMS[key].name);
        }
        if (saveData && saveData.discoveredKingdoms) {
            for (const key in saveData.discoveredKingdoms) {
                existingKingdomNames.push(saveData.discoveredKingdoms[key].name);
            }
        }

        let defaultCapital = start + Math.floor((end - start) / 2);
        if (townZones.length > 0) {
            defaultCapital = townZones.reduce((prev, curr) => Math.abs(curr - defaultCapital) < Math.abs(prev - defaultCapital) ? curr : prev);
        }

        const prompt = `Generate a completely unique and procedurally drafted fantasy kingdom located in the wild frontier of the world between zones ${zoneRange[0]} and ${zoneRange[1]}.
The list of existing kingdoms in the world is: ${JSON.stringify(existingKingdomNames)}

YOUR CRITICAL INSTRUCTIONS:
1. Make up a highly creative and immersive fantasy name for this kingdom. It must not be identical or highly similar to any existing kingdom name. Let's call the finalized name "name".
2. Generate a creative faction name ("factionName") representing the ruling order of the kingdom, which must be themed and designed directly based on the finalized kingdom name.
4. Keep the biomes, descriptions, ruler details, imports/exports, and town names cohesive with this kingdom's theme.

Return ONLY a valid JSON object in this format (no markdown formatting, no backticks, just the raw JSON):
{
  "id": "frontier_kingdom_${Math.abs(zoneRange[0])}",
  "name": "Finalized unique fantasy name of the Kingdom",
  "desc": "A highly detailed, creative, and immersive fantasy history and lore paragraph describing the kingdom's origins, its rise in the frontier, and its current state.",
  "capital": ${defaultCapital},
  "zoneRange": [${zoneRange[0]}, ${zoneRange[1]}],
  "biomes": ["Biome1", "Biome2"], // Pick two different biomes from: Forest, Plains, Coastal, Desert, Winter, Deadwoods, Hell, Cave, Dungeon
  "rulingFaction": "faction_frontier_${Math.abs(zoneRange[0])}",
  "factionName": "Faction Name representing the ruling order, generated based on the kingdom name",
  "factionColor": "#HEXCODE",
  "leaderTitle": "King/Grand Magister/Jarl/etc.",
  "leaderName": "Leader Name",
  "leaderPersona": "Persona profile of the ruler",
  "allies": ["crown_of_willowbrook"], // Select 1-2 allied faction ids (can include: crown_of_willowbrook, shadow_covenant, merchant_league, high_mage_council, frost_jarls, infernal_pact)
  "rivals": ["shadow_covenant"], // Select 1-2 rival faction ids
  "exportGoods": ["wheat"], // Pick 1-2 export cargo ids from: wheat, iron_ore, herbs, silk, whiskey, salt, spices, celestial_ambrosia, abyssal_brimstone
  "importGoods": ["iron_ore"], // Pick 1-2 import cargo ids
  "townNames": ${townNamesJsonStr} // Generate creative, unique town names for each town zone in this range that fit the kingdom's biomes/culture.
}`;

        try {
            const result = await Promise.race([
                this.generateContentWithTools(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 20000))
            ]);
            let text = result.response.text().trim();
            console.log("Gemini Generated Frontier Kingdom:", text);
            let parsed = this.cleanAndParseJson(text);

            // Enforce rulingFaction ID naming convention (Phase 21)
            if (parsed.factionName) {
                let fid = parsed.factionName.toLowerCase().trim();
                if (fid.startsWith("the ")) {
                    fid = fid.substring(4);
                }
                fid = fid.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                parsed.rulingFaction = fid || `faction_frontier_${Math.abs(zoneRange[0])}`;
            }
            
            // Programmatically align capital to nearest multiple of 4 (town zone) in range
            if (townZones.length > 0 && Math.abs(parsed.capital) % 4 !== 0) {
                parsed.capital = townZones.reduce((prev, curr) => Math.abs(curr - parsed.capital) < Math.abs(prev - parsed.capital) ? curr : prev);
            }

            // Save and log town names in saveData.zones
            if (parsed.townNames) {
                if (!saveData.zones) saveData.zones = {};
                for (const zIdx in parsed.townNames) {
                    const z = parseInt(zIdx);
                    let name = parsed.townNames[zIdx];
                    if (z === parsed.capital && !name.toLowerCase().includes('capital')) {
                        name = `${name} Capital`;
                    }
                    if (!saveData.zones[zIdx]) {
                        saveData.zones[zIdx] = {
                            name: name,
                            biome: (z === parsed.capital) ? 'Capital' : 'Town'
                        };
                    }
                    if (window.logGeneratedName) {
                        window.logGeneratedName("towns", {
                            name: name,
                            zoneIndex: z,
                            lore: `Pre-generated town under ${parsed.name}.`
                        });
                    }
                }
            }

            // Log the generated kingdom
            if (window.logGeneratedName) {
                window.logGeneratedName("kingdoms", {
                    name: parsed.name,
                    id: parsed.id,
                    desc: parsed.desc,
                    faction: parsed.factionName
                });
            }

            return parsed;
        } catch (e) {
            console.error("GeminiService: Failed to generate frontier kingdom, using fallback", e);
            const templates = [
                {
                    name: 'Kingdom of Vaelgard',
                    desc: 'A rugged outpost kingdom founded by exiled knights seeking freedom in the wild frontier.',
                    biomes: ['Forest', 'Plains'],
                    factionName: 'The Iron Vanguard',
                    factionColor: '#a06040',
                    leaderTitle: 'Lord Commander',
                    leaderName: 'Garrick the Stalwart',
                    leaderPersona: 'A hard-nosed soldier who values strength, directness, and loyalty. Sceptical of outsiders.',
                    townNames: ["Thornhaven", "Ashenmere", "Goldfall", "Cinderveil"]
                },
                {
                    name: 'Sylvan Sultanate of Zanj-Abar',
                    desc: 'An exotic oasis kingdom of golden minarets and vast trade networks spanning the arid frontier.',
                    biomes: ['Desert', 'Coastal'],
                    factionName: 'The Obsidian Crescent',
                    factionColor: '#ccaa44',
                    leaderTitle: 'Grand Sultan',
                    leaderName: 'Al-Mansur the Wise',
                    leaderPersona: 'A cunning, polite ruler who cares deeply about commerce, wealth, and diplomacy.',
                    townNames: ["Qasira", "Shadzar", "Tidepool", "Seawind"]
                },
                {
                    name: 'Stronghold of Irondeep',
                    desc: 'A colossal subterranean kingdom carved into the roots of the world, rich with metal and gem mines.',
                    biomes: ['Cave', 'Dungeon'],
                    factionName: 'The Stoneforge Clan',
                    factionColor: '#777788',
                    leaderTitle: 'High Thane',
                    leaderName: 'Thorgar Bronzebeard',
                    leaderPersona: 'A stubborn, traditionalist dwarf ruler who trusts only steel, stone, and strong ale.',
                    townNames: ["Deephearth", "Stonebridge", "Glimmerlode", "Anvilgard"]
                },
                {
                    name: 'Duskveil Dominion',
                    desc: 'A mysterious, fog-shrouded realm of darkwoods where shadow magic and ancient curses linger.',
                    biomes: ['Deadwoods', 'Cave'],
                    factionName: 'The Nightshade Coven',
                    factionColor: '#663399',
                    leaderTitle: 'Dread Lord',
                    leaderName: 'Malakor the Silent',
                    leaderPersona: 'A cold, calculating spellcaster who rarely speaks but rules with absolute authority.',
                    townNames: ["Shadowfen", "Gravewood", "Mistweaver", "Whisperwind"]
                },
                {
                    name: 'Frosthold Realm',
                    desc: 'A freezing northern tundra of snow-covered peaks, ruled by proud giant-slaying clans.',
                    biomes: ['Winter', 'Plains'],
                    factionName: 'The Winter Vanguard',
                    factionColor: '#88ccff',
                    leaderTitle: 'Jarl',
                    leaderName: 'Bjorn Icebreaker',
                    leaderPersona: 'A boisterous warrior king who respects physical might, hospitality, and tales of glory.',
                    townNames: ["Snowdrift", "Glacierpoint", "Coldstone", "Frostkeep"]
                }
            ];

            const tIdx = Math.floor(Math.abs(zoneRange[0]) / 16) % templates.length;
            const template = templates[tIdx];

            const fallbackTownNames = {};
            townZones.forEach((z, i) => {
                const name = (z === defaultCapital) ? `${template.name} Capital` : template.townNames[i % template.townNames.length];
                fallbackTownNames[z] = name;
                if (!saveData.zones) saveData.zones = {};
                if (!saveData.zones[z]) {
                    saveData.zones[z] = {
                        name: name,
                        biome: (z === defaultCapital) ? 'Capital' : 'Town'
                    };
                }
            });

            let fid = template.factionName.toLowerCase().trim();
            if (fid.startsWith("the ")) {
                fid = fid.substring(4);
            }
            fid = fid.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

            return {
                id: `frontier_kingdom_${Math.abs(zoneRange[0])}`,
                name: template.name,
                desc: template.desc,
                capital: defaultCapital,
                zoneRange: [zoneRange[0], zoneRange[1]],
                biomes: template.biomes,
                rulingFaction: fid || `faction_frontier_${Math.abs(zoneRange[0])}`,
                factionName: template.factionName,
                factionColor: template.factionColor,
                leaderTitle: template.leaderTitle,
                leaderName: template.leaderName,
                leaderPersona: template.leaderPersona,
                allies: ["crown_of_willowbrook"],
                rivals: ["shadow_covenant"],
                exportGoods: ["wheat"],
                importGoods: ["iron_ore"],
                townNames: fallbackTownNames
            };
        }
    }

    async improveHeroPersonality(currentPersonality, state) {
        if (!this.model) return { personality: currentPersonality || "A brave adventurer." };

        const prompt = `You are a creative writer and roleplay designer for a dark fantasy RPG.
Your task is to write a highly creative, immersive 1-2 sentence roleplay personality / disposition profile for the player's character.

Current character context:
- Class: ${state.player.class}
- Level: ${state.player.level}
- Alignment: ${state.player.alignment} (Negative is Evil, Positive is Good)
- Current Zone: ${state.zone ? state.zone.name : 'Unknown lands'}
- Active Quests: ${JSON.stringify(state.player.quests)}

${currentPersonality ? `The player has started writing this draft: "${currentPersonality}". Please improve, flesh out, and polish this draft, making it highly atmospheric and creative, incorporating their class/alignment/level traits.` : `No draft exists. Please procedurally generate a completely new, unique, and highly creative personality profile that matches their class and alignment.`}

Format the output strictly as a JSON object:
{
  "personality": "Your polished/generated 1-2 sentence personality here."
}
Keep it punchy, atmospheric, and highly tailored to their class/level/alignment.`;

        try {
            const result = await Promise.race([
                this.generateContentWithTools(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
            ]);
            let text = result.response.text().trim();
            return this.cleanAndParseJson(text);
        } catch (e) {
            console.error("GeminiService: Failed to improve/generate hero personality", e);
            return { personality: currentPersonality || `A level ${state.player.level} ${state.player.class} seeking fortune in the realm.` };
        }
    }

    async generateOmniVideoOnTheFly(category, promptText, screenshotBase64, portraitLeftBase64 = null, portraitRightBase64 = null) {
        if (!this.apiKey) {
            console.warn("GeminiService: No API key for on-the-fly video generation.");
            return null;
        }
        
        console.log(`[GeminiService] Initiating on-the-fly video generation for category: '${category}'`);
        
        // Clean base64 strings to get raw bytes
        const cleanBase64 = (b64) => {
            if (!b64) return null;
            return b64.replace(/^data:image\/\w+;base64,/, "");
        };

        const imgBytes = cleanBase64(screenshotBase64);
        const pLeftBytes = cleanBase64(portraitLeftBase64);
        const pRightBytes = cleanBase64(portraitRightBase64);

        const inputParts = [];
        
        // Add the screenshot reference
        if (imgBytes) {
            inputParts.push({
                type: "image",
                data: imgBytes,
                mime_type: "image/png"
            });
        }
        // Add left character portrait reference
        if (pLeftBytes) {
            inputParts.push({
                type: "image",
                data: pLeftBytes,
                mime_type: "image/png"
            });
        }
        // Add right character portrait reference
        if (pRightBytes) {
            inputParts.push({
                type: "image",
                data: pRightBytes,
                mime_type: "image/png"
            });
        }
        
        // Add the prompt instruction
        inputParts.push({
            type: "text",
            text: promptText
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${this.apiKey}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "gemini-omni-flash-preview",
                    input: inputParts,
                    response_modalities: ["video"]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                const err = new Error(`API returned error status ${response.status}: ${errText}`);
                if (response.status === 429 || (window.isRateLimitErrorGlobal && window.isRateLimitErrorGlobal(err))) {
                    window.handleGeminiRateLimit(err.message, false);
                }
                throw err;
            }

            const data = await response.json();
            console.log("[GeminiService] Omni API response data:", JSON.stringify(data, null, 2));

            // Helper to recursively look for any base64-like video data in the response structure
            const findVideoInObject = (obj, path = "") => {
                if (!obj || typeof obj !== 'object') return null;
                
                // Check direct fields (support both camelCase and snake_case)
                if (obj.outputVideo && obj.outputVideo.data) return `data:video/mp4;base64,${obj.outputVideo.data}`;
                if (obj.output_video && obj.output_video.data) return `data:video/mp4;base64,${obj.output_video.data}`;
                if (obj.outputVideo && obj.outputVideo.bytes) return `data:video/mp4;base64,${obj.outputVideo.bytes}`;
                if (obj.output_video && obj.output_video.bytes) return `data:video/mp4;base64,${obj.output_video.bytes}`;
                
                if (obj.inlineData && obj.inlineData.mimeType && obj.inlineData.mimeType.startsWith('video/')) {
                    return `data:${obj.inlineData.mimeType};base64,${obj.inlineData.data}`;
                }
                if (obj.inline_data && obj.inline_data.mime_type && obj.inline_data.mime_type.startsWith('video/')) {
                    return `data:${obj.inline_data.mime_type};base64,${obj.inline_data.data}`;
                }
                
                // Recurse into children
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        const currentPath = path ? `${path}.${key}` : key;
                        const val = obj[key];
                        
                        // Exclude keys containing signature or id to prevent false positives
                        const lowerKey = key.toLowerCase();
                        if (lowerKey.includes("signature") || lowerKey === "id") {
                            continue;
                        }
                        
                        // Check if this string is a base64 video payload
                        if (typeof val === 'string' && val.length > 5000) {
                            const isBase64 = /^[A-Za-z0-9+/=\s\n]+$/.test(val.substring(0, 100).trim());
                            if (isBase64) {
                                console.log(`[GeminiService] Found base64 string payload at path: ${currentPath} (length: ${val.length})`);
                                let mime = "video/mp4";
                                if (currentPath.toLowerCase().includes("gif")) mime = "image/gif";
                                return `data:${mime};base64,${val.replace(/\s/g, '')}`;
                            }
                        }
                        
                        if (val && typeof val === 'object') {
                            const result = findVideoInObject(val, currentPath);
                            if (result) return result;
                        }
                    }
                }
                return null;
            };

            // Check for long-running operation name
            if (data && data.name) {
                console.log(`[GeminiService] Video generation job started: ${data.name}. Polling status...`);
                return await this.pollVideoGenerationJob(data.name);
            }

            const videoSrc = findVideoInObject(data);
            if (videoSrc) return videoSrc;

            throw new Error("No video data returned in Omni response.");
        } catch (err) {
            console.error("[GeminiService] Failed to generate video on-the-fly:", err);
            if (window.isRateLimitErrorGlobal && window.isRateLimitErrorGlobal(err)) {
                window.handleGeminiRateLimit(err.message || String(err), false);
            }
            return null;
        }
    }

    async pollVideoGenerationJob(operationName) {
        const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${this.apiKey}`;
        const maxRetries = 20;
        const delayMs = 3000;

        // Recursive helper also accessible inside polling
        const findVideoInObject = (obj, path = "") => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.outputVideo && obj.outputVideo.data) return `data:video/mp4;base64,${obj.outputVideo.data}`;
            if (obj.output_video && obj.output_video.data) return `data:video/mp4;base64,${obj.output_video.data}`;
            if (obj.outputVideo && obj.outputVideo.bytes) return `data:video/mp4;base64,${obj.outputVideo.bytes}`;
            if (obj.output_video && obj.output_video.bytes) return `data:video/mp4;base64,${obj.output_video.bytes}`;
            if (obj.inlineData && obj.inlineData.mimeType && obj.inlineData.mimeType.startsWith('video/')) {
                return `data:${obj.inlineData.mimeType};base64,${obj.inlineData.data}`;
            }
            if (obj.inline_data && obj.inline_data.mime_type && obj.inline_data.mime_type.startsWith('video/')) {
                return `data:${obj.inline_data.mime_type};base64,${obj.inline_data.data}`;
            }
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    const val = obj[key];
                    
                    // Exclude signature and id keys
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.includes("signature") || lowerKey === "id") {
                        continue;
                    }
                    
                    if (typeof val === 'string' && val.length > 5000) {
                        const isBase64 = /^[A-Za-z0-9+/=\s\n]+$/.test(val.substring(0, 100).trim());
                        if (isBase64) {
                            console.log(`[GeminiService] Found base64 string payload at path: ${currentPath} (length: ${val.length})`);
                            let mime = "video/mp4";
                            if (currentPath.toLowerCase().includes("gif")) mime = "image/gif";
                            return `data:${mime};base64,${val.replace(/\s/g, '')}`;
                        }
                    }
                    if (val && typeof val === 'object') {
                        const result = findVideoInObject(val, currentPath);
                        if (result) return result;
                    }
                }
            }
            return null;
        };

        for (let i = 0; i < maxRetries; i++) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    const err = new Error(`Failed to poll status: ${response.status}`);
                    if (response.status === 429 || (window.isRateLimitErrorGlobal && window.isRateLimitErrorGlobal(err))) {
                        window.handleGeminiRateLimit(err.message, false);
                    }
                    throw err;
                }
                const data = await response.json();
                console.log(`[GeminiService] Polled operation ${operationName} data:`, JSON.stringify(data, null, 2));
                if (data.done) {
                    if (data.error) {
                         throw new Error(`Operation failed: ${data.error.message}`);
                    }
                    const videoSrc = findVideoInObject(data.response);
                    if (videoSrc) return videoSrc;
                    throw new Error("Operation completed but no video data was found.");
                }
                console.log(`[GeminiService] Polling LRO ${operationName} (attempt ${i + 1}/${maxRetries}): not done yet...`);
            } catch (err) {
                console.warn("[GeminiService] Error polling operation status:", err);
                if (window.isRateLimitErrorGlobal && window.isRateLimitErrorGlobal(err)) {
                    window.handleGeminiRateLimit(err.message || String(err), false);
                }
            }
        }
        throw new Error("Timed out waiting for video generation operation to complete.");
    }

    async playSpeech(text, voiceName = null) {
        if (!this.apiKey) {
            alert("Please configure your Gemini API Key in Settings to read messages aloud!");
            return;
        }
        
        // Stop currently playing voice if any
        if (this._activeSpeechSource) {
            try {
                this._activeSpeechSource.stop();
            } catch (e) {}
            this._activeSpeechSource = null;
        }
        
        const activeVoice = voiceName || localStorage.getItem("tts_voice") || "Kore";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${this.apiKey}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: text
                        }]
                    }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: activeVoice
                                }
                            }
                        }
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                const err = new Error(`Speech API returned status ${response.status}: ${errText}`);
                if (response.status === 429 || (window.isRateLimitErrorGlobal && window.isRateLimitErrorGlobal(err))) {
                    window.handleGeminiRateLimit(err.message, false);
                }
                throw err;
            }

            const data = await response.json();
            console.log("[Gemini TTS Response Data]:", JSON.stringify(data, null, 2));
            
            let base64Audio = null;
            const part = data.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData?.data) {
                base64Audio = part.inlineData.data;
            } else if (part?.inline_data?.data) {
                base64Audio = part.inline_data.data;
            }
            
            if (!base64Audio) {
                throw new Error("No speech audio found in response.");
            }
            
            // Play PCM
            const sampleRate = 24000; // Gemini default PCM output sample rate is 24kHz
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const numSamples = len / 2;
            const floatData = new Float32Array(numSamples);
            const dataView = new DataView(bytes.buffer);
            
            for (let i = 0; i < numSamples; i++) {
                const val = dataView.getInt16(i * 2, true); // little endian PCM 16-bit
                floatData[i] = val / 32768.0;
            }
            
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
            audioBuffer.copyToChannel(floatData, 0);
            
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            source.start(0);
            
            this._activeSpeechSource = source;
        } catch (err) {
            console.error("Failed to generate/play speech:", err);
            if (window.isRateLimitErrorGlobal && window.isRateLimitErrorGlobal(err)) {
                window.handleGeminiRateLimit(err.message || String(err), false);
            } else {
                alert("Speech generation failed: " + err.message);
            }
        }
    }
}
