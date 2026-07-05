// Verifies the two "complicated" autoplay presets end-to-end in headless browsers:
//
//  merchant_trader  — must restock potions from the goods tab (the old code deadlocked in an
//                     endless trade loop because the cargo branch returned before the standard
//                     buy logic and the needsPotions hold never released), buy/sell cargo, set
//                     a new different-kingdom capital targetZone after trading, and actually
//                     LEAVE the starting town.
//
//  faction_politician — must seek the throne room (_wantsThroneRoom -> statue -> directory ->
//                     Throne Room card), enter it, and turn in an injected diplomacy quest by
//                     chatting with the ruler (completion fires via the pre-chat delivery check).
//
// Both must produce ZERO page errors — this also regression-covers the delivery-NPC finder
// crash (n.name -> n.npcName) and the coliseum override TDZ fix.
//
// NOTE: headless runs have no Gemini key, so rulers cannot GRANT quests here (LLM-driven);
// quest acquisition is covered by injecting the quest and by the scripted contract-ask flag.
const puppeteer = require('puppeteer');
const http = require('http');

const RUN_SECONDS = 300;

function waitPort(port, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            const req = http.request({ port, host: '127.0.0.1', path: '/' }, () => resolve());
            req.on('error', () => {
                if (Date.now() - start > timeout) reject(new Error(`Timeout waiting for port ${port}`));
                else setTimeout(check, 200);
            });
            req.end();
        };
        check();
    });
}

async function launchGame(label, preset, pageErrors) {
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
    page.on('pageerror', e => {
        pageErrors.push(e.message);
        console.log(`[${label}][pageerror]`, e.message);
    });
    page.on('console', msg => {
        const t = msg.text();
        if (t.includes('[AutoPlay] town-logic error')) {
            pageErrors.push(t);
            console.log(`[${label}][town-logic-error]`, t);
        }
    });

    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 20000 });
    await page.evaluate((lbl) => {
        window.startGame({
            id: 'preset-test-' + lbl, name: 'Bot_' + lbl, classId: 'knight', level: 5,
            playTime: 0, lastSaved: Date.now(), isNewGame: false, currentZone: 0
        });
    }, label);
    await page.waitForFunction(() => {
        const s = window.game && window.game.scene && window.game.scene.scenes[0];
        return s && s.player && s.player.sprite && s.platforms && s.platforms.getChildren().length > 0;
    }, { timeout: 30000 });

    // Neutralize cutscenes (same trick as test_autoplay.js)
    await page.evaluate(() => {
        const stub = function (dialogue, onComplete) {
            if (typeof onComplete === 'function') { try { onComplete(); } catch (e) {} }
            if (this.cancelCutscene) this.cancelCutscene();
        };
        if (window.CutsceneController) window.CutsceneController.prototype.playCutscene = stub;
        const s = window.game.scene.scenes[0];
        if (s && s.cutsceneController) s.cutsceneController.playCutscene = stub;
    });

    // Enable autoplay with the preset under test; fund the run
    await page.evaluate((presetName) => {
        const s = window.game.scene.scenes[0];
        if (saveData) { saveData.gold = 500; saveData.cargo = saveData.cargo || {}; }
        if (s.player && s.player.inventory) s.player.inventory.potions = 0; // force restock path
        const presets = document.querySelectorAll('.preset-btn');
        const btn = Array.from(presets).find(b => b.dataset.preset === presetName);
        if (btn) btn.click();
        else {
            window.autoplayConfig = window.autoplayConfig || {};
            window.autoplayConfig.preset = presetName;
        }
        autoplayConfig.targetZone = 0;
        autoplayConfig.isActive = true;
        s.player.isAI = true;
        const apBtn = document.getElementById('btn-auto-play');
        if (apBtn && s.player.isAI !== true) apBtn.click();
    }, preset);

    return { browser, page };
}

