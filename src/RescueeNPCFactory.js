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
            'Silas', 'Idris', 'Fenwick', 'Godric', 'Emeric'
        ];

        this.femaleNames = [
            'Lyra', 'Mira', 'Elara', 'Seraphina', 'Isolde',
            'Rowena', 'Brynn', 'Astrid', 'Elowen', 'Calista',
            'Thea', 'Fiora', 'Sage', 'Linnea', 'Daphne',
            'Willa', 'Rhiannon', 'Ondine', 'Cerys', 'Aisling'
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
        canvas.height = sheetHeight;
        const ctx = canvas.getContext('2d');

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

        // Register the composited canvas as a Phaser spritesheet
        // Frame size: 100×64, 8 columns × 7 rows
        this.scene.textures.addSpriteSheet(textureKey, canvas, {
            frameWidth: 100,
            frameHeight: 64
        });
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
