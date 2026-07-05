// src/scenes/FighterSuiteManager.js - Fighter Suite UI setup and event handlers
// Extracted from original main.js to preserve all correct DOM selectors and listeners.

window.startFighterSuite = function() {
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

window.setupFighterHTMLHandlers = function() {
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
        'stone_golem', 'stone_golem_rival', 'lava_golem', 'lava_golem_rival', 'copper_golem', 'copper_golem_rival', 'flame_elemental'
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
                'stone_golem', 'stone_golem_rival', 'lava_golem', 'lava_golem_rival', 'copper_golem', 'copper_golem_rival', 'flame_elemental'
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
