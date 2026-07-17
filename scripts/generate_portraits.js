const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

// Ensure output directories exist
const PORTRAITS_DIR = path.join(__dirname, '..', 'src', 'assets', 'portraits');
const BACKDROPS_DIR = path.join(PORTRAITS_DIR, 'backdrops');
if (!fs.existsSync(PORTRAITS_DIR)) {
    fs.mkdirSync(PORTRAITS_DIR, { recursive: true });
}
if (!fs.existsSync(BACKDROPS_DIR)) {
    fs.mkdirSync(BACKDROPS_DIR, { recursive: true });
}

// Read API Key from environment variable
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    process.exit(1);
}

// Character Class Portrait Definitions (Excluding monsters)
const CLASS_PORTRAITS = [
    {
        id: 'knight',
        sheet: 'src/assets/GandalfHardcore FREE Warrior/GandalfHardcore Warrior.png',
        w: 80, h: 64,
        prompt: 'Heroic medieval warrior in shining silver plate armor, face visible, noble expression, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'heavy_knight',
        sheet: 'src/assets/Heavy Knight/Heavy Knight/Black heavy.png',
        w: 91, h: 64,
        prompt: 'Massive heavy knight in dark obsidian-black steel plate armor with a heavy helmet, glowing red visor, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'heavy_guard',
        sheet: 'src/assets/Heavy Knight/Heavy Knight/Black heavy.png',
        w: 91, h: 64,
        prompt: 'Noble medieval town guard in polished silver steel plate armor, open visor showing a friendly, stern protective face, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'wizard',
        sheet: 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Black Wizard sheet.png',
        w: 64, h: 64,
        prompt: 'Wise old wizard with a long white beard, wearing dark starry wizard robes, holding a glowing arcane staff, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'wizard_rival',
        sheet: 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Black Wizard sheet.png',
        w: 64, h: 64,
        prompt: 'Sinister wizard with a dark beard and glowing purple eyes, wearing dark purple wizard robes, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'samurai',
        sheet: 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet black.png',
        w: 96, h: 64,
        prompt: 'Noble samurai in black plate armor with a traditional kabuto helmet, holding a katana, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'ranger',
        sheet: 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer black sheet.png',
        w: 64, h: 64,
        prompt: 'Male elven archer, short brown hair, wearing a green hooded cloak, holding a composite bow, detailed 2D fantasy portrait.',
        bgColor: 'white'
    },
    {
        id: 'alchemist',
        sheet: 'src/assets/GandalfHardcore characters pack/GandalfHardcore characters pack/Mage.png',
        w: 64, h: 64,
        prompt: 'Wise fantasy alchemist brewing a potion in a glass vial, wearing dark robes, glowing cauldron nearby, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'blacksmith',
        sheet: 'src/assets/GandalfHardcore characters pack/GandalfHardcore characters pack/Black Market Dealer.png',
        w: 64, h: 64,
        prompt: 'Human male blacksmith, muscular build, wearing a leather apron, holding a blacksmith hammer over an anvil, detailed 2D fantasy portrait.',
        bgColor: 'white'
    },
    {
        id: 'sage',
        sheet: 'src/assets/GandalfHardcore FREE NPC/GandalfHardcFREE NPC/GandalfHardcore Goddess NPC.png',
        w: 64, h: 64,
        prompt: 'Regal elder sage with long white hair, holding a glowing crystal orb, wearing ancient wizard robes, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'priest',
        sheet: 'src/assets/priest_2.png',
        w: 128, h: 128,
        prompt: 'Holy priest in white and gold robes, serene expression, holding a golden wooden cross, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'witch',
        sheet: 'src/assets/witch_2.png',
        w: 128, h: 128,
        prompt: 'Mysterious witch with long dark hair, wearing a pointed witch hat and dark robes, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'pyromancer',
        sheet: 'src/assets/pyromancer_3.png',
        w: 128, h: 128,
        prompt: 'Fire mage in red and gold robes, hands glowing with warm fire embers, detailed 2D fantasy portrait.',
        bgColor: 'white'
    },
    {
        id: 'elven_spellblade',
        sheet: 'src/assets/elven_spellblade.png',
        w: 128, h: 128,
        prompt: 'Graceful elven spellblade with long silver hair and elven ears, holding a magic-infused glowing sword, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'elven_king',
        sheet: 'src/assets/elven_king.png',
        w: 128, h: 128,
        prompt: 'Regal elven king with a crown of golden leaves, wearing fine green and silver robes, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'elven_queen',
        sheet: 'src/assets/elven_queen.png',
        w: 128, h: 128,
        prompt: 'Graceful elven queen with a silver tiara, glowing green eyes, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'human_king',
        sheet: 'src/assets/human_king.png',
        w: 128, h: 128,
        prompt: 'Human king with a gold crown and red velvet robes, sitting on a throne, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'human_queen',
        sheet: 'src/assets/human_queen.png',
        w: 128, h: 128,
        prompt: 'Human queen with a sapphire tiara and elegant blue dress, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'dwarf_warrior',
        sheet: 'src/assets/dwarf_warrior.png',
        w: 128, h: 128,
        prompt: 'Stocky dwarf warrior with a braided red beard and a heavy steel axe, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'dwarf_king',
        sheet: 'src/assets/dwarf_king.png',
        w: 128, h: 128,
        prompt: 'Dwarven king in golden mail armor, long grey beard and a stone crown, detailed 2D fantasy portrait',
        bgColor: 'white'
    },

    // New Class Portraits (7)
    {
        id: 'elven_longbowman',
        sheet: 'src/assets/elven_longbowman.png',
        w: 128, h: 128,
        prompt: 'Graceful elven longbowman with green leather armor, holding a bow, long pointed elven ears, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'elven_guard',
        sheet: 'src/assets/elven_guard.png',
        w: 128, h: 128,
        prompt: 'Regal elven guard in gold and green plate armor, holding a spear, long pointed elven ears, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'dwarf_miner',
        sheet: 'src/assets/dwarf_miner.png',
        w: 128, h: 128,
        prompt: 'Stocky dwarven miner with a braided grey beard, wearing a leather apron and holding a pickaxe, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'dark_elf_guard',
        sheet: 'src/assets/dark_elf_guard.png',
        w: 128, h: 128,
        prompt: 'Dark elven sentinel with purple eyes and grey skin, clad in heavy black steel armor, holding a halberd, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'dark_elf_spellblade',
        sheet: 'src/assets/dark_elf_spellblade.png',
        w: 128, h: 128,
        prompt: 'Graceful dark elven spellblade with grey skin and glowing blue eyes, holding a magic-infused obsidian sword, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'dark_elf_longbowman',
        sheet: 'src/assets/dark_elf_longbowman.png',
        w: 128, h: 128,
        prompt: 'Dark elven archer with grey skin, holding a recurve bow, hooded dark cloak, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'dark_elf_queen',
        sheet: 'src/assets/dark_elf_queen.png',
        w: 128, h: 128,
        prompt: 'Regal dark elven queen with grey skin, long silver hair, wearing an obsidian tiara and dark purple robes, detailed 2D fantasy portrait',
        bgColor: 'white'
    },

    // Generic Ambient NPC Portraits (18)
    // Humans
    {
        id: 'generic_human_male_light',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Male Skin1.png',
        w: 100, h: 64,
        prompt: 'Simple human male villager, light skin, short brown hair, wearing a basic medieval brown tunic, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_human_male_medium',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Male Skin3.png',
        w: 100, h: 64,
        prompt: 'Simple human male villager, medium tan skin, short black hair, wearing a basic medieval brown tunic, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_human_male_dark',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Male Skin5.png',
        w: 100, h: 64,
        prompt: 'Simple human male villager, dark skin, black hair, wearing a basic medieval brown tunic, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_human_female_light',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Female Skin1.png',
        w: 100, h: 64,
        prompt: 'Simple human female villager, light skin, long brown hair, wearing a basic medieval dress, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_human_female_medium',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Female Skin3.png',
        w: 100, h: 64,
        prompt: 'Simple human female villager, medium tan skin, black hair, wearing a basic medieval dress, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_human_female_dark',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Female Skin5.png',
        w: 100, h: 64,
        prompt: 'Simple human female villager, dark skin, braided dark hair, wearing a basic medieval dress, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    // Elves
    {
        id: 'generic_elf_male_light',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Male Skin1.png',
        w: 100, h: 64,
        prompt: 'Graceful elven male villager, light skin, long blonde hair, pointed elven ears, simple green tunic, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_elf_male_medium',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Male Skin3.png',
        w: 100, h: 64,
        prompt: 'Graceful elven male villager, medium tan skin, silver hair, pointed elven ears, simple green tunic, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_elf_male_dark',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Male Skin5.png',
        w: 100, h: 64,
        prompt: 'Graceful elven male villager, dark skin, black hair, pointed elven ears, simple green tunic, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_elf_female_light',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Female Skin1.png',
        w: 100, h: 64,
        prompt: 'Graceful elven female villager, light skin, long silver hair, pointed elven ears, simple green dress, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_elf_female_medium',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Female Skin3.png',
        w: 100, h: 64,
        prompt: 'Graceful elven female villager, medium tan skin, long blonde hair, pointed elven ears, simple green dress, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_elf_female_dark',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Female Skin5.png',
        w: 100, h: 64,
        prompt: 'Graceful elven female villager, dark skin, dark hair, pointed elven ears, simple green dress, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    // Dwarves
    {
        id: 'generic_dwarf_male_light',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Male Skin1.png',
        w: 100, h: 64,
        prompt: 'Sturdy dwarven male villager, light skin, long braided red beard, simple rugged clothes, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_dwarf_male_medium',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Male Skin3.png',
        w: 100, h: 64,
        prompt: 'Sturdy dwarven male villager, medium tan skin, long braided black beard, simple rugged clothes, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_dwarf_male_dark',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Male Skin5.png',
        w: 100, h: 64,
        prompt: 'Sturdy dwarven male villager, dark skin, long braided grey beard, simple rugged clothes, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_dwarf_female_light',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Female Skin1.png',
        w: 100, h: 64,
        prompt: 'Sturdy dwarven female villager, light skin, braided blonde hair, simple heavy linen dress, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_dwarf_female_medium',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Female Skin3.png',
        w: 100, h: 64,
        prompt: 'Sturdy dwarven female villager, medium tan skin, braided brown hair, simple heavy linen dress, detailed 2D fantasy portrait',
        bgColor: 'white'
    },
    {
        id: 'generic_dwarf_female_dark',
        sheet: 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Character skin colors/Female Skin5.png',
        w: 100, h: 64,
        prompt: 'Sturdy dwarven female villager, dark skin, braided black hair, simple heavy linen dress, detailed 2D fantasy portrait',
        bgColor: 'white'
    }
];

// Backdrop Definitions (14)
const BACKDROPS = [
    { id: 'forest_town', prompt: 'Cozy fantasy village background with wooden cottages and green trees, warm sunlight, pixel art aesthetic, detailed 2D background' },
    { id: 'forest_wild', prompt: 'Lush fantasy forest background with towering trees, ancient roots, dappled sunlight, pixel art aesthetic, detailed 2D background' },
    { id: 'desert_town', prompt: 'Sun-drenched desert bazaar background with sandstone buildings and canvas tents, pixel art aesthetic, detailed 2D background' },
    { id: 'desert_wild', prompt: 'Vast desert wilderness background with sand dunes, rocky arches, scorching sun, pixel art aesthetic, detailed 2D background' },
    { id: 'winter_town', prompt: 'Snow-covered mountain village background with stone chimneys, warm glowing windows, pixel art aesthetic, detailed 2D background' },
    { id: 'winter_wild', prompt: 'Frozen winter wilderness background with snowy pine trees, icy cliffs, howling wind, pixel art aesthetic, detailed 2D background' },
    { id: 'hell_town', prompt: 'Infernal obsidian outpost background, bubbling lava channels, glowing red embers, pixel art aesthetic, detailed 2D background' },
    { id: 'hell_wild', prompt: 'Fiery hellscape background with volcanic eruptions, cracked earth, rivers of flowing lava, pixel art aesthetic, detailed 2D background' },
    { id: 'heaven_town', prompt: 'Ethereal palace of light background, floating white marble platforms, golden arches, pixel art aesthetic, detailed 2D background' },
    { id: 'heaven_wild', prompt: 'Celestial sky background with soft white clouds, aurora borealis, distant stars, pixel art aesthetic, detailed 2D background' },
    { id: 'coastal_town', prompt: 'Charming seaside harbor background with wooden piers, sailing ships, sunny blue sky, pixel art aesthetic, detailed 2D background' },
    { id: 'coastal_wild', prompt: 'Rugged coastal wilderness background with ocean waves crashing against rocks, windy beach, pixel art aesthetic, detailed 2D background' },
    { id: 'deadwoods_town', prompt: 'Spooky swamp settlement background with dark mossy huts, glowing lanterns, pixel art aesthetic, detailed 2D background' },
    { id: 'deadwoods_wild', prompt: 'Haunted deadwoods forest background with twisted bare trees, thick fog, glowing will-o-wisps, pixel art aesthetic, detailed 2D background' }
];

// Helper to remove solid background (black or white) from generated PNGs using border flood-fill
async function removeBackgroundFloodFill(filePath) {
    if (!fs.existsSync(filePath)) return;
    try {
        const image = await Jimp.read(filePath);
        const w = image.bitmap.width;
        const h = image.bitmap.height;
        const data = image.bitmap.data;
        
        const visited = new Uint8Array(w * h);
        const seeds = [
            [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
            [Math.floor(w / 2), 0], [Math.floor(w / 2), h - 1],
            [0, Math.floor(h / 2)], [w - 1, Math.floor(h / 2)]
        ];
        
        // Detect corner background color to prevent bleeding into the character's white hair or dark armor
        const cr = data[0];
        const cg = data[1];
        const cb = data[2];
        let bgMode = 'black'; // default fallback
        if (cr > 180 && cg > 180 && cb > 180) {
            bgMode = 'white';
        }
        
        const queue = [];
        
        // Solid background detector with high tolerance (since we flood-fill from boundaries)
        function isBgColor(r, g, b) {
            if (bgMode === 'white') {
                return r > 180 && g > 180 && b > 180;
            } else {
                return r < 65 && g < 65 && b < 65;
            }
        }
        
        for (const [sx, sy] of seeds) {
            const sIdx = (w * sy + sx) << 2;
            const sr = data[sIdx];
            const sg = data[sIdx + 1];
            const sb = data[sIdx + 2];
            const sa = data[sIdx + 3];
            
            if (sa > 0 && isBgColor(sr, sg, sb)) {
                queue.push([sx, sy]);
                visited[w * sy + sx] = 1;
            }
        }
        
        while (queue.length > 0) {
            const [cx, cy] = queue.shift();
            const idx = (w * cy + cx) << 2;
            
            // Clear background pixel (make transparent)
            data[idx + 3] = 0;
            
            const neighbors = [
                [cx + 1, cy], [cx - 1, cy],
                [cx, cy + 1], [cx, cy - 1]
            ];
            
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const nPos = w * ny + nx;
                    if (!visited[nPos]) {
                        const nIdx = nPos << 2;
                        const nr = data[nIdx];
                        const ng = data[nIdx + 1];
                        const nb = data[nIdx + 2];
                        const na = data[nIdx + 3];
                        
                        if (na > 0 && isBgColor(nr, ng, nb)) {
                            queue.push([nx, ny]);
                            visited[nPos] = 1;
                        }
                    }
                }
            }
        }
        
        await image.write(filePath);
        console.log(`Successfully made background transparent via flood-fill: ${path.basename(filePath)}`);
    } catch (e) {
        console.error(`Failed to post-process background for ${filePath}:`, e.message);
    }
}

// Helper to extract a specific frame from spritesheet
async function extractFrame(sheetPath, frameWidth, frameHeight, frameIndex) {
    const fullPath = path.join(__dirname, '..', sheetPath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`Warning: Spritesheet not found: ${fullPath}`);
        return null;
    }
    const image = await Jimp.read(fullPath);
    const framesPerRow = Math.floor(image.bitmap.width / frameWidth);
    if (framesPerRow <= 0) return null;
    const frameX = (frameIndex % framesPerRow) * frameWidth;
    const frameY = Math.floor(frameIndex / framesPerRow) * frameHeight;

    if (frameX + frameWidth > image.bitmap.width || frameY + frameHeight > image.bitmap.height) {
        return null;
    }

    image.crop({ x: frameX, y: frameY, w: frameWidth, h: frameHeight });
    const buffer = await image.getBuffer('image/png');
    return buffer.toString('base64');
}

