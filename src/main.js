// main.js - Entry point for the game

let game = null;
let titleGame = null;
let selectedClassData = null;

INDOOR_LOCATIONS = {
    tavern: {
        name: 'Tavern',
        icon: 'local_bar',
        bg: 'bg_tavern',
        desc: 'Rest and restore your vitals',
        npcSprite: 'blacksmith',
        npcName: 'Barkeep',
        npcPersona: 'A gruff but friendly tavern owner who serves ale and hears all the rumors.',
        floorTint: 0x8B7355,
        action: 'rest'
    },
    blacksmith: {
        name: 'Blacksmith',
        icon: 'hardware',
        bg: 'bg_blacksmith',
        desc: 'Forge and upgrade weapons',
        npcSprite: 'blacksmith',
        npcName: 'Master Smith',
        npcPersona: 'A master blacksmith who creates weapons of legend.',
        floorTint: 0x4A4A4A,
        action: 'forge'
    },
    coliseum: {
        name: 'Coliseum',
        icon: 'swords',
        bg: 'bg_colliseum',
        desc: 'Fight infinite waves of enemies',
        npcSprite: 'knight',
        npcName: 'Arena Champion Kael',
        npcPersona: 'A legendary gladiator scarred from a thousand battles who runs the arena games. He respects only strength and rewards those who survive the endless waves. Once a mere pit fighter, he earned his freedom through sheer brutality.',
        floorTint: 0x666666,
        action: 'arena'
    },
    apothecary: {
        name: 'Apothecary',
        icon: 'science',
        bg: 'bg_apothecary',
        desc: 'Brew and buy potions',
        npcSprite: 'alchemist',
        npcName: 'Apothecary',
        npcPersona: 'A mysterious alchemist surrounded by bubbling concoctions.',
        floorTint: 0x3D5A3D,
        action: 'brew'
    },
    estate: {
        name: 'Your Estate',
        icon: 'home',
        bg: 'bg_cottage',
        desc: 'Rest and manage your homestead',
        npcSprite: 'spouse', // We will dynamically set this
        npcName: 'Your Spouse',
        npcPersona: 'Your loving spouse who manages the estate while you adventure.',
        floorTint: 0x5C4033,
        action: 'estate'
    },
    guild_hall: {
        name: 'Guild Hall',
        icon: 'military_tech',
        bg: 'bg_guild_hall',
        desc: 'Accept bounty contracts',
        npcSprite: 'knight',
        npcName: 'Guildmaster',
        npcPersona: 'A scarred veteran who posts bounties and rewards brave adventurers.',
        floorTint: 0x6B6B6B,
        action: 'contracts'
    },
    temple: {
        name: 'Temple',
        icon: 'church',
        bg: 'bg_temple',
        desc: 'Pray for blessings & healing',
        npcSprite: 'priest_3',
        npcName: 'High Priestess',
        npcPersona: 'A serene priestess who channels divine power to heal the wounded and bestow holy blessings upon worthy souls. She charges 25 gold for a full divine healing.',
        floorTint: 0x8888AA,
        action: 'pray'
    },
    library: {
        name: 'Library',
        icon: 'menu_book',
        bg: 'bg_library',
        desc: 'Study to increase intelligence',
        npcSprite: 'wizard',
        npcName: 'Head Librarian',
        npcPersona: 'An old wizard who speaks in riddles and guards ancient knowledge.',
        floorTint: 0x4A3B2C,
        action: 'study'
    },
    training: {
        name: 'Training Grounds',
        icon: 'swords',
        bg: 'bg_training',
        desc: 'Spar for safe XP',
        npcSprite: 'samurai',
        npcName: 'Weapons Master',
        npcPersona: 'A disciplined warrior who trains adventurers through combat drills.',
        floorTint: 0xAA9966,
        action: 'train'
    },
    throne_room: {
        name: 'Throne Room',
        icon: 'castle',
        bg: 'bg_throne_room',
        desc: 'Audience with the ruler',
        npcSprite: 'human_king',
        npcName: 'The King',
        npcPersona: 'The ruler of this kingdom.',
        floorTint: 0x8B0000,
        action: 'audience',
        capitalOnly: true  // Only shown in capital cities
    },
    warrior_guild: {
        name: 'Warrior Guild',
        icon: 'shield',
        bg: 'bg_warrior_guild',
        desc: 'Recruit Knights and Samurai',
        npcSprite: 'heavy_knight',
        npcName: 'Grandmaster Ironclad',
        npcPersona: 'A stern, heavily armored commander who trains elite fighters. He values discipline and coin. He charges 100 gold to recruit a Knight and 150 gold for a Samurai.',
        floorTint: 0x555555,
        action: 'recruit_warrior'
    },
    magic_guild: {
        name: 'Magic Guild',
        icon: 'auto_awesome',
        bg: 'bg_magic_guild',
        desc: 'Recruit Wizards and Pyromancers',
        npcSprite: 'wizard',
        npcName: 'Archmage Ignis',
        npcPersona: 'A wise elder wizard surrounded by fire and magic runes. He recruits magical adepts for those who can pay. He charges 150 gold for a Wizard and 200 gold for a Pyromancer.',
        floorTint: 0x3d305a,
        action: 'recruit_mage'
    },
    temple_sanctum: {
        name: 'Temple Sanctum',
        icon: 'favorite',
        bg: 'bg_temple_sanctum',
        desc: 'Recruit Priests to heal your party',
        npcSprite: 'priest',
        npcName: 'Abbot Gregory',
        npcPersona: 'A gentle monk who helps holy adventurers find loyal priests. He requires a donation of 150 gold to the temple, or pure good alignment (+30).',
        floorTint: 0x777799,
        action: 'recruit_priest'
    },
    ranger_lodge: {
        name: 'Ranger Lodge',
        icon: 'forest',
        bg: 'bg_ranger_lodge',
        desc: 'Recruit Rangers and archers',
        npcSprite: 'ranger',
        npcName: 'Huntmaster Robin',
        npcPersona: 'An agile woodman who coordinates the rangers of the realm. He charges 120 gold, or requires at least +20 alignment.',
        floorTint: 0x3d523d,
        action: 'recruit_ranger'
    },
    elven_sanctum: {
        name: 'Elven Sanctum',
        icon: 'magic_button',
        bg: 'bg_elven_sanctum',
        desc: 'Recruit Elven Spellblades',
        npcSprite: 'elven_spellblade',
        npcName: 'Spellblade Lorelei',
        npcPersona: 'An elegant elf spellblade commander who guards the forest secrets. She sponsors spellblades to join worthy causes for 180 gold, or at least +40 alignment.',
        floorTint: 0x2d5e60,
        action: 'recruit_spellblade'
    },
    witches_coven: {
        name: 'Witches Coven',
        icon: 'dark_mode',
        bg: 'bg_witches_coven',
        desc: 'Recruit Witches and shadow mages',
        npcSprite: 'witch',
        npcName: 'Coven Mother Morbida',
        npcPersona: 'A sinister witch chanting over a dark cauldron. She demands a dark sacrifice of 200 gold or chaotic/evil alignment (-30 or lower) to summon a witch ally.',
        floorTint: 0x3d203d,
        action: 'recruit_witch'
    }
};

