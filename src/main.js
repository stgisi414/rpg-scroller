// main.js - Entry point for the game

let game = null;
let titleGame = null;
let selectedClassData = null;

window.INDOOR_LOCATIONS = {
    tavern: {
        name: 'Tavern',
        icon: 'local_bar',
        bg: 'bg_tavern',
        desc: 'Rest and restore your vitals',
        npcSprite: 'blacksmith',
        npcName: 'Barkeep',
        npcPersona: 'A gruff but friendly tavern owner who serves ale and hears all the rumors.',
        floorTint: 0x8B7355,
        action: 'rest'
    },
    blacksmith: {
        name: 'Blacksmith',
        icon: 'hardware',
        bg: 'bg_blacksmith',
        desc: 'Forge and upgrade weapons',
        npcSprite: 'blacksmith',
        npcName: 'Master Smith',
        npcPersona: 'A master blacksmith who creates weapons of legend.',
        floorTint: 0x4A4A4A,
        action: 'forge'
    },
    coliseum: {
        name: 'Coliseum',
        icon: 'swords',
        bg: 'bg_colliseum',
        desc: 'Fight infinite waves of enemies',
        npcSprite: 'knight',
        npcName: 'Arena Champion Kael',
        npcPersona: 'A legendary gladiator scarred from a thousand battles who runs the arena games. He respects only strength and rewards those who survive the endless waves. Once a mere pit fighter, he earned his freedom through sheer brutality.',
        floorTint: 0x666666,
        action: 'arena'
    },
    apothecary: {
        name: 'Apothecary',
        icon: 'science',
        bg: 'bg_apothecary',
        desc: 'Brew and buy potions',
        npcSprite: 'alchemist',
        npcName: 'Apothecary',
        npcPersona: 'A mysterious alchemist surrounded by bubbling concoctions.',
        floorTint: 0x3D5A3D,
        action: 'brew'
    },
    estate: {
        name: 'Your Estate',
        icon: 'home',
        bg: 'bg_cottage',
        desc: 'Rest and manage your homestead',
        npcSprite: 'spouse', // We will dynamically set this
        npcName: 'Your Spouse',
        npcPersona: 'Your loving spouse who manages the estate while you adventure.',
        floorTint: 0x5C4033,
        action: 'estate'
    },
    guild_hall: {
        name: 'Guild Hall',
        icon: 'military_tech',
        bg: 'bg_guild_hall',
        desc: 'Accept bounty contracts',
        npcSprite: 'knight',
        npcName: 'Guildmaster',
        npcPersona: 'A scarred veteran who posts bounties and rewards brave adventurers.',
        floorTint: 0x6B6B6B,
        action: 'contracts'
    },
    temple: {
        name: 'Temple',
        icon: 'church',
        bg: 'bg_temple',
        desc: 'Pray for blessings & healing',
        npcSprite: 'priest',
        npcName: 'High Priestess',
        npcPersona: 'A serene priestess who channels divine power to heal the wounded and bestow holy blessings upon worthy souls. She charges 25 gold for a full divine healing.',
        floorTint: 0x8888AA,
        action: 'pray'
    },
    library: {
        name: 'Library',
        icon: 'menu_book',
        bg: 'bg_library',
        desc: 'Study to increase intelligence',
        npcSprite: 'wizard',
        npcName: 'Head Librarian',
        npcPersona: 'An old wizard who speaks in riddles and guards ancient knowledge.',
        floorTint: 0x4A3B2C,
        action: 'study'
    },
    training: {
        name: 'Training Grounds',
        icon: 'swords',
        bg: 'bg_training',
        desc: 'Spar for safe XP',
        npcSprite: 'samurai',
        npcName: 'Weapons Master',
        npcPersona: 'A disciplined warrior who trains adventurers through combat drills.',
        floorTint: 0xAA9966,
        action: 'train'
    },
    throne_room: {
        name: 'Throne Room',
        icon: 'castle',
        bg: 'bg_throne_room',
        desc: 'Audience with the ruler',
        npcSprite: 'human_king',
        npcName: 'The King',
        npcPersona: 'The ruler of this kingdom.',
        floorTint: 0x8B0000,
        action: 'audience',
        capitalOnly: true  // Only shown in capital cities
    }
};

// Initialize the title screen Phaser canvas (animated sprites behind the HTML menu)
function initTitleScreen() {
    if (titleGame) return; // Already running
    titleGame = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: 'title-canvas',
        transparent: true,
        pixelArt: true,
        width: window.innerWidth,
        height: window.innerHeight,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [TitleScene],
        banner: false,
        audio: { noAudio: true }
    });
}