async function generateImage(task) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';
    let payload;
    let outputPath;

    if (task.isBackdrop) {
        outputPath = path.join(BACKDROPS_DIR, `${task.id}.png`);
        payload = {
            model: "gemini-3.1-flash-image",
            input: [
                {
                    type: "text",
                    text: task.prompt
                }
            ],
            response_format: {
                type: "image",
                aspect_ratio: "1:1",
                image_size: "1K"
            }
        };
    } else {
        outputPath = path.join(PORTRAITS_DIR, `${task.id}.png`);
        const referenceFrames = [];
        for (let f = 0; f < 4; f++) {
            const frameBase64 = await extractFrame(task.sheet, task.w, task.h, f);
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

        const bgInstruction = task.bgColor === 'white'
            ? 'Set on a simple solid white background (hex color #FFFFFF), with absolutely no borders, no frames, and no outlines around the edges of the image. The background MUST be pure solid white, even if the reference sprites have a black or dark background.'
            : 'Set on a simple solid black background (hex color #000000), with absolutely no borders, no frames, and no outlines around the edges of the image. The background MUST be pure solid black, even if the reference sprites have a white or light background.';

        payload = {
            model: "gemini-3.1-flash-image",
            input: [
                {
                    type: "text",
                    text: `Using the provided ${referenceFrames.length} game sprites as strict visual references for the character's face, hair, clothing/armor design, and color palette, generate a high-detail 2D fantasy RPG portrait of the following class: ${task.prompt}. The generated character portrait must look identical to the reference sprites, maintaining exact character consistency in outfit design and colors. ${bgInstruction}`
                },
                ...referenceFrames
            ],
            response_format: {
                type: "image",
                aspect_ratio: "1:1",
                image_size: "1K"
            }
        };
    }

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
            fs.writeFileSync(outputPath, buffer);
            console.log(`Successfully generated: ${path.basename(outputPath)}`);

            if (!task.isBackdrop) {
                // Post-process transparency via flood-fill
                await removeBackgroundFloodFill(outputPath);

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
            }
        } else {
            throw new Error("No image data returned in the response.");
        }
    } catch (err) {
        console.error(`Failed to generate ${task.id}:`, err.message);
    }
}

