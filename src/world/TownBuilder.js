/**
 * TownBuilder.js - Handles town layout generation, ambient NPC composition,
 * named shopkeeper placement, and the King's Guard system.
 * Extracted from WorldManager.js to modularize class code.
 */
window.TownBuilder = {
    buildTownDecorAndNPCs(wm, zoneData) {
        const scene = wm.scene;
        const currentZoneIdx = wm.currentZoneIndex;

        // Retroactively add town NPCs to old saves if missing
        if (!zoneData.npcs || zoneData.npcs.length < 4) {
            zoneData.npcs = [
                { name: (currentZoneIdx === 0) ? "Elara the Sage" : (window.CharacterComposer ? window.CharacterComposer.generateRandomName('wizard', false).split(" ")[0] + " the Sage" : "Elara the Sage"), persona: "A wise elder who offers counsel on magical threats.", x: 250, spriteKey: "npc" },
                { name: (currentZoneIdx === 0) ? "Brom the Hammer" : (window.CharacterComposer ? window.CharacterComposer.generateRandomName('warrior', true).split(" ")[0] + " the Hammer" : "Brom the Hammer"), persona: "A gruff blacksmith who forged his weapons in dragon fire.", x: 500, spriteKey: "blacksmith" },
                { name: (currentZoneIdx === 0) ? "Orion the Hunter" : (window.CharacterComposer ? window.CharacterComposer.generateRandomName('ranger', true).split(" ")[0] + " the Hunter" : "Orion the Hunter"), persona: "A quiet tracker offering goods from the wilds.", x: 750, spriteKey: "ranger" },
                { name: (currentZoneIdx === 0) ? "Ignatius the Alchemist" : (window.CharacterComposer ? window.CharacterComposer.generateRandomName('alchemist', true).split(" ")[0] + " the Alchemist" : "Ignatius"), persona: "An enigmatic alchemist selling curious concoctions.", x: 1000, spriteKey: "alchemist" }
            ];
            // Update cache
            const saves = window.getSaves();
            if (saveData && saveData.zones) {
                saveData.zones[currentZoneIdx] = JSON.parse(JSON.stringify(zoneData));
                const idx = saves.findIndex(s => s.id === saveData.id);
                const clonedSave = JSON.parse(JSON.stringify(saveData));
                if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
                window.saveSaves(saves);
            }
        } else if (currentZoneIdx !== 0) {
            // Rename default tutorial names to unique names in Zone 1+
            let changed = false;
            zoneData.npcs.forEach(npc => {
                if (npc.name === "Elara the Sage") {
                    npc.name = window.CharacterComposer ? window.CharacterComposer.generateRandomName('wizard', false).split(" ")[0] + " the Sage" : npc.name;
                    changed = true;
                } else if (npc.name === "Brom the Hammer") {
                    npc.name = window.CharacterComposer ? window.CharacterComposer.generateRandomName('warrior', true).split(" ")[0] + " the Hammer" : npc.name;
                    changed = true;
                } else if (npc.name === "Orion the Hunter") {
                    npc.name = window.CharacterComposer ? window.CharacterComposer.generateRandomName('ranger', true).split(" ")[0] + " the Hunter" : npc.name;
                    changed = true;
                } else if (npc.name === "Vespera" || npc.name === "Vespera the Alchemist" || npc.name === "Ignatius" || npc.name === "Ignatius the Alchemist" || npc.name.includes("the Alchemist") || npc.name.includes("the Hunter") || npc.name.includes("the Hammer") || npc.name.includes("the Sage")) {
                    // Rebuild name to strip double titles and correct gender alignment
                    if (npc.name.includes("the Sage")) {
                        let first = npc.name.split(" ")[0];
                        if (window.CharacterComposer && window.CharacterComposer.isFemaleName && !window.CharacterComposer.isFemaleName(first)) {
                            first = window.CharacterComposer.generateRandomName('wizard', false).split(" ")[0];
                        }
                        npc.name = first + " the Sage";
                    } else if (npc.name.includes("the Hammer")) {
                        let first = npc.name.split(" ")[0];
                        if (window.CharacterComposer && window.CharacterComposer.isFemaleName && window.CharacterComposer.isFemaleName(first)) {
                            first = window.CharacterComposer.generateRandomName('warrior', true).split(" ")[0];
                        }
                        npc.name = first + " the Hammer";
                    } else if (npc.name.includes("the Hunter")) {
                        let first = npc.name.split(" ")[0];
                        if (window.CharacterComposer && window.CharacterComposer.isFemaleName && window.CharacterComposer.isFemaleName(first)) {
                            first = window.CharacterComposer.generateRandomName('ranger', true).split(" ")[0];
                        }
                        npc.name = first + " the Hunter";
                    } else {
                        let first = npc.name.split(" ")[0];
                        if (window.CharacterComposer && window.CharacterComposer.isFemaleName && window.CharacterComposer.isFemaleName(first)) {
                            first = window.CharacterComposer.generateRandomName('alchemist', true).split(" ")[0];
                        }
                        npc.name = first + " the Alchemist";
                    }
                    changed = true;
                }
            });
            if (changed) {
                const saves = window.getSaves();
                if (saveData && saveData.zones) {
                    saveData.zones[currentZoneIdx] = JSON.parse(JSON.stringify(zoneData));
                    const idx = saves.findIndex(s => s.id === saveData.id);
                    const clonedSave = JSON.parse(JSON.stringify(saveData));
                    if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
                    window.saveSaves(saves);
                }
            }
        } else if (currentZoneIdx === 0) {
            // Rename Vespera to Ignatius in Zone 0 to match male sprite
            let changed = false;
            zoneData.npcs.forEach(npc => {
                if (npc.name === "Vespera" || npc.name === "Vespera the Alchemist") {
                    npc.name = "Ignatius the Alchemist";
                    changed = true;
                }
            });
            if (changed) {
                const saves = window.getSaves();
                if (saveData && saveData.zones) {
                    saveData.zones[currentZoneIdx] = JSON.parse(JSON.stringify(zoneData));
                    const idx = saves.findIndex(s => s.id === saveData.id);
                    const clonedSave = JSON.parse(JSON.stringify(saveData));
                    if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
                    window.saveSaves(saves);
                }
            }
        }

        // --- DECOR PERSISTENCE ---
        if (zoneData.decorLayout) {
            const isCapitalZone = window.isCapitalCity ? window.isCapitalCity(currentZoneIdx) : false;
            
            const hasCapitalBuildings = zoneData.decorLayout.some(item => item.asset && item.asset.startsWith && item.asset.startsWith('cap_'));
            const hasCozyBuildings = zoneData.decorLayout.some(item => item.asset && item.asset.startsWith && item.asset.startsWith('cozy_'));
            const hasOldAssets = zoneData.decorLayout.some(item => 
                item.asset === 'ultimate_pines' || 
                item.asset === 'bg_coastal' ||
                (item.asset && item.asset.startsWith && item.asset.startsWith('ultimate_pines'))
            );
            const isMismatch = (isCapitalZone && !hasCapitalBuildings) || (!isCapitalZone && hasCapitalBuildings) || (!isCapitalZone && !hasCozyBuildings && Math.random() < 0.25);
            
            const isDungeonTownWithTrees = (zoneData.biome === 'Dungeon') && 
                zoneData.decorLayout.some(item => ['tree1','tree2','tree3','tree4','pine'].includes(item.asset));
            const isDeadwoodsTownWithTrees = (zoneData.biome === 'Deadwoods') && 
                zoneData.decorLayout.some(item => ['tree1','tree2','tree3','tree4','pine'].includes(item.asset));
            if (hasOldAssets || isDungeonTownWithTrees || isDeadwoodsTownWithTrees || isMismatch) {
                delete zoneData.decorLayout;
            }
        }
        
        if (!zoneData.decorLayout) {
            const isCapitalZone = window.isCapitalCity ? window.isCapitalCity(currentZoneIdx) : false;

            let validAssets = [];
            let scale = 1.5;
            let spacing = 140;

            if (isCapitalZone) {
                const allCapAssets = [
                    'cap_bakery', 'cap_blacksmith', 'cap_carpenter', 'cap_church', 'cap_farmhouse',
                    'cap_store', 'cap_guardhouse', 'cap_inn', 'cap_markethall', 'cap_merchanthouse',
                    'cap_cottage', 'cap_stonehouse', 'cap_tailor', 'cap_tavern', 'cap_townhall', 'cap_watchtower'
                ];
                validAssets = allCapAssets.filter(k => scene.textures.exists(k));
                scale = 2.0;
                spacing = 200;
            } else {
                const baseAssets = ['house', 'house2', 'house3', 'house4', 'house5', 'house6', 'tavern', 'tavernGreen', 'shop', 'stall', 'stable'];
                const cozyAssets = [
                    'cozy_barn', 'cozy_house_big', 'cozy_water_building',
                    'cozy_house1', 'cozy_house2', 'cozy_house3', 'cozy_house4', 'cozy_house5',
                    'cozy_house6', 'cozy_house7', 'cozy_house8', 'cozy_house9', 'cozy_house10',
                    'cozy_bakery', 'cozy_blacksmith', 'cozy_fish', 'cozy_inn', 'cozy_shop1', 'cozy_shop2',
                    'cozy_stall1', 'cozy_stall2', 'cozy_stall3', 'cozy_stall4', 'cozy_stall5',
                    'cozy_stall6', 'cozy_stall7', 'cozy_stall8', 'cozy_stall9', 'cozy_stall10',
                    'cozy_woodcutting', 'cozy_distillery', 'cozy_masonry', 'cozy_pottery'
                ];
                const allTownAssets = [...baseAssets, ...cozyAssets];
                validAssets = allTownAssets.filter(k => scene.textures.exists(k));
                scale = 1.5;
                spacing = 140;
            }

            if (validAssets.length === 0) {
                validAssets = ['house'];
            }

            const layout = [];

            if (isCapitalZone) {
                const houses = ['cap_cottage', 'cap_stonehouse', 'cap_merchanthouse', 'cap_farmhouse'];
                const shuffledHouses = [...houses].sort(() => Math.random() - 0.5);

                const crafts = ['cap_carpenter', 'cap_tailor', 'cap_blacksmith', 'cap_bakery'];
                const shuffledCrafts = [...crafts].sort(() => Math.random() - 0.5);

                const hospitality = ['cap_inn', 'cap_tavern'];
                const shuffledHosp = [...hospitality].sort(() => Math.random() - 0.5);

                const plannedLayout = [
                    { asset: 'cap_watchtower', x: 150, scale: 2.0 },
                    { asset: 'cap_guardhouse', x: 345, scale: 2.0 },
                    { asset: shuffledHouses[0], x: 550, scale: 2.0 },
                    { asset: shuffledHouses[1], x: 745, scale: 2.0 },
                    { asset: shuffledCrafts[0], x: 940, scale: 2.0 },
                    { asset: shuffledCrafts[1], x: 1135, scale: 2.0 },
                    { asset: 'cap_markethall', x: 1360, scale: 2.2 },
                    { asset: 'cap_store', x: 1590, scale: 2.0 },
                    { asset: shuffledHosp[0], x: 1795, scale: 2.0 },
                    { asset: 'cap_townhall', x: 2030, scale: 2.2 },
                    { asset: 'cap_church', x: 2295, scale: 2.2 },
                    { asset: 'cap_watchtower', x: 2530, scale: 2.0 }
                ];

                plannedLayout.forEach(item => {
                    if (scene.textures.exists(item.asset)) {
                        layout.push({
                            asset: item.asset,
                            x: item.x,
                            y: 696,
                            scale: item.scale,
                            depth: -5
                        });
                    }
                });
            } else {
                let buildingCount = Math.floor(Math.random() * 4) + 7;
                let shuffled = [...validAssets].sort(() => Math.random() - 0.5);
                let buildingList = shuffled.slice();
                while (buildingList.length < buildingCount) {
                    buildingList.push(validAssets[Math.floor(Math.random() * validAssets.length)]);
                }
                buildingList = buildingList.slice(0, buildingCount);

                for (let i = 0; i < buildingCount; i++) {
                    const xOffset = 120;
                    const randOffset = 40;
                    layout.push({ 
                        asset: buildingList[i], 
                        x: xOffset + (i * spacing) + Math.floor(Math.random() * randOffset), 
                        y: 696, 
                        scale: scale, 
                        depth: -5 
                    });
                }
            }

            const biome = zoneData.biome || 'Forest';
            if (biome !== 'Dungeon') {
                const treeCount = Math.floor(Math.random() * 3) + 2;
                for (let i = 0; i < treeCount; i++) {
                    layout.push({ asset: 'tree1', x: 150 + Math.floor(Math.random() * 1100), y: 696, scale: 0.8, depth: -4 });
                }
            }

            layout.push({ asset: 'statue', x: 640, y: 696, scale: 1.5, depth: -4, isAngelStatue: true });

            zoneData.decorLayout = layout;
            
            const saves = window.getSaves();
            const idx = saves.findIndex(s => s.id === saveData.id);
            const clonedSave = JSON.parse(JSON.stringify(saveData));
            if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
            window.saveSaves(saves);
        }

        if (!zoneData.decorLayout.some(item => item.isAngelStatue)) {
            let existingStatue = zoneData.decorLayout.find(item => item.asset === 'statue');
            if (existingStatue) {
                existingStatue.isAngelStatue = true;
            } else {
                zoneData.decorLayout.push({ asset: 'statue', x: 640, y: 696, scale: 1.5, depth: -4, isAngelStatue: true });
            }
        }

        zoneData.decorLayout.forEach(item => {
            let targetY = item.y;
            if (scene.platforms && scene.platforms.getChildren().length > 0) {
                const blocksAtX = scene.platforms.getChildren().filter(block => Math.abs(block.x - item.x) <= 23 && block.y < 800);
                if (blocksAtX.length > 0) {
                    const highestBlock = blocksAtX.reduce((highest, current) => current.y < highest.y ? current : highest, blocksAtX[0]);
                    const offsetY = item.y - 696;
                    targetY = (highestBlock.y - 24) + offsetY;
                }
            }

            const img = (item.frame !== undefined) ? 
                scene.add.image(item.x, targetY, item.asset, item.frame) : 
                scene.add.image(item.x, targetY, item.asset);
            
            img.setOrigin(0.5, 1).setScale(item.scale).setDepth(item.depth);
            if (item.tint !== undefined) img.setTint(item.tint);
            scene.decorGroup.add(img);

            if (item.isAngelStatue && zoneData.type === 'Safe') {
                scene.angelStatue = img;
                scene.physics.add.existing(img, true);
                
                scene.angelStatueZone = scene.add.zone(img.x, img.y - 50, 150, 150);
                scene.physics.add.existing(scene.angelStatueZone);
                scene.angelStatueZone.body.moves = false;
            }
        });

        // Spawn NPCs
        const currentKingdomForNpc = window.getKingdomForZone ? window.getKingdomForZone(currentZoneIdx) : null;
        const isElvenKingdom = currentKingdomForNpc && (
            (currentKingdomForNpc.biomes && currentKingdomForNpc.biomes.includes('Deadwoods')) || 
            currentKingdomForNpc.id === 'duskveil' || 
            currentKingdomForNpc.id === 'ashenmoor' || 
            (currentKingdomForNpc.name && currentKingdomForNpc.name.toLowerCase().includes('elven')) || 
            (currentKingdomForNpc.rulingFaction && currentKingdomForNpc.rulingFaction.toLowerCase().includes('elven'))
        );
        const isDwarvenKingdom = currentKingdomForNpc && (
            (currentKingdomForNpc.biomes && currentKingdomForNpc.biomes.includes('Cave')) || 
            (currentKingdomForNpc.name && currentKingdomForNpc.name.toLowerCase().includes('dwarf')) || 
            (currentKingdomForNpc.name && currentKingdomForNpc.name.toLowerCase().includes('dwarven')) || 
            (currentKingdomForNpc.name && currentKingdomForNpc.name.toLowerCase().includes('underrealm')) || 
            (currentKingdomForNpc.name && currentKingdomForNpc.name.toLowerCase().includes('stronghold')) || 
            (currentKingdomForNpc.rulingFaction && currentKingdomForNpc.rulingFaction.toLowerCase().includes('dwarf')) ||
            (currentKingdomForNpc.rulingFaction && currentKingdomForNpc.rulingFaction.toLowerCase().includes('dwarven'))
        );

        if (zoneData.npcs && Array.isArray(zoneData.npcs)) {
            zoneData.npcs.forEach(nData => {
                const rawKey = nData.spriteKey || nData.type || 'npc';
                let spriteKey = rawKey;
                let combatClass = 'sword';
                
                if (['npc', 'blacksmith', 'alchemist', 'knight', 'samurai', 'sage', 'ranger', 'wizard', 'king'].includes(rawKey)) {
                    spriteKey = rawKey;
                } else {
                    if (nData.customConfig) {
                        const recreated = window.CharacterComposer.recreateNPC(scene, rawKey, nData.customConfig.layers, nData.customConfig.weaponType);
                        spriteKey = recreated.spriteKey;
                        combatClass = recreated.weaponType;
                    } else {
                        const npcData = window.CharacterComposer.generateRandomNPC(scene, null, { isElven: isElvenKingdom, isDwarven: isDwarvenKingdom });
                        spriteKey = npcData.spriteKey;
                        combatClass = npcData.weaponType;
                        nData.spriteKey = spriteKey;
                        nData.customConfig = npcData.config;
                    }
                }
                
                const npc = new window.NPCController(scene, nData.x, 624, scene.player, wm.geminiService, nData.name, nData.persona, spriteKey, combatClass);
                npc.faction = nData.faction || null;
                npc.factionRank = nData.factionRank || 'commoner';
                npc.politicalTitle = nData.politicalTitle || null;
                
                scene.physics.add.collider(npc.sprite, scene.platforms);
                scene.npcs.push(npc);
                scene.decorGroup.add(npc.nameText);
                scene.decorGroup.add(npc.promptText);
            });
        }

        // Spawn ambient villagers
        if (!zoneData.ambientNpcs) {
            zoneData.ambientNpcs = [];
            const ambientCount = Math.floor(Math.random() * 2) + 2;
            const ambientSlots = [1300, 1500, 1700];
            for (let i = 0; i < ambientCount; i++) {
                if (zoneData.biome === 'Heaven') {
                    const gender = Math.random() < 0.5 ? 'male' : 'female';
                    const ghostData = window.CharacterComposer.generateSpecialEnemy(scene, 'ghost', gender);
                    const celestialNames = [
                        'Aurelius', 'Seraphina', 'Valerius', 'Caelia', 'Uriel', 'Astraea', 'Cassiel',
                        'Azrael', 'Metatron', 'Gabriel', 'Michael', 'Raphael', 'Jophiel', 'Zadkiel',
                        'Chamuel', 'Haniel', 'Remiel', 'Sariel', 'Raguel', 'Arielle', 'Selene',
                        'Caelum', 'Elysia', 'Zephyr', 'Orion', 'Lyra', 'Nova', 'Astra', 'Solana'
                    ];
                    const name = celestialNames[Math.floor(Math.random() * celestialNames.length)] + ' the Spirit';
                    const spiritPersonas = [
                        'A peaceful soul enjoying the eternal serenity of the heavens, hums a gentle hymn.',
                        'A majestic sentinel standing watch over the pearlescent architecture.',
                        'A celestial weaver shaping clouds into beautiful patterns in the sky.',
                        'An ancient spirit reading a tome of pure light under a golden-leaved tree.',
                        'A light-forged soul polishing a shield of condensed starlight.',
                        'A serene spirit meditating on a floating platform, surrounded by a faint golden aura.'
                    ];
                    const persona = spiritPersonas[Math.floor(Math.random() * spiritPersonas.length)];
                    zoneData.ambientNpcs.push({
                        name: name,
                        x: ambientSlots[i],
                        spriteKey: ghostData.spriteKey,
                        weaponType: ghostData.weaponType,
                        isCelestial: true,
                        type: 'ghost',
                        gender: gender,
                        persona: persona
                    });
                } else {
                    const npcData = window.CharacterComposer.generateRandomNPC(scene, null, { isElven: isElvenKingdom, isDwarven: isDwarvenKingdom });
                    const isMale = npcData.config && npcData.config.layers 
                        ? npcData.config.layers.some(l => l.startsWith('npc_male_skin'))
                        : Math.random() < 0.5;
                    const villagerName = window.CharacterComposer.generateRandomName(
                        isDwarvenKingdom ? 'dwarf' : (isElvenKingdom ? 'elf' : npcData.weaponType),
                        isMale
                    );
                    zoneData.ambientNpcs.push({
                        name: villagerName,
                        x: ambientSlots[i],
                        spriteKey: npcData.spriteKey,
                        weaponType: npcData.weaponType,
                        customConfig: npcData.config
                    });
                }
            }
        }

        if (zoneData.ambientNpcs && zoneData.ambientNpcs.length > 0) {
            let changed = false;
            zoneData.ambientNpcs.forEach(n => {
                if (n.customConfig && n.customConfig.layers) {
                    const isMale = n.customConfig.layers.some(l => l.startsWith('npc_male_skin'));
                    const isFemaleName = ["Lyra", "Mira", "Seraphina", "Isolde", "Rowena", "Brynn", "Astrid", "Calista", "Thea", "Fiora", "Linnea", "Rhiannon", "Cerys", "Aisling", "Sylvia", "Briar", "Cora", "Eira", "Fay", "Gwen", "Hazel", "Iris", "Jade", "Maeve", "Niamh", "Opal", "Pearl", "Quinn", "Rose", "Saffron", "Talia", "Una", "Violet", "Wren", "Xenia", "Yvaine", "Zola"].some(fn => n.name.startsWith(fn));
                    const isMaleName = ["Aldric", "Theron", "Gareth", "Bram", "Valerius", "Arthur", "Lancelot", "Galahad", "Godric", "Emeric", "Balin", "Gawain", "Ector", "Percival", "Tristan", "Bors", "Cador", "Lucan", "Bedivere", "Kay", "Alisander", "Drian", "Garm", "Sigurd", "Uther", "Gorn", "Garret", "Lothar", "Wulfgar", "Dax", "Brutus", "Drake", "Talon", "Cassian", "Leif", "Osric", "Halden", "Corbin", "Silas", "Rowan", "Ignatius", "Elidor", "Zephyr", "Merlin", "Alistair", "Archibald", "Balthazar", "Gideon", "Gwydion", "Solomon", "Thaddeus", "Orpheus", "Prospero", "Aurelius", "Cyrus", "Vesper", "Kaelen", "Zephyrus", "Lucius", "Morbius", "Malakai", "Gaius", "Salazar", "Damian", "Ignis", "Orion", "Robin", "Sylas", "Sylvan", "Thorn", "Faolan", "Hunter", "Hawke", "Fletcher", "Bowen", "Garrick", "Scythe", "Tracker", "Brand", "Elm", "Ash", "Flint", "Ridge", "Gully", "Kenji", "Hiroshi", "Takeshi", "Musashi", "Jin", "Katsu", "Nobu", "Hattori", "Hanzo", "Juro", "Kojiro", "Sojiro", "Gennosuke", "Chiba", "Masamune", "Muramasa", "Saito", "Tadao", "Ryoma", "Shingen", "Kenshin", "Yojimbo", "Ronin", "Katashi", "Katsuro", "Raiden", "Ren", "Ryu", "Shinji", "Taiki", "Takahiro", "Yasuo", "Yoshi", "Kaito", "Daiki", "Tariq", "Sato", "Conan", "Ragnar", "Kratos", "Rolf", "Torstein", "Bjorn", "Gunnar", "Halfdan", "Harald", "Ivar", "Odin", "Thor", "Loki", "Tyr", "Beowulf", "Wulf", "Harkon", "Cedric", "Darian", "Halden", "Idris", "Orin", "Dara"].some(mn => n.name.startsWith(mn));
                    
                    if ((isMale && isFemaleName && !isMaleName) || (!isMale && isMaleName && !isFemaleName)) {
                        n.name = window.CharacterComposer.generateRandomName(isDwarvenKingdom ? 'dwarf' : (isElvenKingdom ? 'elf' : n.weaponType), isMale);
                        changed = true;
                    }
                }
            });
            if (changed) {
                const saves = window.getSaves();
                if (saveData && saveData.zones) {
                    saveData.zones[currentZoneIdx] = JSON.parse(JSON.stringify(zoneData));
                    const idx = saves.findIndex(s => s.id === saveData.id);
                    const clonedSave = JSON.parse(JSON.stringify(saveData));
                    if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
                    window.saveSaves(saves);
                }
            }
        }

        zoneData.ambientNpcs.forEach(nData => {
            let villager;
            if (nData.isCelestial) {
                if (nData.type === 'ghost') {
                    window.CharacterComposer.generateSpecialEnemy(scene, 'ghost', nData.gender, nData.spriteKey);
                }
                villager = new window.NPCController(
                    scene, 
                    nData.x, 
                    624, 
                    scene.player, 
                    wm.geminiService, 
                    nData.name, 
                    nData.persona || 'A celestial soul.', 
                    nData.spriteKey, 
                    nData.weaponType
                );
            } else {
                const recreated = window.CharacterComposer.recreateNPC(scene, nData.spriteKey, nData.customConfig.layers, nData.customConfig.weaponType);
                villager = new window.NPCController(scene, nData.x, 624, scene.player, wm.geminiService, nData.name, 'A friendly townsperson going about their day.', recreated.spriteKey, recreated.weaponType);
                villager.config = nData.customConfig; // Attach modular configuration details
            }
            scene.physics.add.collider(villager.sprite, scene.platforms);
            scene.npcs.push(villager);
            scene.decorGroup.add(villager.nameText);
            scene.decorGroup.add(villager.promptText);
        });

        // Fallback for Elara the Sage in Zone 0
        if (currentZoneIdx === 0) {
            const hasSage = scene.npcs.find(n => n.npcName === 'Elara the Sage' || n.spriteKey === 'sage');
            if (!hasSage) {
                const sage = new window.NPCController(scene, 500, 624, scene.player, wm.geminiService, 'Elara the Sage', 'Elara is a wise and mysterious sage...', 'sage');
                scene.physics.add.collider(sage.sprite, scene.platforms);
                scene.npcs.push(sage);
                scene.decorGroup.add(sage.nameText);
                scene.decorGroup.add(sage.promptText);
            }
        }

        // --- KINGS GUARD HOSTILITY SYSTEM ---
        const hostility = window.checkGuardHostility ? window.checkGuardHostility(currentZoneIdx, saveData.alignment) : { shouldAttack: false, reason: null };
        
        if (hostility.shouldAttack) {
            const isCapitalZone = window.isCapitalCity ? window.isCapitalCity(currentZoneIdx) : false;
            const guardCount = isCapitalZone ? (Math.floor(Math.random() * 3) + 5) : (Math.floor(Math.random() * 3) + 2);
            
            const zoneWidth = isCapitalZone ? 2760 : 1840;
            const step = zoneWidth / (guardCount + 1);
            for (let i = 0; i < guardCount; i++) {
                const spawnX = step * (i + 1);
                let guardType = 'knight_rival';
                if (zoneData.biome === 'Heaven') {
                    const types = ['heavenly_valkyrie', 'heavenly_archangel'];
                    guardType = types[i % types.length];
                } else if (isElvenKingdom) {
                    const types = ['elven_spellblade_rival', 'elven_longbowman_rival', 'elven_guard_rival'];
                    guardType = types[i % types.length];
                } else if (isDwarvenKingdom) {
                    const types = ['dwarf_warrior_rival', 'dwarf_miner_rival'];
                    guardType = types[i % types.length];
                } else {
                    const types = ['knight_rival', 'ranger_rival'];
                    guardType = types[i % types.length];
                }
                const guard = new window.EnemyController(scene, spawnX, 600, scene.player, wm.geminiService, guardType);
                scene.physics.add.collider(guard.sprite, scene.platforms);
                scene.enemies.add(guard.sprite);
            }

            if (!scene.guardWarningCutscenePlayed) {
                scene.guardWarningCutscenePlayed = true;
                if (scene.cutsceneController) {
                    const reason = hostility.reason || "The King has ordered your arrest!";
                    const factionObj = (window.getFactionForZone && window.getFactionForZone(currentZoneIdx)) || null;
                    const leaderObj = factionObj ? factionObj.leader : null;
                    const leaderName = leaderObj ? window.formatLeaderName(leaderObj.title, leaderObj.name) : "the Sovereign";

                    const context = {
                        reason: reason,
                        playerName: (scene.player && scene.player.name) ? scene.player.name : "Outlaw",
                        factionName: factionObj ? factionObj.name : "the ruling council",
                        kingdomName: (window.getKingdomForZone && window.getKingdomForZone(currentZoneIdx)) ? window.getKingdomForZone(currentZoneIdx).name : "the kingdom",
                        leaderName: leaderName,
                        zoneName: "Town Entrance"
                    };
                    scene.cutsceneController.playCutscene('guard_warning', context);
                }
            }
        } else {
            // Spawn peaceful gate guards and patrols that look like King's Guard but are just friendly NPCs
            const isCapitalZone = window.isCapitalCity ? window.isCapitalCity(currentZoneIdx) : false;
            const guardCount = isCapitalZone ? 4 : 2;
            
            const positions = isCapitalZone ? [200, 450, 2350, 2550] : [200, 1600];
            for (let i = 0; i < guardCount; i++) {
                const spawnX = positions[i];
                const faction = window.getFactionForZone(currentZoneIdx);
                const factionName = faction ? faction.name : "the Realm";
                let guardSprite = 'heavy_knight';
                let guardName = `King's Guard`;
                let guardPersona = `A disciplined soldier sworn to protect the peace of ${factionName}. They watch for criminals and rebels.`;
                let guardClass = 'sword';

                if (zoneData.biome === 'Heaven') {
                    const types = ['heavenly_valkyrie', 'heavenly_archangel'];
                    guardSprite = types[i % types.length];
                    guardName = 'Heavenly Sentry';
                    guardPersona = 'An angelic guardian keeping watch over the sacred capital.';
                    guardClass = 'magic';
                } else if (isElvenKingdom) {
                    const types = ['elven_spellblade_rival', 'elven_guard_rival'];
                    guardSprite = types[i % types.length];
                    guardName = 'Elven Defender';
                    guardPersona = `A vigilant elf defending the forest boundaries of ${factionName}.`;
                    guardClass = 'sword';
                } else if (isDwarvenKingdom) {
                    const types = ['dwarf_warrior_rival', 'dwarf_miner_rival'];
                    guardSprite = types[i % types.length];
                    guardName = 'Dwarf Shieldguard';
                    guardPersona = `A stout dwarf protecting the underrealm tunnels of ${factionName}.`;
                    guardClass = 'axe';
                }

                const guardNPC = new window.NPCController(
                    scene, 
                    spawnX, 
                    600, 
                    scene.player, 
                    wm.geminiService, 
                    guardName, 
                    guardPersona, 
                    guardSprite,
                    guardClass
                );
                guardNPC.faction = faction ? faction.id : null;
                guardNPC.factionRank = 'guard';
                guardNPC.politicalTitle = 'Guard';
                scene.physics.add.collider(guardNPC.sprite, scene.platforms);
                scene.npcs.push(guardNPC);
                scene.decorGroup.add(guardNPC.nameText);
                scene.decorGroup.add(guardNPC.promptText);
            }
        }

        // Persist updated zone configurations
        if (saveData && saveData.zones) {
            saveData.zones[currentZoneIdx] = JSON.parse(JSON.stringify(zoneData));
            const saves = window.getSaves();
            const idx = saves.findIndex(s => s.id === saveData.id);
            if (idx > -1) {
                saves[idx] = saveData;
                window.saveSaves(saves);
            }
        }
    }
};
