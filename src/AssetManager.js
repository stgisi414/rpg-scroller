// AssetManager.js - Centralized system for loading assets or generating placeholders

class AssetManager {
    constructor(scene) {
        this.scene = scene;
    }

    preload() {
        // Prevent duplicate preloads from overwriting global texture frame references
        const textures = this.scene.textures;
        const load = this.scene.load;
        
        const originalImage = load.image;
        load.image = function(key, ...args) {
            if (textures.exists(key)) return this;
            return originalImage.call(this, key, ...args);
        };
        
        const originalSpritesheet = load.spritesheet;
        load.spritesheet = function(key, ...args) {
            if (textures.exists(key)) return this;
            return originalSpritesheet.call(this, key, ...args);
        };
        
        const originalAtlas = load.atlas;
        load.atlas = function(key, ...args) {
            if (textures.exists(key)) return this;
            return originalAtlas.call(this, key, ...args);
        };

        // Load Real Assets
        // Note: For sprite sheets, we will need to determine the exact frame dimensions soon. 
        // For now, we will load a few static images to replace our placeholders!
        
        // Load Class Assets (Temporarily as static images until we slice the sprite sheets)
        // Load Class Assets as SpriteSheets
        this.scene.load.spritesheet('knight', 'src/assets/GandalfHardcore FREE Warrior/GandalfHardcore Warrior.png', { frameWidth: 80, frameHeight: 64 });
        this.scene.load.spritesheet('heavy_knight', 'src/assets/Heavy Knight/Heavy Knight/Black heavy.png', { frameWidth: 91, frameHeight: 64 });
        this.scene.load.spritesheet('wizard', 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Black Wizard sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('samurai', 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet black.png', { frameWidth: 96, frameHeight: 64 });
        this.scene.load.spritesheet('ranger', 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer black sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('elven_spellblade', 'src/assets/elven_spellblade.png?v=4', { frameWidth: 128, frameHeight: 128 });

        // Rival Hero Sprites (Red recolors)
        this.scene.load.spritesheet('knight_rival', 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png', { frameWidth: 91, frameHeight: 64 }); // Assuming 80x64
        this.scene.load.spritesheet('wizard_rival', 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Red Wizard sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('samurai_rival', 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet red.png', { frameWidth: 96, frameHeight: 64 });
        this.scene.load.spritesheet('ranger_rival', 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer red sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('elven_spellblade_rival', 'src/assets/elven_spellblade.png?v=4', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('elven_king', 'src/assets/elven_king.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('elven_king_rival', 'src/assets/elven_king.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('elven_queen', 'src/assets/elven_queen.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('elven_queen_rival', 'src/assets/elven_queen.png', { frameWidth: 128, frameHeight: 128 });
        // Human King & Queen (Craftpix 830108)
        this.scene.load.spritesheet('human_king', 'src/assets/human_king.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('human_queen', 'src/assets/human_queen.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('elven_longbowman', 'src/assets/elven_longbowman.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('elven_longbowman_rival', 'src/assets/elven_longbowman.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('elven_guard', 'src/assets/elven_guard.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('elven_guard_rival', 'src/assets/elven_guard.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dwarf_warrior', 'src/assets/dwarf_warrior.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dwarf_miner', 'src/assets/dwarf_miner.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dwarf_king', 'src/assets/dwarf_king.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dwarf_warrior_rival', 'src/assets/dwarf_warrior.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dwarf_miner_rival', 'src/assets/dwarf_miner.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dwarf_king_rival', 'src/assets/dwarf_king.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('megaboss_rival', 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png', { frameWidth: 91, frameHeight: 64 });
        // Witch sprites
        this.scene.load.spritesheet('witch', 'src/assets/witch_2.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('witch_1', 'src/assets/witch_1.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('witch_2', 'src/assets/witch_2.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('witch_3', 'src/assets/witch_3.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('witch_1_rival', 'src/assets/witch_1.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('witch_3_rival', 'src/assets/witch_3.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('witch_spear', 'src/assets/craftpix-net-470871-witch-pixel-character-sprite-sheets-pack/Witch_2/Spear.png', { frameWidth: 128, frameHeight: 128 });
        // Priest sprites
        this.scene.load.spritesheet('priest', 'src/assets/priest_2.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('priest_1', 'src/assets/priest_1.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('priest_2', 'src/assets/priest_2.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('priest_3', 'src/assets/priest_3.png', { frameWidth: 128, frameHeight: 128 });
        // Pyromancer sprites
        this.scene.load.spritesheet('pyromancer', 'src/assets/pyromancer_3.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('pyromancer_1', 'src/assets/pyromancer_1.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('pyromancer_2', 'src/assets/pyromancer_2.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('pyromancer_3', 'src/assets/pyromancer_3.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('pyromancer_1_rival', 'src/assets/pyromancer_1.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('pyromancer_2_rival', 'src/assets/pyromancer_2.png', { frameWidth: 128, frameHeight: 128 });
        // Hellhound sprites
        this.scene.load.spritesheet('hellhound_1', 'src/assets/hellhound_1.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('hellhound_2', 'src/assets/hellhound_2.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('hellhound_3', 'src/assets/hellhound_3.png', { frameWidth: 128, frameHeight: 128 });

        // Dark Elves (stitched)
        this.scene.load.spritesheet('dark_elf_guard', 'src/assets/dark_elf_guard.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dark_elf_guard_rival', 'src/assets/dark_elf_guard.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dark_elf_spellblade', 'src/assets/dark_elf_spellblade.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dark_elf_spellblade_rival', 'src/assets/dark_elf_spellblade.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dark_elf_longbowman', 'src/assets/dark_elf_longbowman.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dark_elf_longbowman_rival', 'src/assets/dark_elf_longbowman.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dark_elf_queen', 'src/assets/dark_elf_queen.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dark_elf_queen_rival', 'src/assets/dark_elf_queen.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.image('queen_blade_1', 'src/assets/craftpix-net-313262-pixel-dark-elf-queen-animated-sprite-pack/1/Blade_1.png');
        this.scene.load.image('queen_blade_2', 'src/assets/craftpix-net-313262-pixel-dark-elf-queen-animated-sprite-pack/1/Blade_2.png');
        this.scene.load.image('queen_blade_3', 'src/assets/craftpix-net-313262-pixel-dark-elf-queen-animated-sprite-pack/1/Blade_3.png');
        this.scene.load.spritesheet('dark_elf_minion', 'src/assets/dark_elf_minion.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('dark_elf_minion_rival', 'src/assets/dark_elf_minion.png', { frameWidth: 128, frameHeight: 128 });

        // Mimics (stitched)
        this.scene.load.spritesheet('mimic_1', 'src/assets/mimic_1.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('mimic_2', 'src/assets/mimic_2.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('mimic_3', 'src/assets/mimic_3.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('mimic_1_rival', 'src/assets/mimic_1.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('mimic_2_rival', 'src/assets/mimic_2.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('mimic_3_rival', 'src/assets/mimic_3.png', { frameWidth: 128, frameHeight: 128 });

        // Gorgons (stitched)
        this.scene.load.spritesheet('gorgon_1', 'src/assets/gorgon_1.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('gorgon_2', 'src/assets/gorgon_2.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('gorgon_3', 'src/assets/gorgon_3.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('gorgon_1_rival', 'src/assets/gorgon_1.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('gorgon_2_rival', 'src/assets/gorgon_2.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('gorgon_3_rival', 'src/assets/gorgon_3.png', { frameWidth: 128, frameHeight: 128 });

        // Golems (stitched)
        this.scene.load.spritesheet('stone_golem', 'src/assets/stone_golem.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('lava_golem', 'src/assets/lava_golem.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('copper_golem', 'src/assets/copper_golem.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('stone_golem_rival', 'src/assets/stone_golem.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('lava_golem_rival', 'src/assets/lava_golem.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('copper_golem_rival', 'src/assets/copper_golem.png', { frameWidth: 128, frameHeight: 128 });

        this.scene.load.spritesheet('heal_animation', 'src/assets/heal_animation.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('bless_buff', 'src/assets/bless_buff.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('witch_debuff', 'src/assets/witch_debuff.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('witch_3_charge', 'src/assets/craftpix-net-470871-witch-pixel-character-sprite-sheets-pack/Witch_3/Charge.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('mind_control_debuff', 'src/assets/mind_control_debuff.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('elven_queen_buff', 'src/assets/elven_queen_buff.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('human_queen_buff', 'src/assets/human_queen_buff.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('pyromancer_1_charge', 'src/assets/craftpix-net-317603-pyromancer-character-sprite-sheets-pixel-art/Pyromancer_1/Charge.png', { frameWidth: 64, frameHeight: 64 });
        
        // Damned Enemies
        const damnedPath = 'src/assets/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore Hell Asset Pack 32x32/GandalfHardcore The Damned Enemies and NPCs/';
        this.scene.load.spritesheet('plague_flies', damnedPath + 'Plague Flies.png', { frameWidth: 32, frameHeight: 64 });
        this.scene.load.spritesheet('old_demon', damnedPath + 'Old Demon.png', { frameWidth: 80, frameHeight: 64 });
        this.scene.load.spritesheet('the_devil', 'src/assets/devil_boss.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('lich_lord', 'src/assets/lich_lord.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('skeleton', 'src/assets/skeleton.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('bandit', 'src/assets/bandit.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('frost_giant', 'src/assets/frost_giant.png', { frameWidth: 128, frameHeight: 128 });
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

        // Town Assets (Base)
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

        // Medieval Town Buildings (Capitals Only)
        const capPath = 'src/assets/Medieval Town Buildings/Medieval Town Buildings/';
        this.scene.load.image('cap_bakery', capPath + 'Bakery.png');
        this.scene.load.image('cap_blacksmith', capPath + 'Blacksmith.png');
        this.scene.load.image('cap_carpenter', capPath + 'Carpenter_Workshop.png');
        this.scene.load.image('cap_church', capPath + 'Church.png');
        this.scene.load.image('cap_farmhouse', capPath + 'Farmhouse.png');
        this.scene.load.image('cap_store', capPath + 'General_Store.png');
        this.scene.load.image('cap_guardhouse', capPath + 'Guard_House.png');
        this.scene.load.image('cap_inn', capPath + 'Inn.png');
        this.scene.load.image('cap_markethall', capPath + 'Market_Hall.png');
        this.scene.load.image('cap_merchanthouse', capPath + 'Merchant_House.png');
        this.scene.load.image('cap_cottage', capPath + 'Small_Cottage.png');
        this.scene.load.image('cap_stonehouse', capPath + 'Stone_House.png');
        this.scene.load.image('cap_tailor', capPath + 'Tailor_Shop.png');
        this.scene.load.image('cap_tavern', capPath + 'Tavern.png');
        this.scene.load.image('cap_townhall', capPath + 'town_hall.png');
        this.scene.load.image('cap_watchtower', capPath + 'watch_towner.png');

        // Cozy Village Buildings (Towns Expansion)
        const cozyPath = 'src/assets/Cozy Village World Builder Kit – Towns & Farms/Cozy Village World Builder Kit – Towns & Farms/buildings/';
        this.scene.load.image('cozy_barn', cozyPath + 'Village Houses/spr_cozy_barn.png');
        this.scene.load.image('cozy_house_big', cozyPath + 'Village Houses/spr_cozy_village_house_big.png');
        this.scene.load.image('cozy_water_building', cozyPath + 'Village Houses/spr_water_building.png');
        for (let i = 1; i <= 10; i++) {
            this.scene.load.image(`cozy_house${i}`, cozyPath + `Village Houses/spr_cozy_village_house_${i}.png`);
        }
        
        // Shop Buildings
        this.scene.load.image('cozy_bakery', cozyPath + 'Cozy Village Shop Buildings (Animated)/spr_village_bakery_shop_1.png');
        this.scene.load.image('cozy_blacksmith', cozyPath + 'Cozy Village Shop Buildings (Animated)/spr_village_blacksmith_shop.png');
        this.scene.load.image('cozy_fish', cozyPath + 'Cozy Village Shop Buildings (Animated)/spr_village_fish_shop.png');
        this.scene.load.image('cozy_inn', cozyPath + 'Cozy Village Shop Buildings (Animated)/spr_village_inn.png');
        this.scene.load.image('cozy_shop1', cozyPath + 'Cozy Village Shop Buildings (Animated)/spr_village_shop_1.png');
        this.scene.load.image('cozy_shop2', cozyPath + 'Cozy Village Shop Buildings (Animated)/spr_village_shop_2.png');

        // Cozy Market Stalls
        for (let i = 1; i <= 10; i++) {
            this.scene.load.image(`cozy_stall${i}`, cozyPath + `Cozy Market Stalls/spr_stall_${i}.png`);
        }

        // Workshops
        this.scene.load.image('cozy_woodcutting', cozyPath + 'Workshops/spr_woodcutting_station.png');
        this.scene.load.image('cozy_distillery', cozyPath + 'Workshops/spr_distillery.png');
        this.scene.load.image('cozy_masonry', cozyPath + 'Workshops/spr_masonry.png');
        this.scene.load.image('cozy_pottery', cozyPath + 'Workshops/spr_pottery.png');

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
        this.scene.load.image('bg_cottage', 'src/assets/bg_cottage.jpg');
        this.scene.load.image('bg_colliseum', 'src/assets/bg_colliseum.jpg');
        
        // Indoor Backgrounds
        this.scene.load.image('bg_tavern', 'src/assets/bg_tavern.jpg');
        this.scene.load.image('bg_blacksmith', 'src/assets/bg_blacksmith.jpg');
        this.scene.load.image('bg_apothecary', 'src/assets/bg_apothecary.jpg');
        this.scene.load.image('bg_guild_hall', 'src/assets/bg_guild_hall.jpg');
        this.scene.load.image('bg_temple', 'src/assets/bg_temple.jpg');
        this.scene.load.image('bg_library', 'src/assets/bg_library.jpg');
        this.scene.load.image('bg_training', 'src/assets/bg_training_grounds.jpg');
        this.scene.load.image('bg_throne_room', 'src/assets/bg_throne_room.png');
        this.scene.load.image('bg_heaven_throne', 'src/assets/bg_heaven_throne.png');
        this.scene.load.image('bg_heaven', 'src/assets/bg_heaven.png');
        
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

        // Load Enemy Assets
        this.scene.load.spritesheet('training_dummy', 'src/assets/training_dummy.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('summon_angel', 'src/assets/GandalfHardcore Angel/GandalfHardcore Angel/GandalfHardcore Angel.png', { frameWidth: 96, frameHeight: 64 });
        this.scene.load.spritesheet('pack_mule', 'src/assets/pack_mule.png', { frameWidth: 120, frameHeight: 120 });
        this.scene.load.spritesheet('mule_cart', 'src/assets/mule_cart.png', { frameWidth: 96, frameHeight: 64 });
        
        // Heavenly Entities (PixelLab generated)
        this.scene.load.spritesheet('heavenly_valkyrie', 'src/assets/heavenly_valkyrie.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('heavenly_seraph', 'src/assets/heavenly_seraph.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('heavenly_archangel', 'src/assets/heavenly_archangel.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('heavenly_cherub', 'src/assets/heavenly_cherub.png', { frameWidth: 124, frameHeight: 124 });
        
        // Regular Entities (PixelLab generated)
        this.scene.load.spritesheet('ogre', 'src/assets/ogre.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('giant', 'src/assets/giant.png', { frameWidth: 120, frameHeight: 120 });
        this.scene.load.spritesheet('troll', 'src/assets/troll.png', { frameWidth: 124, frameHeight: 124 });
        this.scene.load.spritesheet('willowisp', 'src/assets/willowisp.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('dragon', 'src/assets/dragon.png', { frameWidth: 128, frameHeight: 128 });

        this.scene.load.spritesheet('king', 'src/assets/Male Pixel Art characters/Male Pixel Art characters/Male Pixel Art characters.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('slime', 'src/assets/GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime green.png', { frameWidth: 32, frameHeight: 32 });
        this.scene.load.spritesheet('goblin', 'src/assets/GandalfHardcore Goblin sheet/GandalfHardcore Goblin sheet/Goblin enemy green sheet.png', { frameWidth: 84, frameHeight: 64 });
        this.scene.load.spritesheet('bat', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Bat sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('mushroom', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Mushroom sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('orc', 'src/assets/GandalfHardcore Pixel Art Enemies/GandalfHardcore Pixel Art Enemies/Orc sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('spider', 'src/assets/GandalfHardcore Pixel Art Spider/GandalfHardcore Pixel Art Spider/GandalfHardcore Pixel Art Spider.png', { frameWidth: 192, frameHeight: 96 });
        
        // Load Desert Enemies
        this.scene.load.spritesheet('mummy', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Enemies/Mummy.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('scarab_beetle', 'src/assets/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Desert Asset Pack 32x32/GandalfHardcore Enemies/Scarab beetle.png', { frameWidth: 32, frameHeight: 32 });

        // Zombie Enemies (GandalfHardcore Zombies — 80x64 per frame, 8 cols x 8 rows, 4 color variants)
        this.scene.load.spritesheet('zombie', 'src/assets/GandalfHardcore Zombies/GandalfHardcore Zombie v4 sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('zombie_v2', 'src/assets/GandalfHardcore Zombies/GandalfHardcore Zombie v2 sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('zombie_v3', 'src/assets/GandalfHardcore Zombies/GandalfHardcore Zombie v3 sheet.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('zombie_v1', 'src/assets/GandalfHardcore Zombies/GandalfHardcore Zombie v1 sheet.png', { frameWidth: 64, frameHeight: 64 });

        // NPC Assets
        this.scene.load.spritesheet('npc', 'src/assets/GandalfHardcore FREE NPC/GandalfHardcFREE NPC/GandalfHardcore Goddess NPC.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.spritesheet('blacksmith', 'src/assets/GandalfHardcore characters pack/GandalfHardcore characters pack/Black Market Dealer.png', { frameWidth: 64, frameHeight: 64 });

        // Rescuee NPC Assets (GandalfHardcore Character Asset Pack — 100x64 per frame, 8 cols x 7 rows)
        const charBase = 'src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack';
        const rescueeFrameConfig = { frameWidth: 100, frameHeight: 64 };

        // Male & Female Skin Tones (5 each)
        for (let i = 1; i <= 5; i++) {
            this.scene.load.spritesheet(`npc_male_skin${i}`, `${charBase}/Character skin colors/Male Skin${i}.png`, rescueeFrameConfig);
            this.scene.load.spritesheet(`npc_female_skin${i}`, `${charBase}/Character skin colors/Female Skin${i}.png`, rescueeFrameConfig);
        }
        // Male & Female Hair (5 each)
        for (let i = 1; i <= 5; i++) {
            this.scene.load.spritesheet(`npc_male_hair${i}`, `${charBase}/Male Hair/Male Hair${i}.png`, rescueeFrameConfig);
            this.scene.load.spritesheet(`npc_female_hair${i}`, `${charBase}/Female Hair/Female Hair${i}.png`, rescueeFrameConfig);
        }
        // Male Clothing
        this.scene.load.spritesheet('npc_male_shirt', `${charBase}/Male Clothing/Shirt v2.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_male_shirt_blue', `${charBase}/Male Clothing/Blue Shirt v2.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_male_shirt_green', `${charBase}/Male Clothing/Green Shirt v2.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_male_shirt_purple', `${charBase}/Male Clothing/Purple Shirt v2.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_male_shirt_orange', `${charBase}/Male Clothing/orange Shirt v2.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_male_pants', `${charBase}/Male Clothing/Pants.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_male_pants_blue', `${charBase}/Male Clothing/Blue Pants.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_male_pants_green', `${charBase}/Male Clothing/Green Pants.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_male_pants_purple', `${charBase}/Male Clothing/Purple Pants.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_male_pants_orange', `${charBase}/Male Clothing/Orange Pants.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_male_boots', `${charBase}/Male Clothing/Boots.png`, rescueeFrameConfig);
        // Female Clothing
        this.scene.load.spritesheet('npc_female_corset', `${charBase}/Female Clothing/Corset v2.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_female_corset_blue', `${charBase}/Female Clothing/Blue Corset v2.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_female_corset_green', `${charBase}/Female Clothing/Green Corset v2.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_female_corset_purple', `${charBase}/Female Clothing/Purple Corset v2.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_female_corset_orange', `${charBase}/Female Clothing/Orange Corset v2.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_female_skirt', `${charBase}/Female Clothing/Skirt.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('npc_female_boots', `${charBase}/Female Clothing/Boots.png`, rescueeFrameConfig);

        
        // Special skins
        const specialBase = 'src/assets/GandalfHardcore Special skin/GandalfHardcore Special skin';
        this.scene.load.spritesheet('special_female_demon', `${specialBase}/Female Demon skin.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('special_male_demon', `${specialBase}/Male Demon skin.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('special_female_devil', `${specialBase}/Female Devil skin.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('special_male_devil', `${specialBase}/Male Devil skin.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('special_female_ghost', `${specialBase}/Female Ghost skin.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('special_male_ghost', `${specialBase}/Male Ghost skin.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('special_female_orc', `${specialBase}/Female Orc skin.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('special_male_orc', `${specialBase}/Male Orc skin.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('special_female_zombie', `${specialBase}/Female Zombie skin.png`, rescueeFrameConfig);
        this.scene.load.spritesheet('special_male_zombie', `${specialBase}/Male Zombie skin.png`, rescueeFrameConfig);

        // Wolfen & Coyle
        this.scene.load.spritesheet('wolfen', 'src/assets/wolfen.png', { frameWidth: 128, frameHeight: 128 });
        this.scene.load.spritesheet('coyle', 'src/assets/coyle.png', { frameWidth: 128, frameHeight: 128 });

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
        this.scene.load.image('item-wooden-sword', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Wooden Sword.png');

        // --- AUTO GENERATED MODULAR LOADERS ---
        this.scene.load.spritesheet('mod_basket_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Basket.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bronze_axe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Bronze Axe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bronze_pickaxe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Bronze Pickaxe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bronze_sword_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Bronze Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_diamond_axe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Diamond Axe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_diamond_pickaxe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Diamond Pickaxe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_diamond_sword_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Diamond Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_flower_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Flower.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_golden_axe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Golden Axe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_golden_pickaxe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Golden Pickaxe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_golden_sword_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Golden Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_hoe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Hoe F.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_iron_axe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Iron Axe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_iron_pickaxe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Iron Pickaxe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_iron_sword_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Iron Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_stick_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Stick.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_wooden_axe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Wooden Axe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_wooden_pickaxe_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Wooden Pickaxe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_wooden_sword_f', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Female Hand/Wooden Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bronze_axe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Bronze Axe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bronze_pickaxe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Bronze Pickaxe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bronze_sword_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Bronze Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_diamond_axe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Diamond Axe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_diamond_pickaxe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Diamond Pickaxe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_diamond_sword_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Diamond Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_golden_axe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Golden Axe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_golden_pickaxe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Golden Pickaxe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_golden_sword_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Golden Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_hoe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Hoe M.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_iron_axe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Iron Axe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_iron_pickaxe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Iron Pickaxe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_iron_sword_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Iron Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_stick_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Stick.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_wooden_axe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Wooden Axe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_wooden_pickaxe_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Wooden Pickaxe.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_wooden_sword_m', 'src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Wooden Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bunny_ears1_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Bunny ears1.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bunny_ears2_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Bunny ears2.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bunny_ears3_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Bunny ears3.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bunny_ears4_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Bunny ears4.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_bunny_ears5_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Bunny ears5.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_farming_hat_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Farming Hat F.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_blue_cap_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Blue cap.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_green_cap_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Green cap.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hat1_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Hat1.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hat2_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Hat2.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hat3_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Hat3.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hat4_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Hat4.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hat5_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Hat5.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_mining_helmet_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Mining Helmet.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_orange_cap_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Orange cap.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_purple_cap_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Purple cap.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_red_cap_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Red cap.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_santa_hat_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Female Santa hat.png?v=2', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_witch_hat_f', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Female Hat/Witch hat.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_farming_hat_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Farming Hat M.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_guard_helmet_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Guard Helmet.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_blue_cap_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Blue cap.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_green_cap_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Green cap.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hat1_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Hat1.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hat10_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Hat10.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hat2_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Hat2.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hat3_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Hat3.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hat4_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Hat4.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hat5_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Hat5.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hat6_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Hat6.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hat7_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Hat7.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hat8_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Hat8.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hat9_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Hat9.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_mining_helmet_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Mining Helmet.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_orange_cap_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Orange cap.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_purple_cap_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Purple cap.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_red_cap_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Red cap.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_santa_hat_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Male Santa hat.png?v=2', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_pumpkin_hat_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Pumpkin hat.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_viking_helmet_with_horns_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Viking Helmet with horns.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_viking_helmet_m', 'src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Viking Helmet.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_opera_gloves_blue_f', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Female/Opera Gloves blue.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_opera_gloves_brown_f', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Female/Opera Gloves brown.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_opera_gloves_green_f', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Female/Opera Gloves green.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_opera_gloves_orange_f', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Female/Opera Gloves orange.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_opera_gloves_purple_f', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Female/Opera Gloves purple.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_opera_gloves_red_f', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Female/Opera Gloves red.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_opera_gloves_f', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Female/Opera Gloves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_glove_blue_m', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Male/Glove blue.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_glove_green_m', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Male/Glove green.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_glove_orange_m', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Male/Glove orange.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_glove_purple_m', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Male/Glove purple.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_glove_red_m', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Male/Glove red.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_glove_white_m', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Male/Glove white.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_gloves_m', 'src/assets/GandalfHardcore 14x Arm Layers/GandalfHardcore Arm Layers/Male/Gloves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_blue_swim_trunks_m', 'src/assets/GandalfHardcore 7x Male Clothing/GandalfHardcore 7x Male Clothing/Blue swim trunks.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_chainmail_m', 'src/assets/GandalfHardcore 7x Male Clothing/GandalfHardcore 7x Male Clothing/Chainmail.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_green_swim_trunks_m', 'src/assets/GandalfHardcore 7x Male Clothing/GandalfHardcore 7x Male Clothing/Green swim trunks.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_orange_swim_trunks_m', 'src/assets/GandalfHardcore 7x Male Clothing/GandalfHardcore 7x Male Clothing/Orange swim trunks.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_purple_swim_trunks_m', 'src/assets/GandalfHardcore 7x Male Clothing/GandalfHardcore 7x Male Clothing/Purple swim trunks.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_red_swim_trunks_m', 'src/assets/GandalfHardcore 7x Male Clothing/GandalfHardcore 7x Male Clothing/Red swim trunks.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_split_hose_m', 'src/assets/GandalfHardcore 7x Male Clothing/GandalfHardcore 7x Male Clothing/Split hose.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_armored_corset_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Armored Corset.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_black_thigh-high_boots_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Black Thigh-High Boots.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_blue_bikini_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Blue bikini.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_blue_bodice_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Blue Bodice Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_blue_bodice_mid_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Blue Bodice Mid Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_blue_bodice_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Blue Bodice.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_blue_corset_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Blue Corset Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_blue_corset_v2_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Blue Corset v2 Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_blue_dress_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Blue dress.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_brown_thigh-high_boots_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Brown Thigh-High Boots.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_corset_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Corset Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_corset_v2_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Corset v2 Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_fancy_blue_dress_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Fancy Blue Dress.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_green_bikini_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Green bikini.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_green_bodice_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Green Bodice Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_green_bodice_mid_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Green Bodice Mid Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_green_bodice_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Green Bodice.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_green_corset_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Green Corset Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_green_corset_v2_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Green Corset v2 Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_long_dress_blue_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Long dress blue.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_long_dress_green_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Long dress green.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_long_dress_orange_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Long dress orange.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_long_dress_purple_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Long dress purple.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_long_dress_red_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Long dress red.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_orange_bikini_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Orange bikini.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_orange_bodice_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Orange Bodice Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_orange_bodice_mid_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Orange Bodice Mid Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_orange_bodice_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Orange Bodice.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_orange_corset_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Orange Corset Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_orange_corset_v2_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Orange Corset v2 Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_pink_thigh-high_boots_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Pink Thigh-High Boots.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_purple_bikini_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Purple bikini.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_purple_bodice_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Purple Bodice Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_purple_bodice_mid_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Purple Bodice Mid Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_purple_bodice_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Purple Bodice.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_purple_corset_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Purple Corset Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_purple_corset_v2_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Purple Corset v2 Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_queen_dress_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Queen Dress.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_red_bikini_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Red bikini.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_red_bodice_long_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Red Bodice Long Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_red_bodice_mid_sleeves_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Red Bodice Mid Sleeves.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_red_bodice_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Red Bodice.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_red_thigh-high_boots_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Red Thigh-High Boots.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_short_skirt_f', 'src/assets/GandalfHardcore 43x Female Clothing/GandalfHardcore 43x Female Clothing/Short Skirt.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_fancy_hair_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Fancy Hair.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair10_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair10.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair11_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair11.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair12_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair12.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair13_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair13.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair14_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair14.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair15_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair15.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair16_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair16.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair17_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair17.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair18_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair18.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair19_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair19.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair20_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair20.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair21_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair21.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair22_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair22.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair23_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair23.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair24_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair24.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair25_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair25.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair26_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair26.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair27_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair27.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair28_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair28.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair29_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair29.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair30_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair30.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair6_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair6.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair7_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair7.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair8_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair8.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_hair9_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Male Hair9.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_queen_hair_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Queen hair.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_shield_maiden_hair_m', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/28x Male Hair/Shield Maiden hair.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair10_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair10.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair11_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair11.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair12_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair12.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair13_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair13.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair14_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair14.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair15_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair15.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair16_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair16.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair17_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair17.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair18_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair18.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair19_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair19.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair20_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair20.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair21_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair21.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair22_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair22.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair23_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair23.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair24_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair24.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair25_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair25.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair26_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair26.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair27_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair27.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair28_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair28.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair29_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair29.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair30_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair30.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair31_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair31.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair32_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair32.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair33_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair33.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair34_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair34.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair35_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair35.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair6_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair6.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair7_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair7.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair8_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair8.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_hair9_f', 'src/assets/GandalfHardcore 58x Hair/GandalfHardcore 58x Hair/30x Female Hair/Female Hair9.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_elven_ears1_f', 'src/assets/GandalfHardcore 10x Elven ears/Female Ears/Elven Ears1.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_elven_ears2_f', 'src/assets/GandalfHardcore 10x Elven ears/Female Ears/Elven Ears2.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_elven_ears3_f', 'src/assets/GandalfHardcore 10x Elven ears/Female Ears/Elven Ears3.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_elven_ears4_f', 'src/assets/GandalfHardcore 10x Elven ears/Female Ears/Elven Ears4.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_elven_ears5_f', 'src/assets/GandalfHardcore 10x Elven ears/Female Ears/Elven Ears5.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_elven_ears1_m', 'src/assets/GandalfHardcore 10x Elven ears/Male Ears/Elven Ears1.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_elven_ears2_m', 'src/assets/GandalfHardcore 10x Elven ears/Male Ears/Elven Ears2.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_elven_ears3_m', 'src/assets/GandalfHardcore 10x Elven ears/Male Ears/Elven Ears3.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_elven_ears4_m', 'src/assets/GandalfHardcore 10x Elven ears/Male Ears/Elven Ears4.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_elven_ears5_m', 'src/assets/GandalfHardcore 10x Elven ears/Male Ears/Elven Ears5.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_male_sword_m', 'src/assets/GandalfHardcore FREE Character Asset Pack/GandalfHardcore Character Asset Pack/Male Hand/Male Sword.png', { frameWidth: 100, frameHeight: 64 });
        this.scene.load.spritesheet('mod_female_sword_f', 'src/assets/GandalfHardcore FREE Character Asset Pack/GandalfHardcore Character Asset Pack/Female Hand/Female Sword.png', { frameWidth: 100, frameHeight: 64 });
        // --- END AUTO GENERATED ---

        // UI Assets
        this.scene.load.spritesheet('emojis', 'src/assets/GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png', { frameWidth: 16, frameHeight: 16 });
        this.scene.load.image('ui-bar', 'src/assets/GandalfHardcore Pixel Art Game UI/GandalfHardcore Pixel Art Game UI/64x16 resource counter.png');
        this.scene.load.image('ui-button', 'src/assets/GandalfHardcore Pixel Art Game UI/GandalfHardcore Pixel Art Game UI/32x64 button.png');
        this.scene.load.image('ui-frame', 'src/assets/GandalfHardcore Pixel Art Game UI/GandalfHardcore Pixel Art Game UI/64x64 frame.png');
        this.scene.load.image('ui-paper', 'src/assets/GandalfHardcore Pixel Art Game UI/GandalfHardcore Pixel Art Game UI/128x32 paper.png');

        // Projectiles and Effects
        this.scene.load.spritesheet('projectile_blue', 'src/assets/GandalfHardcore Projectiles and effects/GandalfHardcore Projectiles and effects/GandalfHardcore 64x64 Projectiles1.png', { frameWidth: 64, frameHeight: 64 });
        this.scene.load.image('arrow', 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/arrow.png');
        this.scene.load.image('elf_arrow', 'src/assets/craftpix-net-546731-elf-warrior-sprite-sheet-pixel-art-pack/Elf_3/Charge.png');

        // Weather Sprites
        this.scene.load.image('weather_rain', 'src/assets/Weather Sprites/Sprites/Sprites/rain1.png');
        this.scene.load.image('weather_snow', 'src/assets/Weather Sprites/Sprites/Sprites/snow.png');
        this.scene.load.spritesheet('weather_rain_collision', 'src/assets/Weather Sprites/Sprites/Sprites/ColisionRainAnim.png', { frameWidth: 16, frameHeight: 16 });
        this.scene.load.spritesheet('weather_blur_collision', 'src/assets/Weather Sprites/Sprites/Sprites/ColisionBlurAnim.png', { frameWidth: 16, frameHeight: 16 });

        // Restore original loader methods
        load.image = originalImage;
        load.spritesheet = originalSpritesheet;
        load.atlas = originalAtlas;
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
