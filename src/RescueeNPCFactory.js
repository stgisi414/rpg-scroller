// RescueeNPCFactory.js - Creates composite NPC textures by layering GandalfHardcore sprite sheets

class RescueeNPCFactory {
    constructor(scene) {
        this.scene = scene;
        this._counter = 0; // Unique ID counter for texture keys

        // Name pools
        this.maleNames = [
            'Aldric', 'Theron', 'Cedric', 'Rowan', 'Gareth',
            'Eldon', 'Bram', 'Osric', 'Leif', 'Darian',
            'Caelum', 'Torvin', 'Halden', 'Wren', 'Corbin',
            'Silas', 'Idris', 'Fenwick', 'Godric', 'Emeric',
            'Baldwin', 'Cuthbert', 'Duncan', 'Finnian', 'Garrick',
            'Hector', 'Ivor', 'Jasper', 'Kendrick', 'Lyle',
            'Mervin', 'Nevil', 'Orson', 'Pippin', 'Quentin'
        ];

        this.femaleNames = [
            'Lyra', 'Mira', 'Elspeth', 'Seraphina', 'Isolde',
            'Rowena', 'Brynn', 'Astrid', 'Elowen', 'Calista',
            'Thea', 'Fiora', 'Sage', 'Linnea', 'Daphne',
            'Willa', 'Rhiannon', 'Ondine', 'Cerys', 'Aisling',
            'Althea', 'Beatrix', 'Clara', 'Eira', 'Gwen',
            'Hazel', 'Iris', "Maeve", 'Nesta', 'Olwen',
            'Sylvia', 'Talia', 'Una', 'Violet', 'Zola'
        ];

        // Asset key definitions
        this.assets = {
            male: {
                skins: ['npc_male_skin1', 'npc_male_skin2', 'npc_male_skin3', 'npc_male_skin4', 'npc_male_skin5'],
                hairs: ['npc_male_hair1', 'npc_male_hair2', 'npc_male_hair3', 'npc_male_hair4', 'npc_male_hair5'],
                shirts: ['npc_male_shirt', 'npc_male_shirt_blue', 'npc_male_shirt_green', 'npc_male_shirt_purple', 'npc_male_shirt_orange'],
                pants: ['npc_male_pants', 'npc_male_pants_blue', 'npc_male_pants_green', 'npc_male_pants_purple', 'npc_male_pants_orange'],
                boots: ['npc_male_boots']
            },
            female: {
                skins: ['npc_female_skin1', 'npc_female_skin2', 'npc_female_skin3', 'npc_female_skin4', 'npc_female_skin5'],
                hairs: ['npc_female_hair1', 'npc_female_hair2', 'npc_female_hair3', 'npc_female_hair4', 'npc_female_hair5'],
                corsets: ['npc_female_corset', 'npc_female_corset_blue', 'npc_female_corset_green', 'npc_female_corset_purple', 'npc_female_corset_orange'],
                skirt: ['npc_female_skirt'],
                boots: ['npc_female_boots']
            }
        };

        // Clothing color descriptions (index-matched to shirt/pants/corset arrays)
        this._clothingColors = ['red', 'blue', 'green', 'purple', 'orange'];
    }

