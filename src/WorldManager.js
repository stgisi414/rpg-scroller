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

        if (!zoneData) {
            // Generate via Gemini (or rich fallback)
            zoneData = await this.generateZoneWithGemini(zoneIndex);
            window.saveData.zones[zoneIndex] = zoneData;
            
            // Save to localStorage
            const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
            const saveIndex = saves.findIndex(s => s.id === window.saveData.id);
            if (saveIndex > -1) {
                saves[saveIndex] = window.saveData;
            } else {
                saves.push(window.saveData);
            }
            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
        }

        // Apply zone data to scene
        try {
            this.buildZone(zoneData, spawnSide);
        } catch (e) {
            console.error("Error in buildZone:", e);
            const errEl = document.getElementById('debug-content');
            if (errEl) errEl.innerHTML += `<br><span style="color:red">CRITICAL ERROR in buildZone: ${e.message}<br>${e.stack}</span>`;
        }
        this.scene.showLoading(false);
    }

    async generateZoneWithGemini(zoneIndex) {
        // Prompt Gemini to create a zone
        this.scene.loadingText.setText("Gemini is forging the world...");
        
        const playerLevel = window.saveData.level || 1;
        const playerClassId = window.saveData.classId || 'knight';
        
        // Zone 0 is always a town; after that, a town appears every 4 zones in either direction
        const absIdx = Math.abs(zoneIndex);
        let forceTown = zoneIndex === 0 || (absIdx > 0 && absIdx % 4 === 0);

        // Biome Chunking: Every 4 zones (3 wilderness + 1 town) share a biome.
        const biomes = ['Forest', 'Plains', 'Cave', 'Desert', 'Winter', 'Coastal', 'Dungeon', 'Deadwoods', 'Hell'];
        let chunkIndex = absIdx === 0 ? 0 : Math.floor((absIdx - 1) / 4);
        let selectedBiome = biomes[chunkIndex % biomes.length];

        const response = await this.geminiService.generateZoneData(zoneIndex, playerLevel, forceTown, playerClassId, selectedBiome);
        return response;
    }

    buildZone(zoneData, spawnSide) {
        // Clear previous enemies/NPCs (handled in GameScene usually)
        this.currentZoneData = zoneData;
        
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

        if (spawnSide === 'left') {
            this.scene.player.sprite.setX(100);
            if (this.scene.partyMembers) {
                this.scene.partyMembers.forEach((hero, i) => {
                    hero.sprite.setX(100 - 60 - (i * 60));
                    hero.sprite.setY(600);
                    hero.sprite.setVelocity(0, 0);
                });
            }
        } else if (spawnSide === 'right') {
            this.scene.player.sprite.setX(3740);
            if (this.scene.partyMembers) {
                this.scene.partyMembers.forEach((hero, i) => {
                    hero.sprite.setX(3740 + 60 + (i * 60));
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
        if (this.scene.decorGroup) {
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
                    window.saveData.zones[this.currentZoneIndex] = zoneData;
                    const idx = saves.findIndex(s => s.id === window.saveData.id);
                    if (idx > -1) saves[idx] = window.saveData; else saves.push(window.saveData);
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
                if (idx > -1) saves[idx] = window.saveData; else saves.push(window.saveData);
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
                const img = (item.frame !== undefined) ? 
                    this.scene.add.image(item.x, item.y, item.asset, item.frame) : 
                    this.scene.add.image(item.x, item.y, item.asset);
                
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
                    const spriteKey = ['blacksmith', 'alchemist', 'knight', 'samurai', 'sage', 'ranger', 'wizard'].includes(rawKey) ? rawKey : 'npc';
                    const npc = new NPCController(this.scene, nData.x, 696, this.scene.player, this.geminiService, nData.name, nData.persona, spriteKey);
                    this.scene.physics.add.collider(npc.sprite, this.scene.platforms);
                    this.scene.npcs.push(npc);
                    this.scene.decorGroup.add(npc.nameText);
                    this.scene.decorGroup.add(npc.promptText);
                });
            }

            // FALLBACK: If it's zone 0 and Gemini forgot the Sage, force her to spawn!
            if (this.currentZoneIndex === 0) {
                const hasSage = this.scene.npcs.find(n => n.npcName === 'Elara the Sage' || n.spriteKey === 'sage');
                if (!hasSage) {
                    const sage = new NPCController(this.scene, 500, 696, this.scene.player, this.geminiService, 'Elara the Sage', 'Elara is a wise and mysterious sage...', 'sage');
                    this.scene.physics.add.collider(sage.sprite, this.scene.platforms);
                    this.scene.npcs.push(sage);
                    this.scene.decorGroup.add(sage.nameText);
                    this.scene.decorGroup.add(sage.promptText);
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
                if (idx > -1) saves[idx] = window.saveData; else saves.push(window.saveData);
                localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
            }

            zoneData.decorLayout.forEach(item => {
                // Ensure asset is loaded to prevent crash if save has weird data
                if (this.scene.textures.exists(item.asset)) {
                    // Correct old depths dynamically so old saves don't stay hidden behind backgrounds
                    let finalDepth = item.depth;
                    if (finalDepth === -6) finalDepth = -4;
                    if (finalDepth === -5) finalDepth = -3;

                    const img = (item.frame !== undefined)
                        ? this.scene.add.image(item.x, item.y, item.asset, item.frame)
                        : this.scene.add.image(item.x, item.y, item.asset);
                    img.setOrigin(0.5, 1).setScale(item.scale).setDepth(finalDepth);
                    if (item.tint) {
                        img.setTint(item.tint);
                    }
                    this.scene.decorGroup.add(img);
                }
            });

            // 10% chance to spawn a Spider Boss if this is dangerous
            if (zoneData.type !== 'Safe' && !zoneData.enemies.find(e => e.type === 'spider') && Math.random() < 0.10) {
                const playerLevel = window.saveData.level || 1;
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

            const defeatedCount = (window.saveData.defeatedRivals || []).length;
            
            // Base encounter chance for first rival is 50%, drops 10% per kill down to 10% for the Megaboss
            const encounterChance = Math.max(0.10, 0.50 - (defeatedCount * 0.10));

            if (zoneData.type !== 'Safe' && Math.random() < encounterChance) {
                isRivalEncounter = true;
                const rivalClasses = ['knight_rival', 'wizard_rival', 'samurai_rival', 'ranger_rival'];
                
                if (defeatedCount >= 4 && !window.saveData.isSavior) {
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

            // Spawn Enemies
            zoneData.enemies.forEach(eData => {
                let type = (eData.type || 'slime').toLowerCase().replace(/\s+/g, '_');
                if (type === 'tree_damned') type = 'lich_lord'; // Upgrade old saves and AI hallucinations
                const validTypes = [
                    'slime', 'goblin', 'bat', 'mushroom', 'orc', 'spider',
                    'plague_flies', 'burning_skull_blue', 'old_demon', 'male_damned',
                    'female_damned', 'twisted_damned', 'burning_damned',
                    'burning_skull', 'imp', 'cheeky_devil', 'the_devil',
                    'lich_lord', 'skeleton', 'bandit', 'frost_giant',
                    'mummy', 'scarab_beetle'
                ];
                if (!validTypes.includes(type)) {
                    console.warn(`AI generated invalid enemy type: ${type}. Falling back.`);
                    type = validTypes[Math.floor(Math.random() * validTypes.length)];
                }
                
                // Sanitize AI outputs which could be strings, undefined, or NaN
                const spawnX = (eData.x !== undefined && !isNaN(Number(eData.x))) ? Number(eData.x) : 200 + Math.random() * 3400;
                const hp = (eData.hp !== undefined && !isNaN(Number(eData.hp))) ? Number(eData.hp) : 100;
                const speed = (eData.speed !== undefined && !isNaN(Number(eData.speed))) ? Number(eData.speed) : 100;

                // Spawn from above so they don't fall through the floor!
                const enemy = new EnemyController(this.scene, spawnX, 300, this.scene.player, this.geminiService, type);
                enemy.maxHp = hp;
                enemy.hp = hp;
                enemy.speed = speed;
                this.scene.enemies.add(enemy.sprite);
            });

            if (isRivalEncounter) {
                const spawnX = spawnSide === 'left' ? 800 : 400; // Spawn opposite to player
                this.scene.spawnHeroAI(rivalClass, spawnX, 600, 'hostile', 'Rival Hero', 'A cocky and aggressive rival adventurer who hates the player.', 0);
                
                if (isMegaboss) {
                    // Spawn all 4 base rivals as backup
                    this.scene.spawnHeroAI('knight_rival', spawnX - 80, 600, 'hostile', 'Rival Knight');
                    this.scene.spawnHeroAI('wizard_rival', spawnX + 80, 600, 'hostile', 'Rival Wizard');
                    this.scene.spawnHeroAI('samurai_rival', spawnX - 160, 600, 'hostile', 'Rival Samurai');
                    this.scene.spawnHeroAI('ranger_rival', spawnX + 160, 600, 'hostile', 'Rival Ranger');
                }

                // Trigger the cutscene
                let prompt = `Generate a 2-sentence trash-talk dialogue from a rival adventurer (${rivalClass}) who just ambushed the player in ${zoneData.name}. They might have monsters with them. Be aggressive and dramatic.`;
                if (isMegaboss) {
                    prompt = `Generate an epic 3-sentence boss monologue from the Rival Megaboss. The player has defeated all his lieutenants, and now he is attacking with his entire elite squad of 4 heroes! This is the ultimate showdown.`;
                }

                this.geminiService.getGameMasterResponse(this.scene.player, prompt, zoneData).then(res => {
                    if (this.scene.playCutscene) {
                        this.scene.playCutscene(`[Rival]: ${res.storyText}`, () => {});
                    }
                }).catch(e => console.error("GM cutscene error:", e));
            }

            // Inject quest-target enemies if player has active kill quests
            if (zoneData.type === 'Dangerous' && window.saveData.quests && window.saveData.quests.length > 0) {
                const spawnedTypes = zoneData.enemies.map(e => (e.type || 'slime').toLowerCase().replace(/\s+/g, '_'));
                window.saveData.quests.forEach(quest => {
                    if (quest.targetType && !spawnedTypes.includes(quest.targetType)) {
                        const playerLevel = window.saveData.level || 1;
                        const questEnemy = new EnemyController(
                            this.scene, 400 + Math.floor(Math.random() * 500), 600,
                            this.scene.player, this.geminiService, quest.targetType
                        );
                        questEnemy.maxHp = 80 + (playerLevel * 20);
                        questEnemy.hp = questEnemy.maxHp;
                        questEnemy.speed = 80 + (playerLevel * 10);
                        this.scene.enemies.add(questEnemy.sprite);
                        console.log(`Injected quest-target enemy: ${quest.targetType}`);
                    }
                });
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

            // Scrub Mira/goddess from old cached wilderness zones and spawn
            if (zoneData.type !== 'Safe' && zoneData.npcs && zoneData.npcs.length > 0) {
                zoneData.npcs = zoneData.npcs.filter(n => n.spriteKey !== 'npc');
                
                // Spawn the valid wandering heroes in the wilderness
                zoneData.npcs.forEach(nData => {
                    const spriteKey = nData.spriteKey || 'ranger';
                    const npc = new NPCController(this.scene, nData.x, 696, this.scene.player, this.geminiService, nData.name, nData.persona, spriteKey);
                    this.scene.physics.add.collider(npc.sprite, this.scene.platforms);
                    this.scene.npcs.push(npc);
                    this.scene.decorGroup.add(npc.nameText);
                    this.scene.decorGroup.add(npc.promptText);
                });
            }
        }
    }
}
