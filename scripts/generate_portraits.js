const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

// Ensure output directory exists
const PORTRAITS_DIR = path.join(__dirname, '..', 'src', 'assets', 'portraits');
if (!fs.existsSync(PORTRAITS_DIR)) {
    fs.mkdirSync(PORTRAITS_DIR, { recursive: true });
}

// Read API Key from environment variable
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    console.error("Please run: $env:GEMINI_API_KEY=\"your_key_here\" (PowerShell) or export GEMINI_API_KEY=\"your_key\" (Bash) first.");
    process.exit(1);
}

// Character Class Portrait Definitions
const CLASS_PORTRAITS = [
    {
        id: 'knight',
        sheet: 'src/assets/GandalfHardcore FREE Warrior/GandalfHardcore Warrior.png',
        w: 80, h: 64,
        prompt: 'Heroic medieval warrior in shining silver plate armor, face visible, noble expression, detailed 2D fantasy portrait'
    },
    {
        id: 'heavy_knight',
        sheet: 'src/assets/Heavy Knight/Heavy Knight/Black heavy.png',
        w: 91, h: 64,
        prompt: 'Massive heavy knight in dark obsidian-black steel plate armor with a heavy helmet, glowing red visor, detailed 2D fantasy portrait'
    },
    {
        id: 'wizard',
        sheet: 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Black Wizard sheet.png',
        w: 64, h: 64,
        prompt: 'Wise old wizard with a long white beard, wearing dark starry wizard robes, holding a glowing arcane staff, detailed 2D fantasy portrait'
    },
    {
        id: 'wizard_rival',
        sheet: 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Black Wizard sheet.png',
        w: 64, h: 64,
        prompt: 'Sinister wizard with a dark beard and glowing purple eyes, wearing dark purple wizard robes, detailed 2D fantasy portrait'
    },
    {
        id: 'samurai',
        sheet: 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet black.png',
        w: 96, h: 64,
        prompt: 'Noble samurai in black plate armor with a traditional kabuto helmet, holding a katana, detailed 2D fantasy portrait'
    },
    {
        id: 'ranger',
        sheet: 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer black sheet.png',
        w: 64, h: 64,
        prompt: 'Elven archer with a hooded green cloak and long brown hair, holding a composite bow, detailed 2D fantasy portrait'
    },
    {
        id: 'priest',
        sheet: 'src/assets/priest_2.png',
        w: 128, h: 128,
        prompt: 'Holy priest in white and gold robes, serene expression, holding a golden wooden cross, detailed 2D fantasy portrait'
    },
    {
        id: 'witch',
        sheet: 'src/assets/witch_2.png',
        w: 128, h: 128,
        prompt: 'Mysterious witch with long dark hair, wearing a pointed witch hat and dark robes, detailed 2D fantasy portrait'
    },
    {
        id: 'pyromancer',
        sheet: 'src/assets/pyromancer_3.png',
        w: 128, h: 128,
        prompt: 'Fire mage in red and gold robes, hands glowing with warm fire embers, detailed 2D fantasy portrait'
    },
    {
        id: 'elven_spellblade',
        sheet: 'src/assets/elven_spellblade.png',
        w: 128, h: 128,
        prompt: 'Graceful elven spellblade with long silver hair and elven ears, holding a magic-infused glowing sword, detailed 2D fantasy portrait'
    },
    {
        id: 'elven_king',
        sheet: 'src/assets/elven_king.png',
        w: 128, h: 128,
        prompt: 'Regal elven king with a crown of golden leaves, wearing fine green and silver robes, detailed 2D fantasy portrait'
    },
    {
        id: 'elven_queen',
        sheet: 'src/assets/elven_queen.png',
        w: 128, h: 128,
        prompt: 'Graceful elven queen with a silver tiara, glowing green eyes, detailed 2D fantasy portrait'
    },
    {
        id: 'human_king',
        sheet: 'src/assets/human_king.png',
        w: 128, h: 128,
        prompt: 'Human king with a gold crown and red velvet robes, sitting on a throne, detailed 2D fantasy portrait'
    },
    {
        id: 'human_queen',
        sheet: 'src/assets/human_queen.png',
        w: 128, h: 128,
        prompt: 'Human queen with a sapphire tiara and elegant blue dress, detailed 2D fantasy portrait'
    },
    {
        id: 'dwarf_warrior',
        sheet: 'src/assets/dwarf_warrior.png',
        w: 128, h: 128,
        prompt: 'Stocky dwarf warrior with a braided red beard and a heavy steel axe, detailed 2D fantasy portrait'
    },
    {
        id: 'dwarf_king',
        sheet: 'src/assets/dwarf_king.png',
        w: 128, h: 128,
        prompt: 'Dwarven king in golden mail armor, long grey beard and a stone crown, detailed 2D fantasy portrait'
    }
];