    /**
     * Creates a composite rescuee NPC texture and returns a config object.
     * @param {Object} options - Optional overrides for randomization
     * @param {string} options.gender - 'male' or 'female'
     * @param {number} options.skinTone - 1-5 (index into skin arrays)
     * @param {number} options.hairStyle - 1-5 (index into hair arrays)
     * @param {number} options.shirtColor - 0-4 (index into shirt/corset arrays)
     * @param {number} options.pantsColor - 0-4 (index into pants arrays, male only)
     * @param {string} options.textureKey - Force a specific texture key (for regeneration)
     * @param {string} options.name - Force a specific name
     * @returns {Object} { textureKey, name, gender, skinTone, hairStyle, clothingDesc, config }
     */
    createRescuee(options = {}) {
        // Resolve gender
        const gender = options.gender || (Math.random() < 0.5 ? 'male' : 'female');

        // Resolve random choices (1-indexed for skin/hair, 0-indexed for clothing)
        const skinTone = options.skinTone || (Math.floor(Math.random() * 5) + 1);
        const hairStyle = options.hairStyle || (Math.floor(Math.random() * 5) + 1);
        const shirtColor = (options.shirtColor !== undefined) ? options.shirtColor : Math.floor(Math.random() * 5);
        const pantsColor = (options.pantsColor !== undefined) ? options.pantsColor : Math.floor(Math.random() * 5);

        // Build the texture key
        const textureKey = options.textureKey || `rescuee_${gender}_${this._counter++}_${Date.now()}`;

        // Pick a name
        const namePool = gender === 'male' ? this.maleNames : this.femaleNames;
        const name = options.name || namePool[Math.floor(Math.random() * namePool.length)];

        // Determine layer keys based on gender
        const genderAssets = this.assets[gender];
        const skinKey = genderAssets.skins[skinTone - 1];
        const hairKey = genderAssets.hairs[hairStyle - 1];

        let layers;
        let clothingDesc;

        if (gender === 'male') {
            const shirtKey = genderAssets.shirts[shirtColor];
            const pantsKey = genderAssets.pants[pantsColor];
            const bootsKey = genderAssets.boots[0];
            layers = [skinKey, shirtKey, pantsKey, bootsKey, hairKey];
            clothingDesc = `${this._clothingColors[shirtColor]} shirt, ${this._clothingColors[pantsColor]} pants`;
        } else {
            const corsetKey = genderAssets.corsets[shirtColor];
            const skirtKey = genderAssets.skirt[0];
            const bootsKey = genderAssets.boots[0];
            layers = [skinKey, corsetKey, skirtKey, bootsKey, hairKey];
            clothingDesc = `${this._clothingColors[shirtColor]} corset, skirt`;
        }

        // Composite the texture
        this._compositeTexture(textureKey, layers);

        // Build the config for save/load regeneration
        const config = {
            gender,
            skinTone,
            hairStyle,
            shirtColor,
            pantsColor,
            textureKey
        };

        return {
            textureKey,
            name,
            gender,
            skinTone,
            hairStyle,
            clothingDesc,
            config
        };
    }