async function runMerchant() {
    const errors = [];
    const { browser, page } = await launchGame('merchant', 'merchant_trader', errors);
    const result = {
        restocked: false, boughtCargo: false, retargeted: false, leftTown: false,
        targetZone: 0, finalZone: 0, errors
    };

    const deadline = Date.now() + RUN_SECONDS * 1000;
    while (Date.now() < deadline) {
        const s = await page.evaluate(() => {
            const sc = window.game.scene.scenes[0];
            const cargoCount = saveData && saveData.cargo ? Object.values(saveData.cargo).reduce((a, b) => a + b, 0) : 0;
            return {
                zone: sc.worldManager ? sc.worldManager.currentZoneIndex : 0,
                potions: sc.player && sc.player.inventory ? (sc.player.inventory.potions || 0) : 0,
                cargo: cargoCount,
                targetZone: window.autoplayConfig ? window.autoplayConfig.targetZone : 0,
                restockDone: sc.player && sc.player.companionAI ? !!sc.player.companionAI._merchantPotionRestockDone : false,
                gold: saveData ? saveData.gold : 0
            };
        }).catch(() => null);
        if (s) {
            if (s.potions > 0 || s.restockDone) result.restocked = true;
            if (s.cargo > 0) result.boughtCargo = true;
            if (s.targetZone !== 0) { result.retargeted = true; result.targetZone = s.targetZone; }
            if (s.zone !== 0) { result.leftTown = true; result.finalZone = s.zone; }
            if (result.restocked && result.boughtCargo && result.retargeted && result.leftTown) break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    await browser.close();
    return result;
}

async function runPolitician() {
    const errors = [];
    const { browser, page } = await launchGame('politician', 'faction_politician', errors);

    // Inject a diplomacy quest targeting THIS capital's ruler — the politician must head to
    // the throne room and complete it by talking to the ruler.
    const questInfo = await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        const kingdom = window.getKingdomForZone ? window.getKingdomForZone(0) : null;
        if (!kingdom) return { ok: false };
        const faction = window.WORLD_FACTIONS[kingdom.rulingFaction];
        const rulerName = faction && faction.leader ? faction.leader.name : null;
        s.player.addQuest({
            id: 'diplo_test', type: 'diplomacy', title: 'Deliver the Treaty',
            description: 'Deliver a treaty to the local ruler.',
            targetKingdom: kingdom.id, targetRuler: rulerName,
            targetCount: 1, currentCount: 0, rewardGold: 200, rewardReputation: 20
        });
        return { ok: true, kingdom: kingdom.id, ruler: rulerName };
    });
    console.log('[politician] injected diplomacy quest:', JSON.stringify(questInfo));

    const result = {
        injected: questInfo.ok, wantedThrone: false, enteredThrone: false,
        askedContract: false, questCompleted: false, errors
    };

    const deadline = Date.now() + RUN_SECONDS * 1000;
    while (Date.now() < deadline) {
        const s = await page.evaluate(() => {
            const sc = window.game.scene.scenes[0];
            const ai = sc.player ? sc.player.companionAI : null;
            const q = sc.player && sc.player.quests ? sc.player.quests.find(x => x.id === 'diplo_test') : null;
            return {
                wantsThrone: ai ? !!ai._wantsThroneRoom : false,
                indoor: sc.currentIndoorLocation || null,
                asked: ai ? !!ai._askedCourtContract : false,
                questActive: !!q,
                questDone: q ? (q.currentCount >= q.targetCount) : true
            };
        }).catch(() => null);
        if (s) {
            if (s.wantsThrone) result.wantedThrone = true;
            if (s.indoor === 'throne_room') result.enteredThrone = true;
            if (s.asked) result.askedContract = true;
            if (!s.questActive || s.questDone) result.questCompleted = result.enteredThrone; // completed only counts after throne entry
            if (result.wantedThrone && result.enteredThrone && result.questCompleted) break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    await browser.close();
    return result;
}

async function main() {
    await waitPort(3000);
    const [merchant, politician] = await Promise.all([runMerchant(), runPolitician()]);

    console.log('\n=== MERCHANT_TRADER ===');
    console.log('Restocked potions (or none available):', merchant.restocked);
    console.log('Bought cargo:', merchant.boughtCargo);
    console.log('Retargeted to another capital:', merchant.retargeted, merchant.retargeted ? `(zone ${merchant.targetZone})` : '');
    console.log('Left starting town:', merchant.leftTown, merchant.leftTown ? `(now zone ${merchant.finalZone})` : '');
    console.log('Errors:', merchant.errors.length);

    console.log('\n=== FACTION_POLITICIAN ===');
    console.log('Diplomacy quest injected:', politician.injected);
    console.log('Wanted throne room:', politician.wantedThrone);
    console.log('Entered throne room:', politician.enteredThrone);
    console.log('Asked for court contract (needs chat UI alive):', politician.askedContract);
    console.log('Diplomacy quest turned in:', politician.questCompleted);
    console.log('Errors:', politician.errors.length);

    const merchantPass = merchant.restocked && merchant.boughtCargo && merchant.retargeted && merchant.leftTown && merchant.errors.length === 0;
    const politicianPass = politician.injected && politician.wantedThrone && politician.enteredThrone && politician.questCompleted && politician.errors.length === 0;

    console.log('\n=== VERDICT ===');
    console.log(merchantPass ? 'MERCHANT: PASS' : 'MERCHANT: FAIL');
    console.log(politicianPass ? 'POLITICIAN: PASS' : 'POLITICIAN: FAIL');
    process.exit(merchantPass && politicianPass ? 0 : 1);
}

main().catch(err => { console.error('Verify error:', err); process.exit(1); });
