function getInsideFrame(floorKey, floorFrame) {
    if (floorKey === 'floor') {
        if (floorFrame === 109) return 118; // winter snow inside
        return 10; // default grass/dirt inside
    }
    if (floorKey === 'floor_desert') {
        return 138; // solid canyon clay inside (replaces frame 17/30/31 which had pillars/stripes/triangles)
    }
    if (floorKey === 'floor_hell') {
        return 32; // solid hell slate inside (replaces frame 17 which was a pillar with transparency)
    }
    return 0; // fallback
}

function addDeepGround(scene, x, startY, endY, floorKey, floorFrame, floorTint) {
    const insideFrame = getInsideFrame(floorKey, floorFrame);
    // Spacing between blocks is 46px (32px * 1.5 = 48px, so 46px spacing gives a tiny overlap to avoid seams)
    for (let dy = startY; dy <= endY; dy += 46) {
        const img = scene.add.image(x, dy, floorKey, insideFrame);
        img.setScale(1.5);
        img.setDepth(-8);
        if (floorTint !== 0xffffff) {
            img.setTint(floorTint);
        }
        scene.bgLayers.push(img);
    }
}

class LevelGenerator {
    constructor(scene) {
        this.scene = scene;
    }

    setBiomeVisuals(biomeOrZoneData, zoneType = 'Hostile') {
        let biome = biomeOrZoneData;
        let type = zoneType;
        let zoneIndex = (saveData && saveData.currentZone) || 0;
        if (biomeOrZoneData && typeof biomeOrZoneData === 'object') {
            biome = biomeOrZoneData.biome;
            type = biomeOrZoneData.type || zoneType;
            if (biomeOrZoneData.index !== undefined) {
                zoneIndex = biomeOrZoneData.index;
            }
        }

        const isCapital = type === 'Safe' && window.isCapitalCity && window.isCapitalCity(zoneIndex);
        const widthTiles = type === 'Safe' ? (isCapital ? 60 : 40) : 84;

        const scene = this.scene;

        // Clear old background layers
        if (scene.bgLayers) {
            scene.bgLayers.forEach(bg => bg.destroy());
        }
        scene.bgLayers = [];

        // Clear old platforms
        scene.platforms.clear(true, true);

        // Map Biomes to Sky Colors, Floor Tiles, and BG layers
        let skyColor = '#87CEEB'; // Default light blue
        let floorKey = 'floor';
        let floorFrame = undefined;
        let floorTint = 0xffffff; // Default no tint
        let bgConfig = [];

        if (biome === 'Forest' || !biome) {
            skyColor = '#2d4c1e';
            floorKey = 'floor';
            bgConfig = [
                { key: 'bg_forest', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Plains') {
            skyColor = '#87CEEB';
            floorKey = 'floor';
            bgConfig = [
                { key: 'bg_plains', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Desert') {
            skyColor = '#e0a96d';
            floorKey = 'floor_desert';
            bgConfig = [
                { key: 'bg_desert_1', scroll: 0.1, depth: -9 },
                { key: 'bg_desert_2', scroll: 0.2, depth: -8 },
                { key: 'bg_desert_3', scroll: 0.3, depth: -7 },
                { key: 'bg_desert_4', scroll: 0.4, depth: -6 },
                { key: 'bg_desert_5', scroll: 0.5, depth: -5 }
            ];
        } else if (biome === 'Cave') {
            skyColor = '#111111';
            floorKey = 'floor_hell';
            floorTint = 0x555566;
            bgConfig = [
                { key: 'bg_dungeon', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Dungeon') {
            skyColor = '#1a1525';
            floorKey = 'floor_hell';
            floorTint = 0x7777aa; // Grey-blue stone
            bgConfig = [
                { key: 'bg_dungeon', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Hell') {
            skyColor = '#1a0b0b';
            floorKey = 'floor_hell';
            bgConfig = [
                { key: 'bg_hell_gemini', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Heaven') {
            skyColor = '#8fc7f4'; // bright celestial sky blue
            floorKey = 'floor';
            floorFrame = undefined;
            floorTint = 0xffe8aa; // golden-yellow floor blocks
            bgConfig = [
                { key: 'bg_heaven', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Deadwoods') {
            skyColor = '#2b2a33';
            floorKey = 'floor';
            floorTint = 0x887788;
            bgConfig = [
                { key: 'bg_deadwoods_gemini', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Winter') {
            skyColor = '#1f2937';
            floorKey = 'floor'; // Use the main floor tileset
            floorFrame = 109; // Frame 109 is the snow-capped top-center block
            floorTint = 0xffffff;
            bgConfig = [
                { key: 'bg_winter_mountains', scroll: 0.1, depth: -9 }
            ];
        } else if (biome === 'Coastal') {
            skyColor = '#87CEEB';
            floorKey = 'floor_desert'; // Use sand tile for coast
            floorFrame = 0;
            floorTint = 0xffeedd;
            bgConfig = [];
            
            // Build custom dynamic ocean background
            scene.waterLayers = [];
            
            // Create animation if it doesn't exist
            if (!scene.anims.exists('coastal_waves')) {
                scene.anims.create({
                    key: 'coastal_waves',
                    frames: scene.anims.generateFrameNumbers('coastal_anim', { start: 0, end: 12 }),
                    frameRate: 10,
                    repeat: -1
                });
            }
            
            // The GIF is 1280x1280, we want it to cover the screen and scroll slowly
            let bgSprite = scene.add.sprite(640, 696, 'coastal_anim')
                .setOrigin(0.5, 1)
                .setScrollFactor(0, 1)
                .setDepth(-10);
                
            // Scale to fit height or width, since it's 1280x1280, it easily covers a 1280x720 screen
            const scaleX = 1280 / bgSprite.width;
            const scaleY = 720 / bgSprite.height;
            bgSprite.setScale(Math.max(scaleX, scaleY));
            
            bgSprite.play('coastal_waves');
            scene.bgLayers.push(bgSprite);
        }

        scene.cameras.main.setBackgroundColor(skyColor);

        // Toggle clouds based on biome
        const showClouds = (biome !== 'Dungeon' && biome !== 'Hell');
        if (scene.clouds) {
            scene.clouds.forEach(cloud => cloud.setVisible(showClouds));
        }

        // Build Background Layers
        bgConfig.forEach(config => {
            const isFullScreen = ['bg_heaven', 'bg_hell_gemini', 'bg_deadwoods_gemini', 'bg_coastal'].includes(config.key);
            let yPos = isFullScreen ? (360 + (config.yOffset || 0)) : (696 + (config.yOffset || 0));
            let scrollY = isFullScreen ? 0.05 : 1.0;
            let originY = isFullScreen ? 0.5 : 1.0;
            
            let bg = scene.add.image(640, yPos, config.key)
                .setOrigin(0.5, originY)
                .setScrollFactor(0, scrollY)
                .setDepth(config.depth);
            if (config.tint) {
                bg.setTint(config.tint);
            }
            // Scale appropriately based on image dimensions to completely fill the screen
            const scaleX = 1280 / bg.width;
            const scaleY = 720 / bg.height;
            const scale = Math.max(scaleX, scaleY);
            bg.setScale(scale);
            scene.bgLayers.push(bg);
        });

        // Build Floor / Platforms
        // Set world bounds depending on biome height (Width totalWidth, height 3200 to cap bottom scroll at Y = 1200)
        scene.physics.world.setBounds(0, -2000, widthTiles * 46, 4000);
        scene.cameras.main.setBounds(0, -2000, widthTiles * 46, 3200);

        if (type === 'Safe') {
            // Flat floor for towns (40 blocks for 1840 width)
            for(let i = 0; i < widthTiles; i++) {
                let currentX = i * 46 + 24;
                let frameIdx = (floorFrame !== undefined) ? floorFrame : ((floorKey === 'floor') ? 1 : 0);
                let block = scene.platforms.create(currentX, 696, floorKey, frameIdx).setScale(1.5).refreshBody();
                if (floorTint !== 0xffffff) {
                    block.setTint(floorTint);
                }
                
                // Fill dirt below for towns so they don't float!
                addDeepGround(scene, currentX, 696 + 24, 1500, floorKey, floorFrame, floorTint);
            }
        } else {
            // 2D Platforming logic
            let currentY = 696;
            
            // Build a safety floor at y = 820 across the entire zone
            for(let i = 0; i < widthTiles; i++) {
                let frameIdx = (floorFrame !== undefined) ? floorFrame : ((floorKey === 'floor') ? 1 : 0);
                let block = scene.platforms.create(i * 46 + 24, 820, floorKey, frameIdx).setScale(1.5).refreshBody();
                if (floorTint !== 0xffffff) block.setTint(floorTint);
                
                // Fill dirt below the safety floor to the bottom of the world (1500)
                addDeepGround(scene, i * 46 + 24, 820 + 24, 1500, floorKey, floorFrame, floorTint);
            }

            // Always ensure the first few blocks are solid so the player doesn't fall
            for(let i = 0; i < 6; i++) {
                let currentX = i * 46 + 24;
                let frameIdx = (floorFrame !== undefined) ? floorFrame : ((floorKey === 'floor') ? 1 : 0);
                let block = scene.platforms.create(currentX, currentY, floorKey, frameIdx).setScale(1.5).refreshBody();
                if (floorTint !== 0xffffff) block.setTint(floorTint);
                
                // Fill dirt below
                addDeepGround(scene, currentX, currentY + 24, 1500, floorKey, floorFrame, floorTint);
            }

            let blockIndex = 6;
            while (blockIndex < 78) {
                // Generate a gap of 1 to 3 blocks
                let gapWidth = Math.floor(Math.random() * 3) + 1;
                
                // Fill the background of the gap with dirt so we don't see the sky underground
                for (let g = 0; g < gapWidth; g++) {
                    let gapX = (blockIndex + g) * 46 + 24;
                    addDeepGround(scene, gapX, 672, 844, floorKey, floorFrame, floorTint);
                }
                
                blockIndex += gapWidth;
                
                if (blockIndex >= 78) break;
                
                // Determine new elevation, max difference 138 pixels (3 blocks of 46px)
                let heightDiff = (Math.floor(Math.random() * 3) + 1) * 46;
                if (Math.random() > 0.5) {
                    currentY -= heightDiff;
                } else {
                    currentY += heightDiff;
                }
                // Clamp elevation to keep it clear of the screen top and bottom safety floor
                currentY = Math.max(350, Math.min(696, currentY));
                
                // Generate a platform of 3 to 10 blocks wide
                let platWidth = Math.floor(Math.random() * 8) + 3;
                let endPlatIndex = Math.min(78, blockIndex + platWidth);
                
                let frameIdx = (floorFrame !== undefined) ? floorFrame : ((floorKey === 'floor') ? 1 : 0);
                for (let i = blockIndex; i < endPlatIndex; i++) {
                    let currentX = i * 46 + 24;
                    let block = scene.platforms.create(currentX, currentY, floorKey, frameIdx).setScale(1.5).refreshBody();
                    if (floorTint !== 0xffffff) block.setTint(floorTint);
                    
                    // Fill dirt below
                    addDeepGround(scene, currentX, currentY + 24, 1500, floorKey, floorFrame, floorTint);
                    
                    // 15% chance of a higher floating platform block above this one
                    if (Math.random() < 0.15) {
                        let platY = currentY - 138; // 3 blocks higher
                        let blockAbove = scene.platforms.create(currentX, platY, floorKey, frameIdx).setScale(1.5).refreshBody();
                        blockAbove.body.checkCollision.down = false;
                        blockAbove.body.checkCollision.left = false;
                        blockAbove.body.checkCollision.right = false;
                        if (floorTint !== 0xffffff) blockAbove.setTint(floorTint);
                    }
                }
                
                blockIndex = endPlatIndex;
            }

            // Ensure the end blocks are solid at ground level
            for(let i = 78; i < 84; i++) {
                let currentX = i * 46 + 24;
                let frameIdx = (floorFrame !== undefined) ? floorFrame : ((floorKey === 'floor') ? 1 : 0);
                let block = scene.platforms.create(currentX, 696, floorKey, frameIdx).setScale(1.5).refreshBody();
                if (floorTint !== 0xffffff) block.setTint(floorTint);
                
                // Fill dirt below
                addDeepGround(scene, currentX, 696 + 24, 1500, floorKey, floorFrame, floorTint);
            }
        }

        // Rebuild colliders to link the new platform instances
        if (scene.playerCollider) scene.physics.world.removeCollider(scene.playerCollider);
        if (scene.enemiesCollider) scene.physics.world.removeCollider(scene.enemiesCollider);
        
        scene.playerCollider = scene.physics.add.collider(scene.heroGroup || scene.player.sprite, scene.platforms);
        scene.enemiesCollider = scene.physics.add.collider(scene.enemies, scene.platforms);
    }
}
