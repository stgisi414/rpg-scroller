/**
 * RPG Scroller - Omni Cutscene Video Generation Utility
 * 
 * This utility uses the Google Gen AI SDK (`@google/genai`) and the Google Veo model
 * (`veo-2.0-generate-001`) to procedurally generate .mp4 cinematic backdrops for the
 * game's cutscenes in Omni mode.
 * 
 * PREREQUISITES:
 * 1. Install the Google Gen AI Node.js SDK:
 *    npm install @google/genai
 * 
 * 2. Set your Gemini API key in the environment:
 *    Windows (PowerShell):
 *      $env:GEMINI_API_KEY="AIzaSy..."
 *    Windows (CMD):
 *      set GEMINI_API_KEY=AIzaSy...
 *    Linux/macOS:
 *      export GEMINI_API_KEY="AIzaSy..."
 * 
 * RUNNING THE SCRIPT:
 *    node scripts/generate_omni_videos.js [storyboard_dir]
 * 
 * If a storyboard directory is provided, the script will read prompt files (.txt) from it.
 * Otherwise, it will fall back to generating videos using built-in detailed prompts for the 7 categories.
 */

const fs = require('fs');
const path = require('path');

// Ensure the Google Gen AI SDK is installed before requiring
let GoogleGenAI;
try {
    const sdk = require('@google/genai');
    GoogleGenAI = sdk.GoogleGenAI;
} catch (e) {
    console.error("ERROR: '@google/genai' SDK is not installed.");
    console.error("Please run: npm install @google/genai");
    process.exit(1);
}

// 1. Initialize API client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("ERROR: GEMINI_API_KEY environment variable is not set.");
    console.error("Please set it in your environment: e.g., $env:GEMINI_API_KEY=\"your_key_here\"");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// 2. Constants & Folders
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'videos');
const DEFAULT_STORYBOARD_DIR = path.join(__dirname, '..', 'assets', 'storyboards');

// Define default prompts for the 7 cutscene categories if no storyboard files are found
const DEFAULT_PROMPTS = {
    'town_entrance': 'A cinematic video of entering a medieval fantasy capital gate. Stone arches, flags waving, guards standing watch, bustling town inside, golden hour lighting.',
    'rival_ambush': 'A dramatic, dark fantasy forest ambush scene. A cocky rival rogue steping out of the shadows, unsheathing dual glowing daggers, camera rotating around them, foggy woods.',
    'boss_monologue': 'An epic fantasy boss monologue arena. A dark wizard or overlord standing on a platform, channeling dark purple magical energy, floating runes, menacing cinematic look.',
    'heaven_encounter': 'A celestial, divine realm in the high heavens. A radiant angel with glowing wings floating amidst golden clouds, soft volumetric sun rays, peaceful but awe-inspiring.',
    'hell_encounter': 'An infernal, fiery hellscape abyss. A giant towering demon laughing amongst bubbling lava and scorched volcanic rocks, red ambient glow, cinematic dramatic angles.',
    'throne_room_entrance': 'A grand royal throne room entrance. Golden pillars, high arches, a majestic monarch sitting on a throne, guards lined up, carpet leading up, sunlight streaming through windows.',
    'guard_warning': 'A medieval checkpoint warning. Alert guards holding spears, blocking a stone bridge pathway, warning sign, tense atmospheric sunset lighting.'
};

async function run() {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`Created output directory: ${OUTPUT_DIR}`);
    }

    // Determine storyboard directory
    const args = process.argv.slice(2);
    const storyboardDir = args[0] ? path.resolve(args[0]) : DEFAULT_STORYBOARD_DIR;
    
    console.log(`Looking for storyboards in: ${storyboardDir}`);
    
    const promptsToGenerate = { ...DEFAULT_PROMPTS };

    // Try reading prompts from the storyboard directory
    if (fs.existsSync(storyboardDir)) {
        try {
            const files = fs.readdirSync(storyboardDir);
            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const category = path.basename(file, '.txt');
                    if (DEFAULT_PROMPTS[category]) {
                        const promptText = fs.readFileSync(path.join(storyboardDir, file), 'utf8').trim();
                        if (promptText) {
                            promptsToGenerate[category] = promptText;
                            console.log(`Loaded custom storyboard prompt for '${category}' from ${file}`);
                        }
                    }
                }
            }
        } catch (err) {
            console.warn(`Could not read storyboard directory: ${err.message}. Falling back to default prompts.`);
        }
    } else {
        console.log("Storyboard directory not found. Using default prompts.");
    }

    console.log("\nStarting video generation sequence...");
    for (const [category, prompt] of Object.entries(promptsToGenerate)) {
        const outputPath = path.join(OUTPUT_DIR, `${category}.mp4`);
        console.log(`\nGenerating video for category: '${category}'`);
        console.log(`Prompt: "${prompt}"`);
        
        try {
            // Call the video generation API
            const response = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: prompt,
                config: {
                    aspectRatio: '16:9',
                    durationSeconds: 5,
                    outputMimeType: 'video/mp4'
                }
            });

            if (response && response.generatedVideos && response.generatedVideos[0] && response.generatedVideos[0].video) {
                const videoBytes = response.generatedVideos[0].video.bytes;
                fs.writeFileSync(outputPath, Buffer.from(videoBytes, 'base64'));
                console.log(`SUCCESS: Saved generated video to ${outputPath}`);
            } else {
                throw new Error("No video data returned in API response.");
            }
        } catch (err) {
            console.error(`FAILED to generate video for '${category}':`, err.message);
        }
    }

    // Write manifest
    const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
    try {
        const generatedList = fs.readdirSync(OUTPUT_DIR)
            .filter(file => file.endsWith('.mp4'))
            .map(file => path.basename(file, '.mp4'));
        fs.writeFileSync(manifestPath, JSON.stringify(generatedList, null, 2));
        console.log(`Saved manifest.json to ${manifestPath} with ${generatedList.length} video(s).`);
    } catch (err) {
        console.error("Failed to save manifest.json:", err.message);
    }

    console.log("\nVideo generation sequence complete.");
}

run().catch(err => {
    console.error("Fatal error running video generation script:", err);
    process.exit(1);
});
