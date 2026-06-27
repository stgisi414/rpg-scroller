// WorldManager.js - Handles infinite zone generation and persistence

class WorldManager {
    constructor(scene, geminiService) {
        this.scene = scene;
        this.geminiService = geminiService;
        
        // Initialize zones in saveData if not present
        if (!window.saveData) {
            window.saveData = {
                id: 'save_' + Date.now(),
                name: 'Unknown Hero',
                level: 1,
                xp: 0,
                gold: 0,
                currentZone: 0,
                zones: {}
            };
        }
        if (!window.saveData.zones) window.saveData.zones = {};
        if (typeof window.saveData.currentZone === 'undefined') window.saveData.currentZone = 0;
        if (typeof window.saveData.gold === 'undefined') window.saveData.gold = 0;
    }

    async loadZone(zoneIndex, spawnSide) {
        if (window.saveData) {
            window.saveData = JSON.parse(JSON.stringify(window.saveData));
        }

        // Force pocket zones (777 and -666) to regenerate fresh on every visit
        if ((zoneIndex === 777 || zoneIndex === -666) && window.saveData.zones) {
            delete window.saveData.zones[zoneIndex];
        }

        this.currentZoneIndex = zoneIndex;

        // Show loading screen
        this.scene.showLoading(true);

        if (this.scene && this.scene.player && typeof this.scene.player.clearTempStats === 'function') {
            this.scene.player.clearTempStats();
        }

        window.saveData.currentZone = zoneIndex;
        let zoneData = window.saveData.zones[zoneIndex];

        // Invalidate stale zones from the old broken gemini-1.5-flash era or repetitive naming
        const staleNames = ['Fallback Wilderness', 'Fallback Town', 'Corrupted Void', 'Whispering Thicket', 'The Whispering Thicket'];
        if (zoneData && staleNames.includes(zoneData.name)) {
            zoneData = null;
        }

        // Invalidate zones that should be towns but were cached as wilderness in older saves
        const isTownIndex = Math.abs(zoneIndex) > 0 && Math.abs(zoneIndex) % 4 === 0;
        if (zoneData && isTownIndex && zoneData.type !== 'Safe') {
            zoneData = null;
        }
        // Inverse: invalidate zones that should be wilderness but were cached as Safe (Gemini hallucination)
        if (zoneData && !isTownIndex && zoneIndex !== 0 && zoneData.type === 'Safe') {
            console.warn(`Zone ${zoneIndex} was cached as Safe but should be Dangerous — regenerating.`);
            zoneData = null;
        }

        if (!zoneData) {
            // Generate via Gemini (or rich fallback)
            zoneData = await this.generateZoneWithGemini(zoneIndex);
            if (!this.scene || this.scene.isSceneDestroyed) {
                // BUG-21: ensure loading overlay is hidden before early abort
                if (this.scene && !this.scene.isSceneDestroyed && this.scene.showLoading) this.scene.showLoading(false);
                return;
            }
            window.saveData.zones[zoneIndex] = JSON.parse(JSON.stringify(zoneData));
            
            // Save to localStorage
            const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
            const saveIndex = saves.findIndex(s => s.id === window.saveData.id);
            const clonedSave = JSON.parse(JSON.stringify(window.saveData));
            if (saveIndex > -1) {
                saves[saveIndex] = clonedSave;
            } else {
                saves.push(clonedSave);
            }
            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
        }

        // Apply zone data to scene
        try {
            this.buildZone(zoneData, spawnSide);
        } catch (e) {
            console.error("Error in buildZone: " + e.stack);
            const errEl = document.getElementById('debug-content');
            if (errEl) errEl.innerHTML += `<br><span style="color:red">CRITICAL ERROR in buildZone: ${e.message}<br>${e.stack}</span>`;
        }
        this.scene.showLoading(false);
    }

    saveZoneState() {
        if (!window.saveData) return;
        if (!window.saveData.zones) window.saveData.zones = {};
        if (typeof this.currentZoneIndex === 'undefined') return;
        const zoneData = window.saveData.zones[this.currentZoneIndex];
        if (!zoneData || zoneData.type === 'Safe') return;

        const aliveEnemies = [];
        if (this.scene && this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(sprite => {
                if (sprite && sprite.active && sprite.controller && !sprite.controller.isDead && sprite.controller.hp > 0) {
                    aliveEnemies.push({
                        type: sprite.controller.type || 'slime',
                        x: sprite.x,
                        hp: sprite.controller.hp,
                        speed: sprite.controller.speed || 100
                    });
                }
            });
        }
        zoneData.enemies = aliveEnemies;
    }

    async generateZoneWithGemini(zoneIndex) {
        if (!this.scene || this.scene.isSceneDestroyed) return null;
        if (this.scene.loadingText) {
            this.scene.loadingText.setText("Gemini is forging the world...");
        }
        
        const playerLevel = (window.saveData && window.saveData.level) || 1;
        const playerClassId = (window.saveData && window.saveData.classId) || 'knight';
        
        // Zone 0 is always a town; after that, a town appears every 4 zones in either direction
        const absIdx = Math.abs(zoneIndex);
        let forceTown = zoneIndex === 0 || (absIdx > 0 && absIdx % 4 === 0);

        let selectedBiome;
        if (zoneIndex === 777) {
            selectedBiome = 'Heaven';
            forceTown = true;
        } else if (zoneIndex === -666) {
            selectedBiome = 'Hell';
            forceTown = false;
        } else {
            // Biome Chunking: Every 4 zones (3 wilderness + 1 town) share a biome.
            const biomes = ['Forest', 'Plains', 'Cave', 'Desert', 'Winter', 'Coastal', 'Dungeon', 'Deadwoods', 'Hell'];
            let chunkIndex = absIdx === 0 ? 0 : Math.floor((absIdx - 1) / 4);
            selectedBiome = biomes[chunkIndex % biomes.length];
        }

        const response = await this.geminiService.generateZoneData(zoneIndex, playerLevel, forceTown, playerClassId, selectedBiome);
        return response;
    }

