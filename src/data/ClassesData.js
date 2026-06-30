// src/data/ClassesData.js - Contains the configurations, animations, stats and level growths for all classes
// Extracted from original main.js to preserve all fine-tuned positions.

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
        sheetCols: 5,
        idleFrames: 5, idleRow: 0,
        walkRow: 1,
        attackRow: 2,
        jumpRow: 1,
        fallRow: 1,
        dashRow: 1,
        flipX: true,
        animFrames: {
            idle: { start: 0, end: 3 },
            walk: { start: 5, end: 8 },
            attack: { start: 10, end: 14 },
            jump: { start: 5, end: 8 },
            fall: { start: 5, end: 8 },
            hit: { start: 30, end: 33 },
            die: { start: 50, end: 54 }
        },
        comboStartFrame: 15, comboEndFrame: 19,
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
        spriteScale: 1.05,
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
        spriteScale: 1.05,
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
        spriteScale: 1.05,
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
        spriteScale: 1.05,
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
        spriteScale: 1.05,
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
        spriteScale: 1.05,
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
        spriteScale: 1.05,
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
        spriteScale: 1.05,
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
        spriteScale: 1.05,
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
