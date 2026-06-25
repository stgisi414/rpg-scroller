const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Stub window.prompt
    await page.evaluateOnNewDocument(() => {
        window.prompt = () => "";
    });

    console.log("Navigating to game...");
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle2' });

    console.log("Logging sliceData from localStorage...");
    const data = await page.evaluate(() => {
        return {
            sliceData: localStorage.getItem('sprite_slice_data'),
            sliceColData: localStorage.getItem('sprite_slice_coldata')
        };
    });
    console.log("localStorage sprite_slice_data:", data.sliceData);
    console.log("localStorage sprite_slice_coldata:", data.sliceColData);

    await browser.close();
}

run().catch(err => {
    console.error("Error in capture script:", err);
    process.exit(1);
});
