getReputationPriceMultiplier = function() {
    const currentZone = (saveData && saveData.currentZone) || 0;
    const faction = window.getFactionForZone ? window.getFactionForZone(currentZone) : null;
    if (!faction) return 1.0;
    
    const rep = window.getFactionReputation ? window.getFactionReputation(faction.id) : 0;
    if (rep <= -50) return Infinity; // Refuse service
    if (rep <= -20) return 1.25;     // 25% markup
    if (rep < 0) return 1.10;        // 10% markup
    if (rep >= 100) return 0.75;     // 25% discount
    if (rep >= 75) return 0.80;      // 20% discount
    if (rep >= 50) return 0.85;      // 15% discount
    if (rep >= 20) return 0.90;      // 10% discount
    return 1.0;
};

class ShopManager {
    constructor(player) {
        this.player = player;
    }

    openShopUI(shopType, npcName) {
        if (shopType === 'marketplace') {
            return this.openMarketplaceUI(npcName);
        }
        const player = this.player;
        const shopUI = document.getElementById('ui-shop');
        
        shopUI.style.display = 'flex';
        
        // Setup dynamic tab bar for town shops (Phase 11)
        let tabHeader = document.getElementById('shop-tab-bar');
        if (!tabHeader) {
            tabHeader = document.createElement('div');
            tabHeader.id = 'shop-tab-bar';
            tabHeader.className = 'flex items-center gap-4 border-b border-outline-variant pb-2';
            
            const titleBlock = document.getElementById('shop-title').parentElement;
            titleBlock.insertAdjacentElement('afterend', tabHeader);
        }

        const isSafeZone = player.scene.worldManager && player.scene.worldManager.currentZoneData && player.scene.worldManager.currentZoneData.type === 'Safe';
        
        if (isSafeZone) {
            tabHeader.style.display = 'flex';
            tabHeader.innerHTML = `
                <button id="btn-shop-goods" class="px-4 py-1.5 text-[12px] font-bold tracking-widest uppercase border-b-2 border-primary text-primary transition-colors">🛒 Shop Goods</button>
                <button id="btn-shop-cargo" class="px-4 py-1.5 text-[12px] font-bold tracking-widest uppercase border-b-2 border-transparent text-on-surface-variant transition-colors hover:text-primary">📦 Cargo Trade</button>
            `;
            
            const btnGoods = document.getElementById('btn-shop-goods');
            const btnCargo = document.getElementById('btn-shop-cargo');
            
            btnGoods.onclick = () => {
                btnGoods.className = "px-4 py-1.5 text-[12px] font-bold tracking-widest uppercase border-b-2 border-primary text-primary transition-colors";
                btnCargo.className = "px-4 py-1.5 text-[12px] font-bold tracking-widest uppercase border-b-2 border-transparent text-on-surface-variant transition-colors hover:text-primary";
                this.renderStandardShopGoods(shopType, npcName);
            };
            
            btnCargo.onclick = () => {
                btnCargo.className = "px-4 py-1.5 text-[12px] font-bold tracking-widest uppercase border-b-2 border-primary text-primary transition-colors";
                btnGoods.className = "px-4 py-1.5 text-[12px] font-bold tracking-widest uppercase border-b-2 border-transparent text-on-surface-variant transition-colors hover:text-primary";
                this.openMarketplaceUI(npcName);
            };
        } else {
            tabHeader.style.display = 'none';
        }

        // Close btn
        const closeBtn = document.getElementById('btn-close-shop');
        closeBtn.onclick = () => {
            player.scene.npcs.forEach(npc => {
                if (npc.isShopOpen) npc.closeShop();
            });
        };

        this.renderStandardShopGoods(shopType, npcName);
    }