window.formatLeaderName = function(title, name) {
    if (!title) return name || '';
    if (!name) return title || '';
    const titleWords = title.split(/\s+/).map(w => w.toLowerCase());
    const firstWordOfName = name.split(/\s+/)[0];
    if (firstWordOfName && titleWords.includes(firstWordOfName.toLowerCase())) {
        return title + " " + name.substring(firstWordOfName.length).trim();
    }
    return title + " " + name;
};

// Initialize the title screen Phaser canvas (animated sprites behind the HTML menu)
function initTitleScreen() {
    if (titleGame) return; // Already running
    titleGame = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: 'title-canvas',
        transparent: true,
        pixelArt: true,
        width: window.innerWidth,
        height: window.innerHeight,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [TitleScene],
        banner: false,
        audio: { noAudio: true }
    });
}

// classesData, growths, and calculateStatsForLevel are now loaded from src/data/ClassesData.js
// creationAllocations, renderCreationSkillsGrid, showTitleScreen, showCreateScreen, selectClass are now loaded from src/world/CharacterCreationManager.js

function startGame(saveDataParam) {
    saveData = saveDataParam;
    // Destroy the title screen Phaser instance before creating the gameplay one
    if (titleGame) {
        titleGame.destroy(true);
        titleGame = null;
    }
    const container = document.getElementById('game-container');
    if (container) container.innerHTML = '';

    // Hide Create UI and show Game UI
    document.getElementById('ui-create').style.display = 'none';
    document.getElementById('ui-select').style.display = 'none';
    document.getElementById('ui-title').style.display = 'none';
    // HUD is managed by GameScene now

    window.selectedClass = window.classesData[saveData.classId];
    saveData = JSON.parse(JSON.stringify(saveData));
    if (saveData) {
        saveData.narrativeJournal = saveData.narrativeJournal || [];
    }

    // Character Stats & Level Progression Migration
    if (saveData && saveData.level) {
        // Always recalculate base stats based on level to correct/heal any frozen stats from the saving bug
        saveData.stats = window.calculateStatsForLevel(saveData.classId || 'knight', saveData.level);
        saveData.stats.migratedProgress = true;
        
        if (!saveData.passiveSkills || saveData.skillPoints === undefined) {
            saveData.passiveSkills = saveData.passiveSkills || {};
            const totalPoints = 3 + (saveData.level - 1);
            let spentPoints = 0;
            for (const skillId in saveData.passiveSkills) {
                spentPoints += saveData.passiveSkills[skillId] || 0;
            }
            saveData.skillPoints = Math.max(0, totalPoints - spentPoints);
            console.log(`[Migration] Migrated Level ${saveData.level} character to new progression. Stats:`, saveData.stats, `Skill Points:`, saveData.skillPoints);
        }
    }

    // Load character-specific autoplay settings or initialize defaults
    autoplayConfig = saveData.autoplayConfig || {
        preset: 'custom',
        targetZone: 0,
        coliseumGrind: false,
        townFocus: 50,
        partyBuildFocus: 50,
        questFocus: 70,
        selfPotionPct: 40,
        partyPotionPct: 40,
        spellRate: 50,
        dashFreq: 30,
        blockRate: 20,
        heroPersonality: ''
    };
    if (!saveData.autoplayConfig) {
        saveData.autoplayConfig = JSON.parse(JSON.stringify(autoplayConfig));
    }

    // Migrate existing saves — add political system fields if missing
    if (!saveData.factionReputation) saveData.factionReputation = {};
    if (!saveData.politicalChoices) saveData.politicalChoices = [];
    if (saveData.currentTitle === undefined) saveData.currentTitle = null;
    if (!saveData.visitedZones) saveData.visitedZones = [saveData.currentZone || 0];
    if (!saveData.discoveredKingdoms) saveData.discoveredKingdoms = {};

    // Deduplicate/rename any duplicate kingdom names in discoveredKingdoms (Phase 21)
    if (saveData && saveData.discoveredKingdoms) {
        const rootKeywords = ["duskveil", "frosthold", "willowbrook", "ashenmoor", "tidereach", "embercrown", "vaelgard", "zanj-abar", "irondeep"];
        
        // Helper to normalize names by extracting the root keyword or fallback to lowercase clean string
        const normalizeName = (name) => {
            let n = (name || "").toLowerCase().trim();
            if (n.startsWith("the ")) {
                n = n.substring(4).trim();
            }
            for (const kw of rootKeywords) {
                if (n.includes(kw)) return kw;
            }
            return n;
        };

        // Collect all names currently in use in the world
        const knownWorldNames = new Set();
        for (const key in WORLD_KINGDOMS) {
            knownWorldNames.add(normalizeName(WORLD_KINGDOMS[key].name));
        }

        // We want to detect duplicates within discoveredKingdoms or conflicts with the known world
        const duplicates = [];
        const seenNames = new Set(knownWorldNames);
        
        // Sort discovered kingdoms by starting zone to ensure deterministic processing
        const kList = Object.values(saveData.discoveredKingdoms);
        kList.sort((a, b) => a.zoneRange[0] - b.zoneRange[0]);

        kList.forEach(k => {
            const normalized = normalizeName(k.name);
            if (seenNames.has(normalized)) {
                // It is a duplicate or conflicts with the known world!
                duplicates.push(k);
            } else {
                seenNames.add(normalized);
            }
        });

        if (duplicates.length > 0) {
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
                },
                {
                    name: 'Lost Archipelago of Aethelgard',
                    desc: 'A sun-drenched network of tropical islands and coral reefs, ruled by a coalition of free corsairs.',
                    biomes: ['Coastal', 'Forest'],
                    factionName: 'The Tideborn Alliance',
                    factionColor: '#11aa99',
                    leaderTitle: 'High Admiral',
                    leaderName: 'Kaelen Vance',
                    leaderPersona: 'A charismatic sea captain who believes in individual liberty, fair trade, and naval superiority.',
                    townNames: ["Tidewatch", "Coralhaven", "Sirenspire", "Windward"]
                },
                {
                    name: 'Volcanic Sultanate of Khar-Dunes',
                    desc: 'A majestic desert emirate built around geothermal geysers and rich basalt deposits.',
                    biomes: ['Desert', 'Hell'],
                    factionName: 'The Firebrand Cartel',
                    factionColor: '#dd5522',
                    leaderTitle: 'Grand Emir',
                    leaderName: 'Sargon the Golden',
                    leaderPersona: 'A proud, mercantile ruler who controls the obsidian trade in the burning waste.',
                    townNames: ["Khor-Brimstone", "Basaltgate", "Oasis-of-Ash", "Geyserkeep"]
                },
                {
                    name: 'Undercity of Underrealm',
                    desc: 'A deep subterranean labyrinth of bioluminescent mushrooms and ancient dwarven ruins.',
                    biomes: ['Cave', 'Dungeon'],
                    factionName: 'The Myconid Council',
                    factionColor: '#55bb66',
                    leaderTitle: 'High Archon',
                    leaderName: 'Galanoth the Deepwood',
                    leaderPersona: 'A reclusive spellcaster who seeks to preserve the deep caverns from surface invaders.',
                    townNames: ["Sporefall", "Fungusglen", "Glowshroom", "Mycosect"]
                }
            ];

            let templateIdx = 0;
            duplicates.forEach(k => {
                // Find the next template that is not currently in seenNames
                let template = null;
                let isModified = false;
                while (templateIdx < templates.length) {
                    const temp = templates[templateIdx];
                    templateIdx++;
                    if (!seenNames.has(normalizeName(temp.name))) {
                        template = temp;
                        break;
                    }
                }

                // Fallback to original index if we somehow exhaust templates, but mutate it to guarantee uniqueness!
                if (!template) {
                    template = templates[Math.floor(Math.abs(k.zoneRange[0]) / 16) % templates.length];
                    isModified = true;
                }

                const baseName = template.name;
                const finalizedName = isModified ? `New ${baseName}` : baseName;
                
                // Keep checking if the name is already in seenNames, if so, append range start to be safe
                let uniqueName = finalizedName;
                if (seenNames.has(normalizeName(uniqueName))) {
                    uniqueName = `${baseName} Frontier`;
                }
                if (seenNames.has(normalizeName(uniqueName))) {
                    uniqueName = `${baseName} of Zone ${k.zoneRange[0]}`;
                }

                k.name = uniqueName;
                k.desc = template.desc;
                k.biomes = template.biomes;
                k.factionName = template.factionName;
                k.factionColor = template.factionColor;
                k.leaderTitle = template.leaderTitle;
                k.leaderName = template.leaderName;
                k.leaderPersona = template.leaderPersona;

                let fid = template.factionName.toLowerCase().trim();
                if (fid.startsWith("the ")) {
                    fid = fid.substring(4);
                }
                fid = fid.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                k.rulingFaction = fid;

                // Re-populate townNames
                const fallbackTownNames = {};
                const startZone = k.zoneRange[0];
                const endZone = k.zoneRange[1];
                const townZones = [];
                for (let z = startZone; z <= endZone; z++) {
                    if (z === 0 || (Math.abs(z) > 0 && Math.abs(z) % 4 === 0)) {
                        townZones.push(z);
                    }
                }
                townZones.forEach((z, i) => {
                    const name = (z === k.capital) ? `${template.name} Capital` : template.townNames[i % template.townNames.length];
                    fallbackTownNames[z] = name;
                    if (saveData.zones && saveData.zones[z]) {
                        saveData.zones[z].name = name;
                    }
                });
                k.townNames = fallbackTownNames;
                seenNames.add(template.name.toLowerCase().trim());
                console.log(`Migrated duplicate kingdom to ${template.name} for range [${startZone}, ${endZone}]`);
            });

            // Persist the changes to localStorage!
            try {
                const saves = window.getSaves();
                const idx = saves.findIndex(s => s.id === saveData.id);
                const clonedSave = JSON.parse(JSON.stringify(saveData));
                if (idx > -1) {
                    saves[idx] = clonedSave;
                } else {
                    saves.push(clonedSave);
                }
                window.saveSaves(saves);
                console.log("Successfully persisted migrated duplicate kingdoms to localStorage!");
            } catch (e) {
                console.error("Failed to persist migrated save data:", e);
            }
        }
    }

    // Ensure all discovered kingdoms have their rulingFaction ID follow the correct faction naming convention (Phase 21)
    let saveNeededForHeal = false;
    if (saveData && saveData.discoveredKingdoms) {
        for (const kId in saveData.discoveredKingdoms) {
            const k = saveData.discoveredKingdoms[kId];
            if (k.factionName) {
                let fid = k.factionName.toLowerCase().trim();
                if (fid.startsWith("the ")) {
                    fid = fid.substring(4);
                }
                fid = fid.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                
                // If it changed, update it!
                if (k.rulingFaction !== fid) {
                    console.log(`Healing rulingFaction ID for ${k.name}: ${k.rulingFaction} -> ${fid}`);
                    
                    // Migrate faction reputation to the new ID if it exists under the old ID
                    const oldFid = k.rulingFaction;
                    if (saveData.factionReputation && saveData.factionReputation[oldFid] !== undefined) {
                        saveData.factionReputation[fid] = saveData.factionReputation[oldFid];
                        delete saveData.factionReputation[oldFid];
                    }
                    
                    k.rulingFaction = fid;
                    saveNeededForHeal = true;
                }
            }
        }
    }

    if (saveNeededForHeal) {
        try {
            const saves = window.getSaves();
            const idx = saves.findIndex(s => s.id === saveData.id);
            const clonedSave = JSON.parse(JSON.stringify(saveData));
            if (idx > -1) {
                saves[idx] = clonedSave;
            } else {
                saves.push(clonedSave);
            }
            window.saveSaves(saves);
            console.log("Successfully persisted healed rulingFaction IDs to localStorage!");
        } catch (e) {
            console.error("Failed to persist healed save data:", e);
        }
    }

    if (!saveData.revealedIntel) saveData.revealedIntel = {};
    if (!saveData.knownLanguages) {
        const cls = saveData.class || 'adventurer';
        const startLangs = ['common'];
        if (cls === 'wizard') startLangs.push('celestial');
        else if (cls === 'ranger') startLangs.push('elvish');
        else if (cls === 'knight') startLangs.push('dwarvish');
        saveData.knownLanguages = startLangs;
    }

    // Re-register discovered frontier factions (Phase 10) and populate townNames
    if (window.registerFrontierKingdomFaction) {
        for (const kId in saveData.discoveredKingdoms) {
            const kingdom = saveData.discoveredKingdoms[kId];
            window.registerFrontierKingdomFaction(kingdom);
            
            // Pop townNames into saveData.zones if missing
            if (kingdom.townNames) {
                if (!saveData.zones) saveData.zones = {};
                for (const zIdx in kingdom.townNames) {
                    if (!saveData.zones[zIdx]) {
                        saveData.zones[zIdx] = {
                            name: kingdom.townNames[zIdx],
                            biome: (parseInt(zIdx) === kingdom.capital) ? 'Capital' : 'Town'
                        };
                    }
                }
            }
        }
    }

    // Heal/migrate town names in existing save data (bugfix)
    if (window.getTownNameForZone && saveData.zones) {
        for (const zoneIdxStr in saveData.zones) {
            const zIdx = parseInt(zoneIdxStr);
            const isTownIndex = zIdx === 0 || (Math.abs(zIdx) > 0 && Math.abs(zIdx) % 4 === 0);
            if (isTownIndex && zIdx !== 777 && zIdx !== -666) {
                const correctName = window.getTownNameForZone(zIdx);
                const zone = saveData.zones[zoneIdxStr];
                if (zone && zone.name !== correctName) {
                    console.log(`[Migration] Correcting town name for zone ${zIdx}: "${zone.name}" -> "${correctName}"`);
                    zone.name = correctName;
                }
            }
        }
    }

    const config = {
        type: Phaser.AUTO,
        width: 1280,
        height: 720,
        parent: 'game-container',
        pixelArt: true,
        pauseOnBlur: false,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 1200 },
                debug: false // Turned off pink/blue borders
            }
        },
        scene: [GameScene]
    };

    game = new Phaser.Game(config);
    window.game = game;
}

