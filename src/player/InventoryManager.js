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
            player.inventory.potionList = player.inventory.potionList || [];
            let item = player.inventory.potionList.pop();
            if (!item) item = { key: 'item-potion', name: 'Health Potion', hpRestore: 50 };
            
            const healAmount = item.hpRestore !== undefined ? item.hpRestore : 50;
            if (healAmount === 'all') {
                player.hp = player.maxHp;
            } else {
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
            }
            
            if (item.mpRestore) {
                if (item.mpRestore === 'all') player.mp = player.maxMp;
                else player.mp = Math.min(player.maxMp, player.mp + item.mpRestore);
            }
            if (item.spRestore) {
                if (item.spRestore === 'all') player.sp = player.maxSp;
                else player.sp = Math.min(player.maxSp, player.sp + item.spRestore);
            }
            if (item.buff && player.applyStatusEffect) {
                player.applyStatusEffect(item.buff.type, item.buff.duration, item.buff.strength);
            }
            
            this.updateInventoryUI();
            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
            
            // Visual feedback
            if (player.scene && player.scene.showFloatingText) {
                const label = healAmount === 'all' ? 'Fully Healed!' : `+${healAmount} HP`;
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, label, 0x00ff00);
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
            player.inventory.mpPotionList = player.inventory.mpPotionList || [];
            let item = player.inventory.mpPotionList.pop();
            if (!item) item = { key: 'item-mp-potion', name: 'Mana Potion', mpRestore: 50 };
            
            const mpAmount = item.mpRestore !== undefined ? item.mpRestore : 50;
            if (mpAmount === 'all') {
                player.mp = player.maxMp;
            } else {
                player.mp = Math.min(player.maxMp, player.mp + mpAmount);
            }
            
            if (item.hpRestore) {
                if (item.hpRestore === 'all') player.hp = player.maxHp;
                else player.hp = Math.min(player.maxHp, player.hp + item.hpRestore);
            }
            if (item.spRestore) {
                if (item.spRestore === 'all') player.sp = player.maxSp;
                else player.sp = Math.min(player.maxSp, player.sp + item.spRestore);
            }
            if (item.buff && player.applyStatusEffect) {
                player.applyStatusEffect(item.buff.type, item.buff.duration, item.buff.strength);
            }
            
            this.updateInventoryUI();
            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
            
            // Visual feedback
            if (player.scene && player.scene.showFloatingText) {
                const label = mpAmount === 'all' ? 'Max Mana!' : `+${mpAmount} MP`;
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, label, 0x60a5fa);
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
            player.inventory.spPotionList = player.inventory.spPotionList || [];
            let item = player.inventory.spPotionList.pop();
            if (!item) item = { key: 'item-sp-potion', name: 'Stamina Potion', spRestore: 50 };
            
            const spAmount = item.spRestore !== undefined ? item.spRestore : 50;
            if (spAmount === 'all') {
                player.sp = player.maxSp;
            } else {
                player.sp = Math.min(player.maxSp, player.sp + spAmount);
            }
            
            if (item.hpRestore) {
                if (item.hpRestore === 'all') player.hp = player.maxHp;
                else player.hp = Math.min(player.maxHp, player.hp + item.hpRestore);
            }
            if (item.mpRestore) {
                if (item.mpRestore === 'all') player.mp = player.maxMp;
                else player.mp = Math.min(player.maxMp, player.mp + item.mpRestore);
            }
            if (item.buff && player.applyStatusEffect) {
                player.applyStatusEffect(item.buff.type, item.buff.duration, item.buff.strength);
            }
            
            this.updateInventoryUI();
            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
            
            // Visual feedback
            if (player.scene && player.scene.showFloatingText) {
                const label = spAmount === 'all' ? 'Max Stamina!' : `+${spAmount} SP`;
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, label, 0x4ade80);
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
            player.inventory.meatList = player.inventory.meatList || [];
            let item = player.inventory.meatList.pop();
            if (!item) item = { key: 'item-meat', name: 'Boar Meat', hpRestore: 20 };
            
            const healAmount = item.hpRestore !== undefined ? item.hpRestore : 20;
            if (healAmount === 'all') {
                player.hp = player.maxHp;
            } else {
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
            }
            
            if (item.mpRestore) {
                if (item.mpRestore === 'all') player.mp = player.maxMp;
                else player.mp = Math.min(player.maxMp, player.mp + item.mpRestore);
            }
            if (item.spRestore) {
                if (item.spRestore === 'all') player.sp = player.maxSp;
                else player.sp = Math.min(player.maxSp, player.sp + item.spRestore);
            }
            if (item.buff && player.applyStatusEffect) {
                player.applyStatusEffect(item.buff.type, item.buff.duration, item.buff.strength);
            }
            
            this.updateInventoryUI();
            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
            
            // Visual feedback
            if (player.scene && player.scene.showFloatingText) {
                const label = healAmount === 'all' ? 'Fully Healed!' : `+${healAmount} HP`;
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, label, 0x00ff00);
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
        let item = null;
        if (type === 'hp') {
            player.inventory.potionList = player.inventory.potionList || [];
            item = player.inventory.potionList.pop();
            if (!item) item = { key: 'item-potion', name: 'Health Potion', hpRestore: 50 };
            player.inventory.potions--;
            
            const healAmount = item.hpRestore !== undefined ? item.hpRestore : 50;
            if (healAmount === 'all') {
                bestHero.hp = bestHero.maxHp;
            } else {
                bestHero.hp = Math.min(bestHero.maxHp, bestHero.hp + healAmount);
            }
            if (item.mpRestore) {
                if (item.mpRestore === 'all') bestHero.mp = bestHero.maxMp;
                else bestHero.mp = Math.min(bestHero.maxMp, bestHero.mp + item.mpRestore);
            }
            if (item.spRestore) {
                if (item.spRestore === 'all') bestHero.sp = bestHero.maxSp;
                else bestHero.sp = Math.min(bestHero.maxSp, bestHero.sp + item.spRestore);
            }
            label = healAmount === 'all' ? 'Fully Healed!' : `+${healAmount} HP`;
            color = '#00ff00';
        } else if (type === 'mp') {
            player.inventory.mpPotionList = player.inventory.mpPotionList || [];
            item = player.inventory.mpPotionList.pop();
            if (!item) item = { key: 'item-mp-potion', name: 'Mana Potion', mpRestore: 50 };
            player.inventory.mpPotions--;
            
            const mpAmount = item.mpRestore !== undefined ? item.mpRestore : 50;
            if (mpAmount === 'all') {
                bestHero.mp = bestHero.maxMp;
            } else {
                bestHero.mp = Math.min(bestHero.maxMp, bestHero.mp + mpAmount);
            }
            if (item.hpRestore) {
                if (item.hpRestore === 'all') bestHero.hp = bestHero.maxHp;
                else bestHero.hp = Math.min(bestHero.maxHp, bestHero.hp + item.hpRestore);
            }
            if (item.spRestore) {
                if (item.spRestore === 'all') bestHero.sp = bestHero.maxSp;
                else bestHero.sp = Math.min(bestHero.maxSp, bestHero.sp + item.spRestore);
            }
            label = mpAmount === 'all' ? 'Max Mana!' : `+${mpAmount} MP`;
            color = '#60a5fa';
        } else if (type === 'sp') {
            player.inventory.spPotionList = player.inventory.spPotionList || [];
            item = player.inventory.spPotionList.pop();
            if (!item) item = { key: 'item-sp-potion', name: 'Stamina Potion', spRestore: 50 };
            player.inventory.spPotions--;
            
            const spAmount = item.spRestore !== undefined ? item.spRestore : 50;
            if (spAmount === 'all') {
                bestHero.sp = bestHero.maxSp;
            } else {
                bestHero.sp = Math.min(bestHero.maxSp, bestHero.sp + spAmount);
            }
            if (item.hpRestore) {
                if (item.hpRestore === 'all') bestHero.hp = bestHero.maxHp;
                else bestHero.hp = Math.min(bestHero.maxHp, bestHero.hp + item.hpRestore);
            }
            if (item.mpRestore) {
                if (item.mpRestore === 'all') bestHero.mp = bestHero.maxMp;
                else bestHero.mp = Math.min(bestHero.maxMp, bestHero.mp + item.mpRestore);
            }
            label = spAmount === 'all' ? 'Max Stamina!' : `+${spAmount} SP`;
            color = '#4ade80';
        }
        
        if (item && item.buff && bestHero.applyStatusEffect) {
            bestHero.applyStatusEffect(item.buff.type, item.buff.duration, item.buff.strength);
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

    useMiscPotion() {
        const player = this.player;
        player.inventory.miscPotions = player.inventory.miscPotions || 0;
        if (player.inventory.miscPotions > 0) {
            player.inventory.miscPotions--;
            player.inventory.miscPotionList = player.inventory.miscPotionList || [];
            let item = player.inventory.miscPotionList.pop();
            if (!item) return false;
            
            const healAmount = item.hpRestore || 0;
            if (healAmount === 'all') {
                player.hp = player.maxHp;
            } else if (healAmount > 0) {
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
            }
            
            if (item.mpRestore) {
                if (item.mpRestore === 'all') player.mp = player.maxMp;
                else player.mp = Math.min(player.maxMp, player.mp + item.mpRestore);
            }
            if (item.spRestore) {
                if (item.spRestore === 'all') player.sp = player.maxSp;
                else player.sp = Math.min(player.maxSp, player.sp + item.spRestore);
            }
            if (item.buff && player.applyStatusEffect) {
                player.applyStatusEffect(item.buff.type, item.buff.duration, item.buff.strength);
            }
            
            this.updateInventoryUI();
            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
            
            // Visual feedback
            if (player.scene && player.scene.showFloatingText) {
                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `Used ${item.name}`, 0xcc88ff);
            }
            return true;
        }
        return false;
    }

    updateInventoryUI() {
        const player = this.player;

        // Auto-populate and trim detailed lists from legacy counts
        player.inventory.potionList = player.inventory.potionList || [];
        if (player.inventory.potionList.length > player.inventory.potions) {
            player.inventory.potionList.splice(0, player.inventory.potionList.length - player.inventory.potions);
        }
        while (player.inventory.potionList.length < player.inventory.potions) {
            player.inventory.potionList.push({ key: 'item-potion', name: 'Health Potion', hpRestore: 50 });
        }

        player.inventory.mpPotionList = player.inventory.mpPotionList || [];
        if (player.inventory.mpPotionList.length > player.inventory.mpPotions) {
            player.inventory.mpPotionList.splice(0, player.inventory.mpPotionList.length - player.inventory.mpPotions);
        }
        while (player.inventory.mpPotionList.length < player.inventory.mpPotions) {
            player.inventory.mpPotionList.push({ key: 'item-mp-potion', name: 'Mana Potion', mpRestore: 50 });
        }

        player.inventory.meatList = player.inventory.meatList || [];
        if (player.inventory.meatList.length > player.inventory.meat) {
            player.inventory.meatList.splice(0, player.inventory.meatList.length - player.inventory.meat);
        }
        while (player.inventory.meatList.length < player.inventory.meat) {
            player.inventory.meatList.push({ key: 'item-meat', name: 'Boar Meat', hpRestore: 20 });
        }

        player.inventory.spPotionList = player.inventory.spPotionList || [];
        if (player.inventory.spPotionList.length > player.inventory.spPotions) {
            player.inventory.spPotionList.splice(0, player.inventory.spPotionList.length - player.inventory.spPotions);
        }
        while (player.inventory.spPotionList.length < player.inventory.spPotions) {
            player.inventory.spPotionList.push({ key: 'item-sp-potion', name: 'Stamina Potion', spRestore: 50 });
        }

        player.inventory.miscPotionList = player.inventory.miscPotionList || [];
        const miscCount = player.inventory.miscPotions || 0;
        if (player.inventory.miscPotionList.length > miscCount) {
            player.inventory.miscPotionList.splice(0, player.inventory.miscPotionList.length - miscCount);
        }
        while (player.inventory.miscPotionList.length < miscCount) {
            player.inventory.miscPotionList.push({ key: 'potion-haste-draught', name: 'Draught of Haste', buff: { type: 'haste', duration: 15000, strength: 25 } });
        }

        const getActiveCount = (list, defaultKey) => {
            if (!list || list.length === 0) return 0;
            const topItem = list[list.length - 1];
            const activeKey = topItem ? topItem.key : defaultKey;
            return list.filter(item => item.key === activeKey).length;
        };

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
                } else if (iconSrc.includes('PixelArt_FantasyWeapons_01') || iconSrc.includes('wooden_staff') || iconSrc.includes('items/')) {
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
            const activeCount = getActiveCount(player.inventory.potionList, 'item-potion');
            pQty.innerText = 'x' + activeCount;
            if (pIcon) {
                if (player.inventory.potionList && player.inventory.potionList.length > 0) {
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
            const activeCount = getActiveCount(player.inventory.mpPotionList, 'item-mp-potion');
            sQty.innerText = 'x' + activeCount;
            if (sIcon) {
                if (player.inventory.mpPotionList && player.inventory.mpPotionList.length > 0) {
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
            const activeCount = getActiveCount(player.inventory.meatList, 'item-meat');
            mQty.innerText = 'x' + activeCount;
            if (mIcon) {
                if (player.inventory.meatList && player.inventory.meatList.length > 0) {
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
            const activeCount = getActiveCount(player.inventory.spPotionList, 'item-sp-potion');
            spQty.innerText = 'x' + activeCount;
            if (spIcon) {
                if (player.inventory.spPotionList && player.inventory.spPotionList.length > 0) {
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

        // Miscellaneous Potion Slot (6)
        const miscQty = document.getElementById('inv-qty-6');
        const miscIcon = document.getElementById('inv-icon-6');
        const miscHolder = document.getElementById('inv-placeholder-6');
        if (miscQty) {
            const activeCount = getActiveCount(player.inventory.miscPotionList, 'potion-haste-draught');
            miscQty.innerText = 'x' + activeCount;
            if (miscIcon) {
                if (player.inventory.miscPotionList && player.inventory.miscPotionList.length > 0) {
                    miscIcon.style.display = 'flex';
                    miscIcon.classList.remove('hidden');
                    if (miscHolder) miscHolder.style.display = 'none';
                } else {
                    miscIcon.style.display = 'none';
                    miscIcon.classList.add('hidden');
                    if (miscHolder) miscHolder.style.display = 'block';
                }
            }
        }

        // Dynamic background updates for hotbar slots based on top item in inventory lists
        const updateSlotBg = (list, bgId, fallbackUrl, fbW, fbH, fbSz, fbPos, fbSc) => {
            const bgEl = document.getElementById(bgId);
            if (!bgEl) return;
            if (list && list.length > 0) {
                const topItem = list[list.length - 1];
                let imageSrc = topItem ? topItem.imageSrc : null;
                
                // Fallback: look up in NEW_ITEMS_DATA to find imageSrc if missing on loaded items
                if (topItem && !imageSrc) {
                    if (window.NEW_ITEMS_DATA) {
                        const def = window.NEW_ITEMS_DATA.find(i => i.key === topItem.key);
                        if (def) imageSrc = def.imageSrc;
                    }
                }
                
                const isSheet = topItem && (topItem.isSpritesheet || ['item-potion', 'item-mp-potion', 'item-sp-potion', 'item-chest'].includes(topItem.key));
                
                if (topItem && imageSrc && !isSheet) {
                    bgEl.style.backgroundImage = `url('${imageSrc}')`;
                    bgEl.style.width = '40px';
                    bgEl.style.height = '40px';
                    bgEl.style.backgroundSize = 'contain';
                    bgEl.style.backgroundPosition = 'center';
                    bgEl.style.transform = 'none';
                } else {
                    bgEl.style.backgroundImage = `url('${fallbackUrl}')`;
                    bgEl.style.width = fbW;
                    bgEl.style.height = fbH;
                    bgEl.style.backgroundSize = fbSz;
                    bgEl.style.backgroundPosition = fbPos;
                    bgEl.style.transform = `scale(${fbSc})`;
                }
            } else {
                // If list is empty, reset to default fallback
                bgEl.style.backgroundImage = `url('${fallbackUrl}')`;
                bgEl.style.width = fbW;
                bgEl.style.height = fbH;
                bgEl.style.backgroundSize = fbSz;
                bgEl.style.backgroundPosition = fbPos;
                bgEl.style.transform = `scale(${fbSc})`;
            }
        };

        updateSlotBg(player.inventory.potionList, 'inv-bg-2', 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Healing Sheet.png', '16px', '16px', '48px 128px', '-16px 0px', 2);
        updateSlotBg(player.inventory.mpPotionList, 'inv-bg-3', 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Mana Sheet.png', '16px', '16px', '16px 128px', '0px 0px', 2);
        updateSlotBg(player.inventory.meatList, 'inv-bg-4', 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png', '16px', '16px', 'auto', 'left top', 2.5);
        updateSlotBg(player.inventory.spPotionList, 'inv-bg-5', 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Stamina Sheet.png', '16px', '16px', '16px 128px', '0px 0px', 2);
        updateSlotBg(player.inventory.miscPotionList, 'inv-bg-6', 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon9.png', '40px', '40px', 'contain', 'center', 1);

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
        const self = this;
        
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

        const cycleWeapon = () => {
            player.inventory.weapons = player.inventory.weapons || [ player.inventory.weapon ];
            if (player.inventory.weapons.length > 1) {
                const currentIdx = player.inventory.weapons.findIndex(w => w.key === player.inventory.weapon.key);
                const nextIdx = (currentIdx + 1) % player.inventory.weapons.length;
                player.inventory.weapon = player.inventory.weapons[nextIdx];
                player.recalculateStats();
                self.updateInventoryUI();
                showPopup(1, player.inventory.weapon.name, `Equipped. Damage Bonus: +${player.inventory.weapon.damageBonus}`);
            } else {
                showPopup(1, player.inventory.weapon.name, `Damage Bonus: +${player.inventory.weapon.damageBonus}\n(Buy more weapons to cycle!)`);
            }
        };

        const makeWeaponTapHandler = () => {
            let tapCount = 0;
            let tapTimeout = null;
            return () => {
                tapCount++;
                if (tapTimeout) clearTimeout(tapTimeout);
                tapTimeout = setTimeout(() => {
                    if (tapCount === 1) {
                        const w = player.inventory.weapon;
                        if (w) showPopup(1, w.name, `${w.desc || 'A weapon.'}\nDamage Bonus: +${w.damageBonus}`);
                    } else if (tapCount >= 2) {
                        cycleWeapon();
                    }
                    tapCount = 0;
                }, 250);
            };
        };

        const slot1 = document.getElementById('inv-slot-1');
        if (slot1) slot1.onclick = makeWeaponTapHandler();

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

        // Track active selection
        this.activeHotbarIndex = 2; // Default is Health Potion

        const updateHotbarHighlight = () => {
            const slots = {
                2: document.getElementById('inv-slot-2'),
                3: document.getElementById('inv-slot-3'),
                4: document.getElementById('inv-slot-4'),
                5: document.getElementById('inv-slot-5'),
                6: document.getElementById('inv-slot-6')
            };
            for (let idx in slots) {
                const el = slots[idx];
                if (!el) continue;
                if (parseInt(idx) === this.activeHotbarIndex) {
                    el.classList.remove('border-outline-variant');
                    el.classList.add('border-secondary', 'shadow-[0_0_10px_rgba(246,190,59,0.5)]');
                } else {
                    el.classList.remove('border-secondary', 'shadow-[0_0_10px_rgba(246,190,59,0.5)]');
                    el.classList.add('border-outline-variant');
                }
            }
        };

        // Initialize active slot highlight on startup
        updateHotbarHighlight();

        const makeTapHandler = (slotIdx) => {
            let tapCount = 0;
            let tapTimeout = null;
            return () => {
                tapCount++;
                if (tapTimeout) clearTimeout(tapTimeout);
                tapTimeout = setTimeout(() => {
                    self.activeHotbarIndex = slotIdx;
                    updateHotbarHighlight();

                    let list = null;
                    if (slotIdx === 2) list = player.inventory.potionList;
                    else if (slotIdx === 3) list = player.inventory.mpPotionList;
                    else if (slotIdx === 4) list = player.inventory.meatList;
                    else if (slotIdx === 5) list = player.inventory.spPotionList;
                    else if (slotIdx === 6) list = player.inventory.miscPotionList;

                    if (tapCount === 1) {
                        if (slotIdx === 2) {
                            if (player.usePotion()) {
                                const usedName = (list && list.length > 0) ? list[list.length - 1].name : 'Health Potion';
                                showPopup(3, usedName, 'Consumed.');
                            }
                        } else if (slotIdx === 3) {
                            if (player.useMpPotion()) {
                                const usedName = (list && list.length > 0) ? list[list.length - 1].name : 'Mana Potion';
                                showPopup(4, usedName, 'Consumed.');
                            }
                        } else if (slotIdx === 4) {
                            if (player.useMeat()) {
                                const usedName = (list && list.length > 0) ? list[list.length - 1].name : 'Boar Meat';
                                showPopup(5, usedName, 'Consumed.');
                            }
                        } else if (slotIdx === 5) {
                            if (player.useSpPotion()) {
                                const usedName = (list && list.length > 0) ? list[list.length - 1].name : 'Stamina Potion';
                                showPopup(6, usedName, 'Consumed.');
                            }
                        } else if (slotIdx === 6) {
                            if (self.useMiscPotion()) {
                                const usedName = (list && list.length > 0) ? list[list.length - 1].name : 'Utility Potion';
                                showPopup(7, usedName, 'Consumed.');
                            }
                        }
                    } else if (tapCount === 2) {
                        // Double tap: scroll forward (rotate)
                        if (list && list.length > 1) {
                            const popped = list.pop();
                            list.unshift(popped);
                            self.updateInventoryUI();
                            
                            const topItem = list[list.length - 1];
                            showPopup(slotIdx, topItem.name, `Selected (Double tap to scroll, Single to use).`);
                        } else {
                            showPopup(slotIdx, 'No other items', 'Buy more varieties to scroll!');
                        }
                    } else if (tapCount >= 3) {
                        // Triple tap: scroll backward (rotate reverse)
                        if (list && list.length > 1) {
                            const shifted = list.shift();
                            list.push(shifted);
                            self.updateInventoryUI();
                            
                            const topItem = list[list.length - 1];
                            showPopup(slotIdx, topItem.name, `Selected (Triple tap to scroll, Single to use).`);
                        } else {
                            showPopup(slotIdx, 'No other items', 'Buy more varieties to scroll!');
                        }
                    }
                    tapCount = 0;
                }, 250);
            };
        };

        const tapHandlers = {
            2: makeTapHandler(2),
            3: makeTapHandler(3),
            4: makeTapHandler(4),
            5: makeTapHandler(5),
            6: makeTapHandler(6)
        };

        const slot2 = document.getElementById('inv-slot-2');
        if (slot2) slot2.onclick = tapHandlers[2];

        const slot3 = document.getElementById('inv-slot-3');
        if (slot3) slot3.onclick = tapHandlers[3];

        const slot4 = document.getElementById('inv-slot-4');
        if (slot4) slot4.onclick = tapHandlers[4];

        const slot5 = document.getElementById('inv-slot-5');
        if (slot5) slot5.onclick = tapHandlers[5];

        const slot6 = document.getElementById('inv-slot-6');
        if (slot6) slot6.onclick = tapHandlers[6];

        // Q key listener for quick use & scrolling
        player.scene.input.keyboard.on('keydown-Q', () => {
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
            const handler = tapHandlers[self.activeHotbarIndex];
            if (handler) handler();
        });

        // Hotkeys
        player.scene.input.keyboard.on('keydown-ONE', () => { if(slot1) slot1.onclick(); });
        player.scene.input.keyboard.on('keydown-TWO', () => { if(slotArtifact) slotArtifact.onclick(); });
        player.scene.input.keyboard.on('keydown-THREE', () => { if(slot2) slot2.onclick(); });
        player.scene.input.keyboard.on('keydown-FOUR', () => { if(slot3) slot3.onclick(); });
        player.scene.input.keyboard.on('keydown-FIVE', () => { if(slot4) slot4.onclick(); });
        player.scene.input.keyboard.on('keydown-SIX', () => { if(slot5) slot5.onclick(); });
        player.scene.input.keyboard.on('keydown-SEVEN', () => { if(slot6) slot6.onclick(); });
    }
}

if (typeof window !== 'undefined') {
    window.InventoryManager = InventoryManager;
}
if (typeof module !== 'undefined' && module.exports) {
    window.InventoryManager = InventoryManager;
}