    renderStandardShopGoods(shopType, npcName) {
        const player = this.player;
        const shopTitle = document.getElementById('shop-title');
        
        // Set shop faction emblem
        const emblemEl = document.getElementById('shop-faction-emblem');
        if (emblemEl) {
            const currentZone = (saveData && saveData.currentZone) || 0;
            const kingdomId = window.getKingdomForZone ? window.getKingdomForZone(currentZone) : null;
            const emblemSrc = window.getKingdomEmblemSrc ? window.getKingdomEmblemSrc(kingdomId) : null;
            if (emblemSrc) {
                emblemEl.src = emblemSrc;
                emblemEl.style.display = 'block';
            } else {
                emblemEl.style.display = 'none';
            }
        }

        const itemsContainer = document.getElementById('shop-items-container');
        itemsContainer.className = "grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[60vh] pr-2 w-full";
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
                { key: 'artifact-strength', name: 'Ring of Strength', desc: '+20% Damage', price: 400, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon1.png' },
                { key: 'weapon-crimson-axe', name: 'Crimson War Axe', desc: '+20 Damage', price: 800, type: 'weapon', damageBonus: 20, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'weapon-runic-greataxe', name: 'Runic Greataxe', desc: '+28 Damage', price: 1200, type: 'weapon', damageBonus: 28, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_03.png' },
                { key: 'weapon-dragon-cleaver', name: 'Dragon Cleaver', desc: '+35 Damage', price: 1800, type: 'weapon', damageBonus: 35, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_06.png' },
                { key: 'weapon-worldbreaker', name: 'Worldbreaker', desc: '+45 Damage', price: 3000, type: 'weapon', damageBonus: 45, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_07.png' },
                { key: 'artifact-wooden-buckler', name: 'Wooden Buckler', desc: '5% Damage Reduction', price: 150, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Shields/PixelArt_FantasyWeapons_01_Shield_01.png' },
                { key: 'artifact-iron-shield', name: 'Iron Kite Shield', desc: '12% Damage Reduction', price: 500, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Shields/PixelArt_FantasyWeapons_01_Shield_02.png' },
                { key: 'artifact-crystal-aegis', name: 'Crystal Aegis', desc: '20% DR, +30 Max HP', price: 1200, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Shields/PixelArt_FantasyWeapons_01_Shield_03.png' }
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
                { key: 'artifact-antidote', name: 'Antidote Vial', desc: 'Immunity to Poison', price: 300, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon7.png' },
                { key: 'artifact-autopot', name: 'Elixir of Last Resort', desc: 'Auto-uses HP potion at <30% HP', price: 500, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon15.png' },
                { key: 'weapon-crystal-staff', name: 'Crystal Staff', desc: '+10 Damage', price: 350, type: 'weapon', damageBonus: 10, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_05.png' },
                { key: 'weapon-arcane-scepter', name: 'Arcane Scepter', desc: '+16 Damage', price: 600, type: 'weapon', damageBonus: 16, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_06.png' },
                { key: 'weapon-infernal-staff', name: 'Infernal Staff', desc: '+24 Damage', price: 1000, type: 'weapon', damageBonus: 24, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_03.png' },
                { key: 'weapon-void-staff', name: 'Staff of the Void', desc: '+32 Damage', price: 1600, type: 'weapon', damageBonus: 32, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_04.png' }
            ];
        } else if (shopType === 'ranger') {
            items = [
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', price: 40, type: 'weapon', damageBonus: 3, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'weapon-poison-shiv', name: 'Poisoned Shiv', desc: '+8 Damage', price: 250, type: 'weapon', damageBonus: 8, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_02.png' },
                { key: 'weapon-shortbow', name: 'Shortbow', desc: '+4 Damage', price: 80, type: 'weapon', damageBonus: 4, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_01.png' },
                { key: 'weapon-elven-longbow', name: 'Elven Longbow', desc: '+10 Damage', price: 350, type: 'weapon', damageBonus: 10, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_02.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 10, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
                { key: 'item-fur', name: 'Wolf Pelt', desc: 'Warm fur.', price: 50, type: 'junk', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon45.png' },
                { key: 'weapon-shadow-fang', name: 'Shadow Fang', desc: '+14 Damage', price: 450, type: 'weapon', damageBonus: 14, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_03.png' },
                { key: 'weapon-serpent-blade', name: 'Serpent Blade', desc: '+20 Damage', price: 750, type: 'weapon', damageBonus: 20, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_04.png' },
                { key: 'weapon-voidsteel-tanto', name: 'Voidsteel Tanto', desc: '+28 Damage', price: 1100, type: 'weapon', damageBonus: 28, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_05.png' },
                { key: 'weapon-dragonslayer-katana', name: 'Dragonslayer Katana', desc: '+36 Damage', price: 1700, type: 'weapon', damageBonus: 36, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_10.png' },
                { key: 'weapon-storm-tomahawk', name: 'Storm Tomahawk', desc: '+17 Damage', price: 600, type: 'weapon', damageBonus: 17, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Throwing/PixelArt_FantasyWeapons_01_Throwing_01.png' },
                { key: 'weapon-void-throwing-axe', name: 'Void Throwing Axe', desc: '+24 Damage', price: 950, type: 'weapon', damageBonus: 24, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Throwing/PixelArt_FantasyWeapons_01_Throwing_02.png' },
                { key: 'weapon-phoenix-shuriken', name: 'Phoenix Shuriken', desc: '+32 Damage', price: 1400, type: 'weapon', damageBonus: 32, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Throwing/PixelArt_FantasyWeapons_01_Throwing_03.png' }
            ];
        } else if (shopType === 'wizard') {
            items = [
                { key: 'item-potion', name: 'Health Potion', desc: 'Restores 50 HP', price: 25, type: 'potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Healing Sheet.png' },
                { key: 'item-mp-potion', name: 'Mana Potion', desc: 'Restores 50 MP', price: 25, type: 'mp_potion', isSpritesheet: true, imageSrc: 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Mana Sheet.png' },
                { key: 'weapon-stick', name: 'Oak Wand', desc: '+2 Damage', price: 60, type: 'weapon', damageBonus: 2, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_01.png' },
                { key: 'weapon-crystal-staff', name: 'Crystal Staff', desc: '+10 Damage', price: 350, type: 'weapon', damageBonus: 10, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_05.png' },
                { key: 'weapon-arcane-scepter', name: 'Arcane Scepter', desc: '+16 Damage', price: 600, type: 'weapon', damageBonus: 16, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_06.png' },
                { key: 'weapon-infernal-staff', name: 'Infernal Staff', desc: '+24 Damage', price: 1000, type: 'weapon', damageBonus: 24, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_03.png' },
                { key: 'weapon-void-staff', name: 'Staff of the Void', desc: '+32 Damage', price: 1600, type: 'weapon', damageBonus: 32, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_04.png' }
            ];
        } else if (shopType === 'samurai') {
            items = [
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', price: 50, type: 'weapon', damageBonus: 3, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 15, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
                { key: 'weapon-shadow-fang', name: 'Shadow Fang', desc: '+14 Damage', price: 450, type: 'weapon', damageBonus: 14, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_03.png' },
                { key: 'weapon-serpent-blade', name: 'Serpent Blade', desc: '+20 Damage', price: 750, type: 'weapon', damageBonus: 20, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_04.png' },
                { key: 'weapon-voidsteel-tanto', name: 'Voidsteel Tanto', desc: '+28 Damage', price: 1100, type: 'weapon', damageBonus: 28, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_05.png' },
                { key: 'weapon-dragonslayer-katana', name: 'Dragonslayer Katana', desc: '+36 Damage', price: 1700, type: 'weapon', damageBonus: 36, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_10.png' }
            ];
        } else if (shopType === 'knight') {
            items = [
                { key: 'weapon-bronze-sword', name: 'Bronze Sword', desc: '+2 Damage', price: 60, type: 'weapon', damageBonus: 2, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 15, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
                { key: 'weapon-iron-sword', name: 'Iron Broadsword', desc: '+5 Damage', price: 150, type: 'weapon', damageBonus: 5, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_02.png' },
                { key: 'weapon-gold-sword', name: 'Golden Longsword', desc: '+8 Damage', price: 300, type: 'weapon', damageBonus: 8, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_03.png' }
            ];
        }

        // Concat the new batch of 100 items dynamically
        if (window.getNewItemsForShop) {
            items = items.concat(window.getNewItemsForShop(shopType));
        }

        // Filter items: only show generic items, items meant for the current class, or companion classes in the party
        items = items.filter(item => {
            if (!item.classRestrict) return true;
            if (item.classRestrict === player.classData.id || (player.classData.id && player.classData.id.startsWith(item.classRestrict))) return true;
            if ((player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') && 
                (item.classRestrict === 'knight' || item.classRestrict === 'samurai')) {
                return true;
            }
            const party = player.scene.partyMembers || [];
            const companionCanUse = party.some(member => 
                item.classRestrict === member.classData.id || (member.classData.id && member.classData.id.startsWith(item.classRestrict))
            );
            if (companionCanUse) return true;
            return false;
        });

        // Apply Alignment Price Multiplier
        let multiplier = 1.0;
        let suffix = '';
        
        if (player.scene.zoneBiome === 'Heaven') {
            multiplier = 0.2; // 80% discount
            suffix = ' (Celestial Discount)';
        } else {
            // Find NPC to get their alignment
            const npcObj = player.scene.npcs.find(n => n.npcName === npcName);
            const npcAlignment = npcObj ? npcObj.alignment : 'Neutral';
            
            // Categorize player's alignment
            let playerAlignType = 'Neutral';
            if (player.alignment >= 10) playerAlignType = 'Good';
            else if (player.alignment <= -10) playerAlignType = 'Evil';
            
            if (npcAlignment === 'Good') {
                if (playerAlignType === 'Good') {
                    multiplier = 0.8; // Match! 20% discount
                    suffix = ' (Good - Trusted Discount)';
                } else if (playerAlignType === 'Evil') {
                    multiplier = 1.5; // Mismatch! 50% markup
                    suffix = ' (Good - Hostile Markup)';
                } else {
                    suffix = ' (Good)';
                }
            } else if (npcAlignment === 'Evil') {
                if (playerAlignType === 'Evil') {
                    multiplier = 0.8; // Match! 20% discount
                    suffix = ' (Evil - Syndicate Discount)';
                } else if (playerAlignType === 'Good') {
                    multiplier = 1.5; // Mismatch! 50% markup
                    suffix = ' (Evil - Hostile Markup)';
                } else {
                    suffix = ' (Evil)';
                }
            } else { // Neutral NPC
                if (playerAlignType === 'Good') {
                    multiplier = 0.9; // Good guys get slight discount (10%)
                    suffix = ' (Neutral - Friendly Discount)';
                } else if (playerAlignType === 'Evil') {
                    multiplier = 1.1; // Evil guys get slight markup (10%)
                    suffix = ' (Neutral - Shady Markup)';
                } else {
                    suffix = ' (Neutral)';
                }
            }
        }
        
        let factionMultiplier = 1.0;
        if (getReputationPriceMultiplier) {
            factionMultiplier = getReputationPriceMultiplier();
        }
        
        if (factionMultiplier === Infinity) {
            if (shopTitle) {
                shopTitle.innerText = npcName + " (Refuses to trade!)";
            }
            itemsContainer.innerHTML = `<div style="color: #ff4444; font-family: monospace; font-size: 14px; text-align: center; padding: 20px; width: 100%;">
                "Begone, enemy of the Realm! I will not sell to you."
            </div>`;
            return;
        }
        
        // Merchant's Ledger (15% discount)
        if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
            const artKey = player.inventory.artifacts[player.inventory.equippedArtifact];
            if (artKey === 'artifact-merchant-purse') {
                multiplier *= 0.85;
            }
        }

        multiplier *= factionMultiplier;
        
        if (shopTitle) {
            shopTitle.innerText = npcName + suffix;
        }
        
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
            } else if (itemSrc.includes('PixelArt_FantasyWeapons_01') || itemSrc.includes('items/')) {
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
                const party = player.scene.partyMembers || [];
                const companionCanUse = party.some(member => 
                    item.classRestrict === member.classData.id || (member.classData.id && member.classData.id.startsWith(item.classRestrict))
                );
                const canUseThis = item.classRestrict === player.classData.id || (player.classData.id && player.classData.id.startsWith(item.classRestrict)) || 
                                  ((player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') && 
                                   (item.classRestrict === 'knight' || item.classRestrict === 'samurai')) ||
                                  companionCanUse;
                const color = canUseThis ? 'text-primary' : 'text-error';
                classBadge = `<br><span class="${color} font-bold">[${item.classRestrict.toUpperCase()}]</span>`;
            }

            const isArtifactOwned = item.type === 'artifact' && player.inventory.artifacts && player.inventory.artifacts.includes(item.key);
            const isWeaponEquipped = item.type === 'weapon' && player.inventory.weapon && player.inventory.weapon.key === item.key;
            const isOwned = isArtifactOwned || isWeaponEquipped;

            const priceText = isOwned ? '<span class="text-primary font-headline-sm font-bold uppercase tracking-wider">Owned</span>' : `${item.price}g`;

            const btnHtml = `
                <div class="bg-surface-container-highest border border-outline-variant p-4 flex flex-col items-center gap-2 rounded hover:border-primary transition-colors cursor-pointer" id="shop-item-${idx}">
                    <div class="mb-2" style="width: 48px; height: 48px; overflow: hidden; display: flex; justify-content: center; align-items: center;">
                        <div style="width: ${frameW}px; height: ${frameH}px; background-image: url('${itemSrc}'); background-repeat: no-repeat; image-rendering: pixelated; transform-origin: center; ${extraStyle}"></div>
                    </div>
                    <div class="font-label-caps text-[12px] text-on-surface font-bold text-center">${item.name}</div>
                    <div class="font-body-sm text-[10px] text-on-surface-variant text-center h-8">${item.desc}${classBadge}</div>
                    <div class="font-headline-sm text-secondary font-bold text-[14px] mt-2">${priceText}</div>
                </div>
            `;
            itemsContainer.insertAdjacentHTML('beforeend', btnHtml);
            
            // Wait for DOM update
            setTimeout(() => {
                const el = document.getElementById(`shop-item-${idx}`);
                if (el) {
                    if (isOwned) {
                        el.style.opacity = '0.6';
                        el.style.cursor = 'default';
                        el.classList.remove('hover:border-primary', 'cursor-pointer');
                        el.onclick = null;
                    } else {
                        el.onclick = () => player.buyItem(item);
                    }
                }
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

openMarketplaceUI(npcName) {
    return ShopManager_MarketplaceHelper.openMarketplaceUI.call(this, npcName);
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
                { key: 'artifact-autopot', name: 'Elixir of Last Resort', desc: 'Auto-uses HP potion at <30% HP', price: 500, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/48 Magic Artifacts Pixel Art Icons/PNG/Transperent/Icon15.png' },
                // ranger
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', price: 40, type: 'weapon', damageBonus: 3, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'weapon-poison-shiv', name: 'Poisoned Shiv', desc: '+8 Damage', price: 250, type: 'weapon', damageBonus: 8, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_02.png' },
                { key: 'weapon-shortbow', name: 'Shortbow', desc: '+4 Damage', price: 80, type: 'weapon', damageBonus: 4, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_01.png' },
                { key: 'weapon-elven-longbow', name: 'Elven Longbow', desc: '+10 Damage', price: 350, type: 'weapon', damageBonus: 10, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_02.png' },
                { key: 'item-meat', name: 'Boar Meat', desc: 'Restores 20 HP', price: 10, type: 'meat', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon31.png' },
                { key: 'item-fur', name: 'Wolf Pelt', desc: 'Warm fur.', price: 50, type: 'junk', isSpritesheet: false, imageSrc: 'src/assets/GandalfHardcore Icons/GandalfHardcore Icons/16x16 Icon45.png' },
                // expanded weapons - knight
                { key: 'weapon-crimson-axe', name: 'Crimson War Axe', desc: '+20 Damage', price: 800, type: 'weapon', damageBonus: 20, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'weapon-runic-greataxe', name: 'Runic Greataxe', desc: '+28 Damage', price: 1200, type: 'weapon', damageBonus: 28, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_03.png' },
                { key: 'weapon-dragon-cleaver', name: 'Dragon Cleaver', desc: '+35 Damage', price: 1800, type: 'weapon', damageBonus: 35, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_06.png' },
                { key: 'weapon-worldbreaker', name: 'Worldbreaker', desc: '+45 Damage', price: 3000, type: 'weapon', damageBonus: 45, classRestrict: 'knight', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_07.png' },
                // expanded weapons - wizard
                { key: 'weapon-crystal-staff', name: 'Crystal Staff', desc: '+10 Damage', price: 350, type: 'weapon', damageBonus: 10, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_05.png' },
                { key: 'weapon-arcane-scepter', name: 'Arcane Scepter', desc: '+16 Damage', price: 600, type: 'weapon', damageBonus: 16, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_06.png' },
                { key: 'weapon-infernal-staff', name: 'Infernal Staff', desc: '+24 Damage', price: 1000, type: 'weapon', damageBonus: 24, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_03.png' },
                { key: 'weapon-void-staff', name: 'Staff of the Void', desc: '+32 Damage', price: 1600, type: 'weapon', damageBonus: 32, classRestrict: 'wizard', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_04.png' },
                // expanded weapons - samurai
                { key: 'weapon-shadow-fang', name: 'Shadow Fang', desc: '+14 Damage', price: 450, type: 'weapon', damageBonus: 14, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_03.png' },
                { key: 'weapon-serpent-blade', name: 'Serpent Blade', desc: '+20 Damage', price: 750, type: 'weapon', damageBonus: 20, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_04.png' },
                { key: 'weapon-voidsteel-tanto', name: 'Voidsteel Tanto', desc: '+28 Damage', price: 1100, type: 'weapon', damageBonus: 28, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_05.png' },
                { key: 'weapon-dragonslayer-katana', name: 'Dragonslayer Katana', desc: '+36 Damage', price: 1700, type: 'weapon', damageBonus: 36, classRestrict: 'samurai', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_10.png' },
                // expanded weapons - ranger
                { key: 'weapon-storm-tomahawk', name: 'Storm Tomahawk', desc: '+17 Damage', price: 600, type: 'weapon', damageBonus: 17, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Throwing/PixelArt_FantasyWeapons_01_Throwing_01.png' },
                { key: 'weapon-void-throwing-axe', name: 'Void Throwing Axe', desc: '+24 Damage', price: 950, type: 'weapon', damageBonus: 24, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Throwing/PixelArt_FantasyWeapons_01_Throwing_02.png' },
                { key: 'weapon-phoenix-shuriken', name: 'Phoenix Shuriken', desc: '+32 Damage', price: 1400, type: 'weapon', damageBonus: 32, classRestrict: 'ranger', imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Throwing/PixelArt_FantasyWeapons_01_Throwing_03.png' },
                // shield artifacts
                { key: 'artifact-wooden-buckler', name: 'Wooden Buckler', desc: '5% Damage Reduction', price: 150, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Shields/PixelArt_FantasyWeapons_01_Shield_01.png' },
                { key: 'artifact-iron-shield', name: 'Iron Kite Shield', desc: '12% Damage Reduction', price: 500, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Shields/PixelArt_FantasyWeapons_01_Shield_02.png' },
                { key: 'artifact-crystal-aegis', name: 'Crystal Aegis', desc: '20% DR, +30 Max HP', price: 1200, type: 'artifact', isSpritesheet: false, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Shields/PixelArt_FantasyWeapons_01_Shield_03.png' }
            ];
            if (window.NEW_ITEMS_DATA) {
                allItems = allItems.concat(window.NEW_ITEMS_DATA);
            }
            itemObj = allItems.find(i => i.key === item) || { key: item, price: 0, type: 'unknown' };
            if (player.scene.zoneBiome === 'Heaven') {
                itemObj.price = Math.max(1, Math.round(itemObj.price * 0.2));
            }
        }

        const party = player.scene.partyMembers || [];
        const companionCanUse = party.some(member => 
            itemObj.classRestrict === member.classData.id || (member.classData.id && member.classData.id.startsWith(itemObj.classRestrict))
        );
        const canUse = !itemObj.classRestrict || 
                      itemObj.classRestrict === player.classData.id || 
                      ((player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') && 
                       (itemObj.classRestrict === 'knight' || itemObj.classRestrict === 'samurai')) ||
                      companionCanUse;
        if (!canUse) {
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

        let finalPrice = itemObj.price;
        if (typeof item === 'string') {
            let mult = 1.0;
            if (player.scene.zoneBiome === 'Heaven') {
                mult = 0.2;
            } else {
                // Find NPC to get alignment
                const openShopNpc = player.scene.npcs.find(n => n.isShopOpen);
                if (openShopNpc) {
                    const playerAlignType = player.alignment >= 10 ? 'Good' : (player.alignment <= -10 ? 'Evil' : 'Neutral');
                    if (openShopNpc.alignment === 'Good') {
                        if (playerAlignType === 'Good') mult = 0.8;
                        else if (playerAlignType === 'Evil') mult = 1.5;
                    } else if (openShopNpc.alignment === 'Evil') {
                        if (playerAlignType === 'Evil') mult = 0.8;
                        else if (playerAlignType === 'Good') mult = 1.5;
                    } else {
                        if (playerAlignType === 'Good') mult = 0.9;
                        else if (playerAlignType === 'Evil') mult = 1.1;
                    }
                }
            }
            
            let factionMultiplier = 1.0;
            if (getReputationPriceMultiplier) {
                factionMultiplier = getReputationPriceMultiplier();
            }
            if (factionMultiplier === Infinity) return; // Nemesis cannot buy
            
            // Merchant's Ledger (15% discount)
            if (player.inventory && player.inventory.artifacts && player.inventory.equippedArtifact >= 0) {
                const artKey = player.inventory.artifacts[player.inventory.equippedArtifact];
                if (artKey === 'artifact-merchant-purse') {
                    mult *= 0.85;
                }
            }

            mult *= factionMultiplier;
            finalPrice = Math.max(1, Math.round(itemObj.price * mult));
        }

        if (saveData) {
            saveData = JSON.parse(JSON.stringify(saveData));
        }
        if (!saveData) saveData = { gold: 0 };
        if (saveData.gold === undefined || isNaN(saveData.gold)) saveData.gold = 0;

        if (saveData.gold < finalPrice) {
            // Flash red for insufficient funds
            const ui = document.getElementById('hud-gold');
            if(ui) {
                ui.classList.add('text-error');
                setTimeout(() => ui.classList.remove('text-error'), 300);
            }
            return;
        }

        // Deduct gold
        saveData.gold -= finalPrice;
        const goldEl = document.getElementById('hud-gold');
        if(goldEl) goldEl.innerText = `Gold: ${saveData.gold}`;

        // Apply item effect
        if (itemObj.type === 'weapon') {
            player.inventory.weapons = player.inventory.weapons || [];
            const weaponData = { 
                key: itemObj.key, 
                iconSrc: itemObj.imageSrc, 
                name: itemObj.name, 
                damageBonus: itemObj.damageBonus, 
                desc: itemObj.desc 
            };
            if (itemObj.classRestrict) {
                weaponData.classRestrict = itemObj.classRestrict;
            }
            if (!player.inventory.weapons.some(w => w.key === itemObj.key)) {
                player.inventory.weapons.push(weaponData);
            }
            // Only auto-equip on the player if the player's class can use it!
            const playerCanUse = !itemObj.classRestrict || 
                                 itemObj.classRestrict === player.classData.id || 
                                 (player.classData.id && player.classData.id.startsWith(itemObj.classRestrict)) ||
                                 ((player.classData.id === 'elven_spellblade' || player.classData.id === 'elven_spellblade_rival') && 
                                  (itemObj.classRestrict === 'knight' || itemObj.classRestrict === 'samurai'));
            if (playerCanUse) {
                player.inventory.weapon = weaponData;
            }
        } else if (itemObj.type === 'potion' || itemObj.type === 'mp_potion' || itemObj.type === 'sp_potion') {
            if (itemObj.buff) {
                player.inventory.miscPotions = (player.inventory.miscPotions || 0) + 1;
                player.inventory.miscPotionList = player.inventory.miscPotionList || [];
                player.inventory.miscPotionList.push({
                    key: itemObj.key,
                    name: itemObj.name,
                    imageSrc: itemObj.imageSrc,
                    hpRestore: itemObj.hpRestore || 0,
                    mpRestore: itemObj.mpRestore || 0,
                    spRestore: itemObj.spRestore || 0,
                    buff: itemObj.buff
                });
            } else if (itemObj.type === 'potion') {
                player.inventory.potions++;
                player.inventory.potionList = player.inventory.potionList || [];
                player.inventory.potionList.push({
                    key: itemObj.key,
                    name: itemObj.name,
                    imageSrc: itemObj.imageSrc,
                    hpRestore: itemObj.hpRestore !== undefined ? itemObj.hpRestore : 50,
                    mpRestore: itemObj.mpRestore || 0,
                    spRestore: itemObj.spRestore || 0,
                    buff: null
                });
            } else if (itemObj.type === 'mp_potion') {
                player.inventory.mpPotions = (player.inventory.mpPotions || 0) + 1;
                player.inventory.mpPotionList = player.inventory.mpPotionList || [];
                player.inventory.mpPotionList.push({
                    key: itemObj.key,
                    name: itemObj.name,
                    imageSrc: itemObj.imageSrc,
                    hpRestore: 0,
                    mpRestore: itemObj.mpRestore !== undefined ? itemObj.mpRestore : 50,
                    spRestore: 0,
                    buff: null
                });
            } else if (itemObj.type === 'sp_potion') {
                player.inventory.spPotions = (player.inventory.spPotions || 0) + 1;
                player.inventory.spPotionList = player.inventory.spPotionList || [];
                player.inventory.spPotionList.push({
                    key: itemObj.key,
                    name: itemObj.name,
                    imageSrc: itemObj.imageSrc,
                    hpRestore: 0,
                    mpRestore: 0,
                    spRestore: itemObj.spRestore !== undefined ? itemObj.spRestore : 50,
                    buff: null
                });
            }
        } else if (itemObj.type === 'meat') {
            player.inventory.meat = (player.inventory.meat || 0) + 1;
            player.inventory.meatList = player.inventory.meatList || [];
            player.inventory.meatList.push({
                key: itemObj.key,
                name: itemObj.name,
                hpRestore: itemObj.hpRestore !== undefined ? itemObj.hpRestore : 20,
                mpRestore: itemObj.mpRestore || 0,
                spRestore: itemObj.spRestore || 0,
                buff: itemObj.buff || null
            });
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
                saveData.gold += itemObj.price; // refund
                if(goldEl) goldEl.innerText = `Gold: ${saveData.gold}`;
            }
        } else if (itemObj.type === 'chest') {
            // Random reward
            const roll = Math.random();
            if (roll < 0.5) {
                // Gold
                const reward = 50 + Math.floor(Math.random() * 100);
                saveData.gold += reward;
                if(goldEl) goldEl.innerText = `Gold: ${saveData.gold}`;
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
        if (typeof player._persistToLocalStorage === 'function') {
            player._persistToLocalStorage();
        }
    }

    getNextWeaponUpgrade() {
        const player = this.player;
        const classId = player.classData.id;
        let chain = [];
        if (classId === 'knight' || classId === 'warrior' || classId === 'elven_spellblade' || classId === 'elven_spellblade_rival') {
            chain = [
                { key: 'weapon-bronze-sword', name: 'Bronze Sword', desc: '+2 Damage', damageBonus: 2, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_05.png' },
                { key: 'weapon-iron-sword', name: 'Iron Broadsword', desc: '+5 Damage', damageBonus: 5, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_02.png' },
                { key: 'weapon-gold-sword', name: 'Golden Longsword', desc: '+8 Damage', damageBonus: 8, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_03.png' },
                { key: 'weapon-diamond-sword', name: 'Obsidian Blade', desc: '+15 Damage', damageBonus: 15, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_04.png' },
                { key: 'weapon-crimson-axe', name: 'Crimson War Axe', desc: '+20 Damage', damageBonus: 20, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_01.png' },
                { key: 'weapon-runic-greataxe', name: 'Runic Greataxe', desc: '+28 Damage', damageBonus: 28, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_03.png' },
                { key: 'weapon-dragon-cleaver', name: 'Dragon Cleaver', desc: '+35 Damage', damageBonus: 35, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_06.png' },
                { key: 'weapon-worldbreaker', name: 'Worldbreaker', desc: '+45 Damage', damageBonus: 45, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_07.png' }
            ];
        } else if (classId === 'wizard') {
            chain = [
                { key: 'weapon-stick', name: 'Oak Wand', desc: '+2 Damage', damageBonus: 2, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_01.png' },
                { key: 'weapon-staff', name: 'Adept Staff', desc: '+5 Damage', damageBonus: 5, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_02.png' },
                { key: 'weapon-crystal-staff', name: 'Crystal Staff', desc: '+10 Damage', damageBonus: 10, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_05.png' },
                { key: 'weapon-arcane-scepter', name: 'Arcane Scepter', desc: '+16 Damage', damageBonus: 16, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_06.png' },
                { key: 'weapon-infernal-staff', name: 'Infernal Staff', desc: '+24 Damage', damageBonus: 24, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_03.png' },
                { key: 'weapon-void-staff', name: 'Staff of the Void', desc: '+32 Damage', damageBonus: 32, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Staves/PixelArt_FantasyWeapons_01_Staff_04.png' }
            ];
        } else if (classId === 'samurai') {
            chain = [
                { key: 'weapon-iron-dagger', name: 'Iron Dagger', desc: '+3 Damage', damageBonus: 3, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_01.png' },
                { key: 'weapon-poison-shiv', name: 'Poisoned Shiv', desc: '+8 Damage', damageBonus: 8, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_02.png' },
                { key: 'weapon-shadow-fang', name: 'Shadow Fang', desc: '+14 Damage', damageBonus: 14, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_03.png' },
                { key: 'weapon-serpent-blade', name: 'Serpent Blade', desc: '+20 Damage', damageBonus: 20, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_04.png' },
                { key: 'weapon-voidsteel-tanto', name: 'Voidsteel Tanto', desc: '+28 Damage', damageBonus: 28, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Daggers/PixelArt_FantasyWeapons_01_Dagger_05.png' },
                { key: 'weapon-dragonslayer-katana', name: 'Dragonslayer Katana', desc: '+36 Damage', damageBonus: 36, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_10.png' }
            ];
        } else if (classId === 'ranger') {
            chain = [
                { key: 'weapon-shortbow', name: 'Shortbow', desc: '+4 Damage', damageBonus: 4, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_01.png' },
                { key: 'weapon-elven-longbow', name: 'Elven Longbow', desc: '+10 Damage', damageBonus: 10, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Ranged/PixelArt_FantasyWeapons_01_Ranged_02.png' },
                { key: 'weapon-storm-tomahawk', name: 'Storm Tomahawk', desc: '+17 Damage', damageBonus: 17, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Throwing/PixelArt_FantasyWeapons_01_Throwing_01.png' },
                { key: 'weapon-void-throwing-axe', name: 'Void Throwing Axe', desc: '+24 Damage', damageBonus: 24, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Throwing/PixelArt_FantasyWeapons_01_Throwing_02.png' },
                { key: 'weapon-phoenix-shuriken', name: 'Phoenix Shuriken', desc: '+32 Damage', damageBonus: 32, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/Throwing/PixelArt_FantasyWeapons_01_Throwing_03.png' }
            ];
        }


        const currentBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
        const upgrade = chain.find(w => w.damageBonus > currentBonus);
        return upgrade || null;
    }

    rollChestLoot(x, y) {
        const player = this.player;
        if (!saveData) {
            saveData = {};
        }

        // Calculate passive skill modifiers
        const passives = player.passiveSkills || ( saveData ? (saveData.passiveSkills || {}) : {} );
        const activeModifiers = {};
        for (const skillId in passives) {
            const rank = passives[skillId] || 0;
            if (rank > 0 && PASSIVE_SKILLS_DATA) {
                const skillDef = PASSIVE_SKILLS_DATA.find(s => s.id === skillId);
                if (skillDef && skillDef.statsModifiers) {
                    for (const statKey in skillDef.statsModifiers) {
                        const val = skillDef.statsModifiers[statKey];
                        if (statKey.toLowerCase().includes('multiplier')) {
                            const delta = val - 1;
                            activeModifiers[statKey] = (activeModifiers[statKey] || 0) + delta * rank;
                        } else {
                            activeModifiers[statKey] = (activeModifiers[statKey] || 0) + val * rank;
                        }
                    }
                }
            }
        }

        const rawRoll = Math.random();
        // Shift roll upward based on Luck & magic find to favor rare artifacts (0.70-0.80) & weapons (0.80-1.0)
        const luckValue = player.luck !== undefined ? player.luck : 10;
        const magicFindBoost = ((luckValue - 10) * 0.005) + (activeModifiers.magic_find_mult_per_rank || 0);
        const roll = Math.min(0.99, rawRoll + magicFindBoost);

        let message = '';
        let color = '#ffffff';

        if (roll < 0.30) {
            // Gold
            saveData = JSON.parse(JSON.stringify(saveData));
            const playerLevel = saveData ? saveData.level : 1;
            const zoneIdx = saveData ? Math.abs(saveData.currentZone || 0) : 0;
            const baseAmount = 20 + Math.floor(Math.random() * 60) + (playerLevel * 5) + (zoneIdx * 15);
            
            // Scale gold with Luck and Hoarder's Instinct
            const goldMult = 1.0 + ((luckValue - 10) * 0.02) + (activeModifiers.gold_gain_mult_per_rank || 0);
            const amount = Math.floor(baseAmount * goldMult);

            saveData.gold = (saveData.gold || 0) + amount;
            document.getElementById('hud-gold').innerText = `Gold: ${saveData.gold}`;
            message = `+${amount} Gold`;
            color = 0xffd700;
        } else if (roll < 0.45) {
            // Health Potion
            const zoneIdx = saveData ? Math.abs(saveData.currentZone || 0) : 0;
            const qty = 1 + Math.floor(zoneIdx / 15);
            player.inventory.potions = (player.inventory.potions || 0) + qty;
            message = `+${qty} Health Potion${qty > 1 ? 's' : ''}`;
            color = 0xff6b6b;
        } else if (roll < 0.60) {
            // Mana Potion
            const zoneIdx = saveData ? Math.abs(saveData.currentZone || 0) : 0;
            const qty = 1 + Math.floor(zoneIdx / 15);
            player.inventory.mpPotions = (player.inventory.mpPotions || 0) + qty;
            message = `+${qty} Mana Potion${qty > 1 ? 's' : ''}`;
            color = 0x60a5fa;
        } else if (roll < 0.70) {
            // Stamina Potion
            const zoneIdx = saveData ? Math.abs(saveData.currentZone || 0) : 0;
            const qty = 1 + Math.floor(zoneIdx / 15);
            player.inventory.spPotions = (player.inventory.spPotions || 0) + qty;
            message = `+${qty} Stamina Potion${qty > 1 ? 's' : ''}`;
            color = 0x4ade80;
        } else if (roll < 0.80) {
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
                saveData.gold = (saveData.gold || 0) + amount;
                document.getElementById('hud-gold').innerText = `Gold: ${saveData.gold}`;
                message = `+${amount} Gold`;
                color = 0xffd700;
            }
        } else if (roll < 0.90) {
            // Weapon Upgrade (Class Specific)
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
                saveData.gold = (saveData.gold || 0) + amount;
                document.getElementById('hud-gold').innerText = `Gold: ${saveData.gold}`;
                message = `+${amount} Gold`;
                color = 0xffd700;
            }
        } else {
            // Universal Loot Weapon
            const lootWeapons = [
                { weight: 100, key: 'loot-rusty-mace', name: 'Rusty Mace', damageBonus: 6, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_06.png', color: '#ffffff' },
                { weight: 100, key: 'loot-iron-flail', name: 'Iron Flail', damageBonus: 8, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_07.png', color: '#ffffff' },
                { weight: 100, key: 'loot-spiked-club', name: 'Spiked Club', damageBonus: 10, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_08.png', color: '#ffffff' },
                { weight: 100, key: 'loot-steel-mace', name: 'Steel Mace', damageBonus: 12, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_09.png', color: '#ffffff' },
                
                { weight: 50, key: 'loot-scimitar', name: 'Curved Scimitar', damageBonus: 15, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_11.png', color: '#1eff00' },
                { weight: 50, key: 'loot-desert-hook', name: 'Desert Hook', damageBonus: 17, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_12.png', color: '#1eff00' },
                { weight: 50, key: 'loot-morningstar', name: 'Heavy Morningstar', damageBonus: 20, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_13.png', color: '#1eff00' },
                
                { weight: 20, key: 'loot-crystal-mace', name: 'Crystal Mace', damageBonus: 25, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_14.png', color: '#0070dd' },
                { weight: 20, key: 'loot-golden-flail', name: 'Golden Flail', damageBonus: 28, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_15.png', color: '#0070dd' },
                { weight: 20, key: 'loot-barbarian-hammer', name: 'Barbarian Hammer', damageBonus: 32, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_02.png', color: '#0070dd' },
                
                { weight: 5, key: 'loot-demonic-mace', name: 'Demonic Mace', damageBonus: 40, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_16.png', color: '#a335ee' },
                { weight: 5, key: 'loot-skullcrusher', name: 'Skullcrusher', damageBonus: 45, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_04.png', color: '#a335ee' },
                { weight: 5, key: 'loot-titans-maul', name: 'Titan\'s Maul', damageBonus: 50, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_05.png', color: '#a335ee' },
                
                { weight: 1, key: 'loot-sunfire-flail', name: 'Sunfire Flail', damageBonus: 60, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/OneHanded/PixelArt_FantasyWeapons_01_OneHand_17.png', color: '#ff8000' },
                { weight: 1, key: 'loot-voidhammer', name: 'Voidhammer', damageBonus: 65, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_08.png', color: '#ff8000' },
                { weight: 1, key: 'loot-starfall-cleaver', name: 'Starfall Cleaver', damageBonus: 70, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_09.png', color: '#ff8000' },
                { weight: 1, key: 'loot-heavens-blade', name: 'Blade of the Heavens', damageBonus: 75, imageSrc: 'src/assets/PixelArt_FantasyWeapons_01/PixelArt_FantasyWeapons_01/TwoHanded/PixelArt_FantasyWeapons_01_TwoHanded_10.png', color: '#ff8000' }
            ];

            const totalWeight = lootWeapons.reduce((sum, w) => sum + w.weight, 0);
            let randomWeight = Math.random() * totalWeight;
            let droppedWeapon = lootWeapons[0];
            for (const w of lootWeapons) {
                if (randomWeight < w.weight) {
                    droppedWeapon = w;
                    break;
                }
                randomWeight -= w.weight;
            }

            const currentBonus = player.inventory && player.inventory.weapon ? player.inventory.weapon.damageBonus : 0;
            if (droppedWeapon.damageBonus > currentBonus) {
                player.inventory.weapon = {
                    key: droppedWeapon.key,
                    iconSrc: droppedWeapon.imageSrc,
                    name: droppedWeapon.name,
                    damageBonus: droppedWeapon.damageBonus,
                    desc: `+${droppedWeapon.damageBonus} Damage`
                };
                message = `Found: ${droppedWeapon.name}!`;
                color = parseInt(droppedWeapon.color.replace('#', '0x'));
            } else {
                const amount = 100 + (droppedWeapon.damageBonus * 10);
                saveData.gold = (saveData.gold || 0) + amount;
                document.getElementById('hud-gold').innerText = `Gold: ${saveData.gold}`;
                message = `Sold ${droppedWeapon.name} (+${amount}g)`;
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