const classesData = {
    knight: {
        id: 'knight',
        name: 'The Knight',
        tagline: 'Forged in Ash, Bound by Iron',
        desc: 'A sturdy warrior clad in heavy iron. Excels in close combat and absorbs significant physical damage.',
        image: 'src/assets/GandalfHardcore%20FREE%20Warrior/GandalfHardcore%20Warrior.png',
        isSheet: true,
        frameWidth: 80, frameHeight: 64,
        idleFrames: 5, idleRow: 0,
        flipX: true, // Warrior sprite faces left by default
        dashRow: 5,
        animFrames: {
            idle: { start: 0, end: 4 },
            walk: { start: 10, end: 17 },
            attack: { start: 140, end: 145 },
            jump: { start: 40, end: 43 },
            fall: { start: 50, end: 53 },
            hit: { start: 160, end: 164 },
            die: { start: 150, end: 157 },
            duck: { frames: [100] } // Row 10 col 0 — sword raised guard stance
        },
        comboStartFrame: 120, comboEndFrame: 129, // Row 13 for GandalfHardcore Warrior
        createPreviewScale: 0.70,
        previewOffsetY: 35,
        slotPortraitX: -17, slotPortraitY: -18,
        stats: { vit: 15, str: 14, dex: 9, int: 8 }
    },
    heavy_knight: {
        id: 'heavy_knight',
        name: 'Heavy Knight',
        tagline: 'Unstoppable Juggernaut',
        desc: 'A colossal knight with devastating power.',
        image: 'src/assets/Heavy Knight/Heavy Knight/Black heavy.png',
        isSheet: true,
        frameWidth: 91, frameHeight: 64,
        sheetCols: 10,
        idleFrames: 5, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        jumpRow: 1,
        fallRow: 1,
        dashRow: 1,
        flipX: true,
        animFrames: {
            jump: { start: 5, end: 9 },
            fall: { start: 5, end: 9 },
            hit: { start: 30, end: 34 },
            die: { start: 50, end: 54 }
        },
        comboStartFrame: 40, comboEndFrame: 44,
        slotPortraitX: -17, slotPortraitY: -18,
        stats: { vit: 15, str: 14, dex: 9, int: 8 }
    },
    wizard: {
        id: 'wizard',
        name: 'The Wizard',
        tagline: 'Master of the Arcane Arts',
        desc: 'A scholar of ancient magic. Weak in physical defense but capable of devastating ranged spell attacks.',
        image: 'src/assets/GandalfHardcore%20Wizard/GandalfHardcore%20Wizard/Black%20Wizard%20sheet.png',
        isSheet: true,
        frameWidth: 64, frameHeight: 64,
        idleFrames: 6, idleRow: 1, // Lighting the wand tip
        walkRow: 0,
        attackRow: 2, // Shooting the blast
        jumpRow: 3,
        fallRow: 3, // No separate fall frame
        animFrames: {
            hit: { start: 54, end: 54 },
            die: { start: 60, end: 64 },
            duck: { frames: [14] } // Casting frame — staff raised as magic block pose
        },
        comboStartFrame: 24, // Row 4 (4 * 6)
        comboEndFrame: 41,   // End of Row 6 ((6 * 6) + 5)
        previewScale: 0.6,
        createPreviewScale: 0.70,
        previewOffsetY: 35,
        slotPortraitX: -12, slotPortraitY: -29,
        stats: { vit: 8, str: 6, dex: 10, int: 18 }
    },
    samurai: {
        id: 'samurai',
        name: 'The Samurai',
        tagline: 'Shadows Hide the Blade',
        desc: 'A nimble fighter relying on stealth and critical strikes. Extremely fast, but fragile.',
        image: 'src/assets/GandalfHardcore%20Samurai/GandalfHardcore%20Samurai/Samurai%20Sheet%20black.png',
        isSheet: true,
        frameWidth: 96, frameHeight: 64,
        animFrames: {
            idle: { start: 0, end: 4 },         // Row 0
            walk: { start: 16, end: 23 },        // Row 2
            attack: { start: 24, end: 31 },      // Row 3
            duck: { start: 96, end: 99 },        // Row 12
            jump: { start: 0, end: 0 },          // Static jump
            fall: { start: 40, end: 43 },        // Row 5
            hit: { start: 112, end: 116 },       // Row 14
            die: { start: 128, end: 136 }        // Row 16+17
        },
        comboStartFrame: 32,  // Row 4
        comboEndFrame: 43,    // Row 5 col 3 (frames 44-47 are empty)
        dashRow: 13,          // Row 13
        idleFrames: 5, idleRow: 0,
        flipX: true,
        slotFlipX: true,
        sheetCols: 8,
        createPreviewScale: 0.70,
        previewOffsetY: 35,
        slotPortraitX: -27, slotPortraitY: -19,
        stats: { vit: 10, str: 10, dex: 16, int: 10 }
    },
    ranger: {
        id: 'ranger',
        name: 'The Ranger',
        tagline: 'Eyes of the Forest',
        desc: 'An expert marksman. Controls the battlefield from afar with deadly arrows and traps.',
        image: 'src/assets/GandalfHardcore%20Archer/GandalfHardcore%20Archer/GandalfHardcore%20Archer%20black%20sheet.png',
        isSheet: true,
        frameWidth: 64, frameHeight: 64,  // characters spaced 64px apart
        animFrames: {
            idle: { start: 0, end: 4 },
            attack: { start: 11, end: 21 },
            walk: { start: 22, end: 29 },
            hit: { start: 33, end: 36 },
            die: { start: 44, end: 50 },
            duck: { frames: [15] }, // Bow fully drawn — block/ready stance
            jump: { frames: [0] },
            fall: { frames: [0] }
        },
        idleFrames: 5, idleRow: 0,
        createPreviewScale: 0.70,
        previewOffsetY: 35,
        slotPortraitX: -6, slotPortraitY: -20,
        stats: { vit: 11, str: 12, dex: 15, int: 9 }
    },
    elven_spellblade: {
        id: 'elven_spellblade',
        name: 'Spellblade',
        tagline: 'Arcane Blade, Swift as Wind',
        desc: 'A mystical elven warrior who blends physical swordplay with powerful arcane spells. High physical and magical damage.',
        image: 'src/assets/elven_spellblade.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        sheetCols: 12,
        spriteScale: 1.05,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 40 },
            die: { start: 48, end: 52 }
        },
        slotPortraitX: -20, slotPortraitY: -52,
        previewScale: 1.6,
        stats: { vit: 12, str: 13, dex: 11, int: 14 }
    },
    elven_king: {
        id: 'elven_king',
        name: 'Elven King',
        tagline: 'Sovereign of the Sylvan Canopy',
        desc: 'A noble elven monarch wielding a royal golden sword.',
        image: 'src/assets/elven_king.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        sheetCols: 12,
        spriteScale: 1.05,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        idleFrames: 7, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 42 },
            die: { start: 48, end: 54 }
        },
        stats: { vit: 300, str: 75, dex: 25, int: 45 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    elven_queen: {
        id: 'elven_queen',
        name: 'Elven Queen',
        tagline: 'Empress of the Whispering Woods',
        desc: 'A majestic elven queen channeling the forest\'s ancient light.',
        image: 'src/assets/elven_queen.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        sheetCols: 12,
        spriteScale: 1.05,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        flipX: false,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 41 },
            die: { start: 48, end: 53 }
        },
        stats: { vit: 250, str: 65, dex: 20, int: 50 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    human_king: {
        id: 'human_king',
        name: 'Human King',
        tagline: 'Sovereign of the Realm',
        desc: 'A noble human monarch wielding a regal sword of office.',
        image: 'src/assets/human_king.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        sheetCols: 12,
        spriteScale: 1.05,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        flipX: false,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 38 },
            die: { start: 48, end: 58 }
        },
        stats: { vit: 300, str: 80, dex: 20, int: 30 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    human_queen: {
        id: 'human_queen',
        name: 'Human Queen',
        tagline: 'Grace and Authority',
        desc: 'A regal human queen commanding her court with wisdom and poise.',
        image: 'src/assets/human_queen.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        sheetCols: 12,
        spriteScale: 1.05,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        idleFrames: 7, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        flipX: false,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 38 },
            die: { start: 48, end: 55 }
        },
        stats: { vit: 250, str: 65, dex: 25, int: 40 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    elven_longbowman: {
        id: 'elven_longbowman',
        name: 'Elven Longbowman',
        tagline: 'Vanguard of the Woods',
        desc: 'An elite elven archer guarding the sylvan gates.',
        image: 'src/assets/elven_longbowman.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        sheetCols: 12,
        spriteScale: 1.05,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 40 },
            die: { start: 48, end: 52 }
        },
        stats: { vit: 20, str: 15, dex: 25, int: 10 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    elven_guard: {
        id: 'elven_guard',
        name: 'Elven Guard',
        tagline: 'Sylvan Shield-Bearer',
        desc: 'A dedicated elven sentinel trained in heavy defensive warfare.',
        image: 'src/assets/elven_guard.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        sheetCols: 12,
        spriteScale: 1.066,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 40 },
            die: { start: 48, end: 52 }
        },
        stats: { vit: 24, str: 16, dex: 12, int: 8 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    dwarf_warrior: {
        id: 'dwarf_warrior',
        name: 'Dwarf Warrior',
        tagline: 'Stalwart Defender of the Deep',
        desc: 'A heavy-armored dwarven warrior wielding a massive battleaxe.',
        image: 'src/assets/dwarf_warrior.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 0.9,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 30, end: 33 },
            die: { start: 40, end: 44 }
        },
        stats: { vit: 32, str: 28, dex: 12, int: 8 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    dwarf_miner: {
        id: 'dwarf_miner',
        name: 'Dwarf Miner',
        tagline: 'Delver of the Underrealm',
        desc: 'A rugged dwarven miner wielding a heavy iron pickaxe.',
        image: 'src/assets/dwarf_miner.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 0.9,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 30, end: 33 },
            die: { start: 40, end: 44 }
        },
        stats: { vit: 28, str: 22, dex: 15, int: 10 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    dwarf_king: {
        id: 'dwarf_king',
        name: 'Dwarf King',
        tagline: 'Lord of the Stone Throne',
        desc: 'A majestic dwarven king wearing golden crown and heavy royal plates.',
        image: 'src/assets/dwarf_king.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 0.9,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 30, end: 33 },
            die: { start: 40, end: 44 }
        },
        stats: { vit: 45, str: 30, dex: 15, int: 15 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    witch: {
        id: 'witch',
        name: 'Witch',
        tagline: 'Mistress of Dark Sorcery',
        desc: 'A mysterious witch wielding ancient curses and dark magic. Commands powerful spells from the shadows.',
        image: 'src/assets/witch_2.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        sheetCols: 14,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        dashRow: 8,
        flipX: false,
        spriteScale: 1.066,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [60] },
            dash: { start: 112, end: 119 },
            jump: { start: 98, end: 110 },
            fall: { start: 105, end: 110 },
            attack: { start: 28, end: 32 },
            combo: { start: 84, end: 91 },
            hit: { start: 56, end: 60 },
            die: { start: 70, end: 73 }
        },
        attack2Frames: { start: 42, end: 45 },
        stats: { vit: 18, str: 8, dex: 14, int: 35 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    priest: {
        id: 'priest',
        name: 'Priest',
        tagline: 'Vessel of Divine Light',
        desc: 'A holy priest who channels divine power to heal allies and smite the wicked with radiant energy.',
        image: 'src/assets/priest_2.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        sheetCols: 16,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        flipX: false,
        spriteScale: 1.066,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { start: 16, end: 20 },
            fall: { start: 21, end: 25 },
            attack: { start: 32, end: 39 },
            hit: { start: 48, end: 57 },
            die: { start: 64, end: 67 },
            combo: { start: 64, end: 67 }
        },
        attackDuration: 500,
        stats: { vit: 28, str: 10, dex: 12, int: 28 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    pyromancer: {
        id: 'pyromancer',
        name: 'Pyromancer',
        tagline: 'Herald of the Inferno',
        desc: 'A fearsome pyromancer who commands devastating fire magic, engulfing enemies in arcane flames.',
        image: 'src/assets/pyromancer_3.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        sheetCols: 16,
        idleFrames: 7, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        dashRow: 8,
        flipX: false,
        spriteScale: 1.066,
        bodyWidth: 48, bodyHeight: 108, bodyOffsetX: 40, bodyOffsetY: 20,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            idle: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 16, 17, 18, 19, 20, 21, 22, 23] },
            jump: { start: 112, end: 123 },
            fall: { start: 118, end: 123 },
            attack: { start: 32, end: 37 },
            combo: { start: 64, end: 74 },
            hit: { start: 80, end: 84 },
            die: { start: 96, end: 99 }
        },
        attack2Frames: { start: 48, end: 52 },
        stats: { vit: 20, str: 15, dex: 12, int: 32 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    dark_elf_guard: {
        id: 'dark_elf_guard',
        name: 'Dark Elf Sorceress',
        tagline: 'Abyssal Weaver',
        desc: 'A powerful sorceress channeling chaotic void spells.',
        image: 'src/assets/dark_elf_guard.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.066,
        bodyWidth: 48, bodyHeight: 104, bodyOffsetX: 40, bodyOffsetY: 24,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 40 },
            die: { start: 48, end: 52 }
        },
        stats: { vit: 20, str: 10, dex: 12, int: 28 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    dark_elf_spellblade: {
        id: 'dark_elf_spellblade',
        name: 'Dark Elf Spellblade',
        tagline: 'Shadowblade Master',
        desc: 'A lethal warrior blending blade strikes with dark magic spells.',
        image: 'src/assets/dark_elf_spellblade.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.066,
        bodyWidth: 48, bodyHeight: 104, bodyOffsetX: 40, bodyOffsetY: 24,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 40 },
            die: { start: 48, end: 52 }
        },
        stats: { vit: 24, str: 16, dex: 12, int: 16 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    dark_elf_longbowman: {
        id: 'dark_elf_longbowman',
        name: 'Dark Elf Assassin',
        tagline: 'Shadow Striker',
        desc: 'An elite blade-wielder striking from the shadows.',
        image: 'src/assets/dark_elf_longbowman.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.066,
        bodyWidth: 48, bodyHeight: 104, bodyOffsetX: 40, bodyOffsetY: 24,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 40 },
            die: { start: 48, end: 52 }
        },
        stats: { vit: 22, str: 14, dex: 22, int: 8 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    dark_elf_queen: {
        id: 'dark_elf_queen',
        name: 'Dark Elf Queen',
        tagline: 'Sovereign of Nightfall',
        desc: 'The supreme ruler of the obsidian outposts, channeling massive shadow spells.',
        image: 'src/assets/dark_elf_queen.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.15,
        bodyWidth: 48, bodyHeight: 104, bodyOffsetX: 40, bodyOffsetY: 24,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 40 },
            die: { start: 48, end: 52 }
        },
        stats: { vit: 40, str: 20, dex: 15, int: 28 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    mimic_1: {
        id: 'mimic_1',
        name: 'Bronze Mimic',
        tagline: 'Hungry Chest',
        desc: 'A bronze-reinforced treasure chest that attacks greedy delvers.',
        image: 'src/assets/mimic_1.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 1, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.0,
        bodyWidth: 56, bodyHeight: 50, bodyOffsetX: 36, bodyOffsetY: 78,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 39 },
            die: { start: 48, end: 53 }
        },
        stats: { vit: 25, str: 16, dex: 10, int: 5 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    mimic_2: {
        id: 'mimic_2',
        name: 'Silver Mimic',
        tagline: 'Fierce Chest',
        desc: 'A silver-reinforced treasure chest with dangerous bite force.',
        image: 'src/assets/mimic_2.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 1, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.0,
        bodyWidth: 56, bodyHeight: 50, bodyOffsetX: 36, bodyOffsetY: 78,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 39 },
            die: { start: 48, end: 53 }
        },
        stats: { vit: 35, str: 22, dex: 12, int: 5 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    mimic_3: {
        id: 'mimic_3',
        name: 'Gold Mimic',
        tagline: 'Royal Chest',
        desc: 'A golden-gilded chest, the most lethal and aggressive mimic.',
        image: 'src/assets/mimic_3.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 1, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.0,
        bodyWidth: 56, bodyHeight: 50, bodyOffsetX: 36, bodyOffsetY: 78,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 39 },
            die: { start: 48, end: 53 }
        },
        stats: { vit: 48, str: 28, dex: 14, int: 5 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    gorgon_1: {
        id: 'gorgon_1',
        name: 'Gorgon Sentinel',
        tagline: 'Serpentine Stalker',
        desc: 'A snake-bodied sentinel capable of physical strikes and petrifying gazes.',
        image: 'src/assets/gorgon_1.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.066,
        bodyWidth: 48, bodyHeight: 96, bodyOffsetX: 40, bodyOffsetY: 32,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 39 },
            die: { start: 48, end: 53 }
        },
        stats: { vit: 26, str: 15, dex: 15, int: 10 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    gorgon_2: {
        id: 'gorgon_2',
        name: 'Gorgon Stalker',
        tagline: 'Venomous Serpent',
        desc: 'A highly dangerous gorgon wielding dual strikes and stone gazes.',
        image: 'src/assets/gorgon_2.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.066,
        bodyWidth: 48, bodyHeight: 96, bodyOffsetX: 40, bodyOffsetY: 32,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 39 },
            die: { start: 48, end: 53 }
        },
        stats: { vit: 36, str: 20, dex: 18, int: 12 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    gorgon_3: {
        id: 'gorgon_3',
        name: 'Gorgon Queen',
        tagline: 'Mistress of Stone',
        desc: 'A grand gorgon queen commanding massive stone curses and snake strikes.',
        image: 'src/assets/gorgon_3.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.066,
        bodyWidth: 48, bodyHeight: 96, bodyOffsetX: 40, bodyOffsetY: 32,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 39 },
            die: { start: 48, end: 53 }
        },
        stats: { vit: 48, str: 24, dex: 22, int: 16 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    stone_golem: {
        id: 'stone_golem',
        name: 'Stone Golem',
        tagline: 'Living Boulder',
        desc: 'A massive golem constructed from solid stone, possessing slow but crushing strikes.',
        image: 'src/assets/stone_golem.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.15,
        bodyWidth: 56, bodyHeight: 100, bodyOffsetX: 36, bodyOffsetY: 28,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 39 },
            die: { start: 48, end: 53 }
        },
        stats: { vit: 60, str: 28, dex: 8, int: 5 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    lava_golem: {
        id: 'lava_golem',
        name: 'Lava Golem',
        tagline: 'Molten Behemoth',
        desc: 'A terrifying golem forged from molten lava, burning all who draw near.',
        image: 'src/assets/lava_golem.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.15,
        bodyWidth: 56, bodyHeight: 100, bodyOffsetX: 36, bodyOffsetY: 28,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 39 },
            die: { start: 48, end: 53 }
        },
        stats: { vit: 75, str: 32, dex: 8, int: 5 },
        slotPortraitX: -20, slotPortraitY: -52
    },
    copper_golem: {
        id: 'copper_golem',
        name: 'Copper Golem',
        tagline: 'Automated Protector',
        desc: 'A relic of an ancient empire, defending outposts with mechanical strikes.',
        image: 'src/assets/copper_golem.png',
        isSheet: true,
        frameWidth: 128, frameHeight: 128,
        idleFrames: 6, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        spriteScale: 1.15,
        bodyWidth: 56, bodyHeight: 100, bodyOffsetX: 36, bodyOffsetY: 28,
        previewScale: 1.6,
        createPreviewScale: 1.0,
        previewOffsetY: 20,
        animFrames: {
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] },
            hit: { start: 36, end: 39 },
            die: { start: 48, end: 53 }
        },
        stats: { vit: 50, str: 22, dex: 12, int: 5 },
        slotPortraitX: -20, slotPortraitY: -52
    }
};