window.returnToMainMenu = function() {
    if (game) {
        // Find active scene and save player data
        const scene = game.scene.scenes[0];
        if (scene && scene.player && scene.player.saveGame) {
            scene.player.saveGame();
        }
        
        // Write saveData to localStorage
        if (saveData) {
            const saves = getSaves();
            const saveIndex = saves.findIndex(s => s.id === saveData.id);
            const clonedSave = JSON.parse(JSON.stringify(saveData));
            if (saveIndex > -1) {
                saves[saveIndex] = clonedSave;
            } else {
                saves.push(clonedSave);
            }
            saveSaves(saves);
        }
        
        game.destroy(true);
        game = null;
        window.game = null;
        const container = document.getElementById('game-container');
        if (container) container.innerHTML = '';
    }
    
    // Hide game HUD, show title screen
    document.getElementById('game-hud').style.display = 'none';
    showTitleScreen();
    initTitleScreen(); // Re-initialize the title screen background canvas
};

// Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load skills specification
    fetch('src/assets/skills_specification.json')
        .then(res => res.json())
        .then(data => {
            PASSIVE_SKILLS_DATA = data;
            console.log(`Loaded ${data.length} passive skills specifications.`);
            if (window.selectedClassData) {
                renderCreationSkillsGrid();
            }
        })
        .catch(err => {
            console.error("Failed to load skills specification:", err);
        });

    // Progress loading bar
    const bar = document.getElementById('loading-bar-fill');
    const status = document.getElementById('loading-status');
    if (bar) bar.style.width = '60%';
    if (status) status.innerText = 'Initializing Phaser Engine...';

    // Boot the title screen Phaser canvas
    initTitleScreen();

    // Settings Modal Logic
    const settingsModal = document.getElementById('ui-menu-settings');
    const btnSettings = document.getElementById('btn-menu-settings');
    
    // Auto-open on load if Gemini API Key is missing so players are guided to input it
    // Load/Save functions helper for settings
    const loadSettingsToDOM = () => {
        document.getElementById('input-setting-gemini').value = localStorage.getItem("gemini_api_key") || "";
        document.getElementById('input-setting-chartopia').value = localStorage.getItem("chartopia_api_key") || "";
        document.getElementById('select-setting-cutscene-mode').value = localStorage.getItem("cutscene_mode") || "traditional";
        document.getElementById('select-setting-tts-enabled').value = localStorage.getItem("tts_enabled") || "enabled";
        document.getElementById('select-setting-lyria-enabled').value = localStorage.getItem("lyria_enabled") || "enabled";
    };

    // Auto-open on load if Gemini API Key is missing so players are guided to input it
    if (settingsModal && !localStorage.getItem("gemini_api_key")) {
        loadSettingsToDOM();
        settingsModal.style.display = 'flex';
    }

    if (settingsModal && btnSettings) {
        btnSettings.addEventListener('click', () => {
            loadSettingsToDOM();
            settingsModal.style.display = 'flex';
        });
        
        document.getElementById('btn-close-menu-settings').addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });

        document.getElementById('btn-save-settings').addEventListener('click', () => {
            const geminiKey = document.getElementById('input-setting-gemini').value.trim();
            const chartopiaKey = document.getElementById('input-setting-chartopia').value.trim();
            const cutsceneMode = document.getElementById('select-setting-cutscene-mode').value;
            const ttsEnabled = document.getElementById('select-setting-tts-enabled').value;
            const lyriaEnabled = document.getElementById('select-setting-lyria-enabled').value;
            
            if (geminiKey) localStorage.setItem("gemini_api_key", geminiKey);
            else localStorage.removeItem("gemini_api_key");
            
            if (chartopiaKey) localStorage.setItem("chartopia_api_key", chartopiaKey);
            else localStorage.removeItem("chartopia_api_key");

            localStorage.setItem("cutscene_mode", cutsceneMode);
            localStorage.setItem("tts_enabled", ttsEnabled);
            localStorage.setItem("lyria_enabled", lyriaEnabled);
            
            // Start or stop the auto-loop based on new setting
            window.startLyriaAutoLoop();
            
            alert("Settings saved successfully!");
            settingsModal.style.display = 'none';
        });

        document.getElementById('btn-reset-settings').addEventListener('click', () => {
            if (confirm("Are you sure you want to clear your stored configurations?")) {
                localStorage.removeItem("gemini_api_key");
                localStorage.removeItem("chartopia_api_key");
                localStorage.setItem("cutscene_mode", "traditional");
                localStorage.setItem("tts_enabled", "enabled");
                localStorage.setItem("lyria_enabled", "enabled");
                localStorage.removeItem("lyria_music_data");
                
                window.startLyriaAutoLoop();
                loadSettingsToDOM();
                alert("Configurations and custom music cleared.");
            }
        });
    }

    // Helper to detect rate limit or quota exceeded errors
    function isRateLimitError(err) {
        if (!err) return false;
        const str = String(err).toUpperCase();
        return str.includes("RESOURCE_EXHAUSTED") || 
               str.includes("429") || 
               str.includes("RATE_LIMIT") || 
               str.includes("RATE LIMIT") || 
               str.includes("QUOTA");
    }
    window.isRateLimitErrorGlobal = isRateLimitError; // Expose globally for GeminiService

    window.handleGeminiRateLimit = function(errorMsg, isFatal) {
        console.warn(`[Gemini Rate Limit Handler] errorMsg: ${errorMsg}, isFatal: ${isFatal}`);
        
        if (isFatal) {
            // Force return to main menu
            alert("⚠️ Critical Gemini API Quota Exceeded (RESOURCE_EXHAUSTED):\n\n" +
                  "Your API Key has run out of quota or hit a rate limit. Because text narrative generation is required to play the game, you are being returned to the main menu.\n\n" +
                  "Please check your API Key settings or billing status on Google AI Studio.");
            
            if (window.returnToMainMenu) {
                window.returnToMainMenu();
            } else {
                location.reload();
            }
        } else {
            // Non-fatal. Auto-disable audio, music, and omni video cutscenes to save remaining quota.
            const wasTtsEnabled = localStorage.getItem("tts_enabled") !== "disabled";
            const wasLyriaEnabled = localStorage.getItem("lyria_enabled") !== "disabled";
            const wasOmniCutscenes = localStorage.getItem("cutscene_mode") === "omni";

            if (wasTtsEnabled || wasLyriaEnabled || wasOmniCutscenes) {
                localStorage.setItem("tts_enabled", "disabled");
                localStorage.setItem("lyria_enabled", "disabled");
                localStorage.setItem("cutscene_mode", "traditional");

                // Update settings DOM if open/available
                const selectTts = document.getElementById('select-setting-tts-enabled');
                const selectLyria = document.getElementById('select-setting-lyria-enabled');
                const selectCutscene = document.getElementById('select-setting-cutscene-mode');
                if (selectTts) selectTts.value = "disabled";
                if (selectLyria) selectLyria.value = "disabled";
                if (selectCutscene) selectCutscene.value = "traditional";

                // Stop active Lyria loop
                if (window.startLyriaAutoLoop) {
                    window.startLyriaAutoLoop();
                }

                alert("⚠️ Gemini API Rate Limit Warning:\n\n" +
                      "A non-essential request (music, speech read-aloud, or video cutscenes) triggered a rate limit/quota error.\n\n" +
                      "To preserve your remaining API key usage for core storytelling, AI Background Music, AI Chat Read-Aloud, and Omni video cutscenes have been turned OFF autonomously.");
            }
        }
    };

    // Lyria Music Generation Handler
    window.playLyriaMusic = async function(prompt) {
        const key = localStorage.getItem("gemini_api_key");
        if (!key) return;
        
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/lyria-3-clip-preview:generateContent?key=${key}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        responseModalities: ["AUDIO"]
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API returned ${response.status}: ${errText}`);
            }

            const data = await response.json();
            console.log("[Lyria API Response Data]:", JSON.stringify(data, null, 2));
            
            // Find base64 audio data by scanning all parts in the response candidate
            let base64Audio = null;
            let audioMime = "audio/mp3";
            
            const parts = data.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                    base64Audio = part.inlineData.data;
                    audioMime = part.inlineData.mimeType || "audio/mp3";
                    break;
                } else if (part.inline_data && part.inline_data.data) {
                    base64Audio = part.inline_data.data;
                    audioMime = part.inline_data.mime_type || "audio/mp3";
                    break;
                }
            }
            
            if (!base64Audio) {
                throw new Error("No audio data found in Lyria response.");
            }
            
            // Stop current audio if playing
            if (window.lyriaAudioInstance) {
                window.lyriaAudioInstance.pause();
                window.lyriaAudioInstance = null;
            }
            
            const audioSrc = `data:${audioMime};base64,${base64Audio}`;
            
            // Cache generated music
            localStorage.setItem("lyria_music_data", audioSrc);
            
            const audio = new Audio(audioSrc);
            audio.loop = true;
            audio.volume = 0.5;
            
            window.lyriaAudioInstance = audio;
            audio.play().catch(e => {
                console.log("Autoplay blocked, adding click listener to play generated music");
                const startOnInteraction = () => {
                    audio.play().catch(e => console.warn(e));
                    document.removeEventListener('click', startOnInteraction);
                };
                document.addEventListener('click', startOnInteraction);
            });
        } catch (err) {
            console.error("Failed to generate background music:", err);
            if (isRateLimitError(err) || String(err).includes("429")) {
                window.handleGeminiRateLimit(err.message || String(err), false);
            }
        }
    };

    let musicInterval = null;
    window.startLyriaAutoLoop = () => {
        if (musicInterval) {
            clearInterval(musicInterval);
            musicInterval = null;
        }

        const isMusicEnabled = localStorage.getItem("lyria_enabled") !== "disabled";
        if (!isMusicEnabled) {
            if (window.lyriaAudioInstance) {
                window.lyriaAudioInstance.pause();
                window.lyriaAudioInstance = null;
            }
            return;
        }

        const triggerGen = async () => {
            const hasKey = localStorage.getItem("gemini_api_key");
            const isMusicEnabledNow = localStorage.getItem("lyria_enabled") !== "disabled";
            if (!hasKey || !isMusicEnabledNow) return;
            
            console.log("[Lyria Auto-Loop] Generating fresh background loop...");
            const defaultPrompt = "A loopable, atmospheric retro fantasy background music track with soft strings and acoustic guitar, suitable for side-scroller gameplay.";
            await window.playLyriaMusic(defaultPrompt);
        };

        const cachedMusic = localStorage.getItem("lyria_music_data");
        if (cachedMusic) {
            if (!window.lyriaAudioInstance) {
                const audio = new Audio(cachedMusic);
                audio.loop = true;
                audio.volume = 0.5;
                window.lyriaAudioInstance = audio;
                audio.play().catch(e => {
                    const startOnInteraction = () => {
                        audio.play().catch(e => console.warn(e));
                        document.removeEventListener('click', startOnInteraction);
                    };
                    document.addEventListener('click', startOnInteraction);
                });
            }
        } else {
            triggerGen();
        }

        // Set interval to run every 5 minutes (300,000 ms)
        musicInterval = setInterval(triggerGen, 300000);
    };

    // Auto-run loop on start
    window.startLyriaAutoLoop();

    document.getElementById('btn-new-game').addEventListener('click', showCreateScreen);
    
    // Help Modal Logic
    const helpModal = document.getElementById('ui-menu-help');
    if (helpModal) {
        document.getElementById('btn-menu-help').addEventListener('click', () => {
            helpModal.style.display = 'flex';
        });
        document.getElementById('btn-close-menu-help').addEventListener('click', () => {
            helpModal.style.display = 'none';
        });

    }

        // Tab Switching
        const tabBtns = document.querySelectorAll('.help-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Reset buttons
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.color = '#aaa';
                    b.style.borderBottomColor = 'transparent';
                });
                // Activate clicked button
                btn.classList.add('active');
                btn.style.color = '#2ddbde';
                btn.style.borderBottomColor = '#2ddbde';

                // Hide all panels
                const panels = document.querySelectorAll('.help-tab-panel');
                panels.forEach(p => p.style.display = 'none');

                // Show selected panel
                const targetTab = btn.getAttribute('data-tab');
                const targetPanel = document.getElementById(`help-content-${targetTab}`);
                if (targetPanel) {
                    if (targetTab === 'controls' || targetTab === 'combat' || targetTab === 'factions') {
                        targetPanel.style.display = 'flex';
                    } else {
                        targetPanel.style.display = 'block';
                    }
                }
            });
        });
    
    // Continue Screen Logic
    const btnContinue = document.getElementById('btn-continue');
    
    function renderContinueScreen() {
        const container = document.getElementById('save-slots-container');
        container.innerHTML = '';
        
        if (firebase.auth().currentUser && window.cachedCloudSaves === null) {
            container.innerHTML = `<div class="text-center py-12 text-secondary font-bold uppercase tracking-wider text-[14px]">Loading Cloud Saves...</div>`;
            return;
        }
        
        const saves = getSaves();
        for (let i = 0; i < 8; i++) {
            if (i < saves.length) {
                const save = saves[i];
                // Migrate old 'assassin' saves to 'samurai'
                if (save.classId === 'assassin') save.classId = 'samurai';
                const cData = window.classesData[save.classId];
                // Calculate hours/mins
                const hrs = Math.floor(save.playTime / 60);
                const mins = save.playTime % 60;
                
                const slotDiv = document.createElement('div');
                slotDiv.className = "flex items-stretch bg-surface-container-highest border-2 border-outline-variant hover:border-secondary transition-colors group w-full";
                
                // The slot image container is w-16 h-16 (64x64). 
                // Scale so the frame fills the 64px box, apply per-class previewScale
                const scale = (64 / cData.frameHeight) * (cData.previewScale || 1);
                
                // Determine which frame to show and calculate position
                let portraitOffsetX, portraitOffsetY;
                if (cData.animFrames && cData.animFrames.idle) {
                    // Classes with explicit animFrames (samurai, ranger, wizard)
                    const idleFrame = cData.animFrames.idle.start;
                    // Sheet widths: knight=80*10=800, others=768
                    const sheetCols = cData.sheetCols || (cData.frameWidth === 80 ? 10 : 12);
                    const frameCol = idleFrame % sheetCols;
                    const frameRow = Math.floor(idleFrame / sheetCols);
                    portraitOffsetX = (64 - (cData.frameWidth * scale)) / 2 - (frameCol * cData.frameWidth * scale);
                    portraitOffsetY = -(frameRow * cData.frameHeight * scale);
                } else {
                    // Row-based classes (knight)
                    portraitOffsetX = (64 - (cData.frameWidth * scale)) / 2;
                    portraitOffsetY = -(cData.idleRow || 0) * (cData.frameHeight * scale);
                }
                
                // Allow per-class manual overrides for fine-tuning
                if (cData.slotPortraitX !== undefined) portraitOffsetX = cData.slotPortraitX;
                if (cData.slotPortraitY !== undefined) portraitOffsetY = cData.slotPortraitY;
                
                // We need to load the image to get the full sheet size for background-size
                const shouldFlip = cData.flipX || cData.slotFlipX;
                const transform = shouldFlip ? 'transform: scaleX(-1);' : '';
                const sheetBgCols = cData.sheetCols || (cData.frameWidth === 80 ? 10 : 12);
                const imageHtml = cData.isSheet 
                    ? `<div style="width: 100%; height: 100%; background-image: url('${cData.image}'); background-position: ${portraitOffsetX}px ${portraitOffsetY}px; background-repeat: no-repeat; image-rendering: pixelated; background-size: ${sheetBgCols * cData.frameWidth * scale}px auto; ${transform}"></div>`
                    : `<img src="${cData.image}" alt="${cData.name}" class="w-full h-full object-contain image-rendering-pixelated" style="${transform}">`;

                slotDiv.innerHTML = `
                    <button class="select-btn flex-1 flex items-center gap-6 p-4 text-left cursor-pointer bg-transparent border-none focus:outline-none w-full h-full">
                        <div class="w-16 h-16 bg-surface-container border border-outline flex-shrink-0 flex items-center justify-center p-2 overflow-hidden">
                            ${imageHtml}
                        </div>
                        <div class="flex-1">
                            <h4 class="font-headline-md text-[20px] text-on-surface group-hover:text-secondary uppercase">${save.name}</h4>
                            <p class="font-label-caps text-on-surface-variant text-[12px] uppercase tracking-wider">Level ${save.level} ${cData.name} • ${hrs}h ${mins}m</p>
                        </div>
                    </button>
                    <button class="delete-save-btn p-4 text-on-surface-variant hover:text-error transition-colors flex items-center justify-center cursor-pointer border-l-2 border-outline-variant bg-surface-container hover:bg-error/10" data-id="${save.id}" title="Delete Save">
                        <span class="material-symbols-outlined text-3xl">delete</span>
                    </button>
                `;
                
                // Play
                slotDiv.querySelector('.select-btn').addEventListener('click', () => startGame(save));
                // Delete
                slotDiv.querySelector('.delete-save-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if(confirm(`Are you sure you want to delete ${save.name}?`)) {
                        const newSaves = getSaves().filter(s => s.id !== save.id);
                        saveSaves(newSaves);
                        renderContinueScreen(); // Re-render the list immediately
                    }
                });
                
                container.appendChild(slotDiv);
            } else {
                // Empty slot
                const div = document.createElement('div');
                div.className = "flex items-center gap-6 p-4 bg-surface-container-low border-2 border-dashed border-outline-variant opacity-50 select-none";
                div.innerHTML = `
                    <div class="w-16 h-16 flex items-center justify-center">
                        <span class="material-symbols-outlined text-4xl text-on-surface-variant">person_add</span>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-headline-md text-[20px] text-on-surface-variant uppercase">Empty Slot</h4>
                    </div>
                `;
                container.appendChild(div);
            }
        }
    }

    if(btnContinue) {
        btnContinue.addEventListener('click', () => {
            document.getElementById('ui-title').style.display = 'none';
            document.getElementById('ui-select').style.display = 'flex';
            renderContinueScreen();
        });
    }

    document.getElementById('btn-select-back').addEventListener('click', () => {
        document.getElementById('ui-select').style.display = 'none';
        document.getElementById('ui-title').style.display = 'flex';
    });

    // Create New Game
    document.getElementById('btn-awaken').addEventListener('click', () => {
        const nameInput = document.getElementById('character-name-input');
        const name = nameInput.value.trim();
        
        if (!name) {
            nameInput.classList.add('border-error');
            nameInput.focus();
            return;
        }
        
        nameInput.classList.remove('border-error');
        
        const saves = getSaves();
        if (saves.length >= 8) {
            alert('No empty save slots available! Delete a save to make room.');
            return;
        }
        
        const newSave = {
            id: Date.now().toString(),
            name: name,
            classId: window.selectedClassData.id,
            level: 1,
            playTime: 0,
            lastSaved: Date.now(),
            isNewGame: true,
            // Political system
            factionReputation: {},
            politicalChoices: [],
            currentTitle: null,
            visitedZones: [0],  // Start with zone 0 (Willowbrook capital) discovered
            discoveredKingdoms: {},
            revealedIntel: {},
            knownLanguages: (window.selectedClassData.id === 'wizard' ? ['common', 'celestial'] :
                             window.selectedClassData.id === 'ranger' ? ['common', 'elvish'] :
                             window.selectedClassData.id === 'knight' ? ['common', 'dwarvish'] : ['common']),
            // Skills System starting allocations
            passiveSkills: JSON.parse(JSON.stringify(creationAllocations)),
            skillPoints: 0,
            narrativeJournal: []
        };
        
        saves.push(newSave);
        saveSaves(saves);
        startGame(newSave);
    });

    // Back from Create screen to Title
    document.getElementById('btn-create-back').addEventListener('click', showTitleScreen);

    // Next step button (validate name before proceeding)
    document.getElementById('btn-create-next').addEventListener('click', () => {
        const nameInput = document.getElementById('character-name-input');
        const name = nameInput.value.trim();
        if (!name) {
            nameInput.classList.add('border-error');
            nameInput.focus();
            return;
        }
        nameInput.classList.remove('border-error');
        window.setCreationStep(2);
    });

    // Previous step button
    document.getElementById('btn-create-prev').addEventListener('click', () => {
        window.setCreationStep(1);
    });

    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectClass(e.currentTarget.dataset.class);
        });
    });

    // Fighter Suite Button clicked from main menu
    const btnFighterSuite = document.getElementById('btn-fighter-suite');
    if (btnFighterSuite) {
        btnFighterSuite.addEventListener('click', () => {
            document.getElementById('ui-title').style.display = 'none';
            if (titleGame) {
                titleGame.destroy(true);
                titleGame = null;
            }
            document.getElementById('ui-fighter-suite').style.display = 'flex';
            startFighterSuite();
        });
    }

    // ==========================================
    // Firebase Auth & Cloud Saves Logic (Google Only)
    // ==========================================
    window.cachedCloudSaves = null;

    const authModal = document.getElementById('ui-menu-auth');
    const authStatusIcon = document.getElementById('auth-status-icon');
    const authStatusText = document.getElementById('auth-status-text');
    const btnAuthAction = document.getElementById('btn-auth-action');
    const btnCloseAuth = document.getElementById('btn-close-menu-auth');
    const btnAuthGoogle = document.getElementById('btn-auth-google');
    const authErrorMsg = document.getElementById('auth-error-msg');

    if (btnCloseAuth && authModal) {
        btnCloseAuth.addEventListener('click', () => {
            authModal.style.display = 'none';
        });
    }

    if (btnAuthAction && authModal) {
        btnAuthAction.addEventListener('click', () => {
            const user = firebase.auth().currentUser;
            if (user) {
                firebase.auth().signOut().then(() => {
                    alert("Logged out successfully.");
                }).catch(err => {
                    console.error("Sign out error:", err);
                });
            } else {
                authErrorMsg.innerText = '';
                authModal.style.display = 'flex';
            }
        });
    }

    if (btnAuthGoogle) {
        btnAuthGoogle.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            btnAuthGoogle.disabled = true;
            const originalText = btnAuthGoogle.innerText;
            btnAuthGoogle.innerText = "Connecting...";
            authErrorMsg.innerText = '';

            firebase.auth().signInWithPopup(provider)
                .then(() => {
                    authModal.style.display = 'none';
                    alert("Logged in with Google successfully!");
                })
                .catch((error) => {
                    authErrorMsg.innerText = error.message;
                })
                .finally(() => {
                    btnAuthGoogle.disabled = false;
                    btnAuthGoogle.innerText = originalText;
                });
        });
    }

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            if (authStatusIcon) {
                authStatusIcon.innerText = 'cloud';
                authStatusIcon.style.color = '#00ff00';
            }
            if (authStatusText) {
                authStatusText.innerText = `Logged in as: ${user.email}`;
            }
            if (btnAuthAction) {
                btnAuthAction.innerText = 'Sign Out';
            }

            const db = firebase.firestore();
            db.collection("users").doc(user.uid).get()
                .then((doc) => {
                    let cloudSaves = [];
                    if (doc.exists && doc.data().saves) {
                        cloudSaves = doc.data().saves;
                    }
                    window.cachedCloudSaves = cloudSaves;

                    let localSaves = [];
                    try {
                        const localData = localStorage.getItem('elden_soul_saves');
                        if (localData) localSaves = JSON.parse(localData);
                    } catch (e) {}

                    if (cloudSaves.length === 0 && localSaves.length > 0) {
                        if (confirm("We detected local saves on this device. Would you like to upload them to your new cloud account so you don't lose progress?")) {
                            window.saveSaves(localSaves);
                        }
                    }

                    if (document.getElementById('ui-select').style.display !== 'none') {
                        renderContinueScreen();
                    }
                })
                .catch((err) => {
                    console.error("Error loading cloud saves:", err);
                    window.cachedCloudSaves = [];
                });
        } else {
            window.cachedCloudSaves = null;
            if (authStatusIcon) {
                authStatusIcon.innerText = 'cloud_off';
                authStatusIcon.style.color = '#888';
            }
            if (authStatusText) {
                authStatusText.innerText = 'Guest Mode (Local Saves)';
            }
            if (btnAuthAction) {
                btnAuthAction.innerText = 'Sign In';
            }
            if (document.getElementById('ui-select').style.display !== 'none') {
                renderContinueScreen();
            }
        }
    });
});

// startFighterSuite and setupFighterHTMLHandlers are now loaded from src/scenes/FighterSuiteManager.js

// Save System Utils
window.getSaves = function() {
    if (firebase.auth().currentUser) {
        return window.cachedCloudSaves || [];
    } else {
        try {
            const data = localStorage.getItem('elden_soul_saves');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to parse saves', e);
            return [];
        }
    }
};

window.saveSaves = function(saves) {
    if (firebase.auth().currentUser) {
        window.cachedCloudSaves = saves;
        const user = firebase.auth().currentUser;
        const db = firebase.firestore();
        db.collection("users").doc(user.uid).set({
            saves: saves,
            lastUpdated: Date.now()
        }).catch(err => {
            console.error("Failed to save to Firestore:", err);
        });
    } else {
        try {
            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
        } catch (e) {
            console.error('Failed to save saves', e);
        }
    }
};

function getSaves() {
    return window.getSaves();
}

function saveSaves(saves) {
    window.saveSaves(saves);
}

// Initial Autoplay Config Defaults (persisted in localStorage)
let loadedApConfig = null;
try {
    const savedAp = localStorage.getItem('elden_soul_autoplay_config');
    if (savedAp) loadedApConfig = JSON.parse(savedAp);
} catch (e) {
    console.error('Failed to load autoplay config', e);
}

autoplayConfig = loadedApConfig || {
    preset: 'custom',
    targetZone: 0,
    coliseumGrind: false,
    townFocus: 50,
    partyBuildFocus: 50,
    questFocus: 70,
    selfPotionPct: 40,
    partyPotionPct: 40,
    spellRate: 50,
    dashFreq: 30,
    blockRate: 20,
    heroPersonality: ''
};

// Dismiss loading screen when all resources (fonts, icons, styles) have finished loading
window.addEventListener('load', () => {
    const bar = document.getElementById('loading-bar-fill');
    const status = document.getElementById('loading-status');
    if (bar) bar.style.width = '100%';
    if (status) status.innerText = 'Awakening...';
    
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            loader.style.opacity = '0';
            loader.style.transform = 'scale(1.05)';
            setTimeout(() => loader.remove(), 600);
        }
    }, 400);
});

// Lore logging and exporting utility
window.logGeneratedName = function(category, details) {
    let dict = {};
    try {
        dict = JSON.parse(localStorage.getItem("generated_lore_dictionary") || "{}");
    } catch (e) {
        dict = {};
    }
    
    if (!dict[category]) {
        dict[category] = [];
    }
    
    const exists = dict[category].some(item => item.name === details.name);
    if (!exists) {
        dict[category].push({
            ...details,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem("generated_lore_dictionary", JSON.stringify(dict, null, 2));
        console.log(`[LORE_LOG] Logged new ${category}:`, details);
    }
};

window.exportLoreDictionary = function() {
    const dataStr = localStorage.getItem("generated_lore_dictionary") || "{}";
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'generated_lore_dictionary.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    console.log("Lore dictionary exported successfully!");
};

window.autoAllocateNPCSkills = function(member) {
    if (!member || !member.classId || !PASSIVE_SKILLS_DATA) return;
    const classId = member.classId;
    const classSkills = PASSIVE_SKILLS_DATA.filter(s => s.classId === classId);
    if (classSkills.length === 0) return;

    member.passiveSkills = member.passiveSkills || {};
    const level = member.level || 1;
    let totalPoints = 3 + (level - 1);
    
    // Clear and distribute points sequentially
    classSkills.forEach(s => {
        member.passiveSkills[s.id] = 0;
    });

    let index = 0;
    while (totalPoints > 0) {
        const skill = classSkills[index % classSkills.length];
        const maxRank = skill.maxRank || 5;
        if (member.passiveSkills[skill.id] < maxRank) {
            member.passiveSkills[skill.id]++;
            totalPoints--;
        }
        index++;
        if (index > classSkills.length * 10) break;
    }
};

