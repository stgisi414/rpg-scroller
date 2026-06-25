const puppeteer = require('puppeteer');

async function run() {
    console.log("=== STARTING FEATURE VERIFICATION ===");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    await page.evaluateOnNewDocument(() => {
        window.prompt = () => '';
        window.alert = () => {};
        window.confirm = () => true;
        try { localStorage.clear(); } catch (e) {}
    });

    page.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
    page.on('console', msg => {
        console.log('[PAGE CONSOLE]', msg.text());
    });

    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 20000 });
    
    // Start game in Safe Zone (Town)
    console.log("Starting game in town (zone 0)...");
    await page.evaluate(() => {
        window.startGame({
            id: 'verify-test', name: 'VerifyBot', classId: 'knight', level: 1,
            playTime: 0, lastSaved: Date.now(), isNewGame: false, currentZone: 0,
            alignment: 0, gold: 1000
        });
    });

    // Wait for game scene and NPCs to load
    await page.waitForFunction(() => {
        const s = window.game && window.game.scene && window.game.scene.scenes[0];
        return s && s.npcs && s.npcs.length > 0;
    }, { timeout: 30000 });

    console.log("Game loaded. Giving it 3 seconds to settle...");
    await new Promise(r => setTimeout(r, 3000));

    // Retrieve state from the page
    const report = await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        
        // 1. Verify animations exist in Phaser anims registry
        const animsExist = {
            emoji_happy: s.anims.exists('emoji_happy'),
            emoji_neutral: s.anims.exists('emoji_neutral'),
            emoji_sad: s.anims.exists('emoji_sad'),
            emoji_angry: s.anims.exists('emoji_angry'),
            emoji_love: s.anims.exists('emoji_love')
        };

        // 2. Verify NPC alignments are initialized
        const npcs = s.npcs.map(n => ({
            name: n.npcName,
            alignment: n.alignment,
            socialScore: n.socialScore,
            npcId: n.npcId,
            spriteKey: n.spriteKey
        }));

        const persistedAlignments = window.saveData.npcAlignments;

        return {
            animsExist,
            npcs,
            persistedAlignments,
            playerAlignment: s.player.alignment
        };
    });

    console.log("\n--- EMOJI ANIMATIONS ---");
    console.log(JSON.stringify(report.animsExist, null, 2));

    console.log("\n--- NPC ALIGNMENTS ---");
    console.log(JSON.stringify(report.npcs, null, 2));

    console.log("\n--- PERSISTED ALIGNMENTS IN SAVEDATA ---");
    console.log(JSON.stringify(report.persistedAlignments, null, 2));

    // Test shop pricing multipliers for different player alignments
    console.log("\n--- SHOP PRICING ALIGNMENT MULTIPLIERS TEST ---");
    const shopPrices = await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        const player = s.player;
        const shopManager = player.shopManager;
        
        // Let's test Orion (ranger) or Brom (blacksmith)
        const merchant = s.npcs.find(n => n.spriteKey === 'blacksmith' || n.spriteKey === 'alchemist') || s.npcs[0];
        const npcName = merchant.npcName;
        const npcAlign = merchant.alignment;
        
        const results = [];
        
        // Test combinations
        const alignmentsToTest = [0, 50, -50]; // Neutral, Good, Evil
        for (const align of alignmentsToTest) {
            player.alignment = align;
            
            // Trigger shop items construction
            shopManager.openShopUI(merchant.spriteKey, npcName);
            
            // Extract the first item's price and shop title
            const shopTitle = document.getElementById('shop-title').innerText;
            const itemsContainer = document.getElementById('shop-items-container');
            const firstItemName = itemsContainer.querySelector('.font-label-caps').innerText;
            const firstItemPrice = itemsContainer.querySelector('.font-headline-sm').innerText;
            
            results.push({
                playerAlignment: align,
                merchantName: npcName,
                merchantAlignment: npcAlign,
                shopTitleText: shopTitle,
                firstItemName,
                firstItemPrice
            });
        }
        
        // Close shop UI
        document.getElementById('btn-close-shop').click();
        
        return results;
    });

    console.log(JSON.stringify(shopPrices, null, 2));

    // Test quest gold reward multipliers
    console.log("\n--- QUEST GOLD REWARD ALIGNMENT TEST ---");
    const questRewards = await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        const player = s.player;
        const qManager = player.questManager;
        
        const results = [];
        const testQuest = {
            id: 'test_alignment_quest',
            title: 'Test Alignment Quest',
            rewardGold: 100,
            rewardXP: 0,
            giverAlignment: 'Good'
        };

        // Test Good Player completing Good quest
        player.alignment = 50;
        window.saveData.gold = 0;
        qManager._completeQuest(JSON.parse(JSON.stringify(testQuest)), 0);
        results.push({
            questGiverAlign: 'Good',
            playerAlign: 50,
            expectedGold: 130, // 30% bonus
            actualGold: window.saveData.gold
        });

        // Test Evil Player completing Good quest
        player.alignment = -50;
        window.saveData.gold = 0;
        qManager._completeQuest(JSON.parse(JSON.stringify(testQuest)), 0);
        results.push({
            questGiverAlign: 'Good',
            playerAlign: -50,
            expectedGold: 70, // 30% reduction
            actualGold: window.saveData.gold
        });

        // Test Neutral Player completing Good quest
        player.alignment = 0;
        window.saveData.gold = 0;
        qManager._completeQuest(JSON.parse(JSON.stringify(testQuest)), 0);
        results.push({
            questGiverAlign: 'Good',
            playerAlign: 0,
            expectedGold: 100,
            actualGold: window.saveData.gold
        });

        return results;
    });

    console.log(JSON.stringify(questRewards, null, 2));

    // Check if autoplay has close NPC approach holds correctly
    console.log("\n--- AUTOPLAY SAFE ZONE TARGET HOLD TEST ---");
    const autoplayHold = await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        const player = s.player;
        
        // Enable autoplay
        player.isAI = true;
        
        // Close any open chats or shops
        s.npcs.forEach(n => {
            if (n.isChatOpen) n.closeChat();
            if (n.isShopOpen) n.closeShop();
        });
        player.companionAI._lastChatClosedTime = 0;
        
        // Find closest NPC
        let closestNpc = null;
        let minDist = Infinity;
        s.npcs.forEach(npc => {
            if (npc && npc.sprite && npc.sprite.active) {
                const d = Math.abs(npc.sprite.x - player.sprite.x);
                if (d < minDist) { minDist = d; closestNpc = npc; }
            }
        });

        if (!closestNpc) return { error: "No NPC found" };

        // Position player exactly 100px away from the closest NPC
        player.sprite.x = closestNpc.sprite.x - 100;
        player.sprite.y = closestNpc.sprite.y;
        
        // Trigger one AI tick
        player.lastAITick = 0; // force tick
        player.scene.weatherManager = null; // deactivate weather tick
        
        const beforeTickInput = { ...player.aiInput };
        
        // Execute companionAI update
        player.companionAI.updateAI(20000, 100);
        
        const afterTickInput = { ...player.aiInput };
        
        // Now position player within 30px (interact range)
        player.sprite.x = closestNpc.sprite.x - 30;
        player.lastAITick = 0; // force tick
        player.companionAI.updateAI(30000, 100);
        const closeTickInput = { ...player.aiInput };

        return {
            distanceBefore: 100,
            inputBeforeTick: beforeTickInput,
            inputAfterTick: afterTickInput,
            distanceClose: 30,
            inputCloseTick: closeTickInput
        };
    });

    console.log(JSON.stringify(autoplayHold, null, 2));

    await browser.close();
}

run().catch(err => { console.error(err); process.exit(1); });