// Derived rival and boss classes
classesData.knight_rival = { ...classesData.heavy_knight, id: 'knight_rival', stats: { vit: 30, str: 25, dex: 15, int: 8 }, animFrames: JSON.parse(JSON.stringify(classesData.heavy_knight.animFrames || {})) };
classesData.knight_rival.image = 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png';
classesData.wizard_rival = { ...classesData.wizard, id: 'wizard_rival', stats: { vit: 20, str: 10, dex: 15, int: 30 }, animFrames: JSON.parse(JSON.stringify(classesData.wizard.animFrames || {})) };
classesData.wizard_rival.image = 'src/assets/GandalfHardcore Wizard/GandalfHardcore Wizard/Red Wizard sheet.png';
classesData.samurai_rival = { ...classesData.samurai, id: 'samurai_rival', stats: { vit: 25, str: 20, dex: 30, int: 5 }, animFrames: JSON.parse(JSON.stringify(classesData.samurai.animFrames || {})) };
classesData.samurai_rival.image = 'src/assets/GandalfHardcore Samurai/GandalfHardcore Samurai/Samurai Sheet red.png';
classesData.ranger_rival = { ...classesData.ranger, id: 'ranger_rival', stats: { vit: 25, str: 15, dex: 25, int: 15 }, animFrames: JSON.parse(JSON.stringify(classesData.ranger.animFrames || {})) };
classesData.ranger_rival.image = 'src/assets/GandalfHardcore Archer/GandalfHardcore Archer/GandalfHardcore Archer red sheet.png';
classesData.elven_spellblade_rival = { ...classesData.elven_spellblade, id: 'elven_spellblade_rival', stats: { vit: 24, str: 22, dex: 18, int: 26 }, animFrames: JSON.parse(JSON.stringify(classesData.elven_spellblade.animFrames || {})) };
classesData.elven_spellblade_rival.image = 'src/assets/elven_spellblade.png?v=5';
classesData.elven_longbowman_rival = { ...classesData.elven_longbowman, id: 'elven_longbowman_rival', stats: { vit: 20, str: 15, dex: 25, int: 10 }, animFrames: JSON.parse(JSON.stringify(classesData.elven_longbowman.animFrames || {})) };
classesData.elven_longbowman_rival.image = 'src/assets/elven_longbowman.png';
classesData.elven_guard_rival = { ...classesData.elven_guard, id: 'elven_guard_rival', stats: { vit: 32, str: 20, dex: 14, int: 8 }, animFrames: JSON.parse(JSON.stringify(classesData.elven_guard.animFrames || {})) };
classesData.elven_guard_rival.image = 'src/assets/elven_guard.png';
classesData.elven_queen_rival = { ...classesData.elven_queen, id: 'elven_queen_rival', stats: { vit: 35, str: 18, dex: 16, int: 28 }, animFrames: JSON.parse(JSON.stringify(classesData.elven_queen.animFrames || {})) };
classesData.elven_queen_rival.image = 'src/assets/elven_queen.png';
classesData.dwarf_warrior_rival = { ...classesData.dwarf_warrior, id: 'dwarf_warrior_rival', stats: { vit: 30, str: 25, dex: 10, int: 8 }, animFrames: JSON.parse(JSON.stringify(classesData.dwarf_warrior.animFrames || {})) };
classesData.dwarf_warrior_rival.image = 'src/assets/dwarf_warrior.png';
classesData.dwarf_miner_rival = { ...classesData.dwarf_miner, id: 'dwarf_miner_rival', stats: { vit: 25, str: 20, dex: 12, int: 10 }, animFrames: JSON.parse(JSON.stringify(classesData.dwarf_miner.animFrames || {})) };
classesData.dwarf_miner_rival.image = 'src/assets/dwarf_miner.png';
classesData.dwarf_king_rival = { ...classesData.dwarf_king, id: 'dwarf_king_rival', stats: { vit: 100, str: 40, dex: 15, int: 25 }, animFrames: JSON.parse(JSON.stringify(classesData.dwarf_king.animFrames || {})) };
classesData.dwarf_king_rival.image = 'src/assets/dwarf_king.png';
classesData.megaboss_rival = { ...classesData.heavy_knight, id: 'megaboss_rival', stats: { vit: 150, str: 50, dex: 20, int: 20 }, animFrames: JSON.parse(JSON.stringify(classesData.heavy_knight.animFrames || {})) };
classesData.megaboss_rival.image = 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png';
classesData.witch_1_rival = { ...classesData.witch, id: 'witch_1_rival', image: 'src/assets/witch_1.png', attack2Frames: { start: 42, end: 44 }, stats: { vit: 20, str: 10, dex: 15, int: 30 }, animFrames: JSON.parse(JSON.stringify(classesData.witch.animFrames || {})) };
classesData.witch_3_rival = { ...classesData.witch, id: 'witch_3_rival', image: 'src/assets/witch_3.png', attack2Frames: { start: 42, end: 44 }, stats: { vit: 22, str: 12, dex: 14, int: 32 }, animFrames: JSON.parse(JSON.stringify(classesData.witch.animFrames || {})) };
classesData.pyromancer_1_rival = {
    ...classesData.pyromancer,
    id: 'pyromancer_1_rival',
    image: 'src/assets/pyromancer_1.png',
    stats: { vit: 22, str: 14, dex: 12, int: 28 },
    attack2Frames: { start: 48, end: 61 },
    dashRow: 8,
    animFrames: {
        duck: { frames: [0] },
        idle: { start: 0, end: 5 },
        walk: { start: 16, end: 23 },
        attack: { start: 64, end: 69 },
        combo: { start: 32, end: 40 },
        hit: { start: 80, end: 83 },
        die: { start: 96, end: 99 },
        jump: { start: 112, end: 123 },
        fall: { start: 118, end: 123 }
    }
};
classesData.pyromancer_2_rival = {
    ...classesData.pyromancer,
    id: 'pyromancer_2_rival',
    image: 'src/assets/pyromancer_2.png',
    stats: { vit: 20, str: 16, dex: 14, int: 30 },
    attack2Frames: { start: 48, end: 52 },
    dashRow: 8,
    animFrames: {
        duck: { frames: [0] },
        idle: { start: 0, end: 5 },
        walk: { start: 16, end: 23 },
        attack: { start: 32, end: 37 },
        attack2: { start: 48, end: 52 },
        combo: { start: 64, end: 69 },
        hit: { start: 80, end: 83 },
        die: { start: 96, end: 99 },
        jump: { start: 112, end: 123 },
        fall: { start: 118, end: 123 }
    }
};
// Playable subclasses and rival subclasses
classesData.witch_1 = { ...classesData.witch, id: 'witch_1', name: 'Witch 1', image: 'src/assets/witch_1.png', animFrames: JSON.parse(JSON.stringify(classesData.witch.animFrames || {})) };
classesData.witch_2 = { ...classesData.witch, id: 'witch_2', name: 'Witch 2', image: 'src/assets/witch_2.png', animFrames: JSON.parse(JSON.stringify(classesData.witch.animFrames || {})) };
classesData.witch_3 = { ...classesData.witch, id: 'witch_3', name: 'Witch 3', image: 'src/assets/witch_3.png', animFrames: JSON.parse(JSON.stringify(classesData.witch.animFrames || {})) };
classesData.witch_2_rival = { ...classesData.witch_2, id: 'witch_2_rival', stats: { vit: 20, str: 10, dex: 15, int: 30 } };

classesData.priest_1 = { ...classesData.priest, id: 'priest_1', name: 'Priest 1', image: 'src/assets/priest_1.png', animFrames: JSON.parse(JSON.stringify(classesData.priest.animFrames || {})) };
classesData.priest_2 = { ...classesData.priest, id: 'priest_2', name: 'Priest 2', image: 'src/assets/priest_2.png', animFrames: JSON.parse(JSON.stringify(classesData.priest.animFrames || {})) };
classesData.priest_3 = { ...classesData.priest, id: 'priest_3', name: 'Priest 3', image: 'src/assets/priest_3.png', animFrames: JSON.parse(JSON.stringify(classesData.priest.animFrames || {})) };
classesData.priest_1_rival = { ...classesData.priest_1, id: 'priest_1_rival', stats: { vit: 26, str: 12, dex: 14, int: 26 } };
classesData.priest_2_rival = { ...classesData.priest_2, id: 'priest_2_rival', stats: { vit: 28, str: 10, dex: 12, int: 28 } };
classesData.priest_3_rival = { ...classesData.priest_3, id: 'priest_3_rival', stats: { vit: 24, str: 14, dex: 10, int: 30 } };

classesData.pyromancer_1 = {
    ...classesData.pyromancer,
    id: 'pyromancer_1',
    name: 'Pyromancer 1',
    image: 'src/assets/pyromancer_1.png',
    stats: { vit: 20, str: 15, dex: 12, int: 32 },
    attack2Frames: { start: 48, end: 61 },
    dashRow: 8,
    animFrames: {
        duck: { frames: [0] },
        idle: { start: 0, end: 5 },
        walk: { start: 16, end: 23 },
        attack: { start: 64, end: 69 },
        combo: { start: 32, end: 40 },
        hit: { start: 80, end: 83 },
        die: { start: 96, end: 99 },
        jump: { start: 112, end: 123 },
        fall: { start: 118, end: 123 }
    }
};
classesData.pyromancer_2 = {
    ...classesData.pyromancer,
    id: 'pyromancer_2',
    name: 'Pyromancer 2',
    image: 'src/assets/pyromancer_2.png',
    stats: { vit: 20, str: 15, dex: 12, int: 32 },
    attack2Frames: { start: 48, end: 52 },
    dashRow: 8,
    animFrames: {
        duck: { frames: [0] },
        idle: { start: 0, end: 5 },
        walk: { start: 16, end: 23 },
        attack: { start: 32, end: 37 },
        attack2: { start: 48, end: 52 },
        combo: { start: 64, end: 69 },
        hit: { start: 80, end: 83 },
        die: { start: 96, end: 99 },
        jump: { start: 112, end: 123 },
        fall: { start: 118, end: 123 }
    }
};
classesData.pyromancer_3 = { ...classesData.pyromancer, id: 'pyromancer_3', name: 'Pyromancer 3', image: 'src/assets/pyromancer_3.png', animFrames: JSON.parse(JSON.stringify(classesData.pyromancer.animFrames || {})) };
classesData.pyromancer_3_rival = { ...classesData.pyromancer_3, id: 'pyromancer_3_rival', stats: { vit: 18, str: 18, dex: 10, int: 34 } };

window.classesData = classesData;

// Base Luck definition for all classes
if (classesData.knight && classesData.knight.stats) classesData.knight.stats.luck = 10;
if (classesData.heavy_knight && classesData.heavy_knight.stats) classesData.heavy_knight.stats.luck = 10;
if (classesData.wizard && classesData.wizard.stats) classesData.wizard.stats.luck = 10;
if (classesData.samurai && classesData.samurai.stats) classesData.samurai.stats.luck = 8;
if (classesData.ranger && classesData.ranger.stats) classesData.ranger.stats.luck = 12;
if (classesData.elven_spellblade && classesData.elven_spellblade.stats) classesData.elven_spellblade.stats.luck = 10;
if (classesData.witch && classesData.witch.stats) classesData.witch.stats.luck = 10;
if (classesData.priest && classesData.priest.stats) classesData.priest.stats.luck = 10;
if (classesData.pyromancer && classesData.pyromancer.stats) classesData.pyromancer.stats.luck = 10;

const classGrowths = {
    knight: { vit: 2.0, str: 1.5, dex: 0.8, int: 0.4, luck: 0.5 },
    heavy_knight: { vit: 2.0, str: 1.5, dex: 0.8, int: 0.4, luck: 0.5 },
    wizard: { vit: 0.8, str: 0.4, dex: 1.0, int: 2.0, luck: 0.5 },
    samurai: { vit: 1.0, str: 1.0, dex: 2.0, int: 0.5, luck: 0.4 },
    ranger: { vit: 1.2, str: 1.2, dex: 1.8, int: 0.6, luck: 0.6 },
    elven_spellblade: { vit: 1.2, str: 1.4, dex: 1.2, int: 1.6, luck: 0.5 },
    witch: { vit: 1.4, str: 0.6, dex: 1.0, int: 2.2, luck: 0.5 },
    priest: { vit: 1.8, str: 0.8, dex: 1.0, int: 1.8, luck: 0.5 },
    pyromancer: { vit: 1.4, str: 1.2, dex: 1.0, int: 2.0, luck: 0.5 }
};

window.calculateStatsForLevel = function(classId, level) {
    const baseData = window.classesData[classId] || window.classesData['knight'];
    const growths = classGrowths[classId] || classGrowths['knight'];
    const baseStats = baseData.stats || { vit: 10, str: 10, dex: 10, int: 10, luck: 10 };
    
    const factor = 1 + (level - 1) * 0.01;
    const newStats = {};
    for (const key in baseStats) {
        const base = baseStats[key];
        const growth = growths[key] || 0.5;
        newStats[key] = Math.round(base + growth * (level - 1) * factor);
    }
    if (newStats.luck === undefined) {
        newStats.luck = Math.round((baseStats.luck || 10) + (growths.luck || 0.5) * (level - 1) * factor);
    }
    return newStats;
};

let creationAllocations = {}; // Stores { skillId: rank }

