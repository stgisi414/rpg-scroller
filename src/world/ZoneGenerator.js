/**
 * ZoneGenerator.js - Handles procedural zone generation, cached zone validation,
 * and frontier kingdom generation using the Gemini API.
 * Extracted from WorldManager.js to modularize class code.
 */
window.ZoneGenerator = {
    async draftFrontierKingdomIfNeeded(scene, zoneIndex) {
        const isFrontier = zoneIndex < -48 || zoneIndex > 88;
        if (!isFrontier) return;

        const existingKingdom = window.getKingdomForZone ? window.getKingdomForZone(zoneIndex) : null;
        if (existingKingdom) return;

        let startZone = 0;
        let endZone = 0;
        if (zoneIndex > 88) {
            const chunkIndex = Math.floor((zoneIndex - 89) / 16);
            startZone = 89 + chunkIndex * 16;
            endZone = 88 + (chunkIndex + 1) * 16;
        } else {
            const chunkIndex = Math.floor((-49 - zoneIndex) / 16);
            startZone = -48 - (chunkIndex + 1) * 16;
            endZone = -49 - chunkIndex * 16;
        }
        
        if (scene.showFloatingText && scene.player && scene.player.sprite) {
            scene.showFloatingText(scene.player.sprite.x, scene.player.sprite.y - 60, "Map expanding... drafting frontier kingdom...", 0x88aaff);
        }
        
        const kingdomData = await scene.geminiService.generateFrontierKingdom([startZone, endZone]);
        
        window.saveData.discoveredKingdoms = window.saveData.discoveredKingdoms || {};
        window.saveData.discoveredKingdoms[kingdomData.id] = kingdomData;
        
        if (kingdomData.townNames) {
            if (!window.saveData.zones) window.saveData.zones = {};
            for (const zIdx in kingdomData.townNames) {
                if (!window.saveData.zones[zIdx]) {
                    window.saveData.zones[zIdx] = {
                        name: kingdomData.townNames[zIdx],
                        biome: (parseInt(zIdx) === kingdomData.capital) ? 'Capital' : 'Town'
                    };
                }
            }
        }

        if (window.registerFrontierKingdomFaction) {
            window.registerFrontierKingdomFaction(kingdomData);
        }
        
        if (scene.player && scene.player._persistToLocalStorage) {
            scene.player._persistToLocalStorage();
        }
        
        console.log(`[Frontier] Procedurally generated kingdom: ${kingdomData.name} (${startZone} to ${endZone})`);
    },

    validateZoneCache(zoneIndex, zoneData) {
        if (!zoneData) return null;

        const staleNames = ['Fallback Wilderness', 'Fallback Town', 'Corrupted Void', 'Whispering Thicket', 'The Whispering Thicket'];
        if (staleNames.includes(zoneData.name)) {
            return null;
        }

        const isTownIndex = Math.abs(zoneIndex) > 0 && Math.abs(zoneIndex) % 4 === 0;
        if (isTownIndex && zoneData.type !== 'Safe') {
            return null;
        }
        
        if (!isTownIndex && zoneIndex !== 0 && zoneData.type === 'Safe') {
            console.warn(`Zone ${zoneIndex} was cached as Safe but should be Dangerous — regenerating.`);
            return null;
        }

        const kingdom = window.getKingdomForZone ? window.getKingdomForZone(zoneIndex) : null;
        if (kingdom && kingdom.biomes) {
            if (!kingdom.biomes.includes(zoneData.biome)) {
                console.warn(`Zone ${zoneIndex} had biome ${zoneData.biome} which is invalid for kingdom ${kingdom.name} (expected ${kingdom.biomes.join('/')}) — regenerating.`);
                return null;
            }
        }

        if (zoneData.type === 'Safe' && window.isCapitalCity && window.isCapitalCity(zoneIndex)) {
            const faction = window.getFactionForZone ? window.getFactionForZone(zoneIndex) : null;
            if (faction && faction.court) {
                const hasCourtMember = zoneData.npcs && zoneData.npcs.some(n => faction.court.some(c => c.name === n.name));
                if (!hasCourtMember) {
                    console.warn(`Capital city at zone ${zoneIndex} is missing faction court members — invalidating for regeneration.`);
                    return null;
                }
            }
        }

        return zoneData;
    },

    async generateZoneWithGemini(scene, zoneIndex) {
        const playerLevel = (window.saveData && window.saveData.level) || 1;
        const playerClassId = (window.saveData && window.saveData.classId) || 'knight';
        const forceTown = zoneIndex === 0 || (Math.abs(zoneIndex) > 0 && Math.abs(zoneIndex) % 4 === 0);

        const kingdom = window.getKingdomForZone ? window.getKingdomForZone(zoneIndex) : null;
        let selectedBiome = null;
        if (kingdom && kingdom.biomes) {
            selectedBiome = kingdom.biomes[Math.abs(zoneIndex) % kingdom.biomes.length];
        }

        try {
            const response = await scene.geminiService.generateZoneData(zoneIndex, playerLevel, forceTown, playerClassId, selectedBiome);
            const zoneData = response;
            if (!zoneData) throw new Error("API returned null zone object");
            
            zoneData.type = forceTown ? 'Safe' : 'Dangerous';
            if (!zoneData.npcs) zoneData.npcs = [];
            if (!zoneData.enemies) zoneData.enemies = [];
            if (!zoneData.platforms) zoneData.platforms = [];

            // Guarantee court members in capital cities (Phase 5)
            if (zoneData.type === 'Safe') {
                const isCapitalCity = window.isCapitalCity ? window.isCapitalCity(zoneIndex) : false;
                const faction = window.getFactionForZone ? window.getFactionForZone(zoneIndex) : null;
                if (faction) {
                    if (isCapitalCity && faction.court) {
                        const standardNpcs = zoneData.npcs || [];
                        const courtNpcs = faction.court.map((cMember, idx) => ({
                            name: cMember.name,
                            persona: cMember.persona,
                            x: 600 + idx * 350,
                            spriteKey: cMember.spriteKey || 'custom_townsfolk',
                            faction: faction.id,
                            factionRank: cMember.role || 'courtier',
                            politicalTitle: cMember.title || 'Noble'
                        }));
                        
                        const merchants = standardNpcs.filter(n => 
                            n.name.toLowerCase().includes('merchant') || 
                            n.name.toLowerCase().includes('blacksmith') || 
                            n.name.toLowerCase().includes('alchemist')
                        );
                        zoneData.npcs = [...merchants.slice(0, 1), ...courtNpcs];
                    } else {
                        // Normal town: promote one of the generic NPCs to a local official
                        if (zoneData.npcs && zoneData.npcs.length > 0) {
                            const candidate = zoneData.npcs[0];
                            candidate.faction = faction.id;
                            candidate.factionRank = 'officer';
                            candidate.politicalTitle = `Guard Officer`;
                            candidate.persona += ` They represent ${faction.name} in this region.`;
                        }
                    }
                }
            }
            
            return zoneData;
        } catch (err) {
            console.error("Gemini zone generation error:", err);
            
            const isTownIndex = Math.abs(zoneIndex) > 0 && Math.abs(zoneIndex) % 4 === 0;
            const fallbackType = (zoneIndex === 0 || isTownIndex) ? 'Safe' : 'Dangerous';
            const defaultName = (fallbackType === 'Safe') ? `Town of Oakhaven (${zoneIndex})` : `Wilderness of Zone ${zoneIndex}`;
            
            const biomes = ['Forest', 'Desert', 'Winter', 'Dungeon', 'Plains', 'Deadwoods', 'Hell'];
            const defaultBiome = selectedBiome || biomes[Math.abs(zoneIndex) % biomes.length];

            const defaultZone = {
                name: defaultName,
                lore: "A forgotten region untouched by recent logs.",
                type: fallbackType,
                biome: defaultBiome,
                npcs: [],
                enemies: [],
                platforms: []
            };

            if (fallbackType === 'Safe') {
                defaultZone.npcs = [
                    { name: 'Oswin', persona: 'Cozy blacksmith who upgrades player weapons', spriteKey: 'blacksmith', x: 400 },
                    { name: 'Elysia', persona: 'Cozy alchemist who brews status effect potions', spriteKey: 'alchemist', x: 800 },
                    { name: 'Garrick', persona: 'Town mayor who gives advice', spriteKey: 'mayor', x: 1200 }
                ];
            } else {
                defaultZone.enemies = [
                    { type: 'slime', x: 500 },
                    { type: 'goblin', x: 900 },
                    { type: 'bat', x: 1300 },
                    { type: 'spider', x: 1700 },
                    { type: 'skeleton', x: 2100 }
                ];
            }
            return defaultZone;
        }
    }
};
