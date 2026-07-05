// Captures the stack of the RangeError inside _handleMainHeroAutoPlay
const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.evaluateOnNewDocument(() => {
        window.prompt = () => ''; window.alert = () => {}; window.confirm = () => true;
        try { localStorage.clear(); } catch (e) {}
    });
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 20000 });
    await page.evaluate(() => {
        window.startGame({ id: 'dbg', name: 'DbgBot', classId: 'knight', level: 5, playTime: 0, lastSaved: Date.now(), isNewGame: false, currentZone: 0 });
    });
    await page.waitForFunction(() => {
        const s = window.game && window.game.scene && window.game.scene.scenes[0];
        return s && s.player && s.player.sprite && s.platforms && s.platforms.getChildren().length > 0;
    }, { timeout: 30000 });

    await page.evaluate(() => {
        const s = window.game.scene.scenes[0];
        // Patch to capture the failing stack
        const orig = window.CompanionAI_Helper._handleMainHeroAutoPlay;
        window.CompanionAI_Helper._handleMainHeroAutoPlay = function (...args) {
            try { return orig.apply(this, args); }
            catch (e) { if (!window.__lastStack) window.__lastStack = (e.stack || String(e)).slice(0, 2500); throw e; }
        };
        window.autoplayConfig = window.autoplayConfig || {};
        autoplayConfig.preset = 'merchant_trader';
        autoplayConfig.targetZone = 0;
        autoplayConfig.isActive = true;
        s.player.isAI = true;
        if (saveData) saveData.gold = 500;
        if (s.player.inventory) s.player.inventory.potions = 0;
    });

    await new Promise(r => setTimeout(r, 15000));
    const info = await page.evaluate(() => ({
        stack: window.__lastStack || null,
        quests: window.game.scene.scenes[0].player.quests ? window.game.scene.scenes[0].player.quests.map(q => ({ type: q.type, title: q.title })) : null
    }));
    console.log('QUESTS:', JSON.stringify(info.quests, null, 1));
    console.log('STACK:', info.stack);
    await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