async function run() {
    // Filter list of portraits to generate
    const pendingPortraits = CLASS_PORTRAITS.filter(task => {
        const filePath = path.join(PORTRAITS_DIR, `${task.id}.png`);
        return !fs.existsSync(filePath);
    });

    console.log(`\nStarting generation of ${pendingPortraits.length} class/ambient portraits...`);
    for (let i = 0; i < pendingPortraits.length; i++) {
        const task = pendingPortraits[i];
        console.log(`[${i + 1}/${pendingPortraits.length}] Generating portrait: ${task.id}...`);
        await generateImage(task);
        await new Promise(r => setTimeout(r, 1500));
    }

    // Filter list of backdrops to generate
    const pendingBackdrops = BACKDROPS.filter(task => {
        const filePath = path.join(BACKDROPS_DIR, `${task.id}.png`);
        return !fs.existsSync(filePath);
    });

    console.log(`\nStarting generation of ${pendingBackdrops.length} biome backdrops...`);
    for (let i = 0; i < pendingBackdrops.length; i++) {
        const task = pendingBackdrops[i];
        task.isBackdrop = true;
        console.log(`[${i + 1}/${pendingBackdrops.length}] Generating backdrop: ${task.id}...`);
        await generateImage(task);
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log("\nAsset generation complete!");
}

run();
