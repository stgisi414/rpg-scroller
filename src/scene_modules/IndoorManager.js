class IndoorManager {
    constructor(scene) {
        this.scene = scene;
    }

    openTownDirectory() {
        const scene = this.scene;
        if (!scene.player || !scene.player.sprite || !scene.player.sprite.active) return;
        scene.player.sprite.body.moves = false;
        if (scene.inputManager) scene.inputManager.disableForInput();
        
        const ui = document.getElementById('ui-town-directory');
        if (ui) ui.style.display = 'flex';

        // Wire up the travel panel population for the tab button
        const self = this;
        window._populateTravelPanel = () => self.populateTravelPanel();

        // Reset the autoplay directory navigation timer
        if (scene.player.companionAI) {
            scene.player.companionAI._lastDirTime = 0;
        }

        // Add ESC listener
        scene._dirEscListener = (e) => {
            if (e.key === 'Escape') this.closeTownDirectory();
        };
        window.addEventListener('keydown', scene._dirEscListener);

        const closeBtn = document.getElementById('btn-close-directory');
        if (closeBtn) closeBtn.onclick = () => this.closeTownDirectory();

        const container = document.getElementById('directory-locations-container');
        if (container) {
            container.innerHTML = '';
            const currentZone = (window.saveData && window.saveData.currentZone) || 0;
            const isCapital = window.isCapitalCity ? window.isCapitalCity(currentZone) : false;
            const currentKingdom = window.getKingdomForZone ? window.getKingdomForZone(currentZone) : null;

            // Dynamically update throne room with the local ruler's info
            if (isCapital && currentKingdom && window.WORLD_FACTIONS) {
                const faction = window.WORLD_FACTIONS[currentKingdom.rulingFaction];
                if (faction && faction.leader) {
                    window.INDOOR_LOCATIONS.throne_room.npcName = `${faction.leader.title} ${faction.leader.name}`;
                    window.INDOOR_LOCATIONS.throne_room.npcPersona = faction.leader.persona;
                    window.INDOOR_LOCATIONS.throne_room.desc = `Audience with ${faction.leader.title} ${faction.leader.name}`;
                }
            }

            Object.keys(window.INDOOR_LOCATIONS).forEach(id => {
                const loc = window.INDOOR_LOCATIONS[id];
                // Skip capitalOnly locations if not in a capital city
                if (loc.capitalOnly && !isCapital) return;
                const cardEl = document.createElement('div');
                cardEl.className = 'bg-surface-container-highest border border-outline-variant p-4 flex flex-col items-center gap-3 rounded hover:border-tertiary transition-colors cursor-pointer group';
                cardEl.innerHTML = `
                    <span class="material-symbols-outlined text-4xl text-on-surface group-hover:text-tertiary transition-colors" style="font-variation-settings: 'FILL' 1;">${loc.icon}</span>
                    <div class="font-headline-sm text-[16px] text-tertiary font-bold text-center tracking-wider uppercase">${loc.name}</div>
                    <div class="font-body-sm text-[11px] text-on-surface-variant text-center flex-1">${loc.desc}</div>
                    <button class="w-full mt-2 py-2 bg-surface-container border border-tertiary text-tertiary uppercase text-[10px] font-bold tracking-widest group-hover:bg-tertiary group-hover:text-background transition-colors">Enter</button>
                `;
                cardEl.addEventListener('click', () => {
                    this.enterIndoorLocation(id);
                });
                container.appendChild(cardEl);
            });
        }
    }

    closeTownDirectory() {
        const scene = this.scene;
        if (scene.player && scene.player.sprite && scene.player.sprite.active) {
            scene.player.sprite.body.moves = true;
        }
        if (scene.inputManager) scene.inputManager.enableForInput();
        const ui = document.getElementById('ui-town-directory');
        if (ui) ui.style.display = 'none';
        // Reset to Directory tab on close
        const dirContainer = document.getElementById('directory-locations-container');
        const travelContainer = document.getElementById('travel-destinations-container');
        const tabDir = document.getElementById('tab-directory');
        const tabTravel = document.getElementById('tab-travel');
        if (dirContainer) dirContainer.style.display = 'grid';
        if (travelContainer) travelContainer.style.display = 'none';
        if (tabDir) { tabDir.classList.add('border-tertiary', 'text-tertiary'); tabDir.classList.remove('border-transparent', 'text-on-surface-variant'); }
        if (tabTravel) { tabTravel.classList.remove('border-tertiary', 'text-tertiary'); tabTravel.classList.add('border-transparent', 'text-on-surface-variant'); }
        if (scene._dirEscListener) {
            window.removeEventListener('keydown', scene._dirEscListener);
            scene._dirEscListener = null;
        }
    }

    /**
     * Populates the Fast Travel panel with destinations grouped by kingdom.
     * Known World towns are always available. Frontier towns require prior discovery.
     */
    populateTravelPanel() {
        const container = document.getElementById('travel-destinations-container');
        if (!container) return;
        container.innerHTML = '';

        const currentZone = (window.saveData && window.saveData.currentZone) || 0;
        const playerGold = (window.saveData && window.saveData.gold) || 0;
        const visitedZones = (window.saveData && window.saveData.visitedZones) || [];

        // Gather all Known World towns
        const knownWorldDestinations = {};
        if (window.WORLD_KINGDOMS) {
            for (const kId in window.WORLD_KINGDOMS) {
                const kingdom = window.WORLD_KINGDOMS[kId];
                const faction = window.WORLD_FACTIONS ? window.WORLD_FACTIONS[kingdom.rulingFaction] : null;
                const towns = window.getKingdomTowns ? window.getKingdomTowns(kId) : [];
                knownWorldDestinations[kId] = {
                    kingdom: kingdom,
                    faction: faction,
                    towns: towns.filter(z => z !== currentZone) // Exclude current zone
                };
            }
        }

        // Gather discovered Frontier towns
        const frontierDestinations = [];
        if (window.saveData && window.saveData.discoveredKingdoms) {
            for (const fkId in window.saveData.discoveredKingdoms) {
                const fk = window.saveData.discoveredKingdoms[fkId];
                
                // Programmatically align capital to nearest multiple of 4 (town zone) if it isn't one
                if (Math.abs(fk.capital) % 4 !== 0) {
                    const townZones = [];
                    for (let z = fk.zoneRange[0]; z <= fk.zoneRange[1]; z++) {
                        if (z === 0 || (Math.abs(z) > 0 && Math.abs(z) % 4 === 0)) {
                            townZones.push(z);
                        }
                    }
                    if (townZones.length > 0) {
                        fk.capital = townZones.reduce((prev, curr) => Math.abs(curr - fk.capital) < Math.abs(prev - fk.capital) ? curr : prev);
                    }
                }

                const towns = [];
                for (let z = fk.zoneRange[0]; z <= fk.zoneRange[1]; z++) {
                    if ((z === 0 || (Math.abs(z) > 0 && Math.abs(z) % 4 === 0)) && z !== currentZone) {
                        towns.push(z);
                    }
                }
                if (towns.length > 0) {
                    frontierDestinations.push({ kingdom: fk, towns: towns });
                }
            }
        }

        // Player gold display
        const goldHeader = document.createElement('div');
        goldHeader.className = 'flex items-center justify-between px-2 py-1';
        goldHeader.innerHTML = `
            <span class="text-on-surface-variant text-[12px] uppercase tracking-widest">Your Gold</span>
            <span class="text-[16px] font-bold" style="color: #FFD700;">💰 ${playerGold.toLocaleString()}</span>
        `;
        container.appendChild(goldHeader);

        const self = this;

        // Render Known World kingdoms
        for (const kId in knownWorldDestinations) {
            const data = knownWorldDestinations[kId];
            if (data.towns.length === 0) continue;

            const factionColor = data.faction && data.faction.colors ? data.faction.colors.primary : '#888';

            // Kingdom header
            const emblemSrc = window.getKingdomEmblemSrc ? window.getKingdomEmblemSrc(kId) : null;
            const emblemHtml = emblemSrc ? 
                `<img src="${emblemSrc}" style="width:20px; height:20px; vertical-align:middle; image-rendering:pixelated; border:1px solid rgba(255,255,255,0.15); padding:1px; background:rgba(0,0,0,0.3); border-radius:2px;" />` :
                `<div style="width: 12px; height: 12px; border-radius: 50%; background: ${factionColor}; border: 2px solid ${factionColor}88;"></div>`;

            const header = document.createElement('div');
            header.className = 'flex items-center gap-2 px-2 pt-2';
            header.innerHTML = `
                ${emblemHtml}
                <span class="text-[14px] font-bold tracking-wider uppercase" style="color: ${factionColor};">${data.kingdom.name}</span>
                <span class="text-[10px] text-on-surface-variant">${data.faction ? data.faction.name : ''}</span>
            `;
            container.appendChild(header);

            // Town cards
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 px-2';

            data.towns.forEach(zoneIdx => {
                const zoneDist = Math.abs(zoneIdx - currentZone);
                const currentKingdom = window.getKingdomForZone ? window.getKingdomForZone(currentZone) : null;
                const targetKingdom = data.kingdom;
                const crossKingdom = !currentKingdom || currentKingdom.id !== targetKingdom.id;
                
                // Reputation Cost Modifiers (Phase 6)
                const factionId = targetKingdom.rulingFaction;
                const rep = factionId ? (window.getFactionReputation ? window.getFactionReputation(factionId) : 0) : 0;
                let repMultiplier = 1.0;
                let isNemesis = false;
                
                if (factionId) {
                    if (rep <= -50) {
                        isNemesis = true;
                    } else if (rep <= -20) {
                        repMultiplier = 1.25; // 25% markup
                    } else if (rep < 0) {
                        repMultiplier = 1.10; // 10% markup
                    } else if (rep >= 100) {
                        repMultiplier = 0.75; // 25% discount
                    } else if (rep >= 75) {
                        repMultiplier = 0.80; // 20% discount
                    } else if (rep >= 50) {
                        repMultiplier = 0.85; // 15% discount
                    } else if (rep >= 20) {
                        repMultiplier = 0.90; // 10% discount
                    }
                }

                // Check if both zones are Coastal for Ship Travel Discount
                const currentZoneData = window.saveData && window.saveData.zones && window.saveData.zones[currentZone];
                const targetZoneData = window.saveData && window.saveData.zones && window.saveData.zones[zoneIdx];
                const isCurrentCoastal = currentZoneData && currentZoneData.biome === 'Coastal';
                const isTargetCoastal = targetZoneData && targetZoneData.biome === 'Coastal';
                const isShipRoute = isCurrentCoastal && isTargetCoastal;

                let rawCost = Math.max(10, Math.floor(zoneDist * 5)) + (crossKingdom ? 50 : 0);
                if (isShipRoute) {
                    rawCost = Math.max(5, Math.floor(Math.max(10, Math.floor(zoneDist * 5)) * 0.25)); // 75% discount, bypass cross-kingdom penalty
                }

                // Cargo Exponential Multiplier
                const totalCargo = window.saveData && window.saveData.cargo ? Object.values(window.saveData.cargo).reduce((a, b) => a + b, 0) : 0;
                const cargoMultiplier = totalCargo > 0 ? Math.pow(1.5, totalCargo) : 1.0;

                const cost = isNemesis ? 0 : Math.max(1, Math.round(rawCost * repMultiplier * cargoMultiplier));
                const canAfford = playerGold >= cost && !isNemesis;
                const isCapital = targetKingdom.capital === zoneIdx;

                // Try to get zone name from saved data
                const savedZone = window.saveData && window.saveData.zones && window.saveData.zones[zoneIdx];
                const zoneName = savedZone ? savedZone.name : (window.getTownNameForZone ? window.getTownNameForZone(zoneIdx) : (isCapital ? `${targetKingdom.name} Capital` : `Zone ${zoneIdx}`));

                const card = document.createElement('div');
                card.className = `border p-3 flex flex-col gap-1 rounded transition-colors ${canAfford ? 'border-outline-variant hover:border-tertiary cursor-pointer group' : 'border-outline-variant/30 opacity-40'}`;
                card.style.background = isNemesis ? 'rgba(50,10,10,0.5)' : 'rgba(30,30,30,0.6)';
                
                const priceText = isNemesis ? 
                    `<span style="color: #ff4444; font-weight: bold; font-size: 10px;">❌ BLOCKED (Nemesis)</span>` : 
                    `<span class="text-[11px] font-bold" style="color: ${canAfford ? '#FFD700' : '#888'};">💰 ${cost}g</span>`;

                card.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="text-[12px] font-bold ${canAfford ? 'text-on-surface group-hover:text-tertiary' : 'text-on-surface-variant'} transition-colors">${isCapital ? '🏰 ' : '🏘️ '}${zoneName}</span>
                        ${isShipRoute ? `<span class="text-[10px] px-1.5 py-0.5 rounded font-bold" style="background: rgba(79, 195, 247, 0.2); color: #4fc3f7; border: 1px solid rgba(79, 195, 247, 0.4);">⛵ Ship</span>` : ''}
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-on-surface-variant">Zone ${zoneIdx} · ${zoneDist} zones ${isShipRoute ? '(Sea Route)' : ''}</span>
                        ${priceText}
                    </div>
                `;
                if (canAfford) {
                    card.addEventListener('click', () => self.fastTravel(zoneIdx, cost));
                }
                grid.appendChild(card);
            });

            container.appendChild(grid);
        }

        // Render Frontier destinations
        if (frontierDestinations.length > 0) {
            const frontierHeader = document.createElement('div');
            frontierHeader.className = 'flex items-center gap-2 px-2 pt-4 border-t border-outline-variant mt-2';
            frontierHeader.innerHTML = `
                <span class="text-[14px] font-bold tracking-wider uppercase text-error">🌍 Frontier Territories</span>
                <span class="text-[10px] text-on-surface-variant">Discovered lands beyond the Known World</span>
            `;
            container.appendChild(frontierHeader);

            frontierDestinations.forEach(data => {
                const targetKingdom = data.kingdom;
                const factionId = targetKingdom.rulingFaction;
                const faction = window.WORLD_FACTIONS ? window.WORLD_FACTIONS[factionId] : null;
                const factionColor = faction ? (faction.color || '#ff4444') : (targetKingdom.factionColor || '#ff4444');
                const factionName = (faction && faction.name && faction.name !== 'undefined')
                    ? faction.name 
                    : (targetKingdom.factionName || (factionId ? factionId.replace(/_/g, ' ').toUpperCase() : ''));

                // Frontier Kingdom header
                const emblemSrc = window.getKingdomEmblemSrc ? window.getKingdomEmblemSrc(targetKingdom.id) : null;
                const emblemHtml = emblemSrc ? 
                    `<img src="${emblemSrc}" style="width:20px; height:20px; vertical-align:middle; image-rendering:pixelated; border:1px solid rgba(255,255,255,0.15); padding:1px; background:rgba(0,0,0,0.3); border-radius:2px;" />` :
                    `<div style="width: 12px; height: 12px; border-radius: 50%; background: ${factionColor}; border: 2px solid ${factionColor}88;"></div>`;

                const fHeader = document.createElement('div');
                fHeader.className = 'flex items-center gap-2 px-2 pt-3';
                fHeader.innerHTML = `
                    ${emblemHtml}
                    <span class="text-[14px] font-bold tracking-wider uppercase" style="color: ${factionColor};">${targetKingdom.name}</span>
                    <span class="text-[10px] text-on-surface-variant">${factionName}</span>
                `;
                container.appendChild(fHeader);

                const fGrid = document.createElement('div');
                fGrid.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 px-2';

                data.towns.forEach(zoneIdx => {
                    const zoneDist = Math.abs(zoneIdx - currentZone);
                    
                    // Reputation Cost Modifiers for Frontier (Phase 6)
                    const rep = factionId ? (window.getFactionReputation ? window.getFactionReputation(factionId) : 0) : 0;
                    let repMultiplier = 1.0;
                    let isNemesis = false;
                    
                    if (factionId) {
                        if (rep <= -50) {
                            isNemesis = true;
                        } else if (rep <= -20) {
                            repMultiplier = 1.25; // 25% markup
                        } else if (rep < 0) {
                            repMultiplier = 1.10; // 10% markup
                        } else if (rep >= 100) {
                            repMultiplier = 0.75; // 25% discount
                        } else if (rep >= 75) {
                            repMultiplier = 0.80; // 20% discount
                        } else if (rep >= 50) {
                            repMultiplier = 0.85; // 15% discount
                        } else if (rep >= 20) {
                            repMultiplier = 0.90; // 10% discount
                        }
                    }

                    // Check if both zones are Coastal for Ship Travel Discount
                    const currentZoneData = window.saveData && window.saveData.zones && window.saveData.zones[currentZone];
                    const targetZoneData = window.saveData && window.saveData.zones && window.saveData.zones[zoneIdx];
                    const isCurrentCoastal = currentZoneData && currentZoneData.biome === 'Coastal';
                    const isTargetCoastal = targetZoneData && targetZoneData.biome === 'Coastal';
                    const isShipRoute = isCurrentCoastal && isTargetCoastal;

                    let rawCost = Math.max(10, Math.floor(zoneDist * 5)) + 100; // Frontier premium
                    if (isShipRoute) {
                        rawCost = Math.max(5, Math.floor(Math.max(10, Math.floor(zoneDist * 5)) * 0.25)); // 75% discount, remove frontier premium
                    }

                    // Cargo Exponential Multiplier
                    const totalCargo = window.saveData && window.saveData.cargo ? Object.values(window.saveData.cargo).reduce((a, b) => a + b, 0) : 0;
                    const cargoMultiplier = totalCargo > 0 ? Math.pow(1.5, totalCargo) : 1.0;

                    const cost = isNemesis ? 0 : Math.max(1, Math.round(rawCost * repMultiplier * cargoMultiplier));
                    const canAfford = playerGold >= cost && !isNemesis;
                    const isCapital = targetKingdom.capital === zoneIdx;

                    const savedZone = window.saveData && window.saveData.zones && window.saveData.zones[zoneIdx];
                    const zoneName = savedZone ? savedZone.name : (window.getTownNameForZone ? window.getTownNameForZone(zoneIdx) : (isCapital ? `${targetKingdom.name} Capital` : `Zone ${zoneIdx}`));

                    const card = document.createElement('div');
                    card.className = `border p-3 flex flex-col gap-1 rounded transition-colors ${canAfford ? 'border-error/50 hover:border-error cursor-pointer group' : 'border-outline-variant/30 opacity-40'}`;
                    card.style.background = isNemesis ? 'rgba(50,10,10,0.5)' : 'rgba(40,20,20,0.6)';
                    
                    const priceText = isNemesis ? 
                        `<span style="color: #ff4444; font-weight: bold; font-size: 10px;">❌ BLOCKED (Nemesis)</span>` : 
                        `<span class="text-[11px] font-bold" style="color: ${canAfford ? '#FFD700' : '#888'};">💰 ${cost}g</span>`;

                    card.innerHTML = `
                        <div class="flex items-center justify-between">
                            <span class="text-[12px] font-bold ${canAfford ? 'text-on-surface group-hover:text-error' : 'text-on-surface-variant'} transition-colors">${isCapital ? '🏰 ' : '🏘️ '}${zoneName}</span>
                            ${isShipRoute ? `<span class="text-[10px] px-1.5 py-0.5 rounded font-bold" style="background: rgba(79, 195, 247, 0.2); color: #4fc3f7; border: 1px solid rgba(79, 195, 247, 0.4);">⛵ Ship</span>` : ''}
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] text-on-surface-variant">Zone ${zoneIdx} · ${zoneDist} zones ${isShipRoute ? '(Sea Route)' : ''}</span>
                            ${priceText}
                        </div>
                    `;
                    if (canAfford) {
                        card.addEventListener('click', () => self.fastTravel(zoneIdx, cost));
                    }
                    fGrid.appendChild(card);
                });

                container.appendChild(fGrid);
            });
        }

        // No destinations message
        const totalDestinations = Object.values(knownWorldDestinations).reduce((sum, d) => sum + d.towns.length, 0) + frontierDestinations.reduce((sum, d) => sum + d.towns.length, 0);
        if (totalDestinations === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-center text-on-surface-variant py-8 text-[14px]';
            empty.textContent = 'No travel destinations available from this location.';
            container.appendChild(empty);
        }
    }

    /**
     * Execute fast travel to a target zone, deducting gold.
     */
    fastTravel(targetZone, cost) {
        const scene = this.scene;
        if (!window.saveData || window.saveData.gold < cost) return;

        // Deduct gold
        window.saveData.gold -= cost;
        if (scene.player) scene.player.gold = window.saveData.gold;

        // Reward Faction Reputation proportional to transit taxes paid (Phase 11)
        const targetKingdom = window.getKingdomForZone ? window.getKingdomForZone(targetZone) : null;
        const factionId = targetKingdom ? targetKingdom.rulingFaction : null;
        if (factionId && cost > 0) {
            const repGain = Math.floor(cost / 50);
            if (repGain > 0) {
                if (!window.saveData.factionReputation) window.saveData.factionReputation = {};
                window.saveData.factionReputation[factionId] = (window.saveData.factionReputation[factionId] || 0) + repGain;
                if (window.saveData.factionReputation[factionId] > 100) {
                    window.saveData.factionReputation[factionId] = 100;
                }
                const factionName = targetKingdom.name;
                scene.time.delayedCall(600, () => {
                    if (scene.showFloatingText && scene.player && scene.player.sprite && scene.player.sprite.active) {
                        scene.showFloatingText(scene.player.sprite.x, scene.player.sprite.y - 100, `+${repGain} Rep with ${factionName} (Transit Tax)`, 0x4ade80);
                    }
                });
            }
        }

        // Close the directory
        this.closeTownDirectory();

        // Trigger zone transition
        if (scene.showFloatingText && scene.player && scene.player.sprite) {
            scene.showFloatingText(scene.player.sprite.x, scene.player.sprite.y - 60, `Fast Travel: -${cost}g`, 0xFFD700);
        }

        // Use the same transition system as zone boundaries
        scene.isTransitioning = true;
        scene.cameras.main.fadeOut(800, 0, 0, 0);
        scene.cameras.main.once('camerafadeoutcomplete', () => {
            if (scene.isSceneDestroyed) return;

            // Clear current zone
            if (scene.enemies && typeof scene.enemies.clear === 'function') {
                scene.enemies.clear(true, true);
            }
            if (scene.npcs) {
                [...scene.npcs].forEach(npc => {
                    if (npc && typeof npc.destroy === 'function') npc.destroy();
                });
                scene.npcs = [];
            }
            if (scene.lootChests) {
                scene.lootChests.forEach(chest => {
                    if (chest.sprite) chest.sprite.destroy();
                    if (chest.promptText) chest.promptText.destroy();
                });
                scene.lootChests = [];
            }
            if (scene.angelPromptText) { scene.angelPromptText.destroy(); scene.angelPromptText = null; }
            if (scene.angelStatueZone) { scene.angelStatueZone.destroy(); scene.angelStatueZone = null; }
            scene.angelStatue = null;

            // Save current zone state
            if (scene.worldManager) scene.worldManager.saveZoneState();

            // Load target zone
            if (scene.worldManager) {
                scene.worldManager.loadZone(targetZone, 'center').then(() => {
                    if (scene.isSceneDestroyed) return;
                    scene.cameras.main.scrollY = Phaser.Math.Clamp(scene.player.sprite.y - scene.cameras.main.height * 0.72, 50, 350);
                    scene.isTransitioning = false;
                    scene.cameras.main.fadeIn(800, 0, 0, 0);
                }).catch(err => {
                    if (scene.isSceneDestroyed) return;
                    console.error("Fast travel loadZone error:", err);
                    scene.isTransitioning = false;
                    scene.cameras.main.fadeIn(500, 0, 0, 0);
                });
            } else {
                scene.isTransitioning = false;
                scene.cameras.main.fadeIn(500, 0, 0, 0);
            }
        });
    }

    enterIndoorLocation(locationId) {
        const scene = this.scene;
        this.closeTownDirectory();
        if (scene.isTransitioning) return;
        scene.isTransitioning = true;
        
        const loc = window.INDOOR_LOCATIONS[locationId];
        if (!loc) return;

        scene.cameras.main.fadeOut(500, 0, 0, 0);
        scene.cameras.main.once('camerafadeoutcomplete', () => {
            scene.isIndoors = true;
            scene.currentIndoorLocation = locationId;
            if (typeof scene.spawnCargoCompanion === 'function') {
                scene.spawnCargoCompanion();
            }

            // Stop camera follow and center it on the room
            scene.cameras.main.stopFollow();
            scene.cameras.main.setScroll(0, 0);

            // Clear town stuff
            if (scene.decorGroup && scene.decorGroup.scene) scene.decorGroup.clear(true, true);
            scene.enemies.clear(true, true);
            if (scene.npcs) {
                [...scene.npcs].forEach(npc => {
                    if (npc && typeof npc.destroy === 'function') npc.destroy();
                });
                scene.npcs = [];
            }
            if (scene.lootChests) {
                scene.lootChests.forEach(chest => {
                    if (chest.sprite) chest.sprite.destroy();
                    if (chest.promptText) chest.promptText.destroy();
                });
                scene.lootChests = [];
            }

            // Hide normal backgrounds and clouds
            scene.bgLayers.forEach(bg => { if(bg && bg.active) bg.setVisible(false); });
            if (scene.clouds) scene.clouds.forEach(c => { if(c && c.active) c.setVisible(false); });

            // Fill the blue sky background with black so the 8px letterbox isn't noticeable
            if (!scene.indoorBlackBg) {
                scene.indoorBlackBg = scene.add.rectangle(640, 360, 1280, 720, 0x000000).setDepth(-12);
            } else {
                scene.indoorBlackBg.setVisible(true);
            }

            // Set indoor background
            let bgKey = loc.bg;
            const currentZone = (window.saveData && window.saveData.currentZone) || 0;
            if (locationId === 'throne_room' && currentZone === 777) {
                bgKey = 'bg_heaven_throne';
            }
            if (!scene.indoorBg) {
                // Anchor bottom-center so the visual floor aligns with the characters
                scene.indoorBg = scene.add.image(640, 648, bgKey).setOrigin(0.5, 1).setDepth(-10);
            } else {
                scene.indoorBg.setTexture(bgKey).setVisible(true);
                scene.indoorBg.setPosition(640, 648);
            }
            
            if (locationId === 'coliseum') {
                scene.indoorBg.setScale(1280 / scene.indoorBg.width, 720 / scene.indoorBg.height);
                scene.indoorBg.setPosition(640, 360);
                scene.indoorBg.setOrigin(0.5, 0.5);
            } else {
                // To fit a perfect 64px grid inside the 1280x720 canvas without clipping,
                // the full frame will be 1280x704 (centered with an 8px top/bottom letterbox).
                // This leaves the interior room as exactly 1152x576 (18x9 tiles).
                scene.indoorBg.displayWidth = 1152;
                scene.indoorBg.displayHeight = 576;
                scene.indoorBg.setPosition(640, 648);
                scene.indoorBg.setOrigin(0.5, 1);
            }

            // Dynamically build the border frame around the room using the 7x7 tile set
            if (!scene.indoorWallBgGroup) {
                scene.indoorWallBgGroup = scene.add.group();
                
                const corners = {
                    tl: 14, tr: 20, bl: 84, br: 90
                };
                
                const edges = {
                    top: [15, 16, 17, 18, 19],
                    bottom: [85, 86, 87, 88, 89],
                    left: [28, 42, 56, 70],
                    right: [34, 48, 62, 76]
                };

                const addTile = (x, y, frame) => {
                    scene.indoorWallBgGroup.add(
                        scene.add.image(x, y, 'house_inside_tiles', frame)
                            .setOrigin(0, 0)
                            .setDepth(-11)
                            .setScale(2)
                    );
                };

                // Draw Corners perfectly spanning 1280x704 (starting at Y=8 to center vertically)
                addTile(0, 8, corners.tl);
                addTile(1216, 8, corners.tr);
                addTile(0, 648, corners.bl);
                addTile(1216, 648, corners.br);

                // Draw Top and Bottom Edges (18 tiles horizontally)
                for (let x = 64; x < 1216; x += 64) {
                    addTile(x, 8, Phaser.Math.RND.pick(edges.top));
                    addTile(x, 648, Phaser.Math.RND.pick(edges.bottom));
                }

                // Draw Left and Right Edges (9 tiles vertically)
                for (let y = 72; y < 648; y += 64) {
                    addTile(0, y, Phaser.Math.RND.pick(edges.left));
                    addTile(1216, y, Phaser.Math.RND.pick(edges.right));
                }
            } else {
                scene.indoorWallBgGroup.getChildren().forEach(img => img.setVisible(true));
            }
            
            if (scene.indoorWallBgGroup) {
                const isVisible = locationId !== 'coliseum';
                scene.indoorWallBgGroup.getChildren().forEach(img => img.setVisible(isVisible));
            }

            // Hide platforms so player walks directly on the pre-rendered floor of the background image
            scene.platforms.getChildren().forEach(tile => {
                if (!tile.indoorSavedState) {
                    tile.indoorSavedState = {
                        texture: tile.texture.key,
                        frame: tile.frame.name,
                        isTinted: tile.isTinted,
                        tintTopLeft: tile.tintTopLeft,
                        tintTopRight: tile.tintTopRight,
                        tintBottomLeft: tile.tintBottomLeft,
                        tintBottomRight: tile.tintBottomRight,
                        visible: tile.visible
                    };
                }
                tile.setVisible(false);
            });

            // Set indoor floor collision
            if (!scene.indoorFloor) {
                // Use a physics zone instead of an image to avoid missing texture issues
                scene.indoorFloor = scene.add.zone(640, 696, 1280, 50);
                scene.physics.add.existing(scene.indoorFloor, true); // true = static body
                scene.physics.add.collider(scene.player.sprite, scene.indoorFloor);

                // Add invisible walls to prevent walking off the floor into the void
                scene.indoorLeftWall = scene.add.zone(32, 360, 64, 720);
                scene.physics.add.existing(scene.indoorLeftWall, true);
                scene.physics.add.collider(scene.player.sprite, scene.indoorLeftWall);

                scene.indoorRightWall = scene.add.zone(1248, 360, 64, 720);
                scene.physics.add.existing(scene.indoorRightWall, true);
                scene.physics.add.collider(scene.player.sprite, scene.indoorRightWall);
            } else {
                scene.indoorFloor.setActive(true);
                scene.indoorFloor.body.enable = true;
                if (scene.indoorLeftWall) {
                    scene.indoorLeftWall.setActive(true);
                    scene.indoorLeftWall.body.enable = true;
                }
                if (scene.indoorRightWall) {
                    scene.indoorRightWall.setActive(true);
                    scene.indoorRightWall.body.enable = true;
                }
            }

            // Move player to center and scale up, spawned high enough to not clip into floor
            if (scene.player && scene.player.sprite && scene.player.sprite.active) {
                scene.player.sprite.setPosition(400, 500);
                scene.player.sprite.setVelocity(0, 0);
                const scale = (scene.player.baseScale || 1.5) * (2.5 / 1.5);
                if (typeof scene.player.setScaleWithPhysics === 'function') {
                    scene.player.setScaleWithPhysics(scale);
                } else {
                    scene.player.sprite.setScale(scale);
                }
                scene.player.facingDirection = 1;
            }
            if (scene.partyMembers) {
                scene.partyMembers.forEach(member => {
                    if (member && member.sprite && member.sprite.active) {
                        member.sprite.setPosition(300, 500);
                        member.sprite.setVelocity(0, 0);
                        const scale = (member.baseScale || 1.5) * (2.5 / 1.5);
                        if (typeof member.setScaleWithPhysics === 'function') {
                            member.setScaleWithPhysics(scale);
                        } else {
                            member.sprite.setScale(scale);
                        }
                        if (scene.indoorFloor) {
                            scene.physics.add.collider(member.sprite, scene.indoorFloor);
                        }
                        if (scene.indoorLeftWall) {
                            scene.physics.add.collider(member.sprite, scene.indoorLeftWall);
                        }
                        if (scene.indoorRightWall) {
                            scene.physics.add.collider(member.sprite, scene.indoorRightWall);
                        }
                    }
                });
            }

            // Spawn Location NPC
            let spriteKey = loc.npcSprite;
            let finalNpcName = loc.npcName;
            
            const currentZoneIdx = (window.saveData && window.saveData.currentZone) || 0;
            const currentZoneData = (window.saveData && window.saveData.zones) ? window.saveData.zones[currentZoneIdx] : null;
            const isHeaven = currentZoneData && currentZoneData.biome === 'Heaven';

            const currentKingdom = window.getKingdomForZone ? window.getKingdomForZone(currentZoneIdx) : null;
            const isElvenKingdom = currentKingdom && (
                (currentKingdom.biomes && currentKingdom.biomes.includes('Deadwoods')) || 
                currentKingdom.id === 'duskveil' || 
                currentKingdom.id === 'ashenmoor' || 
                (currentKingdom.name && currentKingdom.name.toLowerCase().includes('elven')) || 
                (currentKingdom.rulingFaction && currentKingdom.rulingFaction.toLowerCase().includes('elven'))
            );

            if (isHeaven) {
                if (locationId === 'throne_room') {
                    spriteKey = 'heavenly_archangel';
                } else if (locationId === 'tavern') {
                    spriteKey = 'heavenly_seraph';
                } else if (locationId === 'general_store') {
                    spriteKey = 'heavenly_valkyrie';
                } else {
                    spriteKey = 'heavenly_cherub';
                }
            } else if (locationId === 'throne_room') {
                // Use Craftpix king/queen sprites for throne rooms
                const faction = window.getFactionForZone ? window.getFactionForZone(currentZoneIdx) : null;
                const leaderGender = (faction && faction.leader && faction.leader.gender) ? faction.leader.gender : 'male';
                if (isElvenKingdom) {
                    spriteKey = leaderGender === 'female' ? 'elven_queen' : 'elven_king';
                } else {
                    spriteKey = leaderGender === 'female' ? 'human_queen' : 'human_king';
                }
            } else if (spriteKey === 'spouse') {
                if (window.saveData && window.saveData.spouseData) {
                    spriteKey = window.saveData.spouseData.spriteKey;
                    finalNpcName = window.saveData.spouseData.name;
                } else {
                    // Fallback if entering estate without spouse (shouldn't happen)
                    const npcData = window.CharacterComposer.generateRandomNPC(scene);
                    spriteKey = npcData.spriteKey;
                    // We could also pass npcData.weaponType if needed later
                    finalNpcName = "Lonely Ghost";
                }
            } else if (locationId === 'temple' && spriteKey === 'priest') {
                // Randomly pick from the 3 Craftpix priest variants
                const priestVariants = ['priest', 'priest_1', 'priest_3'];
                spriteKey = priestVariants[Math.floor(Math.random() * priestVariants.length)];
            }

            const npc = new NPCController(scene, 900, 500, scene.player, scene.geminiService, finalNpcName, loc.npcPersona, spriteKey);
            npc.isIndoorNPC = true;
            npc.indoorAction = loc.action;
            
            // Set faction info for the ruler in the Throne Room (Phase 5)
            if (locationId === 'throne_room') {
                const currentZoneIdx = (window.saveData && window.saveData.currentZone) || 0;
                const faction = window.getFactionForZone ? window.getFactionForZone(currentZoneIdx) : null;
                if (faction) {
                    npc.faction = faction.id;
                    npc.factionRank = 'leader';
                    npc.politicalTitle = faction.leader.title || 'Ruler';

                    // Play Throne Room Entrance Cutscene (Phase 7)
                    window.saveData.visitedThroneRooms = window.saveData.visitedThroneRooms || {};
                    if (!window.saveData.visitedThroneRooms[currentZoneIdx]) {
                        window.saveData.visitedThroneRooms[currentZoneIdx] = true;
                        
                        const titleAndName = `${npc.politicalTitle} ${npc.npcName}`;
                        const dialogue = [
                            {
                                speaker: "Narrator",
                                text: `You step into the grand throne room. The heavy scent of incense and the weight of sovereign authority hang in the air.`
                            },
                            {
                                speaker: titleAndName,
                                portrait: spriteKey,
                                side: 'right',
                                text: `Who approaches the throne? State your purpose, traveler. In these times of conflict, every visitor is either a potential ally... or a spy.`
                            }
                        ];
                        
                        scene.time.delayedCall(600, () => {
                            if (scene.cutsceneController) {
                                scene.cutsceneController.playCutscene(dialogue);
                            }
                        });
                    }
                }
            }
            const scale = (npc.baseScale || 1.5) * (2.5 / 1.5);
            if (typeof npc.setScaleWithPhysics === 'function') {
                npc.setScaleWithPhysics(scale);
            } else {
                npc.sprite.setScale(scale);
            }
            if (scene.indoorFloor) {
                scene.physics.add.collider(npc.sprite, scene.indoorFloor);
            }
            if (scene.indoorLeftWall) {
                scene.physics.add.collider(npc.sprite, scene.indoorLeftWall);
            }
            if (scene.indoorRightWall) {
                scene.physics.add.collider(npc.sprite, scene.indoorRightWall);
            }
            scene.npcs.push(npc);

            const hostility = window.checkGuardHostility ? window.checkGuardHostility(currentZone, window.saveData.alignment) : { shouldAttack: false, reason: null };
            if (hostility.shouldAttack) {
                const guardCount = Math.floor(Math.random() * 2) + 2; // 2 or 3 guards
                for (let i = 0; i < guardCount; i++) {
                    const spawnX = i === 0 ? 150 : (i === 1 ? 1100 : 640);
                    // Spawn as EnemyController of type 'knight_rival' or celestial
                    let guardType = 'knight_rival';
                    if (isHeaven) {
                        const types = ['heavenly_valkyrie', 'heavenly_archangel'];
                        guardType = types[i % types.length];
                    }
                    const guard = new EnemyController(scene, spawnX, 500, scene.player, scene.geminiService, guardType);
                    
                    // Indoor bounds collisions
                    if (scene.indoorFloor) scene.physics.add.collider(guard.sprite, scene.indoorFloor);
                    if (scene.indoorLeftWall) scene.physics.add.collider(guard.sprite, scene.indoorLeftWall);
                    if (scene.indoorRightWall) scene.physics.add.collider(guard.sprite, scene.indoorRightWall);
                    
                    scene.enemies.add(guard.sprite);

                    // Ambient text alerts
                    if (scene.showFloatingText) {
                        scene.time.delayedCall(800 + i * 400, () => {
                            if (guard.sprite && guard.sprite.active) {
                                const texts = ["Halt, heretic!", "Nowhere to run!", "Surrender!", "By the King's order!"];
                                const selectedText = texts[Math.floor(Math.random() * texts.length)];
                                scene.showFloatingText(guard.sprite.x, guard.sprite.y - 80, selectedText, 0xff0000);
                            }
                        });
                    }
                }
            }

            // Spawn 1-2 extra random background NPCs (if not in coliseum)
            if (locationId !== 'coliseum') {
                const extraNpcCount = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < extraNpcCount; i++) {
                    const npcData = window.CharacterComposer.generateRandomNPC(scene);
                    const rndKey = npcData.spriteKey;
                    const rndWeaponType = npcData.weaponType;
                    const rndName = window.CharacterComposer.generateRandomName(rndWeaponType);
                    const rndPersona = "A random townsperson.";
                    
                    const randX = 300 + Math.random() * 500;
                    const rndNpc = new NPCController(scene, randX, 500, scene.player, scene.geminiService, rndName, rndPersona, rndKey, rndWeaponType);
                    rndNpc.isIndoorNPC = true;
                    rndNpc.indoorAction = 'chat'; // They are just for chatting
                    const rndScale = (rndNpc.baseScale || 1.5) * (2.5 / 1.5);
                    if (typeof rndNpc.setScaleWithPhysics === 'function') {
                        rndNpc.setScaleWithPhysics(rndScale);
                    } else {
                        rndNpc.sprite.setScale(rndScale);
                    }
                    if (scene.indoorFloor) {
                        scene.physics.add.collider(rndNpc.sprite, scene.indoorFloor);
                    }
                    if (scene.indoorLeftWall) {
                        scene.physics.add.collider(rndNpc.sprite, scene.indoorLeftWall);
                    }
                    if (scene.indoorRightWall) {
                        scene.physics.add.collider(rndNpc.sprite, scene.indoorRightWall);
                    }
                    scene.npcs.push(rndNpc);
                }
            }

            // Add Leave Button to HUD
            this._addIndoorLeaveButton();

            scene.isTransitioning = false;
            scene.cameras.main.fadeIn(500, 0, 0, 0);
        });
    }

    _addIndoorLeaveButton() {
        const scene = this.scene;
        if (!scene.indoorLeaveBtn) {
            scene.indoorLeaveBtn = document.createElement('button');
            scene.indoorLeaveBtn.innerText = 'Leave ' + window.INDOOR_LOCATIONS[scene.currentIndoorLocation].name;
            scene.indoorLeaveBtn.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 50; background: rgba(0,0,0,0.8); border: 2px solid #cc0000; color: #ffcccc; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: "Courier Prime", monospace; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;';
            scene.indoorLeaveBtn.onclick = () => this.exitIndoorLocation();
            scene.indoorLeaveBtn.onmouseover = () => scene.indoorLeaveBtn.style.background = 'rgba(200,0,0,0.8)';
            scene.indoorLeaveBtn.onmouseout = () => scene.indoorLeaveBtn.style.background = 'rgba(0,0,0,0.8)';
            document.body.appendChild(scene.indoorLeaveBtn);
        } else {
            scene.indoorLeaveBtn.innerText = 'Leave ' + window.INDOOR_LOCATIONS[scene.currentIndoorLocation].name;
            scene.indoorLeaveBtn.style.display = 'block';
        }
    }

    exitIndoorLocation() {
        const scene = this.scene;
        if (scene.isTransitioning || !scene.isIndoors) return;
        scene.isTransitioning = true;
        
        if (scene.indoorLeaveBtn) scene.indoorLeaveBtn.style.display = 'none';

        scene.cameras.main.fadeOut(500, 0, 0, 0);
        scene.cameras.main.once('camerafadeoutcomplete', () => {
            scene.isIndoors = false;
            scene.currentIndoorLocation = null;

            if (scene.indoorBlackBg) scene.indoorBlackBg.setVisible(false);
            if (scene.indoorBg) scene.indoorBg.setVisible(false);
            if (scene.indoorWallBgGroup) {
                scene.indoorWallBgGroup.getChildren().forEach(img => img.setVisible(false));
            }

            // Restore original floor tiles
            if (scene.platforms) {
                scene.platforms.getChildren().forEach(tile => {
                    if (tile.indoorSavedState) {
                        tile.setTexture(tile.indoorSavedState.texture);
                        tile.setFrame(tile.indoorSavedState.frame);
                        tile.setVisible(tile.indoorSavedState.visible !== undefined ? tile.indoorSavedState.visible : true);
                        if (tile.indoorSavedState.isTinted) {
                            tile.setTint(tile.indoorSavedState.tintTopLeft, tile.indoorSavedState.tintTopRight, tile.indoorSavedState.tintBottomLeft, tile.indoorSavedState.tintBottomRight);
                        } else {
                            tile.clearTint();
                        }
                        delete tile.indoorSavedState;
                    }
                });
            }

            // Disable the indoor floor and walls
            if (scene.indoorFloor) {
                scene.indoorFloor.setActive(false);
                scene.indoorFloor.body.enable = false;
            }
            if (scene.indoorLeftWall) scene.indoorLeftWall.body.enable = false;
            if (scene.indoorRightWall) scene.indoorRightWall.body.enable = false;

            // Destroy indoor NPCs (Weapons Master, shopkeepers, etc.)
            if (scene.npcs) {
                [...scene.npcs].forEach(npc => {
                    if (npc.isIndoorNPC) {
                        if (npc && typeof npc.destroy === 'function') npc.destroy();
                    }
                });
                scene.npcs = scene.npcs.filter(npc => !npc.isIndoorNPC);
            }

            // Reset player scale back to normal
            if (scene.player && scene.player.sprite && scene.player.sprite.active) {
                const scale = scene.player.baseScale || 1.5;
                if (typeof scene.player.setScaleWithPhysics === 'function') {
                    scene.player.setScaleWithPhysics(scale);
                } else {
                    scene.player.sprite.setScale(scale);
                }
            }

            // Reset party member scale back to normal
            if (scene.partyMembers) {
                scene.partyMembers.forEach(member => {
                    if (member && member.sprite && member.sprite.active) {
                        const scale = member.baseScale || 1.5;
                        if (typeof member.setScaleWithPhysics === 'function') {
                            member.setScaleWithPhysics(scale);
                        } else {
                            member.sprite.setScale(scale);
                        }
                    }
                });
            }

            // Rebuild the town zone
            const zoneData = scene.worldManager.currentZoneData;
            scene.worldManager.buildZone(zoneData, 'center');

            scene.isTransitioning = false;
            
            // Resume camera follow
            scene.cameras.main.scrollY = Phaser.Math.Clamp(scene.player.sprite.y - scene.cameras.main.height * 0.72, 50, 350);
            scene.cameras.main.startFollow(scene.player.sprite, true, 0.1, 0.0);
            if (typeof scene.spawnCargoCompanion === 'function') {
                scene.spawnCargoCompanion();
            }
            
            scene.cameras.main.fadeIn(500, 0, 0, 0);
        });
    }
}
