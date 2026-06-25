const puppeteer = require('puppeteer');

async function run() {
    console.log("Launching browser to inspect resources...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=swiftshader']
    });
    const page = await browser.newPage();

    page.on('response', response => {
        const status = response.status();
        if (status >= 400) {
            console.log(`[HTTP ${status}] Failed to load: ${response.url()}`);
        }
    });

    page.on('console', msg => {
        const txt = msg.text();
        if (msg.type() === 'error' || txt.includes('warn') || txt.includes('error') || txt.includes('Failed')) {
            console.log(`[Console ${msg.type()}] ${txt}`);
        }
    });

    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => typeof window.startGame === 'function', { timeout: 10000 });
    
    await page.evaluate(() => {
        window.startGame({
            id: 'check-404-test',
            name: 'Check404Bot',
            classId: 'knight',
            level: 1,
            playTime: 0,
            lastSaved: Date.now(),
            isNewGame: false,
            currentZone: 0
        });
    });

    // Wait 5 seconds for all town assets to load
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
    console.log("Done inspecting.");
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
