class CharacterComposer {
    static generateRandomNPC(scene, gender = null, options = {}) {
        // 1. Pick gender — caller can pass 'male', 'female', or null (random)
        const isMale = gender === 'male' ? true : gender === 'female' ? false : Math.random() < 0.5;
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
        if (options.isElven) {
            const elvenEars = validEars.filter(e => e.includes('elven'));
            if (elvenEars.length > 0) {
                ears = elvenEars[Math.floor(Math.random() * elvenEars.length)];
            } else if (validEars.length > 0) {
                ears = validEars[Math.floor(Math.random() * validEars.length)];
            }
        } else {
            if (validEars.length > 0 && Math.random() < 0.4) {
                ears = validEars[Math.floor(Math.random() * validEars.length)];
            }
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
        const uniqueKey = `custom_npc_${isMale ? 'male' : 'female'}_${Math.floor(Math.random() * 9999999)}`;

        // Create canvas - asset pack canonical: 10 cols * 80px = 800w, 7 rows * 64px = 448h
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

        // Asset pack canonical layout: 80x64 per frame, 10 cols x 7 rows.
        const defaultRows = [];
        for (let r = 0; r < 7; r++) {
            const h = (r === 3) ? 60 : 64;
            defaultRows.push({ y: r * 64, h: h });
        }

        const lookupSkin = (skin && skin.startsWith('npc_male_skin')) ? 'npc_male_skin1' : ((skin && skin.startsWith('npc_female_skin')) ? 'npc_female_skin1' : skin);

        const rowData = (window.sliceData && window.sliceData[lookupSkin])
            ? window.sliceData[lookupSkin]
            : defaultRows;

        let colData = (window.sliceColData && window.sliceColData[lookupSkin]) ? window.sliceColData[lookupSkin] : null;
        if (!colData && (lookupSkin.startsWith('npc_male') || lookupSkin.startsWith('npc_female') || lookupSkin.startsWith('custom_'))) {
            colData = [];
            for (let c = 0; c < 8; c++) colData.push({ x: c * 100, w: 100 });
        }

        const numRows = rowData ? rowData.length : 7;

        // Foot line per frame: the lowest opaque pixel within each frame, in source px from the
        // frame top. Composite frames can vary in height/offset per row (user slice tuning), so the
        // visible feet sit at a different in-frame Y from row to row. NPCController anchors the
        // physics body bottom to this measured foot line per frame so the feet stay on the floor
        // during every animation (idle AND walk), instead of assuming a fixed 64px foot line.
        const footData = [];
        const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const fullData = fullImageData.data;
        const canvasW = canvas.width;

        const findFootY = (fx, fy, fw, fh) => {
            const cx = Math.max(0, Math.round(fx));
            const cy = Math.max(0, Math.round(fy));
            const cw = Math.min(canvasW - cx, Math.round(fw));
            const ch = Math.min(canvas.height - cy, Math.round(fh));
            if (cw <= 0 || ch <= 0) return -1;
            for (let yy = ch - 1; yy >= 0; yy--) {
                const absoluteY = cy + yy;
                for (let xx = 0; xx < cw; xx++) {
                    const absoluteX = cx + xx;
                    const idx = (absoluteY * canvasW + absoluteX) * 4 + 3;
                    if (fullData[idx] > 16) return yy;
                }
            }
            return -1; // fully transparent
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
            let lastValidFootY = -1;
            for (let c = 0; c < rowNumCols; c++) {
                const x = rowCols ? rowCols[c].x : c * 80;
                const w = rowCols ? rowCols[c].w : 80;
                const y = rowData[r].y;
                const h = rowData[r].h;
                texture.add(frameIndex, 0, x, y, w, h);
                
                // Scan the base skin + boots first to prevent vertical bleeds from hats/heads of other rows
                let footY = CharacterComposer.scanBaseFootY(scene, skin, boots, r, c, y, h);
                if (footY === -1 && (!skin || !scene.textures.exists(skin))) {
                    footY = findFootY(x, y, w, h);
                }
                
                let hasPixels = false;
                
                if (footY !== -1) {
                    // If the lowest pixel is in the top 25 pixels, it's a stray hat bleed, NOT a real character body!
                    if (footY >= 25) {
                        hasPixels = true;
                        lastValidFootY = footY;
                    } else {
                        // It's a hat bleed. We treat this frame as empty to prevent the bleed from being rendered.
                        // We also don't want this hat pixel to be used as the foot baseline, so we reset footY to the bottom.
                        footY = Math.round(h) - 1;
                    }
                }
                
                if (footY === -1) {
                    footY = lastValidFootY !== -1 ? lastValidFootY : Math.round(h) - 1;
                }
                
                footData[frameIndex] = footY;
                
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
            // Attack animation (Row 5)
            if (numRows >= 6) {
                const attackRowIdx = 5;
                const attackOverrideKey = lookupSkin + '_r' + attackRowIdx;
                const attackCols = (window.sliceColData && window.sliceColData[attackOverrideKey]) || colData;
                const attackFrameCount = attackCols ? attackCols.length : 8;
                scene.anims.create({
                    key: uniqueKey + '_attack',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[attackRowIdx],
                        end: rowStarts[attackRowIdx] + Math.max(1, (rowNonEmptyCounts[attackRowIdx] || attackFrameCount)) - 1
                    }),
                    frameRate: 16,
                    repeat: 0
                });
            }

            // Hit animation (Row 4 - Duck/Block row)
            if (numRows >= 5) {
                const hitRowIdx = 4;
                const hitOverrideKey = lookupSkin + '_r' + hitRowIdx;
                const hitCols = (window.sliceColData && window.sliceColData[hitOverrideKey]) || colData;
                const hitFrameCount = hitCols ? hitCols.length : 8;
                scene.anims.create({
                    key: uniqueKey + '_hit',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[hitRowIdx],
                        end: rowStarts[hitRowIdx] + Math.min(2, hitFrameCount - 1)
                    }),
                    frameRate: 10,
                    repeat: 0
                });
            }

