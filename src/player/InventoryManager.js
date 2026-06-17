class InventoryManager {
    constructor(player) {
        this.player = player;
    }

    cycleArtifact(dir = 1) {
        const player = this.player;
        if (!player.inventory.artifacts || player.inventory.artifacts.length === 0) return;
        player.inventory.equippedArtifact += dir;
        if (player.inventory.equippedArtifact >= player.inventory.artifacts.length) {
            player.inventory.equippedArtifact = 0;
        } else if (player.inventory.equippedArtifact < 0) {
            player.inventory.equippedArtifact = player.inventory.artifacts.length - 1;
        }
        player.recalculateStats();
        this.updateInventoryUI();
    }

    usePotion() {
        const player = this.player;
        if (player.inventory.potions > 0 && player.hp < player.maxHp) {
            player.inventory.potions--;
            player.hp = Math.min(player.maxHp, player.hp + 50);
            this.updateInventoryUI();
            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
            
            // Visual feedback
            if (player.scene && player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, '+50 HP', 0x00ff00);
            }
            return true;
        } else if (player.inventory.potions > 0) {
            // Try to give to a party member who needs HP
            return this._givePotionToParty('hp');
        }
        return false;
    }

    useMpPotion() {
        const player = this.player;
        player.inventory.mpPotions = player.inventory.mpPotions || 0;
        if (player.inventory.mpPotions > 0 && player.mp !== undefined && player.mp < player.maxMp) {
            player.inventory.mpPotions--;
            player.mp = Math.min(player.maxMp, player.mp + 50);
            this.updateInventoryUI();
            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
            
            // Visual feedback
            if (player.scene && player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, '+50 MP', 0x60a5fa);
            }
            return true;
        } else if (player.inventory.mpPotions > 0) {
            // Try to give to a party member who needs MP
            return this._givePotionToParty('mp');
        }
        return false;
    }

    useSpPotion() {
        const player = this.player;
        player.inventory.spPotions = player.inventory.spPotions || 0;
        if (player.inventory.spPotions > 0 && player.sp !== undefined && player.sp < player.maxSp) {
            player.inventory.spPotions--;
            player.sp = Math.min(player.maxSp, player.sp + 50);
            this.updateInventoryUI();
            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
            
            // Visual feedback
            if (player.scene && player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, '+50 SP', 0x4ade80);
            }
            return true;
        } else if (player.inventory.spPotions > 0) {
            // Try to give to a party member who needs SP
            return this._givePotionToParty('sp');
        }
        return false;
    }

    useMeat() {
        const player = this.player;
        player.inventory.meat = player.inventory.meat || 0;
        if (player.inventory.meat > 0 && player.hp < player.maxHp) {
            player.inventory.meat--;
            player.hp = Math.min(player.maxHp, player.hp + 20);
            this.updateInventoryUI();
            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
            
            // Visual feedback
            if (player.scene && player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, '+20 HP', 0x00ff00);
            }
            return true;
        }
        return false;
    }

    _givePotionToParty(type, range) {
        const player = this.player;
        if (!player.scene || !player.scene.partyMembers || player.scene.partyMembers.length === 0) return false;
        
        // Find closest party member who needs this stat
        let bestHero = null;
        let bestDist = Infinity;
        
        for (const hero of player.scene.partyMembers) {
            if (!hero.sprite || !hero.sprite.active) continue;
            
            let needsIt = false;
            if (type === 'hp' && hero.hp < hero.maxHp) needsIt = true;
            if (type === 'mp' && hero.mp !== undefined && hero.mp < hero.maxMp) needsIt = true;
            if (type === 'sp' && hero.sp !== undefined && hero.sp < hero.maxSp) needsIt = true;
            
            if (needsIt) {
                const dist = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, hero.sprite.x, hero.sprite.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestHero = hero;
                }
            }
        }
        
        if (!bestHero) {
            if (player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 30, 'No one needs it!', 0x888888);
            }
            return false;
        }
        
        // Apply potion to party member
        let label = '';
        let color = '#ffffff';
        if (type === 'hp') {
            player.inventory.potions--;
            bestHero.hp = Math.min(bestHero.maxHp, bestHero.hp + 50);
            label = '+50 HP';
            color = '#00ff00';
        } else if (type === 'mp') {
            player.inventory.mpPotions--;
            bestHero.mp = Math.min(bestHero.maxMp, bestHero.mp + 50);
            label = '+50 MP';
            color = '#60a5fa';
        } else if (type === 'sp') {
            player.inventory.spPotions--;
            bestHero.sp = Math.min(bestHero.maxSp, bestHero.sp + 50);
            label = '+50 SP';
            color = '#4ade80';
        }
        
        // Add Camaraderie boost
        bestHero.camaraderie = (bestHero.camaraderie || 0) + 2;
        
        if (player.scene.showFloatingText) {
            player.scene.showFloatingText(bestHero.sprite.x, bestHero.sprite.y - 30, label, parseInt(color.replace('#', '0x'), 16));
            setTimeout(() => {
                player.scene.showFloatingText(bestHero.sprite.x, bestHero.sprite.y - 50, '+2 Camaraderie', 0xf6be3b);
            }, 500);
        }
        
        if (player.scene.updateCharacterSheet) {
            player.scene.updateCharacterSheet();
        }
        
        this.updateInventoryUI();
        
        return true;
    }

    updateInventoryUI() {
        const player = this.player;
        // Weapon Slot (1)
        const wIcon = document.getElementById('inv-icon-1');
        const wBg = document.getElementById('inv-bg-1');
        const wHolder = document.getElementById('inv-placeholder-1');
        if (player.inventory.weapon && player.inventory.weapon.iconSrc) {
            const iconSrc = player.inventory.weapon.iconSrc;
            if (wBg) {
                wBg.style.backgroundImage = `url('${iconSrc}')`;
                
                let frameW = 64;
                let frameH = 64;
                let extraStyle = '';
                
                if (iconSrc.includes('16x16')) {
                    frameW = 16;
                    frameH = 16;
                } else if (iconSrc.includes('Hand Items')) {
                    frameW = 80;
                    frameH = 64;
                } else if (iconSrc.includes('PixelArt_FantasyWeapons_01') || iconSrc.includes('wooden_staff')) {
                    frameW = 40;
                    frameH = 40;
                    extraStyle = 'background-size: contain; background-position: center; transform: none;';
                }
                
                wBg.style.width = `${frameW}px`;
                wBg.style.height = `${frameH}px`;
                
                const scaleX = 40 / frameW;
                const scaleY = 40 / frameH;
                const scale = Math.min(scaleX, scaleY);
                if (!extraStyle) {
                    extraStyle = `transform: scale(${scale}); background-position: left top;`;
                }
                wBg.style.cssText = `width: ${frameW}px; height: ${frameH}px; background-image: url('${iconSrc}'); background-repeat: no-repeat; image-rendering: pixelated; transform-origin: center; ${extraStyle}`;
            }
            if (wIcon) {
                wIcon.style.display = 'flex';
                wIcon.classList.remove('hidden');
            }
            if (wHolder) wHolder.style.display = 'none';
        }

        // Artifact Slot (New Slot 2)
        const aIcon = document.getElementById('inv-icon-artifact');
        const aBg = document.getElementById('inv-bg-artifact');
        const aHolder = document.getElementById('inv-placeholder-artifact');
        if (player.inventory.equippedArtifact !== undefined && player.inventory.equippedArtifact >= 0 && player.inventory.artifacts && player.inventory.artifacts.length > 0) {
            const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            const artifactDef = window.ARTIFACTS_DATA ? window.ARTIFACTS_DATA[artifactKey] : null;
            if (artifactDef) {
                if (aBg) {
                    aBg.style.backgroundImage = `url('${artifactDef.iconSrc}')`;
                }
                if (aIcon) {
                    aIcon.style.display = 'flex';
                    aIcon.classList.remove('hidden');
                }
                if (aHolder) aHolder.style.display = 'none';
            }
        } else {
            if (aIcon) {
                aIcon.style.display = 'none';
                aIcon.classList.add('hidden');
            }
            if (aHolder) aHolder.style.display = 'block';
        }

        // Potion Slot (3)
        const pQty = document.getElementById('inv-qty-2');
        const pIcon = document.getElementById('inv-icon-2');
        const pHolder = document.getElementById('inv-placeholder-2');
        if (pQty) {
            pQty.innerText = 'x' + player.inventory.potions;
            if (pIcon) {
                if (player.inventory.potions > 0) {
                    pIcon.style.display = 'flex';
                    pIcon.classList.remove('hidden');
                    if (pHolder) pHolder.style.display = 'none';
                } else {
                    pIcon.style.display = 'none';
                    pIcon.classList.add('hidden');
                    if (pHolder) pHolder.style.display = 'block';
                }
            }
        }

        // MP Potion Slot (3)
        const sQty = document.getElementById('inv-qty-3');
        const sIcon = document.getElementById('inv-icon-3');
        const sHolder = document.getElementById('inv-placeholder-3');
        if (sQty) {
            player.inventory.mpPotions = player.inventory.mpPotions || 0;
            sQty.innerText = 'x' + player.inventory.mpPotions;
            if (sIcon) {
                if (player.inventory.mpPotions > 0) {
                    sIcon.style.display = 'flex';
                    sIcon.classList.remove('hidden');
                    if (sHolder) sHolder.style.display = 'none';
                } else {
                    sIcon.style.display = 'none';
                    sIcon.classList.add('hidden');
                    if (sHolder) sHolder.style.display = 'block';
                }
            }
        }

        // Meat Slot (4)
        const mQty = document.getElementById('inv-qty-4');
        const mIcon = document.getElementById('inv-icon-4');
        const mHolder = document.getElementById('inv-placeholder-4');
        if (mQty) {
            player.inventory.meat = player.inventory.meat || 0;
            mQty.innerText = 'x' + player.inventory.meat;
            if (mIcon) {
                if (player.inventory.meat > 0) {
                    mIcon.style.display = 'flex';
                    mIcon.classList.remove('hidden');
                    if (mHolder) mHolder.style.display = 'none';
                } else {
                    mIcon.style.display = 'none';
                    mIcon.classList.add('hidden');
                    if (mHolder) mHolder.style.display = 'block';
                }
            }
        }

        // Stamina Potion Slot (5)
        const spQty = document.getElementById('inv-qty-5');
        const spIcon = document.getElementById('inv-icon-5');
        const spHolder = document.getElementById('inv-placeholder-5');
        if (spQty) {
            player.inventory.spPotions = player.inventory.spPotions || 0;
            spQty.innerText = 'x' + player.inventory.spPotions;
            if (spIcon) {
                if (player.inventory.spPotions > 0) {
                    spIcon.style.display = 'flex';
                    spIcon.classList.remove('hidden');
                    if (spHolder) spHolder.style.display = 'none';
                } else {
                    spIcon.style.display = 'none';
                    spIcon.classList.add('hidden');
                    if (spHolder) spHolder.style.display = 'block';
                }
            }
        }

        // Setup click listeners for popup if not already done
        if (!player.inventoryUiBound) {
            player.inventoryUiBound = true;
            this.setupInventoryPopups();
        }
        player.saveGame();
    }

    setupInventoryPopups() {
        const player = this.player;
        const popup = document.getElementById('inv-popup');
        const pTitle = document.getElementById('inv-popup-title');
        const pDesc = document.getElementById('inv-popup-desc');
        
        const showPopup = (slotId, title, desc) => {
            pTitle.innerText = title;
            pDesc.innerText = desc;
            popup.style.opacity = '1';
            popup.style.transform = 'translate(-50%, 0) scale(1)';
            
            // Auto hide after 3 seconds
            if (player.popupTimeout) clearTimeout(player.popupTimeout);
            player.popupTimeout = setTimeout(() => {
                popup.style.opacity = '0';
                popup.style.transform = 'translate(-50%, 0) scale(0.95)';
            }, 3000);
        };

        const useWeapon = () => {
            const w = player.inventory.weapon;
            if (w) showPopup(1, w.name, `${w.desc || 'A weapon.'}\nDamage Bonus: +${w.damageBonus}`);
        };

        const slot1 = document.getElementById('inv-slot-1');
        if (slot1) slot1.onclick = useWeapon;

        const slotArtifact = document.getElementById('inv-slot-artifact');
        if (slotArtifact) slotArtifact.onclick = () => {
            if (player.inventory.artifacts && player.inventory.artifacts.length > 0) {
                player.cycleArtifact();
                const artifactKey = player.inventory.artifacts[player.inventory.equippedArtifact];
                const artifactDef = window.ARTIFACTS_DATA[artifactKey];
                showPopup(2, artifactDef.name, artifactDef.desc);
            } else {
                showPopup(2, 'No Artifacts', 'Find artifacts in chests or stores.');
            }
        };

        const slot2 = document.getElementById('inv-slot-2');
        if (slot2) slot2.onclick = () => {
            if (player.usePotion()) {
                showPopup(3, 'Health Potion', 'Restores 50 HP when used.');
            }
        };

        const slot3 = document.getElementById('inv-slot-3');
        if (slot3) slot3.onclick = () => {
            if (player.useMpPotion()) {
                showPopup(4, 'Mana Potion', 'Restores 50 MP when used.');
            }
        };

        const slot4 = document.getElementById('inv-slot-4');
        if (slot4) slot4.onclick = () => {
            if (player.useMeat()) {
                showPopup(5, 'Boar Meat', 'Restores 20 HP when consumed.');
            }
        };

        const slot5 = document.getElementById('inv-slot-5');
        if (slot5) slot5.onclick = () => {
            if (player.useSpPotion()) {
                showPopup(6, 'Stamina Potion', 'Restores 50 SP when used.');
            }
        };

        // Hotkeys
        player.scene.input.keyboard.on('keydown-ONE', useWeapon);
        player.scene.input.keyboard.on('keydown-TWO', () => { if(slotArtifact) slotArtifact.onclick(); });
        player.scene.input.keyboard.on('keydown-THREE', () => { if(slot2) slot2.onclick(); });
        player.scene.input.keyboard.on('keydown-FOUR', () => { if(slot3) slot3.onclick(); });
        player.scene.input.keyboard.on('keydown-FIVE', () => { if(slot4) slot4.onclick(); });
        player.scene.input.keyboard.on('keydown-SIX', () => { if(slot5) slot5.onclick(); });
    }
}

if (typeof window !== 'undefined') {
    window.InventoryManager = InventoryManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InventoryManager;
}
