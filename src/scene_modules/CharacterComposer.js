class CharacterComposer {
    static generateRandomNPC(scene) {
        // 1. Pick gender
        const isMale = Math.random() < 0.5;
        const genderSuffix = isMale ? '_m' : '_f';
        const oppSuffix = isMale ? '_f' : '_m';

        // 2. Base Skin
        const skins = ['npc_male_skin1', 'npc_male_skin2', 'npc_male_skin3', 'npc_male_skin4', 'npc_male_skin5', 
                       'npc_female_skin1', 'npc_female_skin2', 'npc_female_skin3', 'npc_female_skin4', 'npc_female_skin5'];
        const skin = isMale ? skins[Math.floor(Math.random() * 5)] : skins[5 + Math.floor(Math.random() * 5)];

        // Helper to filter assets by gender
        const getAssets = (list) => {
            if (!list || list.length === 0) return [];
            return list.filter(item => !item.endsWith(oppSuffix));
        };

        const ma = window.MODULAR_ASSETS || { hats:[], arms:[], maleClothing:[], femaleClothing:[], hair:[], ears:[], weapons:[] };

        // 3. Clothing
        const baseMaleShirts = ['npc_male_shirt', 'npc_male_shirt_blue', 'npc_male_shirt_green', 'npc_male_shirt_purple', 'npc_male_shirt_orange'];
        const baseFemaleShirts = ['npc_female_corset', 'npc_female_corset_blue', 'npc_female_corset_green', 'npc_female_corset_purple', 'npc_female_corset_orange'];
        
        let shirt = '';
        let pant = '';
        if (isMale) {
            const mClothes = getAssets(ma.maleClothing).concat(baseMaleShirts);
            if (mClothes.length > 0) shirt = mClothes[Math.floor(Math.random() * mClothes.length)];
            pant = ['npc_male_pants', 'npc_male_pants_blue', 'npc_male_pants_green', 'npc_male_pants_purple', 'npc_male_pants_orange'][Math.floor(Math.random() * 5)];
        } else {
            const fClothes = getAssets(ma.femaleClothing).concat(baseFemaleShirts);
            if (fClothes.length > 0) shirt = fClothes[Math.floor(Math.random() * fClothes.length)];
            pant = 'npc_female_skirt';
        }

        // 4. Arms
        let arms = '';
        const validArms = getAssets(ma.arms);
        if (validArms.length > 0 && Math.random() < 0.5) {
            arms = validArms[Math.floor(Math.random() * validArms.length)];
        }

        // 5. Boots
        const boots = isMale ? 'npc_male_boots' : 'npc_female_boots';

        // 6. Ears
        let ears = '';
        const validEars = getAssets(ma.ears);
        if (validEars.length > 0 && Math.random() < 0.4) {
            ears = validEars[Math.floor(Math.random() * validEars.length)];
        }

        // 7. Hair
        let hair = '';
        const validHair = getAssets(ma.hair);
        if (validHair.length > 0 && Math.random() < 0.9) {
            hair = validHair[Math.floor(Math.random() * validHair.length)];
        } else {
            const hairBase = isMale ? 'npc_male_hair' : 'npc_female_hair';
            hair = `${hairBase}${Math.floor(Math.random() * 5) + 1}`;
        }

        // 8. Hat
        let hat = '';
        const validHats = getAssets(ma.hats);
        if (validHats.length > 0 && Math.random() < 0.3) {
            hat = validHats[Math.floor(Math.random() * validHats.length)];
        }

        // 9. Weapon (assign a combat weapon logic later, but let's composite it so they carry it)
        let weapon = '';
        let weaponType = 'sword'; // default attack style
        const validWeapons = getAssets(ma.weapons);
        if (validWeapons.length > 0) {
            weapon = validWeapons[Math.floor(Math.random() * validWeapons.length)];
            if (weapon.includes('axe')) weaponType = 'axe';
            else if (weapon.includes('pickaxe')) weaponType = 'pickaxe';
            else if (weapon.includes('stick')) weaponType = 'magic';
            else if (weapon.includes('hoe')) weaponType = 'hoe';
        }

        // Generate a unique key
        const uniqueKey = `custom_npc_${Math.floor(Math.random() * 9999999)}`;

        // Create canvas - asset pack canonical: 8 cols * 100px = 800w, 7 rows * 64px = 448h
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 448;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;

        // Draw layers in correct order (back to front)
        // Order: skin -> ears -> pant -> shirt -> arms -> boots -> hair -> hat -> weapon
        const layers = [skin, ears, pant, shirt, arms, boots, hair, hat, weapon];
        
        layers.forEach(layerKey => {
            if (!layerKey) return;
            if (scene.textures.exists(layerKey)) {
                const img = scene.textures.get(layerKey).getSourceImage();
                if (img) {
                    ctx.drawImage(img, 0, 0);
                }
            } else {
                console.warn(`CharacterComposer: Missing texture ${layerKey}`);
            }
        });

        const texture = scene.textures.addCanvas(uniqueKey, canvas);

        // Asset pack canonical layout: 100x64 per frame, 8 cols x 7 rows.
        const defaultRows = [];
        for (let r = 0; r < 7; r++) {
            defaultRows.push({ y: r * 64, h: 64 });
        }

        const lookupSkin = (skin && skin.startsWith('npc_male_skin')) ? 'npc_male_skin1' : ((skin && skin.startsWith('npc_female_skin')) ? 'npc_female_skin1' : skin);

        const rowData = (window.sliceData && window.sliceData[lookupSkin])
            ? window.sliceData[lookupSkin]
            : defaultRows;

        const colData = (window.sliceColData && window.sliceColData[lookupSkin]) ? window.sliceColData[lookupSkin] : null;

        const numRows = rowData ? rowData.length : 7;

        // Foot line per frame: the lowest opaque pixel within each frame, in source px from the
        // frame top. Composite frames can vary in height/offset per row (user slice tuning), so the
        // visible feet sit at a different in-frame Y from row to row. NPCController anchors the
        // physics body bottom to this measured foot line per frame so the feet stay on the floor
        // during every animation (idle AND walk), instead of assuming a fixed 64px foot line.
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
            const rowNumCols = rowCols ? rowCols.length : 8;
            let nonEmpty = 0;
            for (let c = 0; c < rowNumCols; c++) {
                const x = rowCols ? rowCols[c].x : c * 100;
                const w = rowCols ? rowCols[c].w : 100;
                const y = rowData[r].y;
                const h = rowData[r].h;
                texture.add(frameIndex, 0, x, y, w, h);
                footData[frameIndex] = findFootY(x, y, w, h);

                // Detect if this frame has any visible pixels on the composite canvas.
                // Empty frames (fully transparent) should be excluded from animations so
                // the NPC doesn't flash invisible mid-cycle.
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
                if (hasPixels) nonEmpty = c + 1; // track last non-empty column (1-based)

                frameIndex++;
            }
            rowNonEmptyCounts.push(nonEmpty);
        }

        if (!window.npcFootData) window.npcFootData = {};
        window.npcFootData[uniqueKey] = footData;
        if (!window.npcLayers) window.npcLayers = {};
        window.npcLayers[uniqueKey] = layers;

        const idleStart = rowStarts[0];
        const walkStart = numRows > 1 ? rowStarts[1] : 0;
        // Use detected non-empty frame counts instead of hardcoded values.
        // The asset pack has 4 idle frames and 7 walk frames per row; the remaining
        // columns are fully transparent. Including them caused a blank-frame flash
        // every cycle, making the feet look broken/skipping.
        const idleFrameCount = Math.max(1, (rowNonEmptyCounts[0] || 4)) - 1; // end is inclusive
        const walkFrameCount = numRows > 1 ? Math.max(1, (rowNonEmptyCounts[1] || 7)) - 1 : idleFrameCount;

        const idleKey = uniqueKey + '_idle';
        if (!scene.anims.exists(idleKey)) {
            scene.anims.create({
                key: idleKey,
                frames: scene.anims.generateFrameNumbers(uniqueKey, { start: idleStart, end: idleStart + idleFrameCount }),
                frameRate: 6,
                repeat: -1
            });
            scene.anims.create({
                key: uniqueKey + '_walk',
                frames: scene.anims.generateFrameNumbers(uniqueKey, { start: walkStart, end: walkStart + walkFrameCount }),
                frameRate: 10,
                repeat: -1
            });
            // Attack animation (Row 2)
            if (numRows >= 3) {
                const attackRowIdx = 2;
                const attackOverrideKey = lookupSkin + '_r' + attackRowIdx;
                const attackCols = (window.sliceColData && window.sliceColData[attackOverrideKey]) || colData;
                const attackFrameCount = attackCols ? attackCols.length : 8;
                scene.anims.create({
                    key: uniqueKey + '_attack',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[attackRowIdx],
                        end: rowStarts[attackRowIdx] + Math.min(5, attackFrameCount - 1)
                    }),
                    frameRate: 12,
                    repeat: 0
                });
            }

            // Hit animation (Row 5)
            if (numRows >= 6) {
                const hitRowIdx = 5;
                const hitOverrideKey = lookupSkin + '_r' + hitRowIdx;
                const hitCols = (window.sliceColData && window.sliceColData[hitOverrideKey]) || colData;
                const hitFrameCount = hitCols ? hitCols.length : 8;
                scene.anims.create({
                    key: uniqueKey + '_hit',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[hitRowIdx],
                        end: rowStarts[hitRowIdx] + Math.min(3, hitFrameCount - 1)
                    }),
                    frameRate: 10,
                    repeat: 0
                });
            }

            // Death animations (Row 6)
            if (numRows >= 7) {
                const deathRowIdx = 6;
                const deathOverrideKey = lookupSkin + '_r' + deathRowIdx;
                const deathCols = (window.sliceColData && window.sliceColData[deathOverrideKey]) || colData;
                const deathFrameCount = deathCols ? deathCols.length : 8;
                const frames = scene.anims.generateFrameNumbers(uniqueKey, {
                    start: rowStarts[deathRowIdx],
                    end: rowStarts[deathRowIdx] + deathFrameCount - 1
                });
                scene.anims.create({
                    key: uniqueKey + '_death',
                    frames: frames,
                    frameRate: 10,
                    repeat: 0
                });
                scene.anims.create({
                    key: uniqueKey + '_die',
                    frames: frames,
                    frameRate: 10,
                    repeat: 0
                });
            }
        }

        // Return the key, the combat style, and the config needed to recreate them
        return { 
            spriteKey: uniqueKey, 
            weaponType: weaponType,
            config: {
                layers: layers,
                weaponType: weaponType
            }
        };
    }

    static recreateNPC(scene, uniqueKey, layers, weaponType) {
        if (scene.textures.exists(uniqueKey)) {
            return { spriteKey: uniqueKey, weaponType: weaponType };
        }

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 448;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;

        layers.forEach(layerKey => {
            if (!layerKey) return;
            if (scene.textures.exists(layerKey)) {
                const img = scene.textures.get(layerKey).getSourceImage();
                if (img) {
                    ctx.drawImage(img, 0, 0);
                }
            } else {
                console.warn(`CharacterComposer: Missing texture ${layerKey}`);
            }
        });

        const texture = scene.textures.addCanvas(uniqueKey, canvas);

        const defaultRows = [];
        for (let r = 0; r < 7; r++) {
            defaultRows.push({ y: r * 64, h: 64 });
        }

        const skin = layers[0];
        const lookupSkin = (skin && skin.startsWith('npc_male_skin')) ? 'npc_male_skin1' : ((skin && skin.startsWith('npc_female_skin')) ? 'npc_female_skin1' : skin);

        const rowData = (window.sliceData && window.sliceData[lookupSkin])
            ? window.sliceData[lookupSkin]
            : defaultRows;

        const colData = (window.sliceColData && window.sliceColData[lookupSkin]) ? window.sliceColData[lookupSkin] : null;
        const numRows = rowData ? rowData.length : 7;

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
            return ch - 1;
        };

        const rowStarts = [];
        const rowNonEmptyCounts = [];
        let frameIndex = 0;
        for (let r = 0; r < numRows; r++) {
            rowStarts.push(frameIndex);
            const overrideKey = lookupSkin + '_r' + r;
            const rowCols = (window.sliceColData && window.sliceColData[overrideKey]) || colData;
            const rowNumCols = rowCols ? rowCols.length : 8;
            let nonEmpty = 0;
            for (let c = 0; c < rowNumCols; c++) {
                const x = rowCols ? rowCols[c].x : c * 100;
                const w = rowCols ? rowCols[c].w : 100;
                const y = rowData[r].y;
                const h = rowData[r].h;
                texture.add(frameIndex, 0, x, y, w, h);
                footData[frameIndex] = findFootY(x, y, w, h);

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
        window.npcFootData[uniqueKey] = footData;
        if (!window.npcLayers) window.npcLayers = {};
        window.npcLayers[uniqueKey] = layers;

        const idleStart = rowStarts[0];
        const walkStart = numRows > 1 ? rowStarts[1] : 0;
        const idleFrameCount = Math.max(1, (rowNonEmptyCounts[0] || 4)) - 1;
        const walkFrameCount = numRows > 1 ? Math.max(1, (rowNonEmptyCounts[1] || 7)) - 1 : idleFrameCount;

        const idleKey = uniqueKey + '_idle';
        if (!scene.anims.exists(idleKey)) {
            scene.anims.create({
                key: idleKey,
                frames: scene.anims.generateFrameNumbers(uniqueKey, { start: idleStart, end: idleStart + idleFrameCount }),
                frameRate: 6,
                repeat: -1
            });
            scene.anims.create({
                key: uniqueKey + '_walk',
                frames: scene.anims.generateFrameNumbers(uniqueKey, { start: walkStart, end: walkStart + walkFrameCount }),
                frameRate: 10,
                repeat: -1
            });
            // Attack animation (Row 2)
            if (numRows >= 3) {
                const attackRowIdx = 2;
                const attackOverrideKey = lookupSkin + '_r' + attackRowIdx;
                const attackCols = (window.sliceColData && window.sliceColData[attackOverrideKey]) || colData;
                const attackFrameCount = attackCols ? attackCols.length : 8;
                scene.anims.create({
                    key: uniqueKey + '_attack',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[attackRowIdx],
                        end: rowStarts[attackRowIdx] + Math.min(5, attackFrameCount - 1)
                    }),
                    frameRate: 12,
                    repeat: 0
                });
            }

            // Hit animation (Row 5)
            if (numRows >= 6) {
                const hitRowIdx = 5;
                const hitOverrideKey = lookupSkin + '_r' + hitRowIdx;
                const hitCols = (window.sliceColData && window.sliceColData[hitOverrideKey]) || colData;
                const hitFrameCount = hitCols ? hitCols.length : 8;
                scene.anims.create({
                    key: uniqueKey + '_hit',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[hitRowIdx],
                        end: rowStarts[hitRowIdx] + Math.min(3, hitFrameCount - 1)
                    }),
                    frameRate: 10,
                    repeat: 0
                });
            }

            // Death animations (Row 6)
            if (numRows >= 7) {
                const deathRowIdx = 6;
                const deathOverrideKey = lookupSkin + '_r' + deathRowIdx;
                const deathCols = (window.sliceColData && window.sliceColData[deathOverrideKey]) || colData;
                const deathFrameCount = deathCols ? deathCols.length : 8;
                const frames = scene.anims.generateFrameNumbers(uniqueKey, {
                    start: rowStarts[deathRowIdx],
                    end: rowStarts[deathRowIdx] + deathFrameCount - 1
                });
                scene.anims.create({
                    key: uniqueKey + '_death',
                    frames: frames,
                    frameRate: 10,
                    repeat: 0
                });
                scene.anims.create({
                    key: uniqueKey + '_die',
                    frames: frames,
                    frameRate: 10,
                    repeat: 0
                });
            }
        }

        return { spriteKey: uniqueKey, weaponType: weaponType };
    }

    static generateRandomName() {
        const isFunny = Math.random() < 0.3;
        if (isFunny) {
            const first = ["Gorg", "Blorp", "Squee", "Chunk", "Fumble", "Snarfy", "Wobble", "Gristle"];
            const title = ["the Unwashed", "the Confused", "the Round", "the Sticky", "the Loud", "of the Puddle"];
            return first[Math.floor(Math.random() * first.length)] + " " + title[Math.floor(Math.random() * title.length)];
        } else {
            const first = ["Elara", "Thorn", "Kaelen", "Lyra", "Gareth", "Sylas", "Vael", "Rowan"];
            const last = ["Starwhisper", "Ironfoot", "Stormrider", "Nightshade", "Dawncaller", "Oakhaven"];
            if (Math.random() < 0.5) return first[Math.floor(Math.random() * first.length)];
            return first[Math.floor(Math.random() * first.length)] + " " + last[Math.floor(Math.random() * last.length)];
        }
    }
}

window.CharacterComposer = CharacterComposer;