    buildZone(zoneData, spawnSide) {
        // Clear previous enemies/NPCs (handled in GameScene usually)
        this.currentZoneData = zoneData;
        this.scene.zoneType = zoneData.type;
        
        // Update HUD Zone Name
        if (this.scene.hudElements && this.scene.hudElements.zoneName) {
            this.scene.hudElements.zoneName.innerText = zoneData.name || `Zone ${window.saveData.currentZone}`;
            if (this.scene.hudElements.zoneType) {
                this.scene.hudElements.zoneType.innerText = zoneData.type || 'Unknown';
                this.scene.hudElements.zoneType.className = zoneData.type === 'Safe' ? 'text-tertiary-fixed-dim' : 'text-error';
            }
            if (this.scene.hudElements.zoneBiome) {
                this.scene.hudElements.zoneBiome.innerText = zoneData.biome || 'Unknown';
            }
        }

        // Spawn Player at correct edge
        this.scene.player.sprite.setY(600);
        this.scene.player.sprite.setVelocityY(0);
        this.scene.player.sprite.setVelocityX(0);

        const isTown = zoneData.type === 'Safe';
        if (spawnSide === 'left') {
            this.scene.player.sprite.setX(100);
            this.scene.player.sprite.setY(600);
            if (this.scene.partyMembers) {
                this.scene.partyMembers.forEach((hero, i) => {
                    hero.sprite.setX(100 - 60 - (i * 60));
                    hero.sprite.setY(600);
                    hero.sprite.setVelocity(0, 0);
                });
            }
        } else if (spawnSide === 'right') {
            const spawnX = isTown ? 1740 : 3740;
            this.scene.player.sprite.setX(spawnX);
            this.scene.player.sprite.setY(600);
            if (this.scene.partyMembers) {
                this.scene.partyMembers.forEach((hero, i) => {
                    hero.sprite.setX(spawnX + 60 + (i * 60));
                    hero.sprite.setY(600);
                    hero.sprite.setVelocity(0, 0);
                });
            }
        }

        // Set Background/Theme based on biome
        // Dungeon towns should look like Plains towns
        let visualBiome = zoneData.biome;
        if (zoneData.type === 'Safe' && visualBiome === 'Dungeon') {
            visualBiome = 'Plains';
        }
        this.scene.setBiomeVisuals(visualBiome, zoneData.type);

        // Spawn Decor
        if (this.scene.decorGroup && this.scene.decorGroup.scene) {
            this.scene.decorGroup.clear(true, true);
        } else {
            this.scene.decorGroup = this.scene.add.group();
        }

        if (zoneData.type === 'Safe') {
            // Retroactively add town NPCs to old saves if missing
            if (!zoneData.npcs || zoneData.npcs.length < 4) {
                zoneData.npcs = [
                    { name: "Elara the Sage", persona: "A wise elder who offers counsel on magical threats.", x: 250, spriteKey: "npc" },
                    { name: "Brom the Hammer", persona: "A gruff blacksmith who forged his weapons in dragon fire.", x: 500, spriteKey: "blacksmith" },
                    { name: "Orion the Hunter", persona: "A quiet tracker offering goods from the wilds.", x: 750, spriteKey: "ranger" },
                    { name: "Vespera", persona: "An enigmatic alchemist selling curious concoctions.", x: 1000, spriteKey: "alchemist" }
                ];
                // Update cache
                const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
                if (window.saveData && window.saveData.zones) {
                    window.saveData.zones[this.currentZoneIndex] = JSON.parse(JSON.stringify(zoneData));
                    const idx = saves.findIndex(s => s.id === window.saveData.id);
                    const clonedSave = JSON.parse(JSON.stringify(window.saveData));
                    if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
                    localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
                }
            }

            // --- DECOR PERSISTENCE ---
            // Migrate: force regeneration if layout contains old broken assets
            if (zoneData.decorLayout) {
                const hasOldAssets = zoneData.decorLayout.some(item => 
                    item.asset === 'ultimate_pines' || 
                    item.asset === 'bg_coastal' ||
                    (item.asset && item.asset.startsWith && item.asset.startsWith('ultimate_pines'))
                );
                // Regenerate dungeon/deadwoods towns that have regular trees
                const isDungeonTownWithTrees = (zoneData.biome === 'Dungeon') && 
                    zoneData.decorLayout.some(item => ['tree1','tree2','tree3','tree4','pine'].includes(item.asset));
                const isDeadwoodsTownWithTrees = (zoneData.biome === 'Deadwoods') && 
                    zoneData.decorLayout.some(item => ['tree1','tree2','tree3','tree4','pine'].includes(item.asset));
                if (hasOldAssets || isDungeonTownWithTrees || isDeadwoodsTownWithTrees) {
                    delete zoneData.decorLayout;
                }
            }
            
            // Generate the layout once and save it inside zoneData so it never changes on reload.
            if (!zoneData.decorLayout) {
                const allTownAssets = ['house', 'house2', 'house3', 'house4', 'house5', 'house6', 'tavern', 'tavernGreen', 'shop', 'stall', 'stable'];
                const validAssets = allTownAssets.filter(k => this.scene.textures.exists(k));
                
                let buildingCount = Math.floor(Math.random() * 4) + 7;
                let shuffled = [...validAssets].sort(() => Math.random() - 0.5);
                let buildingList = shuffled.slice();
                while (buildingList.length < buildingCount) {
                    buildingList.push(validAssets[Math.floor(Math.random() * validAssets.length)]);
                }
                buildingList = buildingList.slice(0, buildingCount);

                const layout = [];
                for (let i = 0; i < buildingCount; i++) {
                    layout.push({ asset: buildingList[i], x: 120 + (i * 140) + Math.floor(Math.random() * 40), y: 696, scale: 1.5, depth: -5 });
                }

                // Add trees to towns (but NOT in Dungeon biome)
                const biome = zoneData.biome || 'Forest';
                if (biome !== 'Dungeon') {
                    const treeCount = Math.floor(Math.random() * 3) + 2;
                    for (let i = 0; i < treeCount; i++) {
                        layout.push({ asset: 'tree1', x: 150 + Math.floor(Math.random() * 1100), y: 696, scale: 0.8, depth: -4 });
                    }
                }

                // Guarantee one Angel Statue per town for the Town Directory
                layout.push({ asset: 'statue', x: 640, y: 696, scale: 1.5, depth: -4, isAngelStatue: true });

                zoneData.decorLayout = layout;
                // Persist back to localStorage
                const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
                const idx = saves.findIndex(s => s.id === window.saveData.id);
                const clonedSave = JSON.parse(JSON.stringify(window.saveData));
                if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
                localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
            }

            // Fallback for older saves that lack the angel statue
            if (!zoneData.decorLayout.some(item => item.isAngelStatue)) {
                let existingStatue = zoneData.decorLayout.find(item => item.asset === 'statue');
                if (existingStatue) {
                    existingStatue.isAngelStatue = true;
                } else {
                    zoneData.decorLayout.push({ asset: 'statue', x: 640, y: 696, scale: 1.5, depth: -4, isAngelStatue: true });
                }
            }

            // Render from the saved layout
            zoneData.decorLayout.forEach(item => {
                let targetY = item.y;
                if (this.scene.platforms && this.scene.platforms.getChildren().length > 0) {
                    const blocksAtX = this.scene.platforms.getChildren().filter(block => Math.abs(block.x - item.x) <= 23 && block.y < 800);
                    if (blocksAtX.length > 0) {
                        const highestBlock = blocksAtX.reduce((highest, current) => current.y < highest.y ? current : highest, blocksAtX[0]);
                        const offsetY = item.y - 696;
                        targetY = highestBlock.y + offsetY;
                    }
                }

                const img = (item.frame !== undefined) ? 
                    this.scene.add.image(item.x, targetY, item.asset, item.frame) : 
                    this.scene.add.image(item.x, targetY, item.asset);
                
                img.setOrigin(0.5, 1).setScale(item.scale).setDepth(item.depth);
                if (item.tint !== undefined) img.setTint(item.tint);
                this.scene.decorGroup.add(img);

                // Setup interaction for the angel statue
                if (item.isAngelStatue && zoneData.type === 'Safe') {
                    this.scene.angelStatue = img;
                    this.scene.physics.add.existing(img, true); // static body
                    
                    // Interaction zone
                    this.scene.angelStatueZone = this.scene.add.zone(img.x, img.y - 50, 150, 150);
                    this.scene.physics.add.existing(this.scene.angelStatueZone);
                    this.scene.angelStatueZone.body.moves = false;
                }
            });

            // Build NPCs
            if (zoneData.npcs && Array.isArray(zoneData.npcs)) {
                zoneData.npcs.forEach(nData => {
                    const rawKey = nData.spriteKey || nData.type || 'npc';
                    let spriteKey = rawKey;
                    let combatClass = 'sword';
                    
                    if (['npc', 'blacksmith', 'alchemist', 'knight', 'samurai', 'sage', 'ranger', 'wizard', 'king'].includes(rawKey)) {
                        spriteKey = rawKey;
                    } else {
                        // Restore custom modular NPC or generate one
                        if (nData.customConfig) {
                            const recreated = window.CharacterComposer.recreateNPC(this.scene, rawKey, nData.customConfig.layers, nData.customConfig.weaponType);
                            spriteKey = recreated.spriteKey;
                            combatClass = recreated.weaponType;
                        } else {
                            const npcData = window.CharacterComposer.generateRandomNPC(this.scene);
                            spriteKey = npcData.spriteKey;
                            combatClass = npcData.weaponType;
                            nData.spriteKey = spriteKey; // save key
                            nData.customConfig = npcData.config; // save recipe
                        }
                    }
                    
                    const npc = new NPCController(this.scene, nData.x, 624, this.scene.player, this.geminiService, nData.name, nData.persona, spriteKey, combatClass);
                    this.scene.physics.add.collider(npc.sprite, this.scene.platforms);
                    this.scene.npcs.push(npc);
                    this.scene.decorGroup.add(npc.nameText);
                    this.scene.decorGroup.add(npc.promptText);
                });
            }

            // Spawn 2-3 ambient custom modular villagers so the town feels alive.
            // These are separate from the named shop/quest NPCs above and never replace them.
            // Persist ambient villagers in zoneData too so they don't change every time we load the zone!
            if (!zoneData.ambientNpcs) {
                zoneData.ambientNpcs = [];
                const ambientCount = Math.floor(Math.random() * 2) + 2; // 2 or 3
                const ambientSlots = [1300, 1500, 1700];
                for (let i = 0; i < ambientCount; i++) {
                    const npcData = window.CharacterComposer.generateRandomNPC(this.scene);
                    const villagerName = window.CharacterComposer.generateRandomName(npcData.weaponType);
                    zoneData.ambientNpcs.push({
                        name: villagerName,
                        x: ambientSlots[i],
                        spriteKey: npcData.spriteKey,
                        weaponType: npcData.weaponType,
                        customConfig: npcData.config
                    });
                }
            }

            zoneData.ambientNpcs.forEach(nData => {
                const recreated = window.CharacterComposer.recreateNPC(this.scene, nData.spriteKey, nData.customConfig.layers, nData.customConfig.weaponType);
                const villager = new NPCController(this.scene, nData.x, 624, this.scene.player, this.geminiService, nData.name, 'A friendly townsperson going about their day.', recreated.spriteKey, recreated.weaponType);
                this.scene.physics.add.collider(villager.sprite, this.scene.platforms);
                this.scene.npcs.push(villager);
                this.scene.decorGroup.add(villager.nameText);
                this.scene.decorGroup.add(villager.promptText);
            });

            // FALLBACK: If it's zone 0 and Gemini forgot the Sage, force her to spawn!
            if (this.currentZoneIndex === 0) {
                const hasSage = this.scene.npcs.find(n => n.npcName === 'Elara the Sage' || n.spriteKey === 'sage');
                if (!hasSage) {
                    const sage = new NPCController(this.scene, 500, 624, this.scene.player, this.geminiService, 'Elara the Sage', 'Elara is a wise and mysterious sage...', 'sage');
                    this.scene.physics.add.collider(sage.sprite, this.scene.platforms);
                    this.scene.npcs.push(sage);
                    this.scene.decorGroup.add(sage.nameText);
                    this.scene.decorGroup.add(sage.promptText);
                }
            }

            // Persist the updated zone npcs/ambientNpcs configs to localStorage
            if (window.saveData && window.saveData.zones) {
                window.saveData.zones[this.currentZoneIndex] = JSON.parse(JSON.stringify(zoneData));
                const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
                const idx = saves.findIndex(s => s.id === window.saveData.id);
                if (idx > -1) {
                    saves[idx] = window.saveData;
                    localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
                }
            }
        } else {
            // --- WILDERNESS DECOR PERSISTENCE (biome-aware) ---
            // Migrate: force regeneration if layout contains old/broken assets
            if (zoneData.decorLayout) {
                const biome = zoneData.biome || 'Forest';
                const hasOldPines = zoneData.decorLayout.some(item => 
                    item.asset === 'ultimate_pines' || 
                    (typeof item.asset === 'string' && item.asset.startsWith('ultimate_pines'))
                );
                // Regenerate Winter zones that have pines at old y positions
                const isWinterOldY = biome === 'Winter' && 
                    zoneData.decorLayout.some(item => typeof item.asset === 'string' && item.asset.startsWith('ultimate_pine_') && (item.y === 696 || item.y === 660));
                const isCoastalWithoutPalms = biome === 'Coastal' && 
                    (!zoneData.decorLayout.some(item => typeof item.asset === 'string' && item.asset.startsWith('palm')) ||
                     zoneData.decorLayout.some(item => typeof item.asset === 'string' && item.asset.startsWith('palm') && item.scale > 5));
                // Regenerate Dungeon zones that still have trees or old props
                const isDungeonOld = biome === 'Dungeon' && 
                    zoneData.decorLayout.some(item => ['tree1','tree2','tree3','tree4','willow1','willow2','birch1','birch2','pine','torch','decor'].includes(item.asset));
                // Regenerate Deadwoods zones that have regular trees or oversized dead trees
                const isDeadwoodsOld = biome === 'Deadwoods' && 
                    zoneData.decorLayout.some(item => 
                        ['tree1','tree2','tree3','tree4','willow1','willow2','birch1','birch2','pine'].includes(item.asset) ||
                        (typeof item.asset === 'string' && item.asset.startsWith('dead_tree_') && item.scale > 3)
                    );
                // Regenerate Hell zones that have regular trees (were falling through to Forest fallback)
                const isHellOld = biome === 'Hell' && 
                    zoneData.decorLayout.some(item => ['tree1','tree2','tree3','tree4','willow1','willow2','birch1','birch2','birch3','pine'].includes(item.asset));
                // Regenerate Plains zones that have too many trees from the old dense logic
                const isPlainsOld = biome === 'Plains' && 
                    zoneData.decorLayout.filter(item => ['tree1','tree2','tree3','tree4','willow1','willow2','birch1','birch2','birch3','pine'].includes(item.asset)).length > 5;
                // Force regenerate Desert zones so the new cactus layout applies
                const isDesertOld = biome === 'Desert';
                if (hasOldPines || isWinterOldY || isCoastalWithoutPalms || isDungeonOld || isDeadwoodsOld || isHellOld || isPlainsOld || isDesertOld) {
                    delete zoneData.decorLayout;
                }
            }
            // Force rebuild if missing or sparse (< 15 items = old save)
            if (!zoneData.decorLayout || zoneData.decorLayout.length < 15) {
                const layout = [];
                const biome = zoneData.biome || 'Forest';

                if (biome === 'Forest') {
                    // Dense mixed forest
                    const treeTypes = ['tree1', 'tree2', 'tree3', 'tree4', 'birch1', 'birch2', 'birch3', 'willow1', 'willow2', 'pine'];
                    // Background layer (smaller, darker)
                    const bgCount = Math.floor(Math.random() * 15) + 15;
                    for (let i = 0; i < bgCount; i++) {
                        layout.push({ asset: treeTypes[Math.floor(Math.random() * treeTypes.length)], x: -100 + Math.floor(Math.random() * 1480), y: 696, scale: 0.6 + Math.random() * 0.3, depth: -4, tint: 0x778877 });
                    }
                    // Midground layer (larger, full color)
                    const midCount = Math.floor(Math.random() * 10) + 10;
                    for (let i = 0; i < midCount; i++) {
                        layout.push({ asset: treeTypes[Math.floor(Math.random() * treeTypes.length)], x: -100 + Math.floor(Math.random() * 1480), y: 696, scale: 0.8 + Math.random() * 0.4, depth: -3 });
                    }
                } else if (biome === 'Plains') {
                    // Sparse plains, max 2-3 trees spread out
                    const treeTypes = ['tree1', 'tree2', 'birch1', 'birch2'];
                    const treeCount = Math.floor(Math.random() * 2) + 2; // 2 to 3 trees
                    for (let i = 0; i < treeCount; i++) {
                        layout.push({ asset: treeTypes[Math.floor(Math.random() * treeTypes.length)], x: 100 + Math.floor(Math.random() * 1080), y: 696, scale: 0.8 + Math.random() * 0.2, depth: -3 });
                    }
                    // Pad to 15 with small bushes or statues to ensure the rebuild check doesn't re-trigger
                    while (layout.length < 15) {
                        layout.push({ asset: 'statue', x: Math.floor(Math.random() * 1280), y: 696, scale: 0.4 + Math.random() * 0.2, depth: -4, tint: 0x99aa99 });
                    }
                } else if (biome === 'Desert') {
                    const cactusSingle = [27, 28, 29, 33, 34, 35];
                    const cactusTall = [{top: 16, bottom: 22}, {top: 17, bottom: 23}];
                    const rockFrames = [0, 1, 2, 3, 6, 7, 8, 9]; // Single-frame rocks only
                    const rockWide = [{left: 4, right: 5}, {left: 10, right: 11}, {left: 14, right: 15}]; // Double-wide sandstones

                    // Many Cactuses!
                    const floraCount = Math.floor(Math.random() * 8) + 6; // 6 to 13 cactuses
                    for (let i = 0; i < floraCount; i++) {
                        const x = 50 + Math.floor(Math.random() * 1180);
                        const scale = 1.5 + Math.random() * 0.5;
                        if (Math.random() < 0.4) {
                            // Spawn Tall Cactus (bottom and top halves)
                            const t = cactusTall[Math.floor(Math.random() * cactusTall.length)];
                            layout.push({ asset: 'desert_pack', frame: t.bottom, x: x, y: 696, scale: scale, depth: -4, tint: 0xffffff });
                            layout.push({ asset: 'desert_pack', frame: t.top, x: x, y: 696 - (32 * scale), scale: scale, depth: -4, tint: 0xffffff });
                        } else {
                            // Spawn Single Frame Cactus
                            const frame = cactusSingle[Math.floor(Math.random() * cactusSingle.length)];
                            layout.push({ asset: 'desert_pack', frame: frame, x: x, y: 696, scale: scale, depth: -4, tint: 0xffffff });
                        }
                    }

                    // Very few rocks — mix of single and wide
                    const fgCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 rocks
                    for (let i = 0; i < fgCount; i++) {
                        const x = Math.floor(Math.random() * 1200) + 40;
                        const scale = 1.0 + Math.random() * 0.5;
                        if (Math.random() < 0.3) {
                            // Spawn double-wide sandstone (left + right halves side by side)
                            const r = rockWide[Math.floor(Math.random() * rockWide.length)];
                            layout.push({ asset: 'desert_pack', frame: r.left, x: x, y: 696, scale: scale, depth: -3, tint: 0xffffff });
                            layout.push({ asset: 'desert_pack', frame: r.right, x: x + (32 * scale), y: 696, scale: scale, depth: -3, tint: 0xffffff });
                        } else {
                            // Single small rock
                            const frame = rockFrames[Math.floor(Math.random() * rockFrames.length)];
                            layout.push({ asset: 'desert_pack', frame: frame, x: x, y: 696, scale: scale, depth: -3, tint: 0xffffff });
                        }
                    }

                    // Pad the array to 15 items so the fallback engine doesn't spawn forest trees
                    while (layout.length < 15) {
                        const frame = cactusSingle[Math.floor(Math.random() * cactusSingle.length)];
                        layout.push({ asset: 'desert_pack', frame: frame, x: Math.floor(Math.random() * 1280), y: 696, scale: 0.8 + Math.random() * 0.5, depth: -3, tint: 0xffffff });
                    }
                } else if (biome === 'Coastal') {
                    // Tropical trees using the new Palm Trees Pack
                    const bgCount = Math.floor(Math.random() * 6) + 4;
                    for (let i = 0; i < bgCount; i++) {
                        let palmIndex = Math.floor(Math.random() * 16) + 1;
                        layout.push({ asset: `palm${palmIndex}`, x: -50 + Math.floor(Math.random() * 1380), y: 696, scale: 2.0 + Math.random() * 1.0, depth: -4 });
                    }
                    const midCount = Math.floor(Math.random() * 4) + 3;
                    for (let i = 0; i < midCount; i++) {
                        let palmIndex = Math.floor(Math.random() * 16) + 1;
                        layout.push({ asset: `palm${palmIndex}`, x: -50 + Math.floor(Math.random() * 1380), y: 696, scale: 3.0 + Math.random() * 1.0, depth: -3 });
                    }
                    // Pad to 15
                    while (layout.length < 15) {
                        layout.push({ asset: 'statue', x: Math.floor(Math.random() * 1280), y: 696, scale: 0.5, depth: -4, tint: 0x334455 });
                    }
                } else if (biome === 'Cave') {
                    // Cave interior: stalagmites (using rocks), maybe a few dead trees or statues
                    const rockFrames = [0, 1, 2, 3, 6, 7, 8, 9];
                    const rockCount = Math.floor(Math.random() * 8) + 6;
                    for (let i = 0; i < rockCount; i++) {
                        const frame = rockFrames[Math.floor(Math.random() * rockFrames.length)];
                        layout.push({ asset: 'desert_pack', frame: frame, x: 50 + Math.floor(Math.random() * 1180), y: 696, scale: 1.5 + Math.random() * 0.5, depth: -3, tint: 0x888899 });
                    }
                    const statueCount = Math.floor(Math.random() * 3) + 1;
                    for (let i = 0; i < statueCount; i++) {
                        layout.push({ asset: 'statue', x: Math.floor(Math.random() * 1280), y: 696, scale: 0.8, depth: -4, tint: 0x555566 });
                    }
                    // Pad to 15
                    while (layout.length < 15) {
                        layout.push({ asset: 'desert_pack', frame: 0, x: Math.floor(Math.random() * 1280), y: 696, scale: 1.0, depth: -4, tint: 0x666677 });
                    }
                } else if (biome === 'Dungeon') {
                    // NO TREES in the dungeon! Just a few scattered statues
                    const statueCount = Math.floor(Math.random() * 4) + 3;
                    for (let i = 0; i < statueCount; i++) {
                        let r = Math.random();
                        let asset, scale;
                        if (r < 0.4) {
                            asset = 'statue'; // Angel statue
                            scale = 1.2 + Math.random() * 0.5;
                        } else if (r < 0.7) {
                            asset = 'large_statue_hell';
                            scale = 0.7 + Math.random() * 0.4;
                        } else {
                            asset = 'large_statue_hell2';
                            scale = 0.7 + Math.random() * 0.4;
                        }
                        layout.push({ asset, x: 80 + Math.floor(Math.random() * 1120), y: 696, scale, depth: -3, tint: 0x8888aa });
                    }
                    // Pad to 15
                    while (layout.length < 15) {
                        layout.push({ asset: 'statue', x: Math.floor(Math.random() * 1280), y: 696, scale: 0.8, depth: -4, tint: 0x667788 });
                    }
                } else if (biome === 'Deadwoods') {
                    // Spooky Deadwoods biome using dead_tree_X
                    const bgCount = Math.floor(Math.random() * 8) + 8;
                    for (let i = 0; i < bgCount; i++) {
                        let treeIndex = Math.floor(Math.random() * 64) + 1;
                        layout.push({ asset: `dead_tree_${treeIndex}`, x: -50 + Math.floor(Math.random() * 1380), y: 670, scale: 2.0 + Math.random() * 1.0, depth: -4, tint: 0x555566 });
                    }
                    const midCount = Math.floor(Math.random() * 6) + 4;
                    for (let i = 0; i < midCount; i++) {
                        let treeIndex = Math.floor(Math.random() * 64) + 1;
                        layout.push({ asset: `dead_tree_${treeIndex}`, x: -50 + Math.floor(Math.random() * 1380), y: 685, scale: 2.5 + Math.random() * 1.0, depth: -3, tint: 0x777788 });
                    }
                    // Pad to 15
                    while (layout.length < 15) {
                        layout.push({ asset: 'statue', x: Math.floor(Math.random() * 1280), y: 696, scale: 0.6, depth: -4, tint: 0x444455 });
                    }
                } else if (biome === 'Winter') {
                    // Sparse frozen trees and statues using ultimate_pines and tree4
                    const bgCount = Math.floor(Math.random() * 8) + 6;
                    for (let i = 0; i < bgCount; i++) {
                        let usePine = Math.random() > 0.4;
                        let pineIndex = Math.floor(Math.random() * 64) + 1;
                        let asset = usePine ? `ultimate_pine_${pineIndex}` : 'tree4';
                        let frame = undefined;
                        // scale pines up because they are ~50px tall compared to 256x256 trees
                        let scale = (usePine ? 3.5 : 0.6) + Math.random() * 0.5;
                        let treeY = usePine ? 680 : 696;
                        layout.push({ asset, frame, x: -50 + Math.floor(Math.random() * 1380), y: treeY, scale, depth: -4, tint: 0xccddff });
                    }
                    const midCount = Math.floor(Math.random() * 5) + 4;
                    for (let i = 0; i < midCount; i++) {
                        let usePine = Math.random() > 0.4;
                        let pineIndex = Math.floor(Math.random() * 64) + 1;
                        let asset = usePine ? `ultimate_pine_${pineIndex}` : 'tree4';
                        let frame = undefined;
                        let scale = (usePine ? 4.0 : 0.8) + Math.random() * 0.5;
                        let treeY = usePine ? 680 : 696;
                        layout.push({ asset, frame, x: -50 + Math.floor(Math.random() * 1380), y: treeY, scale, depth: -3, tint: 0x88aacc });
                    }
                    // Pad to 15
                    while (layout.length < 15) {
                        layout.push({ asset: 'statue', x: Math.floor(Math.random() * 1280), y: 696, scale: 0.5, depth: -4, tint: 0xbbccdd });
                    }
                } else if (biome === 'Hell') {
                    // Hellish landscape: charred dead trees, hell statues, no green
                    const bgCount = Math.floor(Math.random() * 6) + 4;
                    for (let i = 0; i < bgCount; i++) {
                        let treeIndex = Math.floor(Math.random() * 64) + 1;
                        layout.push({ asset: `dead_tree_${treeIndex}`, x: -50 + Math.floor(Math.random() * 1380), y: 680, scale: 1.5 + Math.random() * 1.0, depth: -4, tint: 0x662222 });
                    }
                    // Scatter some hell statues
                    const statueCount = Math.floor(Math.random() * 3) + 2;
                    for (let i = 0; i < statueCount; i++) {
                        let r = Math.random();
                        let asset = r < 0.5 ? 'large_statue_hell' : 'large_statue_hell2';
                        layout.push({ asset, x: 80 + Math.floor(Math.random() * 1120), y: 696, scale: 0.7 + Math.random() * 0.4, depth: -3, tint: 0xaa4444 });
                    }
                    // Midground charred trees
                    const midCount = Math.floor(Math.random() * 4) + 3;
                    for (let i = 0; i < midCount; i++) {
                        let treeIndex = Math.floor(Math.random() * 64) + 1;
                        layout.push({ asset: `dead_tree_${treeIndex}`, x: -50 + Math.floor(Math.random() * 1380), y: 690, scale: 2.0 + Math.random() * 1.0, depth: -3, tint: 0x883333 });
                    }
                    // Pad to 15
                    while (layout.length < 15) {
                        layout.push({ asset: 'large_statue_hell', x: Math.floor(Math.random() * 1280), y: 696, scale: 0.5, depth: -4, tint: 0x553333 });
                    }
                } else if (biome === 'Heaven') {
                    // Celestial landscape: angel statues, gilded trees, and golden flora
                    const bgCount = Math.floor(Math.random() * 6) + 4;
                    const treeTypes = ['tree1', 'tree2', 'tree3', 'tree4', 'birch1', 'birch2', 'pine'];
                    for (let i = 0; i < bgCount; i++) {
                        let asset = treeTypes[Math.floor(Math.random() * treeTypes.length)];
                        layout.push({ asset, x: -50 + Math.floor(Math.random() * 1380), y: 696, scale: 0.7 + Math.random() * 0.4, depth: -4, tint: 0xfffae6 });
                    }
                    // Scatter some angel statues
                    const statueCount = Math.floor(Math.random() * 3) + 2;
                    for (let i = 0; i < statueCount; i++) {
                        layout.push({ asset: 'statue', x: 80 + Math.floor(Math.random() * 1120), y: 696, scale: 1.2 + Math.random() * 0.4, depth: -3, tint: 0xfff0b3 });
                    }
                    // Midground gilded trees
                    const midCount = Math.floor(Math.random() * 4) + 3;
                    for (let i = 0; i < midCount; i++) {
                        let asset = treeTypes[Math.floor(Math.random() * treeTypes.length)];
                        layout.push({ asset, x: -50 + Math.floor(Math.random() * 1380), y: 696, scale: 0.9 + Math.random() * 0.5, depth: -3, tint: 0xfff5cc });
                    }
                    // Pad to 15
                    while (layout.length < 15) {
                        layout.push({ asset: 'statue', x: Math.floor(Math.random() * 1280), y: 696, scale: 0.8, depth: -4, tint: 0xffeb99 });
                    }
                } else {
                    // Generic fallback — treat like Forest
                    const treeTypes = ['tree1', 'tree2', 'tree3', 'tree4', 'birch1', 'birch2', 'pine'];
                    const bgCount = Math.floor(Math.random() * 12) + 12;
                    for (let i = 0; i < bgCount; i++) {
                        layout.push({ asset: treeTypes[Math.floor(Math.random() * treeTypes.length)], x: -100 + Math.floor(Math.random() * 1480), y: 696, scale: 0.6 + Math.random() * 0.3, depth: -4, tint: 0x778877 });
                    }
                    const midCount = Math.floor(Math.random() * 8) + 8;
                    for (let i = 0; i < midCount; i++) {
                        layout.push({ asset: treeTypes[Math.floor(Math.random() * treeTypes.length)], x: -100 + Math.floor(Math.random() * 1480), y: 696, scale: 0.8 + Math.random() * 0.4, depth: -3 });
                    }
                }

                zoneData.decorLayout = layout;
                const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
                const idx = saves.findIndex(s => s.id === window.saveData.id);
                const clonedSave = JSON.parse(JSON.stringify(window.saveData));
                if (idx > -1) saves[idx] = clonedSave; else saves.push(clonedSave);
                localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
            }

            zoneData.decorLayout.forEach(item => {
                // Ensure asset is loaded to prevent crash if save has weird data
                if (this.scene.textures.exists(item.asset)) {
                    // Correct old depths dynamically so old saves don't stay hidden behind backgrounds
                    let finalDepth = item.depth;
                    if (finalDepth === -6) finalDepth = -4;
                    if (finalDepth === -5) finalDepth = -3;

                    let targetY = item.y;
                    if (this.scene.platforms && this.scene.platforms.getChildren().length > 0) {
                        const blocksAtX = this.scene.platforms.getChildren().filter(block => Math.abs(block.x - item.x) <= 23 && block.y < 800);
                        if (blocksAtX.length > 0) {
                            const highestBlock = blocksAtX.reduce((highest, current) => current.y < highest.y ? current : highest, blocksAtX[0]);
                            const offsetY = item.y - 696;
                            targetY = highestBlock.y + offsetY;
                        } else {
                            // Skip rendering decor if there is no platform under it (pit/gap)
                            return;
                        }
                    }

                    const img = (item.frame !== undefined)
                        ? this.scene.add.image(item.x, targetY, item.asset, item.frame)
                        : this.scene.add.image(item.x, targetY, item.asset);
                    img.setOrigin(0.5, 1).setScale(item.scale).setDepth(finalDepth);
                    if (item.tint) {
                        img.setTint(item.tint);
                    }
                    this.scene.decorGroup.add(img);
                }
            });

            // SAFETY NET: If a Dangerous zone somehow has no enemies (bad Gemini output,
            // old save with cleared enemies, negative zone edge case), generate fallback enemies.
            if (zoneData.type !== 'Safe' && (!zoneData.enemies || zoneData.enemies.length === 0)) {
                console.warn(`Zone ${this.currentZoneIndex} (${zoneData.name}) is Dangerous but has 0 enemies — generating fallback.`);
                const biome = zoneData.biome || 'Forest';
                const biomeEnemies = {
                    'Forest': ['slime', 'goblin', 'mushroom', 'bat', 'spider', 'bandit', 'willowisp'],
                    'Plains': ['slime', 'goblin', 'orc', 'bat', 'bandit', 'willowisp'],
                    'Cave': ['bat', 'spider', 'slime', 'goblin', 'skeleton', 'willowisp'],
                    'Desert': ['mummy', 'scarab_beetle', 'orc', 'spider', 'bat', 'willowisp'],
                    'Coastal': ['slime', 'bat', 'plague_flies', 'bandit', 'willowisp'],
                    'Winter': ['slime', 'orc', 'burning_skull_blue', 'frost_giant', 'willowisp'],
                    'Dungeon': ['slime', 'bat', 'spider', 'old_demon', 'male_damned', 'skeleton', 'willowisp'],
                    'Deadwoods': ['slime', 'bat', 'spider', 'twisted_damned', 'plague_flies', 'willowisp'],
                    'Hell': ['slime', 'bat', 'burning_damned', 'burning_skull', 'imp', 'cheeky_devil', 'willowisp', 'bloated_damned']
                };
                const validTypes = biomeEnemies[biome] || biomeEnemies['Forest'];
                const playerLevel = (window.saveData && window.saveData.level) || 1;
                const absIdx = Math.abs(this.currentZoneIndex || 0);
                const count = Math.max(3, Math.min(6, 3 + Math.floor(absIdx / 5)));
                zoneData.enemies = [];
                for (let i = 0; i < count; i++) {
                    zoneData.enemies.push({
                        type: validTypes[Math.floor(Math.random() * validTypes.length)],
                        x: 300 + Math.floor(Math.random() * 3200),
                        hp: 80 + (playerLevel * 20) + (absIdx * 10) + Math.floor(Math.random() * 40),
                        speed: 80 + (playerLevel * 10) + (absIdx * 5) + Math.floor(Math.random() * 30)
                    });
                }
            }

            // 10% chance to spawn a Spider Boss if this is dangerous
            if (zoneData.type !== 'Safe' && !zoneData.enemies.find(e => e.type === 'spider') && Math.random() < 0.10) {
                const playerLevel = (window.saveData && window.saveData.level) || 1;
                zoneData.enemies.push({
                    type: 'spider',
                    x: 600 + Math.random() * 400,
                    hp: 400 + (playerLevel * 50),
                    speed: 120 + (playerLevel * 10)
                });
            }

            let isRivalEncounter = false;
            let rivalClass = 'knight_rival';
            let isMegaboss = false;

            const defeatedCount = (window.saveData && window.saveData.defeatedRivals || []).length;
            
            // Base encounter chance for first rival is 25%, drops 5% per kill down to 5% for the Megaboss
            const encounterChance = Math.max(0.05, 0.25 - (defeatedCount * 0.05));

            if (zoneData.type !== 'Safe' && Math.random() < encounterChance) {
                isRivalEncounter = true;
                const rivalClasses = ['knight_rival', 'wizard_rival', 'samurai_rival', 'ranger_rival', 'elven_spellblade_rival'];
                
                if (defeatedCount >= 4 && !(window.saveData && window.saveData.isSavior)) {
                    isMegaboss = true;
                    rivalClass = 'megaboss_rival';
                } else {
                    rivalClass = rivalClasses[Math.floor(Math.random() * rivalClasses.length)];
                }
                
                // Clear the normal enemies or keep 1-2 as the "party"
                if (zoneData.enemies.length > 2) {
                    zoneData.enemies.length = 2; // Keep max 2 monsters as minions
                }
            }

            // Spawning guarantee check for new/special enemies in target biomes
            if (zoneData.type === 'Dangerous' && zoneData.enemies) {
                const targetBiome = zoneData.biome || 'Forest';
                const currentEnemyTypes = zoneData.enemies.map(e => ((e.type || '').toLowerCase().replace(/\s+/g, '_')));
                
                // Determine what special/new enemies belong to this biome
                const specialCandidates = [];
                if (['Forest', 'Dungeon', 'Deadwoods'].includes(targetBiome)) {
                    specialCandidates.push('wolfen', 'coyle');
                }
                if (['Dungeon', 'Deadwoods', 'Hell'].includes(targetBiome)) {
                    specialCandidates.push('special_enemy_demon_male', 'special_enemy_demon_female', 'special_enemy_devil_male', 'special_enemy_devil_female');
                }
                if (['Plains', 'Forest', 'Desert', 'Winter'].includes(targetBiome)) {
                    specialCandidates.push('special_enemy_orc_male', 'special_enemy_orc_female');
                }
                if (['Deadwoods', 'Dungeon', 'Forest'].includes(targetBiome)) {
                    specialCandidates.push('special_enemy_zombie_male', 'special_enemy_zombie_female');
                }
                if (['Dungeon', 'Hell', 'Deadwoods', 'Cave'].includes(targetBiome)) {
                    specialCandidates.push('special_enemy_ghost_male', 'special_enemy_ghost_female');
                }

                // If this biome has candidates, and none of them are currently in the enemy list,
                // replace 1-2 random existing enemies (or append them) with candidates!
                if (specialCandidates.length > 0) {
                    const hasSpecial = currentEnemyTypes.some(t => specialCandidates.includes(t));
                    if (!hasSpecial) {
                        const countToSpawn = Math.floor(Math.random() * 2) + 1; // 1 or 2
                        const playerLevel = (window.saveData && window.saveData.level) || 1;
                        for (let i = 0; i < countToSpawn; i++) {
                            const chosenType = specialCandidates[Math.floor(Math.random() * specialCandidates.length)];
                            const spawnX = 300 + Math.random() * 3200;
                            const hp = 100 + (playerLevel * 20) + Math.floor(Math.random() * 50);
                            const speed = 80 + (playerLevel * 5) + Math.floor(Math.random() * 20);
                            
                            // If we have existing enemies, overwrite one; otherwise push
                            if (zoneData.enemies.length > i) {
                                zoneData.enemies[i].type = chosenType;
                            } else {
                                zoneData.enemies.push({
                                    type: chosenType,
                                    x: spawnX,
                                    hp: hp,
                                    speed: speed
                                });
                            }
                        }
                    }
                }
            }

            // Guarantee some heavenly enemies/angels are present to interact with/provoke in Heaven town
            if (zoneData.biome === 'Heaven') {
                if (!zoneData.enemies || zoneData.enemies.length === 0) {
                    zoneData.enemies = [
                        { type: 'heavenly_valkyrie', x: 400, hp: 400, speed: 100 },
                        { type: 'heavenly_seraph', x: 800, hp: 350, speed: 100 },
                        { type: 'heavenly_archangel', x: 1200, hp: 450, speed: 100 },
                        { type: 'heavenly_cherub', x: 1400, hp: 150, speed: 120 }
                    ];
                }
            }

            // Spawn Enemies
            zoneData.enemies.forEach(eData => {
                let type = (eData.type || 'slime').toLowerCase().replace(/\s+/g, '_');
                if (type === 'tree_damned') type = 'lich_lord'; // Upgrade old saves and AI hallucinations
                const validTypes = [
                    'slime', 'goblin', 'bat', 'mushroom', 'orc', 'spider',
                    'plague_flies', 'burning_skull_blue', 'old_demon', 'male_damned',
                    'female_damned', 'twisted_damned', 'burning_damned',
                    'burning_skull', 'imp', 'cheeky_devil', 'the_devil', 'bloated_damned',
                    'lich_lord', 'skeleton', 'bandit', 'frost_giant',
                    'mummy', 'scarab_beetle',
                    'zombie', 'zombie_v1', 'zombie_v2', 'zombie_v3',
                    'wolfen', 'coyle',
                    'special_enemy_demon_male', 'special_enemy_demon_female',
                    'special_enemy_devil_male', 'special_enemy_devil_female',
                    'special_enemy_orc_male', 'special_enemy_orc_female',
                    'special_enemy_zombie_male', 'special_enemy_zombie_female',
                    'special_enemy_ghost_male', 'special_enemy_ghost_female',
                    'heavenly_valkyrie', 'heavenly_seraph', 'heavenly_archangel', 'heavenly_cherub',
                    'ogre', 'giant', 'troll', 'willowisp'
                ];
                if (!validTypes.includes(type)) {
                    console.warn(`AI generated invalid enemy type: ${type}. Falling back.`);
                    type = validTypes[Math.floor(Math.random() * validTypes.length)];
                }
                
                // Sanitize AI outputs which could be strings, undefined, or NaN
                const spawnX = (eData.x !== undefined && !isNaN(Number(eData.x))) ? Number(eData.x) : 200 + Math.random() * 3400;
                const hp = (eData.hp !== undefined && !isNaN(Number(eData.hp))) ? Number(eData.hp) : 100;
                if (hp <= 0) return; // Skip dead/invalid enemies
                const speed = (eData.speed !== undefined && !isNaN(Number(eData.speed))) ? Number(eData.speed) : 100;

                // Spawn from above so they don't fall through the floor or spawn inside platforms!
                const enemy = new EnemyController(this.scene, spawnX, 100, this.scene.player, this.geminiService, type);
                // Only override HP/speed for non-boss enemies (BUG-18: bosses have carefully tuned stats in constructor)
                const bossTypes = ['lich_lord', 'the_devil', 'spider', 'frost_giant'];
                if (!bossTypes.includes(type)) {
                    enemy.maxHp = hp;
                    enemy.hp = hp;
                    enemy.speed = speed;
                }
                this.scene.enemies.add(enemy.sprite);
            });

            if (isRivalEncounter) {
                const spawnX = spawnSide === 'left' ? 800 : 400; // Spawn opposite to player
                this.scene.spawnHeroAI(rivalClass, spawnX, 100, 'hostile', 'Rival Hero', 'A cocky and aggressive rival adventurer who hates the player.', 0);
                
                if (isMegaboss) {
                    // Spawn all 4 base rivals as backup
                    this.scene.spawnHeroAI('knight_rival', spawnX - 80, 100, 'hostile', 'Rival Knight');
                    this.scene.spawnHeroAI('wizard_rival', spawnX + 80, 100, 'hostile', 'Rival Wizard');
                    this.scene.spawnHeroAI('samurai_rival', spawnX - 160, 100, 'hostile', 'Rival Samurai');
                    this.scene.spawnHeroAI('ranger_rival', spawnX + 160, 100, 'hostile', 'Rival Ranger');
                }

                // Show an immediate fallback cutscene so the player always sees dialogue
                const fallbackLines = [
                    `You thought you could wander these lands unchallenged? Think again, fool!`,
                    `I've been tracking you for miles. Your journey ends here!`,
                    `Another hero? Ha! I'll add your bones to my collection.`,
                    `You dare trespass in MY territory? Prepare to be destroyed!`,
                    `Finally, a worthy opponent... or perhaps not. Let's find out!`
                ];
                const megabossFallback = `You've defeated my lieutenants, but that only proves you're worth killing myself. This is your end, hero — all five of us against you!`;
                const immediateLine = isMegaboss ? megabossFallback : fallbackLines[Math.floor(Math.random() * fallbackLines.length)];

                if (this.scene.playCutscene) {
                    this.scene.playCutscene(`[Rival]: ${immediateLine}`, () => {});
                }

                // Also fire async Gemini request to potentially upgrade the cutscene with a better line
                let prompt = `Generate a 2-sentence trash-talk dialogue from a rival adventurer (${rivalClass}) who just ambushed the player in ${zoneData.name}. They might have monsters with them. Be aggressive and dramatic.`;
                if (isMegaboss) {
                    prompt = `Generate an epic 3-sentence boss monologue from the Rival Megaboss. The player has defeated all his lieutenants, and now he is attacking with his entire elite squad of 4 heroes! This is the ultimate showdown.`;
                }

                this.geminiService.getGameMasterResponse(this.scene.player, prompt, zoneData).then(res => {
                    if (!this.scene || this.scene.isSceneDestroyed) return;
                    // If the cutscene is still active, don't interrupt. Otherwise show the AI-generated line.
                    if (res && res.storyText && this.scene.playCutscene) {
                        console.log('Rival cutscene AI line available:', res.storyText);
                    }
                }).catch(e => {
                    // Fallback cutscene already shown, so this is non-critical
                    console.warn("GM rival cutscene async error (fallback already shown):", e.message || e);
                });
            }

            // Inject quest-target enemies if player has active kill quests
            if (zoneData.type === 'Dangerous' && window.saveData && window.saveData.quests && window.saveData.quests.length > 0) {
                const spawnedTypes = zoneData.enemies.map(e => (e.type || 'slime').toLowerCase().replace(/\s+/g, '_'));
                window.saveData.quests.forEach(quest => {
                    if (quest.type === 'kill' || !quest.type) {
                        if (quest.targetType && !spawnedTypes.includes(quest.targetType)) {
                            const playerLevel = window.saveData.level || 1;
                            const questEnemy = new EnemyController(
                                this.scene, 400 + Math.floor(Math.random() * 500), 100,
                                this.scene.player, this.geminiService, quest.targetType
                            );
                            questEnemy.maxHp = 80 + (playerLevel * 20);
                            questEnemy.hp = questEnemy.maxHp;
                            questEnemy.speed = 80 + (playerLevel * 10);
                            this.scene.enemies.add(questEnemy.sprite);
                            console.log(`Injected quest-target enemy: ${quest.targetType}`);
                        }
                    }
                });
            }

            // Spawn Rescuee NPC if this zone matches a rescue quest
            if (zoneData.type === 'Dangerous' && window.saveData && window.saveData.quests) {
                const rescueQuest = window.saveData.quests.find(q => 
                    q.type === 'rescue' && 
                    q.rescueeZone === zoneIndex && 
                    q.rescueState === 'captive'
                );
                if (rescueQuest && typeof RescueeNPCFactory !== 'undefined' && typeof RescueeNPC !== 'undefined') {
                    try {
                        const factory = new RescueeNPCFactory(this.scene);
                        const rescueeConfig = factory.createRescuee({
                            gender: rescueQuest.rescueeGender
                        });
                        // Store the config on the quest for save/load regeneration
                        rescueQuest.rescueeTextureConfig = rescueeConfig.config;
                        
                        // Spawn at the far end of the zone (past enemies)
                        const spawnX = 2800 + Math.floor(Math.random() * 600);
                        const rescuee = new RescueeNPC(this.scene, spawnX, 100, rescueeConfig.textureKey, {
                            name: rescueQuest.rescueeName,
                            gender: rescueQuest.rescueeGender,
                            questId: rescueQuest.id,
                            config: rescueeConfig.config
                        });
                        this.scene.activeRescuee = rescuee;
                        console.log(`Spawned rescuee: ${rescueQuest.rescueeName} at x=${spawnX}`);
                    } catch (err) {
                        console.error('Failed to spawn rescuee:', err);
                    }
                }
            }

            // Re-spawn following rescuee if player has one (from zone transition)
            if (window.saveData && window.saveData.activeRescuee && window.saveData.activeRescuee.state === 'following') {
                if (typeof RescueeNPCFactory !== 'undefined' && typeof RescueeNPC !== 'undefined') {
                    try {
                        const savedRescuee = window.saveData.activeRescuee;
                        const factory = new RescueeNPCFactory(this.scene);
                        const rescueeConfig = factory.createRescuee(savedRescuee.config || {});
                        
                        const spawnX = this.scene.player.sprite.x - 80;
                        const rescuee = new RescueeNPC(this.scene, spawnX, 100, rescueeConfig.textureKey, {
                            name: savedRescuee.name,
                            gender: savedRescuee.gender,
                            questId: savedRescuee.questId,
                            config: savedRescuee.config
                        });
                        rescuee.state = 'following';
                        // Clean up captive-state UI since we're already following
                        if (rescuee._helpPulseTween) {
                            rescuee._helpPulseTween.stop();
                            rescuee._helpPulseTween = null;
                        }
                        if (rescuee.helpText) {
                            rescuee.helpText.destroy();
                            rescuee.helpText = null;
                        }
                        this.scene.activeRescuee = rescuee;
                        console.log(`Re-spawned following rescuee: ${savedRescuee.name}`);
                    } catch (err) {
                        console.error('Failed to re-spawn rescuee:', err);
                    }
                }
            }

            // Check for rescue completion when entering a Safe zone
            if (zoneData.type === 'Safe' && window.saveData && window.saveData.activeRescuee && window.saveData.activeRescuee.state === 'following') {
                const savedRescuee = window.saveData.activeRescuee;
                // Complete the rescue quest
                if (this.scene.player && this.scene.player.progressQuest) {
                    this.scene.player.progressQuest('rescue_complete', savedRescuee.questId);
                }
                if (this.scene.showFloatingText) {
                    this.scene.showFloatingText(
                        this.scene.player.sprite.x, this.scene.player.sprite.y - 100,
                        `🆘 ${savedRescuee.name} Rescued!\n+5 Alignment`, 0x44ff44
                    );
                }
                // Clean up the active rescuee
                if (this.scene.activeRescuee) {
                    this.scene.activeRescuee.completeRescue();
                }
                window.saveData.activeRescuee = null;
                console.log(`Rescue complete: ${savedRescuee.name}`);
            }

            // Display Lore Splash
            if (zoneData.lore || zoneData.name) {
                const nameEl = document.getElementById('lore-zone-name');
                const textEl = document.getElementById('lore-zone-text');
                const loreUi = document.getElementById('ui-zone-lore');
                if (nameEl && textEl && loreUi) {
                    nameEl.innerText = zoneData.name;
                    textEl.innerText = zoneData.lore || "A mysterious place untouched by recent history.";
                    
                    // Trigger fade in
                    loreUi.style.transition = 'none';
                    loreUi.style.opacity = 0;
                    // Force reflow
                    void loreUi.offsetWidth;
                    loreUi.style.transition = 'opacity 1s ease-in-out';
                    loreUi.style.opacity = 1;
                    
                    // Clear previous timeout if any
                    if (this.loreTimeout) clearTimeout(this.loreTimeout);
                    this.loreTimeout = setTimeout(() => {
                        loreUi.style.opacity = 0;
                    }, 5000);
                }
            }

            // Scrub town NPCs from wilderness zones
            if (zoneData.type !== 'Safe' && zoneData.npcs && zoneData.npcs.length > 0) {
                const validHeroes = ['ranger', 'knight', 'samurai', 'wizard', 'elven_spellblade'];
                zoneData.npcs = zoneData.npcs.filter(n => validHeroes.includes(n.spriteKey));
                
                // Spawn the valid wandering heroes in the wilderness
                zoneData.npcs.forEach(nData => {
                    const spriteKey = nData.spriteKey || 'ranger';
                    const npc = new NPCController(this.scene, nData.x, 624, this.scene.player, this.geminiService, nData.name, nData.persona, spriteKey);
                    this.scene.physics.add.collider(npc.sprite, this.scene.platforms);
                    this.scene.npcs.push(npc);
                    this.scene.decorGroup.add(npc.nameText);
                    this.scene.decorGroup.add(npc.promptText);
                });
            }

            // If it's a dangerous zone and there are NO enemies (player cleared it), 50% chance to respawn a few enemies
            if (zoneData.type !== 'Safe' && zoneData.enemies.length === 0 && Math.random() > 0.5) {
                const types = ['slime', 'goblin', 'bat', 'spider', 'skeleton'];
                for(let i=0; i<3; i++) {
                    const type = types[Math.floor(Math.random() * types.length)];
                    const enemy = new EnemyController(this.scene, 200 + Math.random() * 3000, 100, this.scene.player, this.geminiService, type);
                    this.scene.enemies.add(enemy.sprite);
                    zoneData.enemies.push({ type: type, x: enemy.sprite.x, hp: enemy.maxHp, speed: enemy.speed });
                }
            }
        }
    }
}