function renderCreationSkillsGrid() {
    const grid = document.getElementById('create-skills-grid');
    const counter = document.getElementById('create-skill-points-counter');
    const tooltip = document.getElementById('create-skills-tooltip');
    const btnAwaken = document.getElementById('btn-awaken');

    if (!grid || !window.selectedClassData || !window.PASSIVE_SKILLS_DATA) return;

    const classId = window.selectedClassData.id;
    const classSkills = window.PASSIVE_SKILLS_DATA.filter(s => s.classId === classId);
    
    // Calculate total allocated points
    let allocated = 0;
    for (const key in creationAllocations) {
        allocated += creationAllocations[key] || 0;
    }
    if (counter) counter.innerText = `${allocated} / 3`;

    // Handle awaken button state
    if (btnAwaken) {
        if (allocated === 3) {
            btnAwaken.disabled = false;
            btnAwaken.style.opacity = '1.0';
            btnAwaken.style.pointerEvents = 'auto';
            btnAwaken.title = 'Awaken your hero!';
        } else {
            btnAwaken.disabled = true;
            btnAwaken.style.opacity = '0.4';
            btnAwaken.style.pointerEvents = 'none';
            btnAwaken.title = 'Allocate all 3 starting skill points to awaken.';
        }
    }

    grid.innerHTML = classSkills.map(skill => {
        const rank = creationAllocations[skill.id] || 0;
        const iconUrl = `src/assets/skills/${skill.id}.png`;
        const activeClass = rank > 0 ? 'border-primary bg-primary/20 shadow-[0_0_8px_rgba(45,219,222,0.4)]' : 'border-outline-variant hover:border-on-surface-variant';
        
        return `
            <div data-skill-id="${skill.id}" class="create-skill-icon-box relative w-10 h-10 border-2 rounded flex items-center justify-center cursor-pointer transition-all duration-150 ${activeClass}" style="image-rendering: pixelated;">
                <img src="${iconUrl}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2FhYSI+PHBhdGggZD0iTTEyIDJDMiAyIDIgMTIgMiAxMnMxMCAxMCAxMCAxMCAxMCAxMCAxMCAxMFMyIDEyIDEyIDJ6Ii8+PC9zdmc+'" class="w-8 h-8 object-contain" />
                \${rank > 0 ? \`<span class="absolute -bottom-1 -right-1 bg-primary text-background font-bold text-[9px] px-1 rounded border border-primary shadow">\${rank}</span>\` : ''}
            </div>
        `;
    }).join('');

    // Register event listeners
    grid.querySelectorAll('.create-skill-icon-box').forEach(box => {
        const skillId = box.dataset.skillId;
        const skill = classSkills.find(s => s.id === skillId);

        box.addEventListener('mouseenter', () => {
            const rank = creationAllocations[skillId] || 0;
            if (tooltip) tooltip.innerHTML = `<strong>${skill.name}</strong> [Rank ${rank}/5]: ${skill.description}`;
        });

        box.addEventListener('click', () => {
            const rank = creationAllocations[skillId] || 0;
            if (allocated < 3 && rank < 5) {
                creationAllocations[skillId] = rank + 1;
            } else if (rank > 0) {
                creationAllocations[skillId] = rank - 1;
                if (creationAllocations[skillId] === 0) {
                    delete creationAllocations[skillId];
                }
            }
            renderCreationSkillsGrid();
            
            // Update tooltip text with new rank
            const newRank = creationAllocations[skillId] || 0;
            if (tooltip) tooltip.innerHTML = `<strong>\${skill.name}</strong> [Rank \${newRank}/5]: \${skill.description}`;
        });
    });
}

function showTitleScreen() {
    document.getElementById('ui-create').style.display = 'none';
    document.getElementById('ui-title').style.display = 'flex';
    // Re-init title Phaser canvas if it was destroyed
    initTitleScreen();
}

function showCreateScreen() {
    document.getElementById('ui-title').style.display = 'none';
    document.getElementById('ui-create').style.display = 'block';
    selectClass('knight'); // Default selection
}

function selectClass(classId) {
    const data = classesData[classId];
    selectedClassData = data;

    // Update UI text
    document.getElementById('create-class-name').innerText = data.name;
    document.getElementById('create-class-tagline').innerText = data.tagline;
    document.getElementById('create-class-desc').innerText = data.desc;
    
    // Update Image
    const container = document.getElementById('create-class-image');
    
    // Cleanup any existing animation
    if (window.currentPreviewAnim) {
        window.currentPreviewAnim.cancel();
        window.currentPreviewAnim = null;
    }

    if (data.isSheet) {
        // Base scale entirely on height so all characters are scaled relative to container height (256px)
        const baseScale = 256 / data.frameHeight;
        const userScale = data.createPreviewScale || 1;
        const scale = baseScale * userScale;

        // Size the container element itself to match the frame dimensions exactly, eliminating frame bleed
        const frameWidthPx = data.frameWidth * scale;
        const frameHeightPx = data.frameHeight * scale;
        container.style.width = `${frameWidthPx}px`;
        container.style.height = `${frameHeightPx}px`;

        // Position the container inside the parent box using absolute layout
        container.style.position = 'absolute';
        container.style.left = '50%';
        container.style.transform = `translateX(-50%) ${data.flipX ? 'scaleX(-1)' : ''}`;
        
        // Raising the character from the bottom using previewOffsetY
        // Note: positive raises it above bottom, negative shifts it below.
        const raiseAmount = (data.previewOffsetY || 0);
        container.style.bottom = `${raiseAmount}px`;
        container.style.top = 'auto';

        // Hide image until ready to prevent flashing the full sheet
        container.style.backgroundImage = 'none';
        container.style.backgroundRepeat = 'no-repeat';
        container.style.imageRendering = 'pixelated';
        
        // Load image to get actual sheet dimensions for proper scaling
        const tempImg = new Image();
        tempImg.src = data.image;
        tempImg.onload = () => {
            const currentContainer = document.getElementById('create-class-image');
            if (!currentContainer || currentContainer !== container) return;
            container.style.backgroundSize = `${tempImg.width * scale}px ${tempImg.height * scale}px`;
            container.style.backgroundImage = `url('${data.image}')`;
            
            const rowOffset = (data.idleRow || 0) * frameHeightPx;
            
            // Animate background-position from initial offset (offsetX is 0 since container is sized to frame)
            window.currentPreviewAnim = container.animate([
                { backgroundPosition: `0px ${-rowOffset}px` },
                { backgroundPosition: `${-(data.idleFrames * frameWidthPx)}px ${-rowOffset}px` }
            ], {
                duration: data.idleFrames * 150, // 150ms per frame
                easing: `steps(${data.idleFrames}, end)`,
                iterations: Infinity
            });
        };
        container.style.backgroundSize = 'auto';
        container.innerHTML = '';
    } else {
        // It's a standalone image/gif — use an <img> tag and reset container sizing styles
        container.style.position = 'relative';
        container.style.left = '0';
        container.style.transform = 'none';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.bottom = 'auto';
        container.style.top = 'auto';
        container.style.backgroundImage = 'none';
        const flipStyle = data.flipX ? 'transform: scaleX(-1);' : '';
        container.innerHTML = `<img src="${data.image}" alt="${data.name}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;${flipStyle}" />`;
    }

    // Update Stats
    const maxStat = 20;
    const updateStat = (stat, val) => {
        document.getElementById(`stat-${stat}-val`).innerText = val;
        document.getElementById(`stat-${stat}-bar`).style.width = `${(val / maxStat) * 100}%`;
    };
    updateStat('vit', data.stats.vit);
    updateStat('str', data.stats.str);
    updateStat('dex', data.stats.dex);
    updateStat('int', data.stats.int);

    // Update active button styling
    document.querySelectorAll('.class-btn').forEach(btn => {
        if (btn.dataset.class === classId) {
            btn.classList.add('border-secondary', 'bg-surface-container-highest');
            btn.classList.remove('border-outline-variant', 'bg-surface-container-low');
            btn.querySelector('span:first-child').classList.add('text-secondary');
            btn.querySelector('span:first-child').classList.remove('text-on-surface-variant');
        } else {
            btn.classList.remove('border-secondary', 'bg-surface-container-highest');
            btn.classList.add('border-outline-variant', 'bg-surface-container-low');
            btn.querySelector('span:first-child').classList.remove('text-secondary');
            btn.querySelector('span:first-child').classList.add('text-on-surface-variant');
        }
    });

    creationAllocations = {};
    renderCreationSkillsGrid();
}

