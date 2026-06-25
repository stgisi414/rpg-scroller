// Verifies the SpriteDebugger fix: ALL user-tuned npc slice data must SURVIVE a game
// start (panel creation) — both an 8-column layout AND a 10-column layout (the latter
// is legitimate now, e.g. tuning the 10-frame death row). Nothing is wiped on load.
const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Seed localStorage BEFORE any game script runs:
    //  - npc_male_skin1: a user-tuned 8-column layout with NON-default widths
    //  - npc_female_skin1: the old broken 10-column cache (should be migrated away)
    await page.evaluateOnNewDocument(() => {
        window.prompt = () => '';
        window.alert = () => {};
        window.confirm = () => true;

        const customMale = [];
        let x = 0;
        const widths = [90, 110, 95, 105, 100, 120, 80, 100]; // deliberately not all 100
        for (let c = 0; c < 8; c++) { customMale.push({ x, w: widths[c] }); x += widths[c]; }

        // A legitimate 10-column layout (e.g. the 10-frame death row at 80px each).
        const tenColFemale = [];
        for (let c = 0; c < 10; c++) tenColFemale.push({ x: c * 80, w: 80 });

        localStorage.setItem('sprite_slice_coldata', JSON.stringify({
            npc_male_skin1: customMale,
            npc_female_skin1: tenColFemale
        }));
    });
    page.on('pageerror', e => console.log('[pageerror]', e.message));

    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 20000 });
    await page.evaluate(() => {
        window.startGame({
            id: 'slice-test', name: 'SliceBot', classId: 'knight', level: 1,
            playTime: 0, lastSaved: Date.now(), isNewGame: false, currentZone: 0
        });
    });
    await page.waitForFunction(() => {
        const s = window.game && window.game.scene && window.game.scene.scenes[0];
        return s && s.player && s.player.sprite;
    }, { timeout: 30000 });

    const result = await page.evaluate(() => ({
        male: window.sliceColData ? window.sliceColData['npc_male_skin1'] : null,
        female: window.sliceColData ? window.sliceColData['npc_female_skin1'] : null
    }));

    const male = result.male;
    const female = result.female;
    const malePreserved = Array.isArray(male) && male.length === 8 &&
        male[0].w === 90 && male[5].w === 120;
    const femalePreserved = Array.isArray(female) && female.length === 10 &&
        female[0].w === 80 && female[9].x === 720;

    console.log('npc_male_skin1 (user-tuned 8-col):', JSON.stringify(male));
    console.log('npc_female_skin1 (user-tuned 10-col):', JSON.stringify(female));
    console.log('\n=== SUMMARY ===');
    console.log('User 8-col widths preserved:', malePreserved ? 'PASS' : 'FAIL');
    console.log('User 10-col widths preserved:', femalePreserved ? 'PASS' : 'FAIL');

    await browser.close();
}

run().catch(err => { console.error('Verify error:', err); process.exit(1); });
