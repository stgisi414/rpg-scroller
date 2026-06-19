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
            Object.keys(window.INDOOR_LOCATIONS).forEach(id => {
                const loc = window.INDOOR_LOCATIONS[id];
                const card = `
                    <div class="bg-surface-container-highest border border-outline-variant p-4 flex flex-col items-center gap-3 rounded hover:border-tertiary transition-colors cursor-pointer group" onclick="if(window._gameScene) window._gameScene.enterIndoorLocation('${id}')">
                        <span class="material-symbols-outlined text-4xl text-on-surface group-hover:text-tertiary transition-colors" style="font-variation-settings: 'FILL' 1;">${loc.icon}</span>
                        <div class="font-headline-sm text-[16px] text-tertiary font-bold text-center tracking-wider uppercase">${loc.name}</div>
                        <div class="font-body-sm text-[11px] text-on-surface-variant text-center flex-1">${loc.desc}</div>
                        <button class="w-full mt-2 py-2 bg-surface-container border border-tertiary text-tertiary uppercase text-[10px] font-bold tracking-widest group-hover:bg-tertiary group-hover:text-background transition-colors">Enter</button>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', card);
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
        if (scene._dirEscListener) {
            window.removeEventListener('keydown', scene._dirEscListener);
            scene._dirEscListener = null;
        }
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
            if (!scene.indoorBg) {
                // Anchor bottom-center so the visual floor aligns with the characters
                scene.indoorBg = scene.add.image(640, 648, loc.bg).setOrigin(0.5, 1).setDepth(-10);
            } else {
                scene.indoorBg.setTexture(loc.bg).setVisible(true);
                scene.indoorBg.setPosition(640, 648);
            }
            
            // To fit a perfect 64px grid inside the 1280x720 canvas without clipping,
            // the full frame will be 1280x704 (centered with an 8px top/bottom letterbox).
            // This leaves the interior room as exactly 1152x576 (18x9 tiles).
            scene.indoorBg.displayWidth = 1152;
            scene.indoorBg.displayHeight = 576;
            scene.indoorBg.scaleX = scene.indoorBg.displayWidth / scene.indoorBg.width;
            scene.indoorBg.scaleY = scene.indoorBg.displayHeight / scene.indoorBg.height;

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

            // Tint the floor
            scene.platforms.getChildren().forEach(tile => {
                tile.setTint(loc.floorTint);
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
                if (typeof scene.player.setScaleWithPhysics === 'function') {
                    scene.player.setScaleWithPhysics(2.5);
                } else {
                    scene.player.sprite.setScale(2.5);
                }
                scene.player.facingDirection = 1;
            }
            if (scene.partyMembers) {
                scene.partyMembers.forEach(member => {
                    if (member && member.sprite && member.sprite.active) {
                        member.sprite.setPosition(300, 500);
                        member.sprite.setVelocity(0, 0);
                        if (typeof member.setScaleWithPhysics === 'function') {
                            member.setScaleWithPhysics(2.5);
                        } else {
                            member.sprite.setScale(2.5);
                        }
                        if (scene.indoorFloor) {
                            scene.physics.add.collider(member.sprite, scene.indoorFloor);
                        }
                    }
                });
            }

            // Spawn Location NPC
            const npc = new NPCController(scene, 900, 500, scene.player, scene.geminiService, loc.npcName, loc.npcPersona, loc.npcSprite);
            npc.isIndoorNPC = true;
            npc.indoorAction = loc.action;
            npc.sprite.setScale(2.5); // NPCs aren't using setScaleWithPhysics yet, just standard scale
            if (scene.indoorFloor) {
                scene.physics.add.collider(npc.sprite, scene.indoorFloor);
            }
            scene.npcs.push(npc);

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
                if (typeof scene.player.setScaleWithPhysics === 'function') {
                    scene.player.setScaleWithPhysics(1.5);
                } else {
                    scene.player.sprite.setScale(1.5);
                }
            }

            // Reset party member scale back to normal
            if (scene.partyMembers) {
                scene.partyMembers.forEach(member => {
                    if (member && member.sprite && member.sprite.active) {
                        if (typeof member.setScaleWithPhysics === 'function') {
                            member.setScaleWithPhysics(1.5);
                        } else {
                            member.sprite.setScale(1.5);
                        }
                    }
                });
            }

            // Rebuild the town zone
            const zoneData = scene.worldManager.currentZoneData;
            scene.worldManager.buildZone(zoneData, 'center');

            scene.isTransitioning = false;
            
            // Resume camera follow
            scene.cameras.main.startFollow(scene.player.sprite, true, 0.1, 0.1);
            
            scene.cameras.main.fadeIn(500, 0, 0, 0);
        });
    }
}