function startGame(saveData) {
    // Destroy the title screen Phaser instance before creating the gameplay one
    if (titleGame) {
        titleGame.destroy(true);
        titleGame = null;
    }

    // Hide Create UI and show Game UI
    document.getElementById('ui-create').style.display = 'none';
    document.getElementById('ui-select').style.display = 'none';
    document.getElementById('ui-title').style.display = 'none';
    // HUD is managed by GameScene now

    window.selectedClass = classesData[saveData.classId];
    window.saveData = JSON.parse(JSON.stringify(saveData));

    // Character Stats & Level Progression Migration
    if (window.saveData && window.saveData.level) {
        if (!window.saveData.stats || window.saveData.stats.luck === undefined || window.saveData.stats.migratedProgress !== true) {
            window.saveData.stats = window.calculateStatsForLevel(window.saveData.classId || 'knight', window.saveData.level);
            window.saveData.stats.migratedProgress = true;
            window.saveData.passiveSkills = window.saveData.passiveSkills || {};
            
            const totalPoints = 3 + (window.saveData.level - 1);
            let spentPoints = 0;
            for (const skillId in window.saveData.passiveSkills) {
                spentPoints += window.saveData.passiveSkills[skillId] || 0;
            }
            window.saveData.skillPoints = Math.max(0, totalPoints - spentPoints);
            console.log(`[Migration] Migrated Level ${window.saveData.level} character to new progression. Stats:`, window.saveData.stats, `Skill Points:`, window.saveData.skillPoints);
        }
    }

    // Load character-specific autoplay settings or initialize defaults
    window.autoplayConfig = window.saveData.autoplayConfig || {
        preset: 'custom',
        targetZone: 0,
        coliseumGrind: false,
        townFocus: 50,
        partyBuildFocus: 50,
        questFocus: 70,
        selfPotionPct: 40,
        partyPotionPct: 40,
        spellRate: 50,
        dashFreq: 30,
        blockRate: 20,
        heroPersonality: ''
    };
    if (!window.saveData.autoplayConfig) {
        window.saveData.autoplayConfig = JSON.parse(JSON.stringify(window.autoplayConfig));
    }

    // Migrate existing saves — add political system fields if missing
    if (!window.saveData.factionReputation) window.saveData.factionReputation = {};
    if (!window.saveData.politicalChoices) window.saveData.politicalChoices = [];
    if (window.saveData.currentTitle === undefined) window.saveData.currentTitle = null;
    if (!window.saveData.visitedZones) window.saveData.visitedZones = [window.saveData.currentZone || 0];
    if (!window.saveData.discoveredKingdoms) window.saveData.discoveredKingdoms = {};

    // Deduplicate/rename any duplicate kingdom names in discoveredKingdoms (Phase 21)
    if (window.saveData && window.saveData.discoveredKingdoms) {
        const rootKeywords = ["duskveil", "frosthold", "willowbrook", "ashenmoor", "tidereach", "embercrown", "vaelgard", "zanj-abar", "irondeep"];
        
        // Helper to normalize names by extracting the root keyword or fallback to lowercase clean string
        const normalizeName = (name) => {
            let n = (name || "").toLowerCase().trim();
            if (n.startsWith("the ")) {
                n = n.substring(4).trim();
            }
            for (const kw of rootKeywords) {
                if (n.includes(kw)) return kw;
            }
            return n;
        };

        // Collect all names currently in use in the world
        const knownWorldNames = new Set();
        for (const key in window.WORLD_KINGDOMS) {
            knownWorldNames.add(normalizeName(window.WORLD_KINGDOMS[key].name));
        }

        // We want to detect duplicates within discoveredKingdoms or conflicts with the known world
        const duplicates = [];
        const seenNames = new Set(knownWorldNames);
        
        // Sort discovered kingdoms by starting zone to ensure deterministic processing
        const kList = Object.values(window.saveData.discoveredKingdoms);
        kList.sort((a, b) => a.zoneRange[0] - b.zoneRange[0]);

        kList.forEach(k => {
            const normalized = normalizeName(k.name);
            if (seenNames.has(normalized)) {
                // It is a duplicate or conflicts with the known world!
                duplicates.push(k);
            } else {
                seenNames.add(normalized);
            }
        });

        if (duplicates.length > 0) {
            const templates = [
                {
                    name: 'Kingdom of Vaelgard',
                    desc: 'A rugged outpost kingdom founded by exiled knights seeking freedom in the wild frontier.',
                    biomes: ['Forest', 'Plains'],
                    factionName: 'The Iron Vanguard',
                    factionColor: '#a06040',
                    leaderTitle: 'Lord Commander',
                    leaderName: 'Garrick the Stalwart',
                    leaderPersona: 'A hard-nosed soldier who values strength, directness, and loyalty. Sceptical of outsiders.',
                    townNames: ["Thornhaven", "Ashenmere", "Goldfall", "Cinderveil"]
                },
                {
                    name: 'Sylvan Sultanate of Zanj-Abar',
                    desc: 'An exotic oasis kingdom of golden minarets and vast trade networks spanning the arid frontier.',
                    biomes: ['Desert', 'Coastal'],
                    factionName: 'The Obsidian Crescent',
                    factionColor: '#ccaa44',
                    leaderTitle: 'Grand Sultan',
                    leaderName: 'Al-Mansur the Wise',
                    leaderPersona: 'A cunning, polite ruler who cares deeply about commerce, wealth, and diplomacy.',
                    townNames: ["Qasira", "Shadzar", "Tidepool", "Seawind"]
                },
                {
                    name: 'Stronghold of Irondeep',
                    desc: 'A colossal subterranean kingdom carved into the roots of the world, rich with metal and gem mines.',
                    biomes: ['Cave', 'Dungeon'],
                    factionName: 'The Stoneforge Clan',
                    factionColor: '#777788',
                    leaderTitle: 'High Thane',
                    leaderName: 'Thorgar Bronzebeard',
                    leaderPersona: 'A stubborn, traditionalist dwarf ruler who trusts only steel, stone, and strong ale.',
                    townNames: ["Deephearth", "Stonebridge", "Glimmerlode", "Anvilgard"]
                },
                {
                    name: 'Duskveil Dominion',
                    desc: 'A mysterious, fog-shrouded realm of darkwoods where shadow magic and ancient curses linger.',
                    biomes: ['Deadwoods', 'Cave'],
                    factionName: 'The Nightshade Coven',
                    factionColor: '#663399',
                    leaderTitle: 'Dread Lord',
                    leaderName: 'Malakor the Silent',
                    leaderPersona: 'A cold, calculating spellcaster who rarely speaks but rules with absolute authority.',
                    townNames: ["Shadowfen", "Gravewood", "Mistweaver", "Whisperwind"]
                },
                {
                    name: 'Frosthold Realm',
                    desc: 'A freezing northern tundra of snow-covered peaks, ruled by proud giant-slaying clans.',
                    biomes: ['Winter', 'Plains'],
                    factionName: 'The Winter Vanguard',
                    factionColor: '#88ccff',
                    leaderTitle: 'Jarl',
                    leaderName: 'Bjorn Icebreaker',
                    leaderPersona: 'A boisterous warrior king who respects physical might, hospitality, and tales of glory.',
                    townNames: ["Snowdrift", "Glacierpoint", "Coldstone", "Frostkeep"]
                },
                {
                    name: 'Lost Archipelago of Aethelgard',
                    desc: 'A sun-drenched network of tropical islands and coral reefs, ruled by a coalition of free corsairs.',
                    biomes: ['Coastal', 'Forest'],
                    factionName: 'The Tideborn Alliance',
                    factionColor: '#11aa99',
                    leaderTitle: 'High Admiral',
                    leaderName: 'Kaelen Vance',
                    leaderPersona: 'A charismatic sea captain who believes in individual liberty, fair trade, and naval superiority.',
                    townNames: ["Tidewatch", "Coralhaven", "Sirenspire", "Windward"]
                },
                {
                    name: 'Volcanic Sultanate of Khar-Dunes',
                    desc: 'A majestic desert emirate built around geothermal geysers and rich basalt deposits.',
                    biomes: ['Desert', 'Hell'],
                    factionName: 'The Firebrand Cartel',
                    factionColor: '#dd5522',
                    leaderTitle: 'Grand Emir',
                    leaderName: 'Sargon the Golden',
                    leaderPersona: 'A proud, mercantile ruler who controls the obsidian trade in the burning waste.',
                    townNames: ["Khor-Brimstone", "Basaltgate", "Oasis-of-Ash", "Geyserkeep"]
                },
                {
                    name: 'Undercity of Underrealm',
                    desc: 'A deep subterranean labyrinth of bioluminescent mushrooms and ancient dwarven ruins.',
                    biomes: ['Cave', 'Dungeon'],
                    factionName: 'The Myconid Council',
                    factionColor: '#55bb66',
                    leaderTitle: 'High Archon',
                    leaderName: 'Galanoth the Deepwood',
                    leaderPersona: 'A reclusive spellcaster who seeks to preserve the deep caverns from surface invaders.',
                    townNames: ["Sporefall", "Fungusglen", "Glowshroom", "Mycosect"]
                }
            ];

            let templateIdx = 0;
            duplicates.forEach(k => {
                // Find the next template that is not currently in seenNames
                let template = null;
                let isModified = false;
                while (templateIdx < templates.length) {
                    const temp = templates[templateIdx];
                    templateIdx++;
                    if (!seenNames.has(normalizeName(temp.name))) {
                        template = temp;
                        break;
                    }
                }

                // Fallback to original index if we somehow exhaust templates, but mutate it to guarantee uniqueness!
                if (!template) {
                    template = templates[Math.floor(Math.abs(k.zoneRange[0]) / 16) % templates.length];
                    isModified = true;
                }

                const baseName = template.name;
                const finalizedName = isModified ? `New ${baseName}` : baseName;
                
                // Keep checking if the name is already in seenNames, if so, append range start to be safe
                let uniqueName = finalizedName;
                if (seenNames.has(normalizeName(uniqueName))) {
                    uniqueName = `${baseName} Frontier`;
                }
                if (seenNames.has(normalizeName(uniqueName))) {
                    uniqueName = `${baseName} of Zone ${k.zoneRange[0]}`;
                }

                k.name = uniqueName;
                k.desc = template.desc;
                k.biomes = template.biomes;
                k.factionName = template.factionName;
                k.factionColor = template.factionColor;
                k.leaderTitle = template.leaderTitle;
                k.leaderName = template.leaderName;
                k.leaderPersona = template.leaderPersona;

                let fid = template.factionName.toLowerCase().trim();
                if (fid.startsWith("the ")) {
                    fid = fid.substring(4);
                }
                fid = fid.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                k.rulingFaction = fid;

                // Re-populate townNames
                const fallbackTownNames = {};
                const startZone = k.zoneRange[0];
                const endZone = k.zoneRange[1];
                const townZones = [];
                for (let z = startZone; z <= endZone; z++) {
                    if (z === 0 || (Math.abs(z) > 0 && Math.abs(z) % 4 === 0)) {
                        townZones.push(z);
                    }
                }
                townZones.forEach((z, i) => {
                    const name = (z === k.capital) ? `${template.name} Capital` : template.townNames[i % template.townNames.length];
                    fallbackTownNames[z] = name;
                    if (window.saveData.zones && window.saveData.zones[z]) {
                        window.saveData.zones[z].name = name;
                    }
                });
                k.townNames = fallbackTownNames;
                seenNames.add(template.name.toLowerCase().trim());
                console.log(`Migrated duplicate kingdom to ${template.name} for range [${startZone}, ${endZone}]`);
            });

            // Persist the changes to localStorage!
            try {
                const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
                const idx = saves.findIndex(s => s.id === window.saveData.id);
                const clonedSave = JSON.parse(JSON.stringify(window.saveData));
                if (idx > -1) {
                    saves[idx] = clonedSave;
                } else {
                    saves.push(clonedSave);
                }
                localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
                console.log("Successfully persisted migrated duplicate kingdoms to localStorage!");
            } catch (e) {
                console.error("Failed to persist migrated save data:", e);
            }
        }
    }

    // Ensure all discovered kingdoms have their rulingFaction ID follow the correct faction naming convention (Phase 21)
    let saveNeededForHeal = false;
    if (window.saveData && window.saveData.discoveredKingdoms) {
        for (const kId in window.saveData.discoveredKingdoms) {
            const k = window.saveData.discoveredKingdoms[kId];
            if (k.factionName) {
                let fid = k.factionName.toLowerCase().trim();
                if (fid.startsWith("the ")) {
                    fid = fid.substring(4);
                }
                fid = fid.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                
                // If it changed, update it!
                if (k.rulingFaction !== fid) {
                    console.log(`Healing rulingFaction ID for ${k.name}: ${k.rulingFaction} -> ${fid}`);
                    
                    // Migrate faction reputation to the new ID if it exists under the old ID
                    const oldFid = k.rulingFaction;
                    if (window.saveData.factionReputation && window.saveData.factionReputation[oldFid] !== undefined) {
                        window.saveData.factionReputation[fid] = window.saveData.factionReputation[oldFid];
                        delete window.saveData.factionReputation[oldFid];
                    }
                    
                    k.rulingFaction = fid;
                    saveNeededForHeal = true;
                }
            }
        }
    }

    if (saveNeededForHeal) {
        try {
            const saves = JSON.parse(localStorage.getItem('elden_soul_saves') || '[]');
            const idx = saves.findIndex(s => s.id === window.saveData.id);
            const clonedSave = JSON.parse(JSON.stringify(window.saveData));
            if (idx > -1) {
                saves[idx] = clonedSave;
            } else {
                saves.push(clonedSave);
            }
            localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
            console.log("Successfully persisted healed rulingFaction IDs to localStorage!");
        } catch (e) {
            console.error("Failed to persist healed save data:", e);
        }
    }

    if (!window.saveData.revealedIntel) window.saveData.revealedIntel = {};
    if (!window.saveData.knownLanguages) {
        const cls = window.saveData.class || 'adventurer';
        const startLangs = ['common'];
        if (cls === 'wizard') startLangs.push('celestial');
        else if (cls === 'ranger') startLangs.push('elvish');
        else if (cls === 'knight') startLangs.push('dwarvish');
        window.saveData.knownLanguages = startLangs;
    }

    // Re-register discovered frontier factions (Phase 10) and populate townNames
    if (window.registerFrontierKingdomFaction) {
        for (const kId in window.saveData.discoveredKingdoms) {
            const kingdom = window.saveData.discoveredKingdoms[kId];
            window.registerFrontierKingdomFaction(kingdom);
            
            // Pop townNames into saveData.zones if missing
            if (kingdom.townNames) {
                if (!window.saveData.zones) window.saveData.zones = {};
                for (const zIdx in kingdom.townNames) {
                    if (!window.saveData.zones[zIdx]) {
                        window.saveData.zones[zIdx] = {
                            name: kingdom.townNames[zIdx],
                            biome: (parseInt(zIdx) === kingdom.capital) ? 'Capital' : 'Town'
                        };
                    }
                }
            }
        }
    }

    // Heal/migrate town names in existing save data (bugfix)
    if (window.getTownNameForZone && window.saveData.zones) {
        for (const zoneIdxStr in window.saveData.zones) {
            const zIdx = parseInt(zoneIdxStr);
            const isTownIndex = zIdx === 0 || (Math.abs(zIdx) > 0 && Math.abs(zIdx) % 4 === 0);
            if (isTownIndex && zIdx !== 777 && zIdx !== -666) {
                const correctName = window.getTownNameForZone(zIdx);
                const zone = window.saveData.zones[zoneIdxStr];
                if (zone && zone.name !== correctName) {
                    console.log(`[Migration] Correcting town name for zone ${zIdx}: "${zone.name}" -> "${correctName}"`);
                    zone.name = correctName;
                }
            }
        }
    }

    const config = {
        type: Phaser.AUTO,
        width: 1280,
        height: 720,
        parent: 'game-container',
        pixelArt: true,
        pauseOnBlur: false,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 1200 },
                debug: false // Turned off pink/blue borders
            }
        },
        scene: [GameScene]
    };

    game = new Phaser.Game(config);
    window.game = game;
}

window.returnToMainMenu = function() {
    if (game) {
        // Find active scene and save player data
        const scene = game.scene.scenes[0];
        if (scene && scene.player && scene.player.saveGame) {
            scene.player.saveGame();
        }
        
        // Write saveData to localStorage
        if (window.saveData) {
            const saves = getSaves();
            const saveIndex = saves.findIndex(s => s.id === window.saveData.id);
            const clonedSave = JSON.parse(JSON.stringify(window.saveData));
            if (saveIndex > -1) {
                saves[saveIndex] = clonedSave;
            } else {
                saves.push(clonedSave);
            }
            saveSaves(saves);
        }
        
        game.destroy(true);
        game = null;
        window.game = null;
    }
    
    // Hide game HUD, show title screen
    document.getElementById('game-hud').style.display = 'none';
    showTitleScreen();
    initTitleScreen(); // Re-initialize the title screen background canvas
};

// Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load skills specification
    fetch('src/assets/skills_specification.json')
        .then(res => res.json())
        .then(data => {
            window.PASSIVE_SKILLS_DATA = data;
            console.log(`Loaded ${data.length} passive skills specifications.`);
            if (window.selectedClassData) {
                renderCreationSkillsGrid();
            }
        })
        .catch(err => {
            console.error("Failed to load skills specification:", err);
        });

    // Progress loading bar
    const bar = document.getElementById('loading-bar-fill');
    const status = document.getElementById('loading-status');
    if (bar) bar.style.width = '60%';
    if (status) status.innerText = 'Initializing Phaser Engine...';

    // Boot the title screen Phaser canvas
    initTitleScreen();

    document.getElementById('btn-new-game').addEventListener('click', showCreateScreen);
    
    // Help Modal Logic
    const helpModal = document.getElementById('ui-menu-help');
    if (helpModal) {
        document.getElementById('btn-menu-help').addEventListener('click', () => {
            helpModal.style.display = 'flex';
        });
        document.getElementById('btn-close-menu-help').addEventListener('click', () => {
            helpModal.style.display = 'none';
        });

        // Tab Switching
        const tabBtns = document.querySelectorAll('.help-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Reset buttons
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.color = '#aaa';
                    b.style.borderBottomColor = 'transparent';
                });
                // Activate clicked button
                btn.classList.add('active');
                btn.style.color = '#2ddbde';
                btn.style.borderBottomColor = '#2ddbde';

                // Hide all panels
                const panels = document.querySelectorAll('.help-tab-panel');
                panels.forEach(p => p.style.display = 'none');

                // Show selected panel
                const targetTab = btn.getAttribute('data-tab');
                const targetPanel = document.getElementById(`help-content-${targetTab}`);
                if (targetPanel) {
                    if (targetTab === 'controls' || targetTab === 'combat' || targetTab === 'factions') {
                        targetPanel.style.display = 'flex';
                    } else {
                        targetPanel.style.display = 'block';
                    }
                }
            });
        });
    }
    
    // Continue Screen Logic
    const btnContinue = document.getElementById('btn-continue');
    
    function renderContinueScreen() {
        const saves = getSaves();
        const container = document.getElementById('save-slots-container');
        container.innerHTML = '';
        
        for (let i = 0; i < 8; i++) {
            if (i < saves.length) {
                const save = saves[i];
                // Migrate old 'assassin' saves to 'samurai'
                if (save.classId === 'assassin') save.classId = 'samurai';
                const cData = classesData[save.classId];
                // Calculate hours/mins
                const hrs = Math.floor(save.playTime / 60);
                const mins = save.playTime % 60;
                
                const slotDiv = document.createElement('div');
                slotDiv.className = "flex items-stretch bg-surface-container-highest border-2 border-outline-variant hover:border-secondary transition-colors group w-full";
                
                // The slot image container is w-16 h-16 (64x64). 
                // Scale so the frame fills the 64px box, apply per-class previewScale
                const scale = (64 / cData.frameHeight) * (cData.previewScale || 1);
                
                // Determine which frame to show and calculate position
                let portraitOffsetX, portraitOffsetY;
                if (cData.animFrames && cData.animFrames.idle) {
                    // Classes with explicit animFrames (samurai, ranger, wizard)
                    const idleFrame = cData.animFrames.idle.start;
                    // Sheet widths: knight=80*10=800, others=768
                    const sheetCols = cData.sheetCols || (cData.frameWidth === 80 ? 10 : 12);
                    const frameCol = idleFrame % sheetCols;
                    const frameRow = Math.floor(idleFrame / sheetCols);
                    portraitOffsetX = (64 - (cData.frameWidth * scale)) / 2 - (frameCol * cData.frameWidth * scale);
                    portraitOffsetY = -(frameRow * cData.frameHeight * scale);
                } else {
                    // Row-based classes (knight)
                    portraitOffsetX = (64 - (cData.frameWidth * scale)) / 2;
                    portraitOffsetY = -(cData.idleRow || 0) * (cData.frameHeight * scale);
                }
                
                // Allow per-class manual overrides for fine-tuning
                if (cData.slotPortraitX !== undefined) portraitOffsetX = cData.slotPortraitX;
                if (cData.slotPortraitY !== undefined) portraitOffsetY = cData.slotPortraitY;
                
                // We need to load the image to get the full sheet size for background-size
                const shouldFlip = cData.flipX || cData.slotFlipX;
                const transform = shouldFlip ? 'transform: scaleX(-1);' : '';
                const sheetBgCols = cData.sheetCols || (cData.frameWidth === 80 ? 10 : 12);
                const imageHtml = cData.isSheet 
                    ? `<div style="width: 100%; height: 100%; background-image: url('${cData.image}'); background-position: ${portraitOffsetX}px ${portraitOffsetY}px; background-repeat: no-repeat; image-rendering: pixelated; background-size: ${sheetBgCols * cData.frameWidth * scale}px auto; ${transform}"></div>`
                    : `<img src="${cData.image}" alt="${cData.name}" class="w-full h-full object-contain image-rendering-pixelated" style="${transform}">`;

                slotDiv.innerHTML = `
                    <button class="select-btn flex-1 flex items-center gap-6 p-4 text-left cursor-pointer bg-transparent border-none focus:outline-none w-full h-full">
                        <div class="w-16 h-16 bg-surface-container border border-outline flex-shrink-0 flex items-center justify-center p-2 overflow-hidden">
                            ${imageHtml}
                        </div>
                        <div class="flex-1">
                            <h4 class="font-headline-md text-[20px] text-on-surface group-hover:text-secondary uppercase">${save.name}</h4>
                            <p class="font-label-caps text-on-surface-variant text-[12px] uppercase tracking-wider">Level ${save.level} ${cData.name} • ${hrs}h ${mins}m</p>
                        </div>
                    </button>
                    <button class="delete-save-btn p-4 text-on-surface-variant hover:text-error transition-colors flex items-center justify-center cursor-pointer border-l-2 border-outline-variant bg-surface-container hover:bg-error/10" data-id="${save.id}" title="Delete Save">
                        <span class="material-symbols-outlined text-3xl">delete</span>
                    </button>
                `;
                
                // Play
                slotDiv.querySelector('.select-btn').addEventListener('click', () => startGame(save));
                // Delete
                slotDiv.querySelector('.delete-save-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if(confirm(`Are you sure you want to delete ${save.name}?`)) {
                        const newSaves = getSaves().filter(s => s.id !== save.id);
                        saveSaves(newSaves);
                        renderContinueScreen(); // Re-render the list immediately
                    }
                });
                
                container.appendChild(slotDiv);
            } else {
                // Empty slot
                const div = document.createElement('div');
                div.className = "flex items-center gap-6 p-4 bg-surface-container-low border-2 border-dashed border-outline-variant opacity-50 select-none";
                div.innerHTML = `
                    <div class="w-16 h-16 flex items-center justify-center">
                        <span class="material-symbols-outlined text-4xl text-on-surface-variant">person_add</span>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-headline-md text-[20px] text-on-surface-variant uppercase">Empty Slot</h4>
                    </div>
                `;
                container.appendChild(div);
            }
        }
    }

    if(btnContinue) {
        btnContinue.addEventListener('click', () => {
            document.getElementById('ui-title').style.display = 'none';
            document.getElementById('ui-select').style.display = 'flex';
            renderContinueScreen();
        });
    }

    document.getElementById('btn-select-back').addEventListener('click', () => {
        document.getElementById('ui-select').style.display = 'none';
        document.getElementById('ui-title').style.display = 'flex';
    });

    // Create New Game
    document.getElementById('btn-awaken').addEventListener('click', () => {
        const nameInput = document.getElementById('character-name-input');
        const name = nameInput.value.trim();
        
        if (!name) {
            nameInput.classList.add('border-error');
            nameInput.focus();
            return;
        }
        
        nameInput.classList.remove('border-error');
        
        const saves = getSaves();
        if (saves.length >= 8) {
            alert('No empty save slots available! Delete a save to make room.');
            return;
        }
        
        const newSave = {
            id: Date.now().toString(),
            name: name,
            classId: selectedClassData.id,
            level: 1,
            playTime: 0,
            lastSaved: Date.now(),
            isNewGame: true,
            // Political system
            factionReputation: {},
            politicalChoices: [],
            currentTitle: null,
            visitedZones: [0],  // Start with zone 0 (Willowbrook capital) discovered
            discoveredKingdoms: {},
            revealedIntel: {},
            knownLanguages: (selectedClassData.id === 'wizard' ? ['common', 'celestial'] :
                             selectedClassData.id === 'ranger' ? ['common', 'elvish'] :
                             selectedClassData.id === 'knight' ? ['common', 'dwarvish'] : ['common']),
            // Skills System starting allocations
            passiveSkills: JSON.parse(JSON.stringify(creationAllocations)),
            skillPoints: 0
        };
        
        saves.push(newSave);
        saveSaves(saves);
        startGame(newSave);
    });

    // Back from Create screen to Title
    document.getElementById('btn-create-back').addEventListener('click', showTitleScreen);

    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectClass(e.currentTarget.dataset.class);
        });
    });

    // Fighter Suite Button clicked from main menu
    const btnFighterSuite = document.getElementById('btn-fighter-suite');
    if (btnFighterSuite) {
        btnFighterSuite.addEventListener('click', () => {
            document.getElementById('ui-title').style.display = 'none';
            if (titleGame) {
                titleGame.destroy(true);
                titleGame = null;
            }
            document.getElementById('ui-fighter-suite').style.display = 'flex';
            startFighterSuite();
        });
    }
});

function startFighterSuite() {
    if (window.fighterGame) {
        window.fighterGame.destroy(true);
        window.fighterGame = null;
    }

    const config = {
        type: Phaser.AUTO,
        width: 1280,
        height: 720,
        parent: 'game-container',
        pixelArt: true,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 1200 },
                debug: false
            }
        },
        scene: []
    };

    window.fighterGame = new Phaser.Game(config);
    window.fighterGame.scene.add('FighterScene', FighterScene);

    window.fighterState = {
        p1Mode: 'human',
        p1Class: 'knight',
        p2Class: 'dragon',
        p1Level: 1,
        p2Level: 1,
        p1Weapon: null,
        p2Weapon: null,
        p1Artifact: null,
        p2Artifact: null,
        p1Alignment: 0,
        p2Alignment: 0
    };

    window.refreshFighterScene = () => {
        if (!window.fighterGame) return;
        const scene = window.fighterGame.scene.keys['FighterScene'];
        if (scene) {
            scene.scene.restart(window.fighterState);
        } else {
            window.fighterGame.scene.start('FighterScene', window.fighterState);
        }
    };

    window.fighterGame.events.once('ready', () => {
        window.refreshFighterScene();
    });

    setupFighterHTMLHandlers();
}