    /**
     * Composites multiple sprite sheet layers onto a single canvas and registers
     * the result as a Phaser spritesheet texture.
     * Layer order: skin → clothing → boots → hair (bottom to top).
     * All source sheets are 800×448 (8 cols × 7 rows, 100×64 per frame).
     * @param {string} textureKey - The key to register the composite texture under
     * @param {string[]} layers - Array of Phaser texture keys to composite in order
     */
    _compositeTexture(textureKey, layers) {
        const sheetWidth = 800;
        const sheetHeight = 448;

        // Create an offscreen canvas at the full sprite sheet size
        const canvas = document.createElement('canvas');
        canvas.width = sheetWidth;
        canvas.height = 448; // 7 rows * 64px height
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Draw each layer in order (skin first, hair last)
        for (const layerKey of layers) {
            const tex = this.scene.textures.get(layerKey);
            if (!tex || tex.key === '__MISSING') {
                console.warn(`[RescueeNPCFactory] Missing texture: ${layerKey}`);
                continue;
            }
            const sourceImage = tex.getSourceImage();
            ctx.drawImage(sourceImage, 0, 0, sheetWidth, sheetHeight);
        }

        // Remove existing texture if it exists (for regeneration after load)
        if (this.scene.textures.exists(textureKey)) {
            this.scene.textures.remove(textureKey);
        }

        const texture = this.scene.textures.addCanvas(textureKey, canvas);

        // Asset pack canonical layout: 80x64 per frame, 10 cols x 7 rows.
        const defaultRows = [];
        for (let r = 0; r < 7; r++) {
            const h = (r === 3) ? 60 : 64;
            defaultRows.push({ y: r * 64, h: h });
        }

        const baseSkinKey = layers[0];
        const lookupSkin = (baseSkinKey && baseSkinKey.startsWith('npc_male_skin')) ? 'npc_male_skin1' : ((baseSkinKey && baseSkinKey.startsWith('npc_female_skin')) ? 'npc_female_skin1' : baseSkinKey);

        const rowData = (window.sliceData && window.sliceData[lookupSkin])
            ? window.sliceData[lookupSkin]
            : defaultRows;

        const colData = (window.sliceColData && window.sliceColData[lookupSkin]) ? window.sliceColData[lookupSkin] : null;

        const numRows = rowData ? rowData.length : 7;

        // Find foot Y line per frame
        const footData = [];
        const findFootY = (fx, fy, fw, fh) => {
            const cx = Math.max(0, Math.round(fx));
            const cy = Math.max(0, Math.round(fy));
            const cw = Math.min(canvas.width - cx, Math.round(fw));
            const ch = Math.min(canvas.height - cy, Math.round(fh));
            if (cw <= 0 || ch <= 0) return Math.round(fh) - 1;
            const data = ctx.getImageData(cx, cy, cw, ch).data;
            for (let yy = ch - 1; yy >= 0; yy--) {
                for (let xx = 0; xx < cw; xx++) {
                    if (data[(yy * cw + xx) * 4 + 3] > 16) return yy;
                }
            }
            return ch - 1; // fully transparent -> assume feet at frame bottom
        };

        const rowStarts = [];
        const rowNonEmptyCounts = []; // actual non-empty frame count per row
        let frameIndex = 0;
        for (let r = 0; r < numRows; r++) {
            rowStarts.push(frameIndex);
            const overrideKey = lookupSkin + '_r' + r;
            const rowCols = (window.sliceColData && window.sliceColData[overrideKey]) || colData;
            const rowNumCols = rowCols ? rowCols.length : 10;
            let nonEmpty = 0;
            for (let c = 0; c < rowNumCols; c++) {
                const x = rowCols ? rowCols[c].x : c * 80;
                const w = rowCols ? rowCols[c].w : 80;
                const y = rowData[r].y;
                const h = rowData[r].h;
                texture.add(frameIndex, 0, x, y, w, h);
                
                footData[frameIndex] = findFootY(x, y, w, h);

                // Scan if this frame has any visible pixels
                const cx = Math.max(0, Math.round(x));
                const cy = Math.max(0, Math.round(y));
                const cw = Math.min(canvas.width - cx, Math.round(w));
                const ch = Math.min(canvas.height - cy, Math.round(h));
                let hasPixels = false;
                if (cw > 0 && ch > 0) {
                    const pxData = ctx.getImageData(cx, cy, cw, ch).data;
                    for (let i = 3; i < pxData.length; i += 4) {
                        if (pxData[i] > 16) { hasPixels = true; break; }
                    }
                }
                if (hasPixels) nonEmpty = c + 1;

                frameIndex++;
            }
            rowNonEmptyCounts.push(nonEmpty);
        }

        if (!window.npcFootData) window.npcFootData = {};
        window.npcFootData[textureKey] = footData;

        if (!window.npcAnimData) window.npcAnimData = {};
        window.npcAnimData[textureKey] = {
            rowStarts,
            rowNonEmptyCounts
        };
    }

    /**
     * Regenerates a composite texture from saved config data.
     * Used when loading a rescuee from a save file or after zone transition.
     * @param {Object} config - The config object from a previous createRescuee() call
     * @returns {string} The regenerated textureKey
     */
    regenerateTexture(config) {
        const gender = config.gender;
        const genderAssets = this.assets[gender];

        const skinKey = genderAssets.skins[config.skinTone - 1];
        const hairKey = genderAssets.hairs[config.hairStyle - 1];

        let layers;
        if (gender === 'male') {
            const shirtKey = genderAssets.shirts[config.shirtColor];
            const pantsKey = genderAssets.pants[config.pantsColor];
            const bootsKey = genderAssets.boots[0];
            layers = [skinKey, shirtKey, pantsKey, bootsKey, hairKey];
        } else {
            const corsetKey = genderAssets.corsets[config.shirtColor];
            const skirtKey = genderAssets.skirt[0];
            const bootsKey = genderAssets.boots[0];
            layers = [skinKey, corsetKey, skirtKey, bootsKey, hairKey];
        }

        this._compositeTexture(config.textureKey, layers);
        return config.textureKey;
    }
}

window.RescueeNPCFactory = RescueeNPCFactory;