// Helper to extract a specific frame from spritesheet
function extractFrame(sheetPath, frameWidth, frameHeight, frameIndex) {
    const fullPath = path.join(__dirname, '..', sheetPath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`Warning: Spritesheet not found: ${fullPath}`);
        return null;
    }
    const buffer = fs.readFileSync(fullPath);
    const png = PNG.sync.read(buffer);

    const framesPerRow = Math.floor(png.width / frameWidth);
    if (framesPerRow <= 0) return null;
    const frameX = (frameIndex % framesPerRow) * frameWidth;
    const frameY = Math.floor(frameIndex / framesPerRow) * frameHeight;

    if (frameX + frameWidth > png.width || frameY + frameHeight > png.height) {
        return null; // frame index out of bounds
    }

    const framePng = new PNG({ width: frameWidth, height: frameHeight });
    for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
            const srcIdx = (png.width * (frameY + y) + (frameX + x)) << 2;
            const dstIdx = (frameWidth * y + x) << 2;
            framePng.data[dstIdx] = png.data[srcIdx];
            framePng.data[dstIdx + 1] = png.data[srcIdx + 1];
            framePng.data[dstIdx + 2] = png.data[srcIdx + 2];
            framePng.data[dstIdx + 3] = png.data[srcIdx + 3];
        }
    }
    const frameBuffer = PNG.sync.write(framePng);
    return frameBuffer.toString('base64');
}

async function generateImage(task) {
    // Extract up to 4 frames for character consistency reference
    const referenceFrames = [];
    for (let f = 0; f < 4; f++) {
        const frameBase64 = extractFrame(task.sheet, task.w, task.h, f);
        if (frameBase64) {
            referenceFrames.push({
                type: "image",
                data: frameBase64,
                mime_type: "image/png"
            });
        }
    }

    if (referenceFrames.length === 0) {
        console.error(`Skipping ${task.id} because no reference frames could be extracted.`);
        return;
    }

    // Call unified interactions endpoint with gemini-3.1-flash-image
    const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';
    const payload = {
        model: "gemini-3.1-flash-image",
        input: [
            {
                type: "text",
                text: `Using the provided ${referenceFrames.length} game sprites as strict visual references for the character's face, hair, clothing/armor design, and color palette, generate a high-detail 2D fantasy RPG portrait of the following class: ${task.prompt}. The generated character portrait must look identical to the reference sprites, maintaining exact character consistency in outfit design and colors. Set on a simple solid white background.`
            },
            ...referenceFrames
        ],
        response_format: {
            type: "image",
            aspect_ratio: "1:1",
            image_size: "1K"
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
                'Api-Revision': '2026-05-20'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        
        const findBase64Data = (obj) => {
            if (!obj) return null;
            if (typeof obj === 'string') {
                const cleanStr = obj.trim().replace(/\s/g, '');
                if (cleanStr.startsWith('iVBORw0KG') || cleanStr.startsWith('/9j/')) {
                    return cleanStr;
                }
            }
            if (typeof obj === 'object') {
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const res = findBase64Data(item);
                        if (res) return res;
                    }
                } else {
                    for (const key of Object.keys(obj)) {
                        const res = findBase64Data(obj[key]);
                        if (res) return res;
                    }
                }
            }
            return null;
        };
        const base64Data = findBase64Data(data);

        if (base64Data) {
            const buffer = Buffer.from(base64Data, 'base64');
            const outputPath = path.join(PORTRAITS_DIR, `${task.id}.png`);
            fs.writeFileSync(outputPath, buffer);
            console.log(`Successfully generated: ${task.id}.png`);

            // Update manifest
            let manifest = [];
            const manifestPath = path.join(PORTRAITS_DIR, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                try {
                    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                } catch (e) {}
            }
            if (!manifest.includes(task.id)) {
                manifest.push(task.id);
                fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            }
        } else {
            console.error("Full API Response Keys:", Object.keys(data));
            console.error("Diagnostic Parsing Trace:");
            console.error("- Keys of data:", Object.keys(data));
            if (data.steps) {
                console.error("- data.steps is array:", Array.isArray(data.steps));
                console.error("- data.steps length:", data.steps.length);
                data.steps.forEach((step, sIdx) => {
                    console.error(`  Step [${sIdx}] keys:`, Object.keys(step));
                    if (step.candidates) {
                        console.error(`  Step [${sIdx}].candidates is array:`, Array.isArray(step.candidates));
                        step.candidates.forEach((cand, cIdx) => {
                            console.error(`    Candidate [${cIdx}] keys:`, Object.keys(cand));
                            if (cand.parts) {
                                console.error(`    Candidate [${cIdx}].parts is array:`, Array.isArray(cand.parts));
                                cand.parts.forEach((p, pIdx) => {
                                    console.error(`      Part [${pIdx}] keys:`, Object.keys(p));
                                    if (p.inlineData) {
                                        console.error(`      Part [${pIdx}].inlineData keys:`, Object.keys(p.inlineData));
                                    }
                                });
                            }
                        });
                    }
                });
            }
            throw new Error("No image data returned in the response.");
        }
    } catch (err) {
        console.error(`Failed to generate portrait for ${task.id}:`, err.message);
    }
}

async function run() {
    console.log(`Starting generation of ${CLASS_PORTRAITS.length} class portraits using gemini-3.1-flash-image (interactions) with reference Frame 0...`);
    for (let i = 0; i < CLASS_PORTRAITS.length; i++) {
        const task = CLASS_PORTRAITS[i];
        console.log(`[${i + 1}/${CLASS_PORTRAITS.length}] Generating ${task.id}...`);
        await generateImage(task);
        // Wait 1.5s between requests to respect rate limits
        await new Promise(r => setTimeout(r, 1500));
    }
    console.log("Portrait generation complete!");
}

run();