            // Jump & Fall animations (Row 3 - Jump row)
            if (numRows >= 4) {
                const jumpRowIdx = 3;
                const jumpOverrideKey = lookupSkin + '_r' + jumpRowIdx;
                const jumpCols = (window.sliceColData && window.sliceColData[jumpOverrideKey]) || colData;
                const jumpFrameCount = jumpCols ? jumpCols.length : 8;
                scene.anims.create({
                    key: uniqueKey + '_jump',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[jumpRowIdx],
                        end: rowStarts[jumpRowIdx] + Math.min(2, jumpFrameCount - 1)
                    }),
                    frameRate: 10,
                    repeat: -1
                });
                scene.anims.create({
                    key: uniqueKey + '_fall',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[jumpRowIdx] + (jumpFrameCount > 1 ? 1 : 0),
                        end: rowStarts[jumpRowIdx] + Math.min(2, jumpFrameCount - 1)
                    }),
                    frameRate: 10,
                    repeat: -1
                });
            }

            // Duck/Block animation — use Row 1 Frame 0 as block pose
            if (numRows >= 2) {
                scene.anims.create({
                    key: uniqueKey + '_duck',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[1],
                        end: rowStarts[1]
                    }),
                    frameRate: 8,
                    repeat: -1
                });
            } else {
                // Fallback: use idle frame 0 if only 1 row
                scene.anims.create({
                    key: uniqueKey + '_duck',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[0],
                        end: rowStarts[0]
                    }),
                    frameRate: 8,
                    repeat: -1
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

        // Clean up any stale animations referencing the old texture key to prevent Phaser from using destroyed frames
        const animKeysToRemove = [
            uniqueKey + '_idle',
            uniqueKey + '-idle',
            uniqueKey + '_walk',
            uniqueKey + '-move'
        ];
        animKeysToRemove.forEach(key => {
            if (scene.anims && scene.anims.exists(key)) {
                scene.anims.remove(key);
            }
        });

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
            const h = (r === 3) ? 60 : 64;
            defaultRows.push({ y: r * 64, h: h });
        }

        const skin = layers.find(l => l && l.includes('skin')) || layers[0] || '';
        const boots = layers.find(l => l && l.includes('boots')) || '';
        const lookupSkin = (skin && skin.startsWith('npc_male_skin')) ? 'npc_male_skin1' : ((skin && skin.startsWith('npc_female_skin')) ? 'npc_female_skin1' : skin);

        const rowData = (window.sliceData && window.sliceData[lookupSkin])
            ? window.sliceData[lookupSkin]
            : defaultRows;

        let colData = (window.sliceColData && window.sliceColData[lookupSkin]) ? window.sliceColData[lookupSkin] : null;
        if (!colData && (lookupSkin.startsWith('npc_male') || lookupSkin.startsWith('npc_female') || lookupSkin.startsWith('custom_'))) {
            colData = [];
            for (let c = 0; c < 8; c++) colData.push({ x: c * 100, w: 100 });
        }
        const numRows = rowData ? rowData.length : 7;

        const footData = [];
        const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const fullData = fullImageData.data;
        const canvasW = canvas.width;

        const findFootY = (fx, fy, fw, fh) => {
            const cx = Math.max(0, Math.round(fx));
            const cy = Math.max(0, Math.round(fy));
            const cw = Math.min(canvasW - cx, Math.round(fw));
            const ch = Math.min(canvas.height - cy, Math.round(fh));
            if (cw <= 0 || ch <= 0) return Math.round(fh) - 1;
            for (let yy = ch - 1; yy >= 0; yy--) {
                const absoluteY = cy + yy;
                for (let xx = 0; xx < cw; xx++) {
                    const absoluteX = cx + xx;
                    const idx = (absoluteY * canvasW + absoluteX) * 4 + 3;
                    if (fullData[idx] > 16) return yy;
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
            const rowNumCols = rowCols ? rowCols.length : 10;
            let nonEmpty = 0;
            let lastValidFootY = -1;
            for (let c = 0; c < rowNumCols; c++) {
                const x = rowCols ? rowCols[c].x : c * 80;
                const w = rowCols ? rowCols[c].w : 80;
                const y = rowData[r].y;
                const h = rowData[r].h;
                texture.add(frameIndex, 0, x, y, w, h);
                
                // Scan the base skin + boots first to prevent vertical bleeds from hats/heads of other rows
                let footY = CharacterComposer.scanBaseFootY(scene, skin, boots, r, c, y, h);
                if (footY === -1 && (!skin || !scene.textures.exists(skin))) {
                    footY = findFootY(x, y, w, h);
                }
                
                if (footY !== -1) {
                    lastValidFootY = footY;
                } else {
                    footY = lastValidFootY !== -1 ? lastValidFootY : Math.round(h) - 1;
                }
                footData[frameIndex] = footY;

                const cx = Math.max(0, Math.round(x));
                const cy = Math.max(0, Math.round(y));
                const cw = Math.min(canvasW - cx, Math.round(w));
                const ch = Math.min(canvas.height - cy, Math.round(h));
                let hasPixels = false;
                if (cw > 0 && ch > 0) {
                    for (let yy = 0; yy < ch; yy++) {
                        const absoluteY = cy + yy;
                        for (let xx = 0; xx < cw; xx++) {
                            const absoluteX = cx + xx;
                            const idx = (absoluteY * canvasW + absoluteX) * 4 + 3;
                            if (fullData[idx] > 16) {
                                hasPixels = true;
                                break;
                            }
                        }
                        if (hasPixels) break;
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
            // Attack animation (Row 5)
            if (numRows >= 6) {
                const attackRowIdx = 5;
                const attackOverrideKey = lookupSkin + '_r' + attackRowIdx;
                const attackCols = (window.sliceColData && window.sliceColData[attackOverrideKey]) || colData;
                const attackFrameCount = attackCols ? attackCols.length : 8;
                scene.anims.create({
                    key: uniqueKey + '_attack',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[attackRowIdx],
                        end: rowStarts[attackRowIdx] + Math.max(1, (rowNonEmptyCounts[attackRowIdx] || attackFrameCount)) - 1
                    }),
                    frameRate: 16,
                    repeat: 0
                });
            }

            // Hit animation (Row 4 - Duck/Block row)
            if (numRows >= 5) {
                const hitRowIdx = 4;
                const hitOverrideKey = lookupSkin + '_r' + hitRowIdx;
                const hitCols = (window.sliceColData && window.sliceColData[hitOverrideKey]) || colData;
                const hitFrameCount = hitCols ? hitCols.length : 8;
                scene.anims.create({
                    key: uniqueKey + '_hit',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[hitRowIdx],
                        end: rowStarts[hitRowIdx] + Math.min(2, hitFrameCount - 1)
                    }),
                    frameRate: 10,
                    repeat: 0
                });
            }

            // Jump & Fall animations (Row 3 - Jump row)
            if (numRows >= 4) {
                const jumpRowIdx = 3;
                const jumpOverrideKey = lookupSkin + '_r' + jumpRowIdx;
                const jumpCols = (window.sliceColData && window.sliceColData[jumpOverrideKey]) || colData;
                const jumpFrameCount = jumpCols ? jumpCols.length : 8;
                scene.anims.create({
                    key: uniqueKey + '_jump',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[jumpRowIdx],
                        end: rowStarts[jumpRowIdx] + Math.min(2, jumpFrameCount - 1)
                    }),
                    frameRate: 10,
                    repeat: -1
                });
                scene.anims.create({
                    key: uniqueKey + '_fall',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[jumpRowIdx] + (jumpFrameCount > 1 ? 1 : 0),
                        end: rowStarts[jumpRowIdx] + Math.min(2, jumpFrameCount - 1)
                    }),
                    frameRate: 10,
                    repeat: -1
                });
            }

            // Duck animation (Row 1 Frame 0 - block pose)
            if (numRows >= 2) {
                scene.anims.create({
                    key: uniqueKey + '_duck',
                    frames: scene.anims.generateFrameNumbers(uniqueKey, {
                        start: rowStarts[1],
                        end: rowStarts[1]
                    }),
                    frameRate: 8,
                    repeat: -1
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

    static generateSpecialEnemy(scene, type, gender, forceKey = null) {
        if (forceKey && scene.textures.exists(forceKey)) {
            return { spriteKey: forceKey, weaponType: 'sword' };
        }
        const isMale = gender === 'male';
        const genderSuffix = isMale ? '_m' : '_f';
        const oppSuffix = isMale ? '_f' : '_m';

        // 1. Base Skin
        const skin = `special_${gender}_${type}`;

        // Helper to filter assets by gender
        const getAssets = (list) => {
            if (!list || list.length === 0) return [];
            return list.filter(item => !item.endsWith(oppSuffix));
        };

        const ma = window.MODULAR_ASSETS || { hats:[], arms:[], maleClothing:[], femaleClothing:[], hair:[], ears:[], weapons:[] };

        // 2. Clothing (demon/devil/orc/zombie/ghost can have clothing)
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

        // 3. Boots
        const boots = isMale ? 'npc_male_boots' : 'npc_female_boots';

        // 4. Arms (optional gloves/armor)
        let arms = '';
        const validArms = getAssets(ma.arms);
        if (validArms.length > 0 && Math.random() < 0.6) {
            arms = validArms[Math.floor(Math.random() * validArms.length)];
        }

        // 5. Hair (optional)
        let hair = '';
        const validHair = getAssets(ma.hair);
        if (validHair.length > 0 && Math.random() < 0.5) {
            hair = validHair[Math.floor(Math.random() * validHair.length)];
        }

        // 6. Hat / Helmet (optional)
        let hat = '';
        const validHats = getAssets(ma.hats);
        if (validHats.length > 0 && Math.random() < 0.4) {
            hat = validHats[Math.floor(Math.random() * validHats.length)];
        }

        // 7. Weapon (enemies should be armed!)
        let weapon = '';
        let weaponType = 'sword';
        const validWeapons = getAssets(ma.weapons);
        if (validWeapons.length > 0) {
            weapon = validWeapons[Math.floor(Math.random() * validWeapons.length)];
            if (weapon.includes('axe')) weaponType = 'axe';
            else if (weapon.includes('pickaxe')) weaponType = 'pickaxe';
            else if (weapon.includes('stick')) weaponType = 'magic';
            else if (weapon.includes('hoe')) weaponType = 'hoe';
        }

        // Unique Key for this enemy instance
        const uniqueKey = forceKey || `special_enemy_${type}_${gender}_${Math.floor(Math.random() * 9999999)}`;

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 448;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;

        // Draw layers (back to front): skin -> pant -> shirt -> arms -> boots -> hair -> hat -> weapon
        const layers = [skin, pant, shirt, arms, boots, hair, hat, weapon];
        
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

        // If it is a ghost enemy, programmatically draw a glowing golden halo above their head for every animation frame
        if (type === 'ghost' && scene.zoneBiome === 'Heaven') {
            ctx.strokeStyle = '#ffe855';
            ctx.lineWidth = 1.5;
            ctx.fillStyle = 'rgba(255, 232, 85, 0.4)';
            const numRows = 7;
            for (let r = 0; r < numRows; r++) {
                for (let c = 0; c < 8; c++) {
                    const frameX = c * 100 + 50;
                    const frameY = r * 64 + 14; // slightly above the head
                    
                    ctx.beginPath();
                    ctx.ellipse(frameX, frameY, 8, 2.5, -0.05, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }

        const texture = scene.textures.addCanvas(uniqueKey, canvas);

        const defaultRows = [];
        for (let r = 0; r < 7; r++) {
            const h = (r === 3) ? 60 : 64;
            defaultRows.push({ y: r * 64, h: h });
        }

        const rowData = defaultRows;
        const numRows = 7;

        // Find foot Y line per frame
        const footData = [];
        const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const fullData = fullImageData.data;
        const canvasW = canvas.width;

        const findFootY = (fx, fy, fw, fh) => {
            const cx = Math.max(0, Math.round(fx));
            const cy = Math.max(0, Math.round(fy));
            const cw = Math.min(canvasW - cx, Math.round(fw));
            const ch = Math.min(canvas.height - cy, Math.round(fh));
            if (cw <= 0 || ch <= 0) return Math.round(fh) - 1;
            for (let yy = ch - 1; yy >= 0; yy--) {
                const absoluteY = cy + yy;
                for (let xx = 0; xx < cw; xx++) {
                    const absoluteX = cx + xx;
                    const idx = (absoluteY * canvasW + absoluteX) * 4 + 3;
                    if (fullData[idx] > 16) return yy;
                }
            }
            return ch - 1;
        };

        const rowStarts = [];
        const rowNonEmptyCounts = [];
        let frameIndex = 0;
        for (let r = 0; r < numRows; r++) {
            rowStarts.push(frameIndex);
            let nonEmpty = 0;
            for (let c = 0; c < 10; c++) {
                const x = c * 80;
                const w = 80;
                const y = r * 64;
                const h = (r === 3) ? 60 : 64;
                texture.add(frameIndex, 0, x, y, w, h);
                footData[frameIndex] = findFootY(x, y, w, h);

                const cx = Math.max(0, Math.round(x));
                const cy = Math.max(0, Math.round(y));
                const cw = Math.min(canvasW - cx, Math.round(w));
                const ch = Math.min(canvas.height - cy, Math.round(h));
                let hasPixels = false;
                if (cw > 0 && ch > 0) {
                    for (let yy = 0; yy < ch; yy++) {
                        const absoluteY = cy + yy;
                        for (let xx = 0; xx < cw; xx++) {
                            const absoluteX = cx + xx;
                            const idx = (absoluteY * canvasW + absoluteX) * 4 + 3;
                            if (fullData[idx] > 16) {
                                hasPixels = true;
                                break;
                            }
                        }
                        if (hasPixels) break;
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
        const walkStart = rowStarts[1];
        const idleFrameCount = Math.max(1, (rowNonEmptyCounts[0] || 4)) - 1;
        const walkFrameCount = Math.max(1, (rowNonEmptyCounts[1] || 7)) - 1;

        // Register enemy animations using hyphen suffix
        scene.anims.create({
            key: uniqueKey + '-idle',
            frames: scene.anims.generateFrameNumbers(uniqueKey, { start: idleStart, end: idleStart + idleFrameCount }),
            frameRate: 6,
            repeat: -1
        });
        scene.anims.create({
            key: uniqueKey + '-move',
            frames: scene.anims.generateFrameNumbers(uniqueKey, { start: walkStart, end: walkStart + walkFrameCount }),
            frameRate: 10,
            repeat: -1
        });
        // Attack (Row 5)
        scene.anims.create({
            key: uniqueKey + '-attack',
            frames: scene.anims.generateFrameNumbers(uniqueKey, { start: rowStarts[5], end: rowStarts[5] + Math.max(1, (rowNonEmptyCounts[5] || 8)) - 1 }),
            frameRate: 16,
            repeat: 0
        });
        // Hit (Row 4 - Duck/Block row)
        scene.anims.create({
            key: uniqueKey + '-hit',
            frames: scene.anims.generateFrameNumbers(uniqueKey, { start: rowStarts[4], end: rowStarts[4] + Math.min(2, (rowNonEmptyCounts[4] || 3) - 1) }),
            frameRate: 10,
            repeat: 0
        });
        // Die
        scene.anims.create({
            key: uniqueKey + '-die',
            frames: scene.anims.generateFrameNumbers(uniqueKey, { start: rowStarts[6], end: rowStarts[6] + Math.min(5, (rowNonEmptyCounts[6] || 6) - 1) }),
            frameRate: 10,
            repeat: 0
        });

        return { spriteKey: uniqueKey, weaponType: weaponType };
    }

    static generateRandomName(theme = null) {
        // Large, diverse pools of thematic names
        const knightNames = [
            "Aldric", "Theron", "Gareth", "Bram", "Valerius", "Arthur", "Lancelot", "Galahad", 
            "Godric", "Emeric", "Balin", "Gawain", "Ector", "Percival", "Tristan", "Bors",
            "Cador", "Lucan", "Bedivere", "Kay", "Alisander", "Drian", "Garm", "Sigurd",
            "Uther", "Gorn", "Garret", "Lothar", "Wulfgar", "Dax", "Brutus", "Drake",
            "Talon", "Cassian", "Leif", "Osric", "Halden", "Corbin", "Silas", "Rowan"
        ];
        const wizardNames = [
            "Ignatius", "Elidor", "Zephyr", "Sophia", "Merlin", "Alistair", "Archibald", "Balthazar",
            "Gideon", "Gwydion", "Morgana", "Riven", "Solomon", "Thaddeus", "Orpheus", "Morrigan",
            "Prospero", "Aurelius", "Cyrus", "Vesper", "Saskia", "Kaelen", "Valera", "Jalyn",
            "Rhea", "Daphne", "Selene", "Hesperia", "Korr", "Rune", "Astral", "Ondine",
            "Zephyrus", "Lucius", "Morbius", "Malakai", "Gaius", "Salazar", "Damian", "Ignis"
        ];
        const rangerNames = [
            "Orion", "Robin", "Sylas", "Elowen", "Sylvan", "Thorn", "Rowan", "Wren", "Corbin",
            "Faolan", "Hunter", "Talon", "Hawke", "Fletcher", "Bowen", "Artemis", "Yara",
            "Kestrel", "Peregrine", "Silva", "Garrick", "Scythe", "Tracker", "Mist", "Shadow",
            "Swift", "Archer", "Brand", "Ranger", "Elm", "Ash", "River", "Forest",
            "Bramble", "Bark", "Clover", "Flint", "Ridge", "Gully", "Fern"
        ];
        const samuraiNames = [
            "Kenji", "Hiroshi", "Takeshi", "Musashi", "Jin", "Katsu", "Nobu", "Tomoe", "Kaede",
            "Yuki", "Hattori", "Hanzo", "Juro", "Kojiro", "Sojiro", "Gennosuke", "Chiba",
            "Masamune", "Muramasa", "Saito", "Tadao", "Ryoma", "Shingen", "Kenshin", "Yojimbo",
            "Ronin", "Katashi", "Katsuro", "Raiden", "Ren", "Ryu", "Shinji", "Taiki",
            "Takahiro", "Yasuo", "Yoshi", "Kaito", "Daiki", "Tariq", "Sato"
        ];
        const warriorNames = [
            "Conan", "Ragnar", "Kratos", "Brom", "Sigurd", "Rolf", "Torstein", "Bjorn",
            "Gunnar", "Halfdan", "Harald", "Ivar", "Odin", "Thor", "Loki", "Tyr",
            "Garm", "Fenrir", "Beowulf", "Wulf", "Fang", "Claw", "Gore", "Slayer",
            "Bloodaxe", "Ironshield", "Stormfury", "Stonefist", "Grim", "Savage", "Brute",
            "Harkon", "Valkyrie", "Freya", "Astrid", "Hilda", "Brunhilda", "Sigrid", "Ingrid"
        ];
        const generalNames = [
            "Lyra", "Mira", "Seraphina", "Isolde", "Rowena", "Brynn", "Astrid", "Calista",
            "Thea", "Fiora", "Linnea", "Rhiannon", "Cerys", "Aisling", "Sylvia",
            "Orin", "Briar", "Cora", "Dara", "Eira", "Fay", "Gwen", "Hazel",
            "Iris", "Jade", "Maeve", "Niamh", "Opal", "Pearl", "Quinn", "Rose",
            "Saffron", "Talia", "Una", "Violet", "Wren", "Xenia", "Yvaine", "Zola",
            "Cedric", "Darian", "Emeric", "Halden", "Idris", "Leif", "Osric", "Silas"
        ];
        const dwarfNames = [
            "Thorin", "Gimli", "Balin", "Dvalin", "Gloin", "Bofur", "Bifur", "Bombur", "Dain",
            "Thrain", "Thror", "Bruenor", "Durnar", "Kili", "Fili", "Oin", "Korgan", "Yeslick",
            "Barim", "Brokk", "Sindri", "Eitri", "Gurnison", "Gotrek", "Durin", "Moradin",
            "Fargrim", "Hlin", "Torgga", "Audhild", "Dagnal", "Gunnloda", "Bardryn", "Helja"
        ];
        const dwarfLastNames = [
            "Ironfist", "Stonebreaker", "Coppervein", "Shieldbiter", "Goldfinder", "Deepdelver",
            "Thunderhammer", "Anvilbreaker", "Orebearer", "Axebreaker", "Gildedbeard", "Runecarver"
        ];
        const elvenNames = [
            "Elowen", "Legolas", "Elara", "Galadriel", "Celeborn", "Haldir", "Thranduil",
            "Aredhel", "Elladan", "Elrohir", "Glorfindel", "Cirdan", "Arwen", "Elrond",
            "Sylara", "Faelar", "Aerendyl", "Miriél", "Lúthien", "Beren", "Finrod", "Turgon"
        ];
        const elvenLastNames = [
            "Greenleaf", "Windrunner", "Starwhisper", "Sunshadow", "Forestwalker", "Silverspear",
            "Dawnweaver", "Spellweaver", "Oakheart", "Gladekeeper", "Starlight", "Riverflow"
        ];

        const funnyFirst = ["Gorg", "Blorp", "Squee", "Chunk", "Fumble", "Snarfy", "Wobble", "Gristle", "Pug", "Dink", "Plop", "Grumble", "Sprout", "Pip", "Blob"];
        const funnyTitle = ["the Unwashed", "the Confused", "the Round", "the Sticky", "the Loud", "of the Puddle", "the Clumsy", "the Hungry", "the Sleepy", "the Bold-ish"];
        const lastNames = ["Starwhisper", "Ironfoot", "Stormrider", "Nightshade", "Dawncaller", "Oakhaven", "Goldseeker", "Silverblade", "Stonebreaker", "Wildrunner"];

        const isFunny = Math.random() < 0.2;
        if (isFunny) {
            return funnyFirst[Math.floor(Math.random() * funnyFirst.length)] + " " + funnyTitle[Math.floor(Math.random() * funnyTitle.length)];
        }

        // Detect pool based on theme/class
        let pool = generalNames;
        let poolLast = lastNames;
        const normalizedTheme = theme ? theme.toLowerCase() : "";
        if (normalizedTheme.includes("dwarf") || normalizedTheme.includes("dwarven")) {
            pool = dwarfNames;
            poolLast = dwarfLastNames;
        } else if (normalizedTheme.includes("elf") || normalizedTheme.includes("elven") || normalizedTheme.includes("sylvan")) {
            pool = elvenNames;
            poolLast = elvenLastNames;
        } else if (normalizedTheme.includes("knight") || normalizedTheme.includes("melee")) {
            pool = knightNames;
        } else if (normalizedTheme.includes("wizard") || normalizedTheme.includes("staff") || normalizedTheme.includes("alchemist") || normalizedTheme.includes("sage")) {
            pool = wizardNames;
        } else if (normalizedTheme.includes("ranger") || normalizedTheme.includes("bow") || normalizedTheme.includes("daggers")) {
            pool = rangerNames;
        } else if (normalizedTheme.includes("samurai") || normalizedTheme.includes("blade")) {
            pool = samuraiNames;
        } else if (normalizedTheme.includes("warrior") || normalizedTheme.includes("barbarian")) {
            pool = warriorNames;
        }

        const first = pool[Math.floor(Math.random() * pool.length)];
        if (Math.random() < 0.4) {
            return first;
        }
        const last = poolLast[Math.floor(Math.random() * poolLast.length)];
        return first + " " + last;
    }

    static scanBaseFootY(scene, skinKey, bootsKey, r, c, tunedY, tunedH) {
        if (!skinKey || !scene.textures.exists(skinKey)) {
            return -1;
        }
        
        const cacheKey = skinKey + (bootsKey ? "_" + bootsKey : "");
        if (!window._skinFootDataCache) window._skinFootDataCache = {};
        
        if (!window._skinFootDataCache[cacheKey]) {
            const skinImg = scene.textures.get(skinKey).getSourceImage();
            if (!skinImg) return -1;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = skinImg.width || 800;
            tempCanvas.height = skinImg.height || 448;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            tempCtx.drawImage(skinImg, 0, 0);
            
            if (bootsKey && scene.textures.exists(bootsKey)) {
                const bootsImg = scene.textures.get(bootsKey).getSourceImage();
                if (bootsImg) {
                    tempCtx.drawImage(bootsImg, 0, 0);
                }
            }
            
            window._skinFootDataCache[cacheKey] = {
                data: tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data,
                width: tempCanvas.width
            };
        }
        
        const cached = window._skinFootDataCache[cacheKey];
        const origFrameH = 64;
        const origFrameW = (cached.width === 800) ? 100 : 80;
        
        const origX = c * origFrameW;
        const origY = r * origFrameH;
        
        let foundYY = -1;
        for (let yy = origFrameH - 1; yy >= 0; yy--) {
            const absoluteY = origY + yy;
            for (let xx = 0; xx < origFrameW; xx++) {
                const absoluteX = origX + xx;
                const idx = (absoluteY * cached.width + absoluteX) * 4 + 3;
                if (cached.data[idx] > 16) {
                    foundYY = yy;
                    break;
                }
            }
            if (foundYY !== -1) break;
        }
        
        if (foundYY === -1) {
            return -1;
        }
        
        const absoluteFootY = origY + foundYY;
        const tunedFootY = absoluteFootY - tunedY;
        return Math.max(0, Math.min(tunedH - 1, tunedFootY));
    }
}

window.CharacterComposer = CharacterComposer;
