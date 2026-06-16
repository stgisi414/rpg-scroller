// AssetManager.js - Centralized system for loading assets or generating placeholders

class AssetManager {
    constructor(scene) {
        this.scene = scene;
    }

    preload() {
        // Load Real Assets
        // Note: For sprite sheets, we will need to determine the exact frame dimensions soon. 
        // For now, we will load a few static images to replace our placeholders!
        
        // Load Class Assets (Temporarily as static images until we slice the sprite sheets)
        // Load Class Assets as SpriteSheets
        this.scene.load.spritesheet('knight', 'src/assets/GandalfHardcore FREE Warrior/GandalfHardcore Warrior.png', { frameWidth: 80, frameHeight: 64 });
        this.scene.load.spritesheet('wizard', 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Black Wizard sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('samurai', 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet black.png', { frameWidth: 96, frameHeight: 64 });
        this.scene.load.spritesheet('ranger', 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer black sheet.png', { frameWidth: 64, frameHeight: 64 });

        // Rival Hero Sprites (Red recolors)
        this.scene.load.spritesheet('knight_rival', 'src/assets/Heavy Knight 2/Heavy Knight 2/Heavy Knighty sheet2 red.png', { frameWidth: 80, frameHeight: 64 }); // Assuming 80x64
        this.scene.load.spritesheet('wizard_rival', 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Red Wizard sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('samurai_rival', 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet red.png', { frameWidth: 96, frameHeight: 64 });
        this.scene.load.spritesheet('ranger_rival', 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer red sheet.png', { frameWidth: 64, frameHeight: 64 });
        
        // Damned Enemies
        const damnedPath = 'src/assets/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore The Damned Enemies and NPCs/';
        this.scene.load.spritesheet('plague_flies', damnedPath + 'Plague Flies.png', { frameWidth: 32, frameHeight: 64 });
        this.scene.load.spritesheet('old_demon', damnedPath + 'Old Demon.png', { frameWidth: 80, frameHeight: 64 });
        this.scene.load.atlas('the_devil', 'src/assets/devil_boss.png', 'src/assets/devil_boss.json');
        this.scene.load.image('lich_lord', 'src/assets/lich_lord.png');
        this.scene.load.image('skeleton', 'src/assets/skeleton.png');
        this.scene.load.spritesheet('bandit', 'src/assets/bandit.png', { frameWidth: 102, frameHeight: 128 });
        this.scene.load.spritesheet('frost_giant', 'src/assets/frost_giant.png', { frameWidth: 102, frameHeight: 128 });
        const damned64 = ['Bloated Damned', 'Burning Damned', 'Female Damned', 'Imp', 'Male Damned', 'Cheeky Devil', 'Twisted Damned', 'Burning Skull blue', 'Burning Skull'];
        for (const name of damned64) {
            let key = name.toLowerCase().replace(/\s+/g, '_');
            this.scene.load.spritesheet(key, damnedPath + name + '.png', { frameWidth: 64, frameHeight: 64 });
        }
        
        // Environment Assets
        this.scene.load.image('tree1', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Tree1.png');
        this.scene.load.image('tree2', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Tree2.png');
        this.scene.load.image('tree3', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Tree3.png');
        this.scene.load.image('tree4', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Tree4.png');
        this.scene.load.image('birch1', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Birch1.png');
        this.scene.load.image('birch2', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Birch2.png');
        this.scene.load.image('birch3', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Birch3.png');
        this.scene.load.image('willow1', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Weeping Willow1.png');
        this.scene.load.image('willow2', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Weeping Willow2.png');
        this.scene.load.image('pine', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Large Pine Tree.png');
        
        // Load individually sliced Ultimate Pine Trees
        for (let i = 1; i <= 64; i++) {
            this.scene.load.image(`ultimate_pine_${i}`, `src/assets/ultimate_pine_${i}.png`);
        }
        
        // Load Palm Trees
        for (let i = 1; i <= 16; i++) {
            this.scene.load.image(`palm${i}`, `src/assets/Palm Trees Pack – Pixel Art (32x32, Top-Down)/Palm Trees Pack – Pixel Art (32x32, Top-Down)/spr_PalmTree_${i}.png`);
        }
        
        // Load Dead Trees
        for (let i = 1; i <= 64; i++) {
            this.scene.load.image(`dead_tree_${i}`, `src/assets/dead_tree_${i}.png`);
        }

        // Load Water
        this.scene.load.spritesheet('coastal_anim', 'src/assets/coastal_beach_spritesheet.png', { frameWidth: 1280, frameHeight: 1280 });

        this.scene.load.spritesheet('floor', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Floor Tiles1.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('floor_snow', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Floor Tiles2.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('floor_dungeon', 'src/assets/tile castle dungeon.png', { frameWidth: 16, frameHeight: 16 });
        this.scene.load.image('dungeon_wall', 'src/assets/dungeon_wall_tile.png');
        
        // Dungeon Props
        this.scene.load.image('torch', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Torch.png');
        this.scene.load.image('large_statue_hell', 'src/assets/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell Asset Pack 32x32/Large Statue.png');
        this.scene.load.image('large_statue_hell2', 'src/assets/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell Asset Pack 32x32/Large Statue 2.png');
        this.scene.load.spritesheet('decor', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Decor.png', { frameWidth: 32, frameHeight: 32 });

        this.scene.load.image('statue', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Angel Statue.png');
        this.scene.load.image('cloud1', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/cloud1.png');
        this.scene.load.image('cloud2', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/cloud2.png');
        this.scene.load.image('cloud3', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/cloud3.png');
        this.scene.load.image('cloud4', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/cloud4.png');
        this.scene.load.image('cloud5', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/cloud5.png');
        this.scene.load.image('cloud6', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/cloud6.png');

        // Town Assets
        this.scene.load.image('house', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/House.png');
        this.scene.load.image('house2', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/House2.png');
        this.scene.load.image('house3', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/House3.png');
        this.scene.load.image('house4', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/House4.png');
        this.scene.load.image('house5', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/House5.png');
        this.scene.load.image('house6', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/House6.png');
        this.scene.load.image('tavern', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/Tavern.png');
        this.scene.load.image('shop', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/shop.png');
        this.scene.load.image('stall', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/market stall1.png');
        this.scene.load.image('stable', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/Stable or Storage.png');
        this.scene.load.image('tavernGreen', 'src/assets/GandalfHardcore Pixel Art Village Houses tiles/GandalfHardcore Pixel Art Village Houses tiles/Tavern green roof.png');

        // Background Layers
        this.scene.load.image('bg1', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 1.png');
        this.scene.load.image('bg2', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 2.png');
        this.scene.load.image('bg3', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 3.png');
        this.scene.load.image('bg4', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 4.png');
        this.scene.load.image('bg5', 'src/assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/GandalfHardcore Background layers/Normal BG/GandalfHardcore Background layers_layer 5.png');

        // Biome Tiles
        this.scene.load.spritesheet('floor_desert', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Tiles 32x32.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('desert_pack', 'src/assets/Desert Pack/Desert Pack.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('floor_hell', 'src/assets/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell Tiles 32x32 dark.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('floor_medieval', 'src/assets/GandalfHardcore Pixel Art Medieval Fantasy Assets/GandalfHardcore Pixel Art Medieval Fantasy Assets/Dark Forest Tiles.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('floor_winter', 'src/assets/floor_winter.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('floor_coastal', 'src/assets/floor_coastal.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('floor_dungeon', 'src/assets/floor_dungeon.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('house_inside_tiles', 'src/assets/GandalfHardcore House Asset Pack 32x32/GandalfHardcore House Asset Pack 32x32/House Inside Tiles 32x32 v1.png', { frameWidth: 32, frameHeight: 32 });

        // Biome Backgrounds
        this.scene.load.image('bg_hills', 'src/assets/rolling_hills.png');
        this.scene.load.image('bg_mountains', 'src/assets/mountains.png');
        this.scene.load.image('bg_winter_mountains', 'src/assets/bg_winter_mountains.png');
        this.scene.load.image('bg_coastal', 'src/assets/coastal_bg.png');
        this.scene.load.image('bg_dungeon', 'src/assets/gemini-dungeon-bg.jpg');
        this.scene.load.image('bg_plains', 'src/assets/plains_bg.jpg');
        this.scene.load.image('bg_forest', 'src/assets/forest_bg.jpg');

        // Indoor Backgrounds
        this.scene.load.image('bg_tavern', 'src/assets/bg_tavern.jpg');
        this.scene.load.image('bg_blacksmith', 'src/assets/bg_blacksmith.jpg');
        this.scene.load.image('bg_apothecary', 'src/assets/bg_apothecary.jpg');
        this.scene.load.image('bg_guild_hall', 'src/assets/bg_guild_hall.jpg');
        this.scene.load.image('bg_temple', 'src/assets/bg_temple.jpg');
        this.scene.load.image('bg_library', 'src/assets/bg_library.jpg');
        this.scene.load.image('bg_training', 'src/assets/bg_training_grounds.jpg');
        
        // Desert Backgrounds
        this.scene.load.image('bg_desert_1', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Background/Background layer.png');
        this.scene.load.image('bg_desert_2', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Background/Background layer2.png');
        this.scene.load.image('bg_desert_3', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Background/Back layer.png');
        this.scene.load.image('bg_desert_4', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Background/Middle layer.png');
        this.scene.load.image('bg_desert_5', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Background/Front layer.png');

        // Hell Backgrounds
        this.scene.load.image('bg_hell_1', 'src/assets/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell background dark/Background layer.png');
        this.scene.load.image('bg_hell_2', 'src/assets/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell background dark/back layer.png');
        this.scene.load.image('bg_hell_3', 'src/assets/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell background dark/middle layer.png');
        this.scene.load.image('bg_hell_4', 'src/assets/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell background dark/front layer.png');
        this.scene.load.image('bg_hell_gemini', 'src/assets/hell_bg.jpg');
        this.scene.load.image('bg_deadwoods_gemini', 'src/assets/deadwoods_bg.jpg');

        // Medieval / Dark Forest Backgrounds
        this.scene.load.image('bg_dark_forest_1', 'src/assets/GandalfHardcore Pixel Art Medieval Fantasy Assets/GandalfHardcore Pixel Art Medieval Fantasy Assets/Dark Forest Background/Dark Forest Background.png');
        this.scene.load.image('bg_dark_forest_2', 'src/assets/GandalfHardcore Pixel Art Medieval Fantasy Assets/GandalfHardcore Pixel Art Medieval Fantasy Assets/Dark Forest Background/Dark Forest Background Top.png');

        // Indoor Town Backgrounds
        this.scene.load.image('bg_tavern', 'src/assets/bg_tavern.jpg');
        this.scene.load.image('bg_blacksmith', 'src/assets/bg_blacksmith.jpg');
        this.scene.load.image('bg_apothecary', 'src/assets/bg_apothecary.jpg');
        this.scene.load.image('bg_guild_hall', 'src/assets/bg_guild_hall.jpg');
        this.scene.load.image('bg_temple', 'src/assets/bg_temple.jpg');
        this.scene.load.image('bg_library', 'src/assets/bg_library.jpg');
        this.scene.load.image('bg_training', 'src/assets/bg_training_grounds.jpg');

        // Load Enemy Assets
        this.scene.load.spritesheet('training_dummy', 'src/assets/training_dummy.png', { frameWidth: 128, frameHeight: 279 });
        this.scene.load.spritesheet('slime', 'src/assets/GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime green.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('goblin', 'src/assets/GandalfHardcore Goblin sheet/GandalfHardcore Goblin sheet/Goblin enemy green sheet.png', { frameWidth: 84, frameHeight: 64 });
        this.scene.load.spritesheet('bat', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Bat sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('mushroom', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Mushroom sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('orc', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Orc sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('spider', 'src/assets/GandalfHardcore Pixel Art Spider/GandalfHardcore Pixel Art Spider/GandalfHardcore Pixel Art Spider.png', { frameWidth: 192, frameHeight: 96 });
        this.scene.load.spritesheet('bandit', 'src/assets/bandit.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('frost_giant', 'src/assets/frost_giant.png', { frameWidth: 64, frameHeight: 64 });
        
        // Load Desert Enemies
        this.scene.load.spritesheet('mummy', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Enemies/Mummy.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('scarab_beetle', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Enemies/Scarab beetle.png', { frameWidth: 32, frameHeight: 32 });

        // NPC Assets
        this.scene.load.spritesheet('npc', 'src/assets/GandalfHardcore FREE NPC/GandalfHardcFREE NPC/GandalfHardcore Goddess NPC.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('blacksmith', 'src/assets/GandalfHardcore characters pack/GandalfHardcore characters pack/Black Market Dealer.png', { frameWidth: 64, frameHeight: 64 });
        
        // Loot Chests
        this.scene.load.spritesheet('loot_chest', 'src/assets/GandalfHardcore Chests/GandalfHardcore Chests/chest sheet 1.png', { frameWidth: 64, frameHeight: 32 });
        this.scene.load.image('loot_sparkle', 'src/assets/GandalfHardcore Chests/GandalfHardcore Chests/Effect color common.png');
        this.scene.load.spritesheet('alchemist', 'src/assets/GandalfHardcore characters pack/GandalfHardcore characters pack/Mage.png', { frameWidth: 64, frameHeight: 64 });

        // Item Assets
        this.scene.load.image('item-potion', 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Healing Sheet.png');
        this.scene.load.image('item-mp-potion', 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Mana Sheet.png');
        this.scene.load.image('item-sp-potion', 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Stamina Sheet.png');
        this.scene.load.image('item-chest', 'src/assets/GandalfHardcore Chests/GandalfHardcore Chests/chest sheet 1.png');
        
        // Weapon Assets
        this.scene.load.image('weapon-bronze-sword', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Bronze Sword.png');
        this.scene.load.image('weapon-iron-sword', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Iron Sword.png');
        this.scene.load.image('weapon-gold-sword', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Golden Sword.png');
        this.scene.load.image('weapon-diamond-sword', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Diamond Sword.png');
        this.scene.load.image('weapon-iron-axe', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Iron Axe.png');
        this.scene.load.image('weapon-stick', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Stick.png');
        this.scene.load.image('weapon-wooden-sword', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Wooden Sword.png');

        // UI Assets
        this.scene.load.image('ui-bar', 'src/assets/GandalfHardcore Pixel Art Game UI/GandalfHardcore Pixel Art Game UI/64x16 resource counter.png');
        this.scene.load.image('ui-button', 'src/assets/GandalfHardcore Pixel Art Game UI/GandalfHardcore Pixel Art Game UI/32x64 button.png');
        this.scene.load.image('ui-frame', 'src/assets/GandalfHardcore Pixel Art Game UI/GandalfHardcore Pixel Art Game UI/64x64 frame.png');
        this.scene.load.image('ui-paper', 'src/assets/GandalfHardcore Pixel Art Game UI/GandalfHardcore Pixel Art Game UI/128x32 paper.png');

        // Projectiles and Effects
        this.scene.load.spritesheet('projectile_blue', 'src/assets/GandalfHardcore Projectiles and effects/GandalfHardcore Projectiles and effects/GandalfHardcore 64x64 Projectiles1.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.image('arrow', 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/arrow.png');
    }

    create() {
        // We still generate placeholders as a fallback for things we haven't linked yet
        this.generatePlaceholder('player_placeholder', 32, 48, 0x00ff00);
        this.generatePlaceholder('ground_placeholder', 64, 64, 0x555555);
        this.generatePlaceholder('enemy_placeholder', 32, 32, 0xff0000);
    }

    generatePlaceholder(key, width, height, color) {
        if (!this.scene.textures.exists(key)) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(color, 1);
            graphics.fillRect(0, 0, width, height);
            graphics.generateTexture(key, width, height);
            graphics.destroy();
        }
    }
}
