// src/player/ShopManager_MarketplaceHelper.js - Helper containing offloaded marketplace logic for ShopManager

const ShopManager_MarketplaceHelper = {
    openMarketplaceUI(npcName) {
        const player = this.player;
        const shopUI = document.getElementById('ui-shop');
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
        itemsContainer.className = "flex flex-col gap-4 overflow-y-auto max-h-[60vh] pr-2 w-full";
        
        shopUI.style.display = 'flex';
        shopTitle.innerText = npcName + " - Marketplace";
        itemsContainer.innerHTML = ''; // clear
        
        const currentZone = (saveData && saveData.currentZone) || 0;
        const faction = window.getFactionForZone ? window.getFactionForZone(currentZone) : null;
        const rep = faction ? (window.getFactionReputation ? window.getFactionReputation(faction.id) : 0) : 0;
        if (rep <= -50) {
            itemsContainer.innerHTML = `<div style="color: #ff4444; font-family: monospace; font-size: 14px; text-align: center; padding: 20px; width: 100%;">
                "The Merchant League refuses to deal with a nemesis of the realm. Begone!"
            </div>`;
            return;
        }

        const self = this;
        
        function renderMarketContent() {
            if (!saveData.cargo) saveData.cargo = {};
            const totalCargo = Object.values(saveData.cargo).reduce((a, b) => a + b, 0);
            const playerGold = saveData.gold || 0;
            const currentKingdom = window.getKingdomForZone ? window.getKingdomForZone(currentZone) : null;
            
            itemsContainer.innerHTML = `
                <div class="col-span-full flex flex-col gap-4 w-full text-on-surface">
                    <div class="flex justify-between items-center bg-surface-container-high p-4 rounded border border-outline-variant">
                        <div class="flex flex-col">
                            <span class="text-[14px] font-bold uppercase tracking-wider text-tertiary">📦 International Trade Depot</span>
                            <span class="text-[11px] text-on-surface-variant">Buy local exports cheap, sell them to importing kingdoms for high profits!</span>
                        </div>
                        <span class="text-[16px] font-bold" style="color: #4fc3f7;">Cargo hold: ${totalCargo} / 10 units</span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        <!-- BUYING SECTION -->
                        <div class="flex flex-col gap-3">
                            <h4 class="text-[14px] font-bold text-primary border-b border-outline-variant pb-2 uppercase tracking-wide">Buy Cargo (Local Exports)</h4>
                            <div id="buy-cargo-list" class="flex flex-col gap-2 overflow-y-auto max-h-[40vh] pr-2">
                                <!-- Buy items inserted here -->
                            </div>
                        </div>
                        
                        <!-- SELLING SECTION -->
                        <div class="flex flex-col gap-3">
                            <h4 class="text-[14px] font-bold text-secondary border-b border-outline-variant pb-2 uppercase tracking-wide">Sell Cargo (Your Cargo Hold)</h4>
                            <div id="sell-cargo-list" class="flex flex-col gap-2 overflow-y-auto max-h-[40vh] pr-2">
                                <!-- Sell items inserted here -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const buyContainer = document.getElementById('buy-cargo-list');
            const sellContainer = document.getElementById('sell-cargo-list');
            
            const localExports = currentKingdom ? currentKingdom.exportGoods || [] : [];
            if (localExports.length === 0) {
                buyContainer.innerHTML = `<span class="text-[11px] text-on-surface-variant italic">This kingdom exports no trade goods.</span>`;
            } else {
                localExports.forEach(itemId => {
                    const good = window.TRADE_GOODS[itemId];
                    if (!good) return;
                    
                    const buyPrice = window.getTradePrice(itemId, true, currentZone);
                    const canAfford = playerGold >= buyPrice;
                    const isFull = totalCargo >= 10;
                    
                    const itemRow = document.createElement('div');
                    itemRow.className = `flex justify-between items-center p-3 rounded border border-outline-variant/40 bg-surface-container-highest/40`;
                    itemRow.innerHTML = `
                        <div class="flex flex-col gap-0.5">
                            <span class="text-[12px] font-bold text-on-surface">${good.name}</span>
                            <span class="text-[9px] text-on-surface-variant max-w-[200px] leading-tight">${good.desc}</span>
                            <span class="text-[10px] font-bold text-primary">💰 ${buyPrice}g</span>
                        </div>
                        <button class="px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-colors ${canAfford && !isFull ? 'bg-primary text-on-primary hover:bg-primary-hover' : 'bg-outline-variant/30 text-on-surface-variant/50 cursor-not-allowed'}" id="btn-buy-${itemId}">
                            ${isFull ? 'Full' : 'Buy'}
                        </button>
                    `;
                    buyContainer.appendChild(itemRow);
                    
                    if (canAfford && !isFull) {
                        const btn = document.getElementById(`btn-buy-${itemId}`);
                        if (btn) {
                            btn.onclick = () => {
                                saveData.gold -= buyPrice;
                                saveData.cargo[itemId] = (saveData.cargo[itemId] || 0) + 1;
                                if (player.scene && player.scene.showFloatingText) {
                                    player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `+1 ${good.name}`, 0xFFD700);
                                }
                                if (player.scene && typeof player.scene.spawnCargoCompanion === 'function') {
                                    player.scene.spawnCargoCompanion();
                                }
                                if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
                                if (typeof player._persistToLocalStorage === 'function') {
                                    player._persistToLocalStorage();
                                }
                                renderMarketContent();
                            };
                        }
                    }
                });
            }
            
            // 2. SELL CARGO LIST
            let hasCarried = false;
            for (const itemId in saveData.cargo) {
                const qty = saveData.cargo[itemId] || 0;
                if (qty > 0) {
                    hasCarried = true;
                    const good = window.TRADE_GOODS[itemId];
                    const sellPrice = window.getTradePrice ? window.getTradePrice(itemId, false, currentZone) : 0;
                    
                    // Determine if import demand exists for this good in this biome/kingdom
                    const isImported = currentKingdom && currentKingdom.importGoods && currentKingdom.importGoods.includes(itemId);
                    const demandBadge = isImported ? `<span class="ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-secondary text-on-secondary animate-pulse">Import Demand</span>` : '';
                    
                    const itemRow = document.createElement('div');
                    itemRow.className = `flex justify-between items-center p-3 rounded border border-outline-variant/40 bg-surface-container-highest/40`;
                    itemRow.innerHTML = `
                        <div class="flex flex-col gap-0.5">
                            <div class="flex items-center">
                                <span class="text-[12px] font-bold text-on-surface">${good ? good.name : itemId}</span>
                                ${demandBadge}
                            </div>
                            <span class="text-[9px] text-on-surface-variant max-w-[200px] leading-tight">Carrying: ${qty} units</span>
                            <span class="text-[10px] font-bold text-secondary">💰 ${sellPrice}g / unit</span>
                        </div>
                        <button class="px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-colors bg-secondary text-on-secondary hover:bg-secondary-hover" id="btn-sell-${itemId}">
                            Sell 1
                        </button>
                    `;
                    sellContainer.appendChild(itemRow);
                    
                    const btn = document.getElementById(`btn-sell-${itemId}`);
                    if (btn) {
                        btn.onclick = () => {
                            saveData.gold += sellPrice;
                            saveData.cargo[itemId] = Math.max(0, saveData.cargo[itemId] - 1);
                            if (saveData.cargo[itemId] === 0) delete saveData.cargo[itemId];
                            
                            if (player.scene && player.scene.showFloatingText) {
                                player.scene.showFloatingText(player.sprite.x, player.sprite.y - 40, `-$${sellPrice}g`, 0x00FF00);
                            }
                            if (player.scene && typeof player.scene.spawnCargoCompanion === 'function') {
                                player.scene.spawnCargoCompanion();
                            }
                            if (player.scene && player.scene.updateHUD) player.scene.updateHUD();
                            if (typeof player._persistToLocalStorage === 'function') {
                                player._persistToLocalStorage();
                            }
                            renderMarketContent();
                        };
                    }
                }
            }
            
            if (!hasCarried) {
                sellContainer.innerHTML = `<span class="text-[11px] text-on-surface-variant italic">No trade cargo currently in your caravan hold.</span>`;
            }
        }
        
        renderMarketContent();
        
        const closeBtn = document.getElementById('btn-close-shop');
        closeBtn.onclick = () => {
            player.scene.npcs.forEach(npc => {
                if (npc.isShopOpen) npc.closeShop();
            });
        };
    }
};
