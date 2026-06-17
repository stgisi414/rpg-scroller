class ShopManager {
    constructor(player) {
        this.player = player;
    }

    openShopUI(shopType, npcName) {
        const player = this.player;
        const shopUI = document.getElementById('ui-shop');
        const shopTitle = document.getElementById('shop-title');
        const itemsContainer = document.getElementById('shop-items-container');
        
        shopUI.style.display = 'flex';
        shopTitle.innerText = npcName;
        itemsContainer.innerHTML = ''; // clear

        let items = [];
        if (shopType === 'blacksmith') {
            items = [
                { key: 'weapon-bronze-sword', name: 'Bronze Sword', desc: '+2 Damage', price: 50, type: 'weapon', damageBonus: 2, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'weapon-iron-sword', name: 'Iron Broadsword', desc: '+5 Damage', price: 150, type: 'weapon', damageBonus: 5, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_02.png' },
                { key: 'weapon-gold-sword', name: 'Golden Longsword', desc: '+8 Damage', price: 300, type: 'weapon', damageBonus: 8, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_03.png' },
                { key: 'weapon-diamond-sword', name: 'Obsidian Blade', desc: '+15 Damage', price: 500, type: 'weapon', damageBonus: 15, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_04.png' },
                { key: 'weapon-iron-axe', name: 'Heavy Battleaxe', desc: '+6 Damage', price: 200, type: 'weapon', damageBonus: 6, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_01.png' },
                { key: 'artifact-commander', name: 'Commander\'s Horn', desc: 'Party gets +50% Stats', price: 1500, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon14.png' },
                { key: 'artifact-strength', name: 'Ring of Strength', desc: '+20% Damage', price: 400, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon1.png' }
            ];
        } else if (shopType === 'alchemist') {
            items = [
                { key: 'item-potion', name: 'Health Potion', desc: 'Restores 50 HP', price: 20, type: 'potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Healing Sheet.png' },
                { key: 'item-mp-potion', name: 'Mana Potion', desc: 'Restores 50 MP', price: 20, type: 'mp_potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Mana Sheet.png' },
                { key: 'item-sp-potion', name: 'Stamina Potion', desc: 'Restores 50 SP', price: 20, type: 'sp_potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Stamina Sheet.png' },
                { key: 'weapon-stick', name: 'Oak Wand', desc: '+2 Damage', price: 50, type: 'weapon', damageBonus: 2, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_01.png' },
                { key: 'weapon-staff', name: 'Adept Staff', desc: '+5 Damage', price: 150, type: 'weapon', damageBonus: 5, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_02.png' },
                { key: 'item-chest', name: 'Mystery Chest', desc: 'Contains random loot!', price: 100, type: 'chest', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore Chests/GandalfHardcore Chests/chest sheet 1.png' },
                { key: 'artifact-teleporter', name: 'Town Portal Stone', desc: 'Teleport to town at <15% HP', price: 1000, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon13.png' },
                { key: 'artifact-antidote', name: 'Antidote Vial', desc: 'Immunity to Poison', price: 300, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon7.png' }
            ];
        } else if (shopType === 'ranger') {
            items = [
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', price: 40, type: 'weapon', damageBonus: 3, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'weapon-poison-shiv', name: 'Poisoned Shiv', desc: '+8 Damage', price: 250, type: 'weapon', damageBonus: 8, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_02.png' },
                { key: 'weapon-shortbow', name: 'Shortbow', desc: '+4 Damage', price: 80, type: 'weapon', damageBonus: 4, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_01.png' },
                { key: 'weapon-elven-longbow', name: 'Elven Longbow', desc: '+10 Damage', price: 350, type: 'weapon', damageBonus: 10, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_02.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 10, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
                { key: 'item-fur', name: 'Wolf Pelt', desc: 'Warm fur.', price: 50, type: 'junk', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon45.png' }
            ];
        } else if (shopType === 'wizard') {
            items = [
                { key: 'item-potion', name: 'Health Potion', desc: 'Restores 50 HP', price: 25, type: 'potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Healing Sheet.png' },
                { key: 'item-mp-potion', name: 'Mana Potion', desc: 'Restores 50 MP', price: 25, type: 'mp_potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Mana Sheet.png' },
                { key: 'weapon-stick', name: 'Oak Wand', desc: '+2 Damage', price: 60, type: 'weapon', damageBonus: 2, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_01.png' },
            ];
        } else if (shopType === 'samurai') {
            items = [
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', price: 50, type: 'weapon', damageBonus: 3, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 15, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
            ];
        } else if (shopType === 'knight') {
            items = [
                { key: 'weapon-bronze-sword', name: 'Bronze Sword', desc: '+2 Damage', price: 60, type: 'weapon', damageBonus: 2, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 15, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
            ];
        }

        // Filter items: only show generic items and items meant for the current class
        items = items.filter(item => !item.classRestrict || item.classRestrict === player.classData.id);

        // Apply Alignment Price Multiplier
        let multiplier = 1.0;
        if (player.alignment >= 20) multiplier = 0.8; // Heroic discount
        else if (player.alignment >= 10) multiplier = 0.9; // Good discount
        else if (player.alignment <= -20) multiplier = 1.5; // Villainous markup
        else if (player.alignment <= -10) multiplier = 1.2; // Evil markup
        
        items.forEach(item => {
            item.price = Math.max(1, Math.round(item.price * multiplier));
        });

        items.forEach((item, idx) => {
            const itemSrc = item.imageSrc;
            
            // Dynamic framing based on asset type
            let frameW = 64;
            let frameH = 64;
            let extraStyle = '';
            
            if (itemSrc.includes('16x16')) {
                frameW = 16;
                frameH = 16;
            } else if (item.isSpritesheet) {
                if (item.type.includes('potion')) {
                    frameW = 16;
                    frameH = 16;
                } else {
                    frameW = 32;
                    frameH = 32;
                }
            } else if (itemSrc.includes('Hand Items')) {
                frameW = 80;
                frameH = 64;
            } else if (itemSrc.includes('PixelArt_FantasyWeapons_01')) {
                frameW = 48;
                frameH = 48;
                extraStyle = 'background-size: contain; background-position: center; transform: none;';
            }
            
            const scaleX = 48 / frameW;
            const scaleY = 48 / frameH;
            const scale = Math.min(scaleX, scaleY);
            if (!extraStyle) {
                if (item.type === 'mp_potion') {
                    // MP Potion uses the 16x128 Mana Sheet
                    extraStyle = `transform: scale(${scale}); background-position: 0 0; background-size: 16px 128px;`;
                } else if (item.type === 'sp_potion') {
                    // SP Potion uses the 16x128 Stamina Sheet
                    extraStyle = `transform: scale(${scale}); background-position: 0 0; background-size: 16px 128px;`;
                } else if (item.type === 'potion') {
                    // HP Potion uses column 2 (-16px) of 48x128 Healing Sheet
                    extraStyle = `transform: scale(${scale}); background-position: -16px 0; background-size: 48px 128px;`;
                } else {
                    extraStyle = `transform: scale(${scale}); background-position: left top;`;
                }
            }
            
            let classBadge = '';
            if (item.classRestrict) {
                const color = item.classRestrict === player.classData.id ? 'text-primary' : 'text-error';
                classBadge = `<br><span class="${color} font-bold">[${item.classRestrict.toUpperCase()}]</span>`;
            }

            const btnHtml = `
                <div class="bg-surface-container-highest border border-outline-variant p-4 flex flex-col items-center gap-2 rounded hover:border-primary transition-colors cursor-pointer" id="shop-item-${idx}">
                    <div class="mb-2" style="width: 48px; height: 48px; overflow: hidden; display: flex; justify-content: center; align-items: center;">
                        <div style="width: ${frameW}px; height: ${frameH}px; background-image: url('${itemSrc}'); background-repeat: no-repeat; image-rendering: pixelated; transform-origin: center; ${extraStyle}"></div>
                    </div>
                    <div class="font-label-caps text-[12px] text-on-surface font-bold text-center">${item.name}</div>
                    <div class="font-body-sm text-[10px] text-on-surface-variant text-center h-8">${item.desc}${classBadge}</div>
                    <div class="font-headline-sm text-secondary font-bold text-[14px] mt-2">${item.price}g</div>
                </div>
            `;
            itemsContainer.insertAdjacentHTML('beforeend', btnHtml);
            
            // Wait for DOM update
            setTimeout(() => {
                const el = document.getElementById(`shop-item-${idx}`);
                if (el) el.onclick = () => player.buyItem(item);
            }, 0);
        });

        // Close btn
        const closeBtn = document.getElementById('btn-close-shop');
        closeBtn.onclick = () => {
            // Tell nearby NPC to close shop (which re-enables keyboard)
            player.scene.npcs.forEach(npc => {
                if (npc.isShopOpen) npc.closeShop();
            });
        };
    }

    buyItem(item) {
        const player = this.player;
        let itemObj = item;
        if (typeof item === 'string') {
            // Find in pre-defined lists
            const allItems = [
                // blacksmith
                { key: 'weapon-bronze-sword', name: 'Bronze Sword', desc: '+2 Damage', price: 50, type: 'weapon', damageBonus: 2, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'weapon-iron-sword', name: 'Iron Broadsword', desc: '+5 Damage', price: 150, type: 'weapon', damageBonus: 5, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_02.png' },
                { key: 'weapon-gold-sword', name: 'Golden Longsword', desc: '+8 Damage', price: 300, type: 'weapon', damageBonus: 8, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_03.png' },
                { key: 'weapon-diamond-sword', name: 'Obsidian Blade', desc: '+15 Damage', price: 500, type: 'weapon', damageBonus: 15, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_04.png' },
                { key: 'weapon-iron-axe', name: 'Heavy Battleaxe', desc: '+6 Damage', price: 200, type: 'weapon', damageBonus: 6, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_01.png' },
                { key: 'artifact-commander', name: 'Commander\'s Horn', desc: 'Party gets +50% Stats', price: 1500, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon14.png' },
                { key: 'artifact-strength', name: 'Ring of Strength', desc: '+20% Damage', price: 400, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon1.png' },
                // alchemist
                { key: 'item-potion', name: 'Health Potion', desc: 'Restores 50 HP', price: 20, type: 'potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Healing Sheet.png' },
                { key: 'item-mp-potion', name: 'Mana Potion', desc: 'Restores 50 MP', price: 20, type: 'mp_potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Mana Sheet.png' },
                { key: 'item-sp-potion', name: 'Stamina Potion', desc: 'Restores 50 SP', price: 20, type: 'sp_potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Stamina Sheet.png' },
                { key: 'weapon-stick', name: 'Oak Wand', desc: '+2 Damage', price: 50, type: 'weapon', damageBonus: 2, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_01.png' },
                { key: 'weapon-staff', name: 'Adept Staff', desc: '+5 Damage', price: 150, type: 'weapon', damageBonus: 5, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_02.png' },
                { key: 'item-chest', name: 'Mystery Chest', desc: 'Contains random loot!', price: 100, type: 'chest', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore Chests/GandalfHardcore Chests/chest sheet 1.png' },
                { key: 'artifact-teleporter', name: 'Town Portal Stone', desc: 'Teleport to town at <15% HP', price: 1000, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon13.png' },
                { key: 'artifact-antidote', name: 'Antidote Vial', desc: 'Immunity to Poison', price: 300, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon7.png' },
                // ranger
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', price: 40, type: 'weapon', damageBonus: 3, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'weapon-poison-shiv', name: 'Poisoned Shiv', desc: '+8 Damage', price: 250, type: 'weapon', damageBonus: 8, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_02.png' },
                { key: 'weapon-shortbow', name: 'Shortbow', desc: '+4 Damage', price: 80, type: 'weapon', damageBonus: 4, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_01.png' },
                { key: 'weapon-elven-longbow', name: 'Elven Longbow', desc: '+10 Damage', price: 350, type: 'weapon', damageBonus: 10, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_02.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 10, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
                { key: 'item-fur', name: 'Wolf Pelt', desc: 'Warm fur.', price: 50, type: 'junk', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon45.png' }
            ];
            itemObj = allItems.find(i => i.key === item) || { key: item, price: 0, type: 'unknown' };
        }

        if (itemObj.classRestrict && itemObj.classRestrict !== player.classData.id) {
            // Flash red for class restricted
            const ui = document.getElementById('shop-title');
            if(ui) {
                const oldText = ui.innerText;
                ui.innerText = `WRONG CLASS!`;
                ui.classList.add('text-error');
                setTimeout(() => { ui.innerText = oldText; ui.classList.remove('text-error'); }, 1000);
            }
            return;
        }

        if (window.saveData) {
            window.saveData = JSON.parse(JSON.stringify(window.saveData));
        }
        if (!window.saveData) window.saveData = { gold: 0 };
        if (window.saveData.gold === undefined || isNaN(window.saveData.gold)) window.saveData.gold = 0;

        if (window.saveData.gold < itemObj.price) {
            // Flash red for insufficient funds
            const ui = document.getElementById('hud-gold');
            if(ui) {
                ui.classList.add('text-error');
                setTimeout(() => ui.classList.remove('text-error'), 300);
            }
            return;
        }

        // Deduct gold
        window.saveData.gold -= itemObj.price;
        const goldEl = document.getElementById('hud-gold');
        if(goldEl) goldEl.innerText = `Gold: ${window.saveData.gold}`;

        // Apply item effect
        if (itemObj.type === 'weapon') {
            player.inventory.weapon = { key: itemObj.key, iconSrc: itemObj.imageSrc, name: itemObj.name, damageBonus: itemObj.damageBonus, desc: itemObj.desc };
        } else if (itemObj.type === 'potion') {
            player.inventory.potions++;
        } else if (itemObj.type === 'mp_potion') {
            player.inventory.mpPotions = (player.inventory.mpPotions || 0) + 1;
        } else if (itemObj.type === 'sp_potion') {
            player.inventory.spPotions = (player.inventory.spPotions || 0) + 1;
        } else if (itemObj.type === 'meat') {
            player.inventory.meat = (player.inventory.meat || 0) + 1;
        } else if (itemObj.type === 'junk') {
            player.inventory.furs = (player.inventory.furs || 0) + 1;
        } else if (itemObj.type === 'artifact') {
            if (!player.inventory.artifacts.includes(itemObj.key)) {
                player.inventory.artifacts.push(itemObj.key);
                if (player.inventory.equippedArtifact === -1) {
                    player.inventory.equippedArtifact = 0;
                    player.recalculateStats();
                }
            } else {
                alert(`You already own the ${itemObj.name}!`);
                window.saveData.gold += itemObj.price; // refund
                if(goldEl) goldEl.innerText = `Gold: ${window.saveData.gold}`;
            }
        } else if (itemObj.type === 'chest') {
            // Random reward
            const roll = Math.random();
            if (roll < 0.5) {
                // Gold
                const reward = 50 + Math.floor(Math.random() * 100);
                window.saveData.gold += reward;
                if(goldEl) goldEl.innerText = `Gold: ${window.saveData.gold}`;
                alert(`The chest contained ${reward} gold!`);
            } else if (roll < 0.8) {
                // Potions
                player.inventory.potions += 3;
                alert(`The chest contained 3 Health Potions!`);
            } else {
                // Rare Weapon
                player.inventory.weapon = { key: 'weapon-diamond-sword', name: 'Diamond Sword', damageBonus: 15, desc: 'Found in a mystery chest!' };
                alert(`Jackpot! You found a Diamond Sword!`);
            }
        }
        
        player.updateInventoryUI();
    }

    getNextWeaponUpgrade() {
        const player = this.player;
        const classId = player.classData.id;
        let chain = [];
        if (classId === 'knight' || classId === 'warrior') {
            chain = [
                { key: 'weapon-bronze-sword', name: 'Bronze Sword', desc: '+2 Damage', damageBonus: 2, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'weapon-iron-sword', name: 'Iron Broadsword', desc: '+5 Damage', damageBonus: 5, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_02.png' },
                { key: 'weapon-gold-sword', name: 'Golden Longsword', desc: '+8 Damage', damageBonus: 8, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_03.png' },
                { key: 'weapon-diamond-sword', name: 'Obsidian Blade', desc: '+15 Damage', damageBonus: 15, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_04.png' }
            ];
        } else if (classId === 'wizard') {
            chain = [
                { key: 'weapon-stick', name: 'Oak Wand', desc: '+2 Damage', damageBonus: 2, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_01.png' },
                { key: 'weapon-staff', name: 'Adept Staff', desc: '+5 Damage', damageBonus: 5, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_02.png' }
            ];
        } else if (classId === 'samurai') {
            chain = [
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', damageBonus: 3, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'weapon-poison-shiv', name: 'Poisoned Shiv', desc: '+8 Damage', damageBonus: 8, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_02.png' }
            ];
        } else if (classId === 'ranger') {
            chain = [
                { key: 'weapon-shortbow', name: 'Shortbow', desc: '+4 Damage', damageBonus: 4, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_01.png' },
                { key: 'weapon-elven-longbow', name: 'Elven Longbow', desc: '+10 Damage', damageBonus: 10, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_02.png' }
            ];
        }

        const currentBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
        const upgrade = chain.find(w => w.damageBonus > currentBonus);
        return upgrade || null;
    }

    rollChestLoot(x, y) {
        const player = this.player;
        if (!window.saveData) {
            window.saveData = {};
        }
        const roll = Math.random();
        let message = '';
        let color = '#ffffff';

        if (roll < 0.35) {
            // Gold
            window.saveData = JSON.parse(JSON.stringify(window.saveData));
            const playerLevel = window.saveData ? window.saveData.level : 1;
            const amount = 20 + Math.floor(Math.random() * 60) + (playerLevel * 5);
            window.saveData.gold = (window.saveData.gold || 0) + amount;
            document.getElementById('hud-gold').innerText = `Gold: ${window.saveData.gold}`;
            message = `+${amount} Gold`;
            color = 0xffd700;
        } else if (roll < 0.50) {
            // Health Potion
            player.inventory.potions = (player.inventory.potions || 0) + 1;
            message = '+1 Health Potion';
            color = 0xff6b6b;
        } else if (roll < 0.65) {
            // Mana Potion
            player.inventory.mpPotions = (player.inventory.mpPotions || 0) + 1;
            message = '+1 Mana Potion';
            color = 0x60a5fa;
        } else if (roll < 0.75) {
            // Stamina Potion
            player.inventory.spPotions = (player.inventory.spPotions || 0) + 1;
            message = '+1 Stamina Potion';
            color = 0x4ade80;
        } else if (roll < 0.85) {
            // Artifact Drop
            const allArtifacts = Object.keys(window.ARTIFACTS_DATA || {});
            const unowned = allArtifacts.filter(key => !player.inventory.artifacts.includes(key));
            if (unowned.length > 0) {
                const randomArt = unowned[Math.floor(Math.random() * unowned.length)];
                player.inventory.artifacts.push(randomArt);
                if (player.inventory.equippedArtifact === -1) {
                    player.inventory.equippedArtifact = 0; // auto-equip first one
                    player.recalculateStats();
                }
                const artDef = window.ARTIFACTS_DATA[randomArt];
                message = `Found Artifact: ${artDef.name}!`;
                color = 0x00ffff;
            } else {
                // Already have all artifacts, fallback to gold
                const amount = 100 + Math.floor(Math.random() * 100);
                window.saveData.gold = (window.saveData.gold || 0) + amount;
                document.getElementById('hud-gold').innerText = `Gold: ${window.saveData.gold}`;
                message = `+${amount} Gold`;
                color = 0xffd700;
            }
        } else {
            // Weapon Upgrade
            const upgrade = this.getNextWeaponUpgrade();
            if (upgrade) {
                player.inventory.weapon = { 
                    key: upgrade.key, 
                    iconSrc: upgrade.imageSrc, 
                    name: upgrade.name, 
                    damageBonus: upgrade.damageBonus, 
                    desc: upgrade.desc 
                };
                message = `Equipped: ${upgrade.name}!`;
                color = 0xda00ff;
            } else {
                // Max level weapon already - give gold
                const amount = 100 + Math.floor(Math.random() * 100);
                window.saveData.gold = (window.saveData.gold || 0) + amount;
                document.getElementById('hud-gold').innerText = `Gold: ${window.saveData.gold}`;
                message = `+${amount} Gold`;
                color = 0xffd700;
            }
        }

        // Save & UI Update
        player.updateInventoryUI();
        player._persistToLocalStorage();
        if (player.scene && player.scene.showFloatingText) {
            player.scene.showFloatingText(x, y - 40, message, color);
        }
    }
}

if (typeof window !== 'undefined') {
    window.ShopManager = ShopManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShopManager;
}