function setupFighterHTMLHandlers() {
    // Weapon data for Fighter Suite loadout
    const FIGHTER_WEAPONS = {
        knight: [
            { key: 'weapon-bronze-sword', name: 'Bronze Sword', damageBonus: 2 },
            { key: 'weapon-iron-sword', name: 'Iron Broadsword', damageBonus: 5 },
            { key: 'weapon-gold-sword', name: 'Golden Longsword', damageBonus: 8 },
            { key: 'weapon-diamond-sword', name: 'Obsidian Blade', damageBonus: 15 },
            { key: 'weapon-iron-axe', name: 'Heavy Battleaxe', damageBonus: 6 },
            { key: 'weapon-crimson-axe', name: 'Crimson War Axe', damageBonus: 20 },
            { key: 'weapon-runic-greataxe', name: 'Runic Greataxe', damageBonus: 28 },
            { key: 'weapon-dragon-cleaver', name: 'Dragon Cleaver', damageBonus: 35 },
            { key: 'weapon-worldbreaker', name: 'Worldbreaker', damageBonus: 45 }
        ],
        wizard: [
            { key: 'weapon-stick', name: 'Oak Wand', damageBonus: 2 },
            { key: 'weapon-staff', name: 'Adept Staff', damageBonus: 5 },
            { key: 'weapon-crystal-staff', name: 'Crystal Staff', damageBonus: 10 },
            { key: 'weapon-arcane-scepter', name: 'Arcane Scepter', damageBonus: 16 },
            { key: 'weapon-infernal-staff', name: 'Infernal Staff', damageBonus: 24 },
            { key: 'weapon-void-staff', name: 'Staff of the Void', damageBonus: 32 }
        ],
        samurai: [
            { key: 'weapon-iron-dagger', name: 'Iron Dagger', damageBonus: 3 },
            { key: 'weapon-poison-shiv', name: 'Poisoned Shiv', damageBonus: 8 },
            { key: 'weapon-shadow-fang', name: 'Shadow Fang', damageBonus: 14 },
            { key: 'weapon-serpent-blade', name: 'Serpent Blade', damageBonus: 20 },
            { key: 'weapon-voidsteel-tanto', name: 'Voidsteel Tanto', damageBonus: 28 },
            { key: 'weapon-dragonslayer-katana', name: 'Dragonslayer Katana', damageBonus: 36 }
        ],
        ranger: [
            { key: 'weapon-shortbow', name: 'Shortbow', damageBonus: 4 },
            { key: 'weapon-elven-longbow', name: 'Elven Longbow', damageBonus: 10 },
            { key: 'weapon-storm-tomahawk', name: 'Storm Tomahawk', damageBonus: 17 },
            { key: 'weapon-void-throwing-axe', name: 'Void Throwing Axe', damageBonus: 24 },
            { key: 'weapon-phoenix-shuriken', name: 'Phoenix Shuriken', damageBonus: 32 }
        ],
        elven_spellblade: [
            { key: 'weapon-bronze-sword', name: 'Bronze Sword', damageBonus: 2 },
            { key: 'weapon-iron-sword', name: 'Iron Broadsword', damageBonus: 5 },
            { key: 'weapon-crystal-staff', name: 'Crystal Staff', damageBonus: 10 },
            { key: 'weapon-arcane-scepter', name: 'Arcane Scepter', damageBonus: 16 },
            { key: 'weapon-infernal-staff', name: 'Infernal Staff', damageBonus: 24 }
        ]
    };
    FIGHTER_WEAPONS.knight_rival = FIGHTER_WEAPONS.knight;
    FIGHTER_WEAPONS.witch = [
        { key: 'weapon-gnarled-root-wand', name: 'Gnarled Root Wand', damageBonus: 15 },
        { key: 'weapon-blightwood-staff', name: 'Blightwood Staff', damageBonus: 22 },
        { key: 'weapon-voodoo-doll-effigy', name: 'Cursed Effigy', damageBonus: 28 },
        { key: 'weapon-hex-tome', name: 'Grimoire of Hexes', damageBonus: 36 },
        { key: 'weapon-censer-of-shadows', name: 'Shadow Censer', damageBonus: 45 }
    ];
    FIGHTER_WEAPONS.priest = [
        { key: 'weapon-radiant-crosier', name: 'Radiant Crosier', damageBonus: 16 },
        { key: 'weapon-divine-mace', name: 'Divine War Mace', damageBonus: 24 },
        { key: 'weapon-reliquary-of-light', name: 'Reliquary of Light', damageBonus: 32 },
        { key: 'weapon-blessed-chalice', name: 'Blessed Chalice', damageBonus: 38 },
        { key: 'weapon-censer-of-holiness', name: 'Sanctified Censer', damageBonus: 48 }
    ];
    FIGHTER_WEAPONS.pyromancer = [
        { key: 'weapon-ember-scepter', name: 'Ember Scepter', damageBonus: 14 },
        { key: 'weapon-flame-brand-staff', name: 'Hellfire Brand', damageBonus: 25 },
        { key: 'weapon-phoenix-focus', name: 'Phoenix Fire Focus', damageBonus: 30 },
        { key: 'weapon-hellfire-tome', name: 'Pyronomicon', damageBonus: 40 },
        { key: 'weapon-lava-spit-wand', name: 'Magma core Wand', damageBonus: 50 }
    ];
    // Map rival and alternative classes to equivalent weapon tables
    FIGHTER_WEAPONS.wizard_rival = FIGHTER_WEAPONS.wizard;
    FIGHTER_WEAPONS.samurai_rival = FIGHTER_WEAPONS.samurai;
    FIGHTER_WEAPONS.ranger_rival = FIGHTER_WEAPONS.ranger;
    FIGHTER_WEAPONS.elven_spellblade_rival = FIGHTER_WEAPONS.elven_spellblade;
    
    FIGHTER_WEAPONS.elven_longbowman = [
        { key: 'weapon-windrunner-recurve', name: 'Windrunner Bow', damageBonus: 24 },
        { key: 'weapon-sylvan-greatbow', name: 'Sylvan Greatbow', damageBonus: 35 }
    ];
    FIGHTER_WEAPONS.elven_longbowman_rival = FIGHTER_WEAPONS.elven_longbowman;
    
    FIGHTER_WEAPONS.elven_guard = [
        { key: 'weapon-sylvan-glaive', name: 'Sylvan Glaive', damageBonus: 22 },
        { key: 'weapon-forest-halberd', name: 'Forest Halberd', damageBonus: 30 }
    ];
    FIGHTER_WEAPONS.elven_guard_rival = FIGHTER_WEAPONS.elven_guard;

    FIGHTER_WEAPONS.witch_1 = FIGHTER_WEAPONS.witch;
    FIGHTER_WEAPONS.witch_2 = FIGHTER_WEAPONS.witch;
    FIGHTER_WEAPONS.witch_3 = FIGHTER_WEAPONS.witch;
    FIGHTER_WEAPONS.witch_1_rival = FIGHTER_WEAPONS.witch;
    FIGHTER_WEAPONS.witch_2_rival = FIGHTER_WEAPONS.witch;
    FIGHTER_WEAPONS.witch_3_rival = FIGHTER_WEAPONS.witch;
    
    FIGHTER_WEAPONS.priest_1 = FIGHTER_WEAPONS.priest;
    FIGHTER_WEAPONS.priest_2 = FIGHTER_WEAPONS.priest;
    FIGHTER_WEAPONS.priest_3 = FIGHTER_WEAPONS.priest;
    FIGHTER_WEAPONS.priest_1_rival = FIGHTER_WEAPONS.priest;
    FIGHTER_WEAPONS.priest_2_rival = FIGHTER_WEAPONS.priest;
    FIGHTER_WEAPONS.priest_3_rival = FIGHTER_WEAPONS.priest;
    
    FIGHTER_WEAPONS.pyromancer_1 = FIGHTER_WEAPONS.pyromancer;
    FIGHTER_WEAPONS.pyromancer_2 = FIGHTER_WEAPONS.pyromancer;
    FIGHTER_WEAPONS.pyromancer_3 = FIGHTER_WEAPONS.pyromancer;
    FIGHTER_WEAPONS.pyromancer_1_rival = FIGHTER_WEAPONS.pyromancer;
    FIGHTER_WEAPONS.pyromancer_2_rival = FIGHTER_WEAPONS.pyromancer;
    FIGHTER_WEAPONS.pyromancer_3_rival = FIGHTER_WEAPONS.pyromancer;
    FIGHTER_WEAPONS.dwarf_warrior_rival = FIGHTER_WEAPONS.samurai;
    FIGHTER_WEAPONS.dwarf_warrior = FIGHTER_WEAPONS.samurai;
    FIGHTER_WEAPONS.dwarf_miner_rival = FIGHTER_WEAPONS.samurai;
    FIGHTER_WEAPONS.dwarf_miner = FIGHTER_WEAPONS.samurai;
    FIGHTER_WEAPONS.dwarf_king_rival = FIGHTER_WEAPONS.knight;
    FIGHTER_WEAPONS.dwarf_king = FIGHTER_WEAPONS.knight;
    FIGHTER_WEAPONS.human_king = FIGHTER_WEAPONS.knight;
    FIGHTER_WEAPONS.human_queen = FIGHTER_WEAPONS.knight;
    FIGHTER_WEAPONS.elven_king = FIGHTER_WEAPONS.knight;
    FIGHTER_WEAPONS.elven_queen = FIGHTER_WEAPONS.knight;
    FIGHTER_WEAPONS.elven_queen_rival = FIGHTER_WEAPONS.knight;

    // Programmatic rival cloning for new classes
    const newRivals = [
        'dark_elf_guard', 'dark_elf_spellblade', 'dark_elf_longbowman', 'dark_elf_queen',
        'mimic_1', 'mimic_2', 'mimic_3',
        'gorgon_1', 'gorgon_2', 'gorgon_3',
        'stone_golem', 'lava_golem', 'copper_golem'
    ];
    newRivals.forEach(k => {
        if (classesData[k]) {
            classesData[k + '_rival'] = {
                ...classesData[k],
                id: k + '_rival',
                animFrames: JSON.parse(JSON.stringify(classesData[k].animFrames || {}))
            };
            classesData[k + '_rival'].image = classesData[k].image;
        }
    });

    // Populate FIGHTER_WEAPONS for new classes and their rival clones
    newRivals.forEach(k => {
        let baseWeapons = FIGHTER_WEAPONS.knight;
        if (k.includes('guard')) baseWeapons = FIGHTER_WEAPONS.witch;
        else if (k.includes('spellblade')) baseWeapons = FIGHTER_WEAPONS.elven_spellblade;
        else if (k.includes('longbowman')) baseWeapons = FIGHTER_WEAPONS.samurai;
        else if (k.includes('gorgon') || k.includes('mimic')) baseWeapons = FIGHTER_WEAPONS.samurai;
        
        FIGHTER_WEAPONS[k] = baseWeapons;
        FIGHTER_WEAPONS[k + '_rival'] = baseWeapons;
    });

    const FIGHTER_ARTIFACTS = window.ARTIFACTS_DATA ? Object.values(window.ARTIFACTS_DATA) : [
        { key: 'artifact-strength', name: 'Ring of Strength' },
        { key: 'artifact-vitality', name: 'Amulet of Vitality' },
        { key: 'artifact-swiftness', name: 'Boots of Swiftness' },
        { key: 'artifact-magic', name: 'Crystal of Magic' },
        { key: 'artifact-vampire', name: 'Vampiric Fang' },
        { key: 'artifact-shield', name: 'Shielding Charm' },
        { key: 'artifact-antidote', name: 'Antidote Vial' },
        { key: 'artifact-frostward', name: 'Frost Ward' },
        { key: 'artifact-fireopal', name: 'Fire Opal' },
        { key: 'artifact-holy', name: 'Holy Symbol' },
        { key: 'artifact-demonic', name: 'Demonic Sigil' },
        { key: 'artifact-scales', name: 'Scales of Balance' },
        { key: 'artifact-teleporter', name: 'Town Portal Stone' },
        { key: 'artifact-commander', name: "Commander's Horn" },
        { key: 'artifact-autopot', name: 'Elixir of Last Resort' },
        { key: 'artifact-wooden-buckler', name: 'Wooden Buckler' },
        { key: 'artifact-iron-shield', name: 'Iron Kite Shield' },
        { key: 'artifact-crystal-aegis', name: 'Crystal Aegis' }
    ];

    const heroClasses = [
        'knight', 'wizard', 'samurai', 'ranger', 'elven_spellblade', 'witch', 'priest', 'pyromancer', 
        'custom_npc_male', 'custom_npc_female', 'knight_rival', 'wizard_rival', 'samurai_rival', 
        'ranger_rival', 'elven_spellblade_rival', 'elven_longbowman', 'elven_longbowman_rival', 'elven_guard', 'elven_guard_rival', 
        'dwarf_warrior', 'dwarf_warrior_rival', 'dwarf_miner', 'dwarf_miner_rival', 
        'dwarf_king', 'dwarf_king_rival', 'human_king', 'human_queen', 'elven_king', 
        'elven_queen', 'elven_queen_rival', 'witch_1_rival', 'witch_3_rival', 
        'pyromancer_1_rival', 'pyromancer_2_rival', 'priest_1', 'priest_3',
        'dark_elf_guard', 'dark_elf_guard_rival', 'dark_elf_spellblade', 'dark_elf_spellblade_rival',
        'dark_elf_longbowman', 'dark_elf_longbowman_rival', 'dark_elf_queen', 'dark_elf_queen_rival',
        'mimic_1', 'mimic_1_rival', 'mimic_2', 'mimic_2_rival', 'mimic_3', 'mimic_3_rival',
        'gorgon_1', 'gorgon_1_rival', 'gorgon_2', 'gorgon_2_rival', 'gorgon_3', 'gorgon_3_rival',
        'stone_golem', 'stone_golem_rival', 'lava_golem', 'lava_golem_rival', 'copper_golem', 'copper_golem_rival'
    ];

    function populateWeaponDropdown(selectId, classId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">Default Weapon</option>';
        const weapons = FIGHTER_WEAPONS[classId] || [];
        weapons.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.key;
            opt.textContent = `${w.name} (+${w.damageBonus})`;
            select.appendChild(opt);
        });
    }

    function populateArtifactDropdown(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">No Artifact</option>';
        FIGHTER_ARTIFACTS.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.key;
            opt.textContent = a.name + (a.desc ? ` — ${a.desc}` : '');
            select.appendChild(opt);
        });
    }

    function updateLoadoutVisibility(prefix, classId) {
        const weaponRow = document.getElementById(`${prefix}-weapon-row`);
        const artifactRow = document.getElementById(`${prefix}-artifact-row`);
        const alignmentRow = document.getElementById(`${prefix}-alignment-row`);
        const isHero = heroClasses.includes(classId) || (classId && classId.startsWith('custom_npc'));
        if (weaponRow) weaponRow.style.display = isHero ? 'flex' : 'none';
        if (artifactRow) artifactRow.style.display = isHero ? 'flex' : 'none';
        if (alignmentRow) alignmentRow.style.display = isHero ? 'flex' : 'none';
    }

    // Initialize loadout dropdowns
    populateWeaponDropdown('p1-weapon-select', 'knight');
    populateWeaponDropdown('p2-weapon-select', 'dragon');
    populateArtifactDropdown('p1-artifact-select');
    populateArtifactDropdown('p2-artifact-select');
    updateLoadoutVisibility('p1', 'knight');
    updateLoadoutVisibility('p2', 'dragon');

    // Level slider handlers
    const p1LevelSlider = document.getElementById('p1-level-slider');
    const p1LevelDisplay = document.getElementById('p1-level-display');
    const p2LevelSlider = document.getElementById('p2-level-slider');
    const p2LevelDisplay = document.getElementById('p2-level-display');

    if (p1LevelSlider) {
        p1LevelSlider.oninput = () => {
            const val = parseInt(p1LevelSlider.value);
            p1LevelDisplay.textContent = val;
            window.fighterState.p1Level = val;
        };
        p1LevelSlider.onchange = () => window.refreshFighterScene();
    }
    if (p2LevelSlider) {
        p2LevelSlider.oninput = () => {
            const val = parseInt(p2LevelSlider.value);
            p2LevelDisplay.textContent = val;
            window.fighterState.p2Level = val;
        };
        p2LevelSlider.onchange = () => window.refreshFighterScene();
    }

    // Alignment input handlers
    const p1AlignmentInput = document.getElementById('p1-alignment-input');
    const p2AlignmentInput = document.getElementById('p2-alignment-input');

    if (p1AlignmentInput) {
        p1AlignmentInput.oninput = () => {
            const val = parseInt(p1AlignmentInput.value) || 0;
            window.fighterState.p1Alignment = val;
        };
        p1AlignmentInput.onchange = () => window.refreshFighterScene();
    }
    if (p2AlignmentInput) {
        p2AlignmentInput.oninput = () => {
            const val = parseInt(p2AlignmentInput.value) || 0;
            window.fighterState.p2Alignment = val;
        };
        p2AlignmentInput.onchange = () => window.refreshFighterScene();
    }

    // Weapon select handlers
    const p1WeaponSelect = document.getElementById('p1-weapon-select');
    const p2WeaponSelect = document.getElementById('p2-weapon-select');
    if (p1WeaponSelect) {
        p1WeaponSelect.onchange = () => {
            const key = p1WeaponSelect.value;
            if (!key) { window.fighterState.p1Weapon = null; }
            else {
                const allWeapons = Object.values(FIGHTER_WEAPONS).flat();
                window.fighterState.p1Weapon = allWeapons.find(w => w.key === key) || null;
            }
            window.refreshFighterScene();
        };
    }
    if (p2WeaponSelect) {
        p2WeaponSelect.onchange = () => {
            const key = p2WeaponSelect.value;
            if (!key) { window.fighterState.p2Weapon = null; }
            else {
                const allWeapons = Object.values(FIGHTER_WEAPONS).flat();
                window.fighterState.p2Weapon = allWeapons.find(w => w.key === key) || null;
            }
            window.refreshFighterScene();
        };
    }

    // Artifact select handlers
    const p1ArtifactSelect = document.getElementById('p1-artifact-select');
    const p2ArtifactSelect = document.getElementById('p2-artifact-select');
    if (p1ArtifactSelect) {
        p1ArtifactSelect.onchange = () => {
            window.fighterState.p1Artifact = p1ArtifactSelect.value || null;
            window.refreshFighterScene();
        };
    }
    if (p2ArtifactSelect) {
        p2ArtifactSelect.onchange = () => {
            window.fighterState.p2Artifact = p2ArtifactSelect.value || null;
            window.refreshFighterScene();
        };
    }

    const btnHuman = document.getElementById('btn-p1-human');
    const btnAI = document.getElementById('btn-p1-ai');
    const p1Enemies = document.getElementById('p1-enemies-container');

    const setP1Mode = (mode) => {
        window.fighterState.p1Mode = mode;
        if (mode === 'human') {
            btnHuman.classList.add('active');
            btnAI.classList.remove('active');
            p1Enemies.classList.add('hidden');
            const heroClasses = [
                'knight', 'wizard', 'samurai', 'ranger', 'elven_spellblade', 'witch', 'priest', 'pyromancer', 
                'custom_npc_male', 'custom_npc_female', 'knight_rival', 'wizard_rival', 'samurai_rival', 
                'ranger_rival', 'elven_spellblade_rival', 'elven_longbowman', 'elven_longbowman_rival', 'elven_guard', 'elven_guard_rival', 
                'dwarf_warrior', 'dwarf_warrior_rival', 'dwarf_miner', 'dwarf_miner_rival', 
                'dwarf_king', 'dwarf_king_rival', 'human_king', 'human_queen', 'elven_king', 
                'elven_queen', 'elven_queen_rival', 'witch_1_rival', 'witch_3_rival', 
                'pyromancer_1_rival', 'pyromancer_2_rival', 'priest_1', 'priest_3',
                'dark_elf_guard', 'dark_elf_guard_rival', 'dark_elf_spellblade', 'dark_elf_spellblade_rival',
                'dark_elf_longbowman', 'dark_elf_longbowman_rival', 'dark_elf_queen', 'dark_elf_queen_rival',
                'mimic_1', 'mimic_1_rival', 'mimic_2', 'mimic_2_rival', 'mimic_3', 'mimic_3_rival',
                'gorgon_1', 'gorgon_1_rival', 'gorgon_2', 'gorgon_2_rival', 'gorgon_3', 'gorgon_3_rival',
                'stone_golem', 'stone_golem_rival', 'lava_golem', 'lava_golem_rival', 'copper_golem', 'copper_golem_rival'
            ];
            const isCustom = window.fighterState.p1Class && window.fighterState.p1Class.startsWith('custom_npc');
            if (!heroClasses.includes(window.fighterState.p1Class) && !isCustom) {
                window.fighterState.p1Class = 'knight';
                updateP1SelectionUI();
            }
        } else {
            btnAI.classList.add('active');
            btnHuman.classList.remove('active');
            p1Enemies.classList.remove('hidden');
        }
        window.refreshFighterScene();
    };

    btnHuman.onclick = () => setP1Mode('human');
    btnAI.onclick = () => setP1Mode('ai');

    const p1HeroItems = document.querySelectorAll('#p1-heroes-grid .fighter-grid-item');
    p1HeroItems.forEach(item => {
        item.onclick = () => {
            p1HeroItems.forEach(x => x.classList.remove('selected'));
            const p1EnemyItems = document.querySelectorAll('#p1-enemies-container .fighter-grid-item');
            p1EnemyItems.forEach(x => x.classList.remove('selected'));

            item.classList.add('selected');
            window.fighterState.p1Class = item.dataset.class;
            populateWeaponDropdown('p1-weapon-select', item.dataset.class);
            updateLoadoutVisibility('p1', item.dataset.class);
            window.fighterState.p1Weapon = null;
            window.refreshFighterScene();
        };
    });

    const p1EnemyItems = document.querySelectorAll('#p1-enemies-container .fighter-grid-item');
    p1EnemyItems.forEach(item => {
        item.onclick = () => {
            p1HeroItems.forEach(x => x.classList.remove('selected'));
            p1EnemyItems.forEach(x => x.classList.remove('selected'));

            item.classList.add('selected');
            window.fighterState.p1Class = item.dataset.class;
            
            const isHero = heroClasses.includes(item.dataset.class) || (item.dataset.class && item.dataset.class.startsWith('custom_npc'));
            if (isHero) {
                populateWeaponDropdown('p1-weapon-select', item.dataset.class);
            }
            
            updateLoadoutVisibility('p1', item.dataset.class);
            window.fighterState.p1Weapon = null;
            window.fighterState.p1Artifact = null;
            window.refreshFighterScene();
        };
    });

    const updateP1SelectionUI = () => {
        p1HeroItems.forEach(x => {
            const isMatch = x.dataset.class === window.fighterState.p1Class ||
                (x.dataset.class === 'custom_npc_male' && window.fighterState.p1Class && window.fighterState.p1Class.startsWith('custom_npc_male_')) ||
                (x.dataset.class === 'custom_npc_female' && window.fighterState.p1Class && window.fighterState.p1Class.startsWith('custom_npc_female_'));
            if (isMatch) x.classList.add('selected');
            else x.classList.remove('selected');
        });
        p1EnemyItems.forEach(x => {
            if (x.dataset.class === window.fighterState.p1Class) x.classList.add('selected');
            else x.classList.remove('selected');
        });
    };

    const p2HeroItems = document.querySelectorAll('#p2-heroes-grid .fighter-grid-item');
    const p2EnemyItems = document.querySelectorAll('#p2-enemies-grid .fighter-grid-item');

    p2HeroItems.forEach(item => {
        item.onclick = () => {
            p2HeroItems.forEach(x => x.classList.remove('selected'));
            p2EnemyItems.forEach(x => x.classList.remove('selected'));

            item.classList.add('selected');
            window.fighterState.p2Class = item.dataset.class;
            populateWeaponDropdown('p2-weapon-select', item.dataset.class);
            updateLoadoutVisibility('p2', item.dataset.class);
            window.fighterState.p2Weapon = null;
            window.refreshFighterScene();
        };
    });

    p2EnemyItems.forEach(item => {
        item.onclick = () => {
            p2HeroItems.forEach(x => x.classList.remove('selected'));
            p2EnemyItems.forEach(x => x.classList.remove('selected'));

            item.classList.add('selected');
            window.fighterState.p2Class = item.dataset.class;
            
            const isHero = heroClasses.includes(item.dataset.class) || (item.dataset.class && item.dataset.class.startsWith('custom_npc'));
            if (isHero) {
                populateWeaponDropdown('p2-weapon-select', item.dataset.class);
            }
            
            updateLoadoutVisibility('p2', item.dataset.class);
            window.fighterState.p2Weapon = null;
            window.fighterState.p2Artifact = null;
            window.refreshFighterScene();
        };
    });

    const uiSuite = document.getElementById('ui-fighter-suite');
    const btnHideMenu = document.getElementById('btn-hide-menu');
    const btnShowMenu = document.getElementById('btn-show-menu');

    if (btnHideMenu) {
        btnHideMenu.onclick = () => {
            if (uiSuite) uiSuite.classList.add('menu-hidden');
            // Resume the fight when hiding the menu
            if (window.fighterGame) {
                const scene = window.fighterGame.scene.keys['FighterScene'];
                if (scene && scene.scene.isPaused()) {
                    scene.scene.resume();
                }
            }
        };
    }
    if (btnShowMenu) {
        btnShowMenu.onclick = () => {
            if (uiSuite) uiSuite.classList.remove('menu-hidden');
            // Pause the fight when showing the menu
            if (window.fighterGame) {
                const scene = window.fighterGame.scene.keys['FighterScene'];
                if (scene && !scene.scene.isPaused()) {
                    scene.scene.pause();
                }
            }
        };
    }

    const btnStart = document.getElementById('btn-start-fight');
    btnStart.onclick = () => {
        if (!window.fighterGame) return;
        const scene = window.fighterGame.scene.keys['FighterScene'];
        if (!scene) return;

        if (scene.matchActive) {
            scene.enterSandboxMode();
            btnStart.textContent = "START FIGHT";
            btnStart.classList.remove('from-blue-600', 'to-cyan-500');
            btnStart.classList.add('from-red-600', 'to-orange-500');
            if (uiSuite) uiSuite.classList.remove('match-fighting');
        } else {
            scene.startMatch();
            btnStart.textContent = "STOP FIGHT";
            btnStart.classList.remove('from-red-600', 'to-orange-500');
            btnStart.classList.add('from-blue-600', 'to-cyan-500');
            if (uiSuite) {
                uiSuite.classList.add('match-fighting');
                uiSuite.classList.remove('menu-hidden');
            }
        }
    };

    const btnExit = document.getElementById('btn-exit-suite');
    btnExit.onclick = () => {
        if (window.fighterGame) {
            window.fighterGame.destroy(true);
            window.fighterGame = null;
            window.game = null;
        }

        if (uiSuite) {
            uiSuite.style.display = 'none';
            uiSuite.classList.remove('match-fighting', 'menu-hidden');
        }
        btnStart.textContent = "START FIGHT";
        btnStart.classList.remove('from-blue-600', 'to-cyan-500');
        btnStart.classList.add('from-red-600', 'to-orange-500');

        document.getElementById('ui-title').style.display = 'flex';
        initTitleScreen();
    };
}

// Save System Utils
function getSaves() {
    try {
        const data = localStorage.getItem('elden_soul_saves');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to parse saves', e);
        return [];
    }
}

function saveSaves(saves) {
    localStorage.setItem('elden_soul_saves', JSON.stringify(saves));
}

// Initial Autoplay Config Defaults (persisted in localStorage)
let loadedApConfig = null;
try {
    const savedAp = localStorage.getItem('elden_soul_autoplay_config');
    if (savedAp) loadedApConfig = JSON.parse(savedAp);
} catch (e) {
    console.error('Failed to load autoplay config', e);
}

window.autoplayConfig = loadedApConfig || {
    preset: 'custom',
    targetZone: 0,
    coliseumGrind: false,
    townFocus: 50,
    partyBuildFocus: 50,
    questFocus: 70,
    selfPotionPct: 40,
    partyPotionPct: 40,
    spellRate: 50,
    dashFreq: 30,
    blockRate: 20,
    heroPersonality: ''
};

// Dismiss loading screen when all resources (fonts, icons, styles) have finished loading
window.addEventListener('load', () => {
    const bar = document.getElementById('loading-bar-fill');
    const status = document.getElementById('loading-status');
    if (bar) bar.style.width = '100%';
    if (status) status.innerText = 'Awakening...';
    
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            loader.style.opacity = '0';
            loader.style.transform = 'scale(1.05)';
            setTimeout(() => loader.remove(), 600);
        }
    }, 400);
});

// Lore logging and exporting utility
window.logGeneratedName = function(category, details) {
    let dict = {};
    try {
        dict = JSON.parse(localStorage.getItem("generated_lore_dictionary") || "{}");
    } catch (e) {
        dict = {};
    }
    
    if (!dict[category]) {
        dict[category] = [];
    }
    
    const exists = dict[category].some(item => item.name === details.name);
    if (!exists) {
        dict[category].push({
            ...details,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem("generated_lore_dictionary", JSON.stringify(dict, null, 2));
        console.log(`[LORE_LOG] Logged new ${category}:`, details);
    }
};

window.exportLoreDictionary = function() {
    const dataStr = localStorage.getItem("generated_lore_dictionary") || "{}";
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'generated_lore_dictionary.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    console.log("Lore dictionary exported successfully!");
};

window.autoAllocateNPCSkills = function(member) {
    if (!member || !member.classId || !window.PASSIVE_SKILLS_DATA) return;
    const classId = member.classId;
    const classSkills = window.PASSIVE_SKILLS_DATA.filter(s => s.classId === classId);
    if (classSkills.length === 0) return;

    member.passiveSkills = member.passiveSkills || {};
    const level = member.level || 1;
    let totalPoints = 3 + (level - 1);
    
    // Clear and distribute points sequentially
    classSkills.forEach(s => {
        member.passiveSkills[s.id] = 0;
    });

    let index = 0;
    while (totalPoints > 0) {
        const skill = classSkills[index % classSkills.length];
        const maxRank = skill.maxRank || 5;
        if (member.passiveSkills[skill.id] < maxRank) {
            member.passiveSkills[skill.id]++;
            totalPoints--;
        }
        index++;
        if (index > classSkills.length * 10) break;
    }
};

