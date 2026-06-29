// FighterScene.js - Dedicated 1v1 Battle Arena and Practice Scene
class FighterScene extends Phaser.Scene {
    constructor() {
        super('FighterScene');
        this.spriteDebugger = new SpriteDebugger(this);
    }

    init(data) {
        this.p1Mode = data.p1Mode || 'human'; // 'human' or 'ai'
        this.p1Class = data.p1Class || 'knight';
        this.p2Class = data.p2Class || 'dragon';
        this.p1Level = data.p1Level || 1;
        this.p2Level = data.p2Level || 1;
        this.p1Weapon = data.p1Weapon || null;
        this.p2Weapon = data.p2Weapon || null;
        this.p1Artifact = data.p1Artifact || null;
        this.p2Artifact = data.p2Artifact || null;
        this.p1Alignment = data.p1Alignment !== undefined ? data.p1Alignment : 0;
        this.p2Alignment = data.p2Alignment !== undefined ? data.p2Alignment : 0;
        
        this.matchActive = false;
        this.matchTime = 99;
        
        // P2 is hero if it's one of the hero classes or a custom NPC
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
        this.p2IsHero = heroClasses.includes(this.p2Class) || (this.p2Class && (
            this.p2Class.startsWith('custom_npc_') || 
            this.p2Class.startsWith('witch_') || 
            this.p2Class.startsWith('priest_') || 
            this.p2Class.startsWith('pyromancer_') ||
            this.p2Class.startsWith('dark_elf_') ||
            this.p2Class.startsWith('mimic_') ||
            this.p2Class.startsWith('gorgon_') ||
            this.p2Class.includes('_golem')
        ));

        this.p1 = null;
        this.p2 = null;
    }

    preload() {
        this.assetManager = new AssetManager(this);
        this.assetManager.preload();
    }

    create() {
        this.isIndoors = true; // Use indoor scaling rules for characters and enemies
        this.events.on('shutdown', this.shutdown, this);
        this.events.on('destroy', this.shutdown, this);
        this.assetManager.create();
        EnemyAnimationLoader.sliceCustomTextures(this);
        EnemyAnimationLoader.registerAll(this);
        this.spriteDebugger.createDebugPanel();

        // Background: Training Grounds
        this.background = this.add.image(640, 360, 'bg_training');
        this.background.setDisplaySize(1280, 720);

        // Floor Setup: physics body (invisible)
        this.floor = this.add.rectangle(640, 680, 1280, 80, 0x000000).setVisible(false);
        this.physics.add.existing(this.floor, true); // static body

        // Procedural Medieval Stone Brick Floor (Beautified Floor)
        this.floorGraphics = this.add.graphics();
        // 1. Fill base dark grey color
        this.floorGraphics.fillStyle(0x1c1b18, 1.0);
        this.floorGraphics.fillRect(0, 640, 1280, 80);

        // 2. Draw brick pattern
        const brickW = 80;
        const brickH = 20;
        for (let row = 0; row < 4; row++) {
            const y = 640 + row * brickH;
            const xOffset = (row % 2) * (brickW / 2);
            for (let x = -brickW; x < 1280 + brickW; x += brickW) {
                const bx = x + xOffset;
                // Mortar line
                this.floorGraphics.lineStyle(1.5, 0x100f0e, 0.9);
                this.floorGraphics.strokeRect(bx, y, brickW, brickH);
                // Top edge highlight
                this.floorGraphics.lineStyle(1, 0x3d3a33, 0.35);
                this.floorGraphics.lineBetween(bx + 1, y + 1, bx + brickW - 1, y + 1);
            }
        }
        // 3. Top stone curb
        this.floorGraphics.fillStyle(0x282622, 1.0);
        this.floorGraphics.fillRect(0, 638, 1280, 3);
        this.floorGraphics.fillStyle(0x0a0a09, 1.0);
        this.floorGraphics.fillRect(0, 641, 1280, 1);

        // Particle Texture creation
        if (!this.textures.exists('particle_dot')) {
            const canvas = document.createElement('canvas');
            canvas.width = 4;
            canvas.height = 4;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 4, 4);
            this.textures.addCanvas('particle_dot', canvas);
        }

        // 1. Central Fire Pit Sparks (makes the background fire pit animated)
        this.add.particles(640, 575, 'particle_dot', {
            angle: { min: 240, max: 300 },
            speed: { min: 20, max: 60 },
            lifespan: { min: 600, max: 1200 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: [0xff9900, 0xff3300, 0xffcc00],
            frequency: 120
        });

        // 2. Ambient Dust Motes (drifting atmospheric effect)
        this.add.particles(0, 0, 'particle_dot', {
            x: { min: 0, max: 1280 },
            y: { min: 100, max: 630 },
            speedX: { min: -10, max: 10 },
            speedY: { min: -10, max: -2 },
            lifespan: { min: 4000, max: 8000 },
            scale: { start: 0.5, end: 1.5 },
            alpha: { start: 0, from: 0, to: 0.25, end: 0 },
            tint: 0xe0c080,
            frequency: 180
        });

        // Arena Boundaries
        this.physics.world.setBounds(0, 0, 1280, 720);

        // Groups for collisions
        this.heroGroup = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group({ allowGravity: false });
        this.playerAttacks = this.physics.add.group({ allowGravity: false });
        this.playerProjectiles = this.physics.add.group({ allowGravity: false });

        // Setup input manager for human controller
        this.inputManager = new InputManager(this);

        // Colliders
        this.physics.add.collider(this.enemies, this.floor);
        this.physics.add.collider(this.heroGroup, this.floor);

        this.physics.add.overlap(this.heroGroup, this.enemyProjectiles, (heroSprite, projectile) => {
            if (projectile.active && this.matchActive) {
                const knockbackDir = projectile.x > heroSprite.x ? -1 : 1;
                const dmg = projectile.damage != null ? projectile.damage : 15;
                const target = heroSprite.controller;
                if (target && typeof target.takeDamage === 'function') {
                    target.takeDamage(dmg, knockbackDir);
                }
                projectile.destroy();
            }
        });

        // Spawn P1 & P2
        this.spawnP1();
        this.spawnP2();

        // Start in Sandbox (Practice) mode by default
        this.enterSandboxMode();

        // Debug HUD Toggle (F3)
        this.input.keyboard.on('keydown-F3', (event) => {
            event.preventDefault();
            const hud = document.getElementById('debug-hud');
            if (hud) {
                const isVisible = hud.style.display !== 'none';
                hud.style.display = isVisible ? 'none' : 'block';
                const btn = document.getElementById('debug-toggle-btn');
                if (btn) btn.style.opacity = isVisible ? '0.4' : '1';
            }
        });

        // Tab or Escape key to toggle Menu visibility
        this.input.keyboard.on('keydown-TAB', (event) => {
            event.preventDefault();
            this.toggleFighterMenu();
        });
        this.input.keyboard.on('keydown-ESC', (event) => {
            event.preventDefault();
            this.toggleFighterMenu();
        });

        // DOM elements listener
        this.setupUIListeners();
    }

    // Hero level growth table (mirrors ProgressionManager)
    static HERO_GROWTH = {
        knight:  { vit: 2, str: 2, dex: 1, int: 0 },
        wizard:  { vit: 1, str: 0, dex: 1, int: 3 },
        samurai: { vit: 1, str: 1, dex: 3, int: 0 },
        ranger:  { vit: 1, str: 1, dex: 2, int: 1 },
        elven_spellblade: { vit: 1, str: 1, dex: 2, int: 2 }
    };

    /**
     * Apply fighter loadout (level, weapon, artifact) to a hero PlayerController.
     */
    applyHeroLoadout(player, level, weapon, artifactKey) {
        // Apply level stat growth
        if (level > 1 && player.classData && player.classData.stats) {
            const growth = FighterScene.HERO_GROWTH[player.classData.id] || { vit: 1, str: 1, dex: 1, int: 1 };
            const levelsGained = level - 1;
            player.classData.stats.vit += growth.vit * levelsGained;
            player.classData.stats.str += growth.str * levelsGained;
            player.classData.stats.dex += growth.dex * levelsGained;
            player.classData.stats.int += growth.int * levelsGained;
        }

        // Apply weapon
        if (weapon && weapon.damageBonus !== undefined) {
            player.inventory.weapon = {
                key: weapon.key,
                name: weapon.name,
                damageBonus: weapon.damageBonus,
                iconSrc: 'src/assets/wooden_staff.png',
                desc: `+${weapon.damageBonus} Damage`
            };
        }

        // Apply artifact
        if (artifactKey && window.ARTIFACTS_DATA && window.ARTIFACTS_DATA[artifactKey]) {
            player.inventory.artifacts = [artifactKey];
            player.inventory.equippedArtifact = 0;
        }

        // Recalculate stats with all boosts applied
        if (player.recalculateStats) {
            player.recalculateStats();
        } else if (player.statsManager && player.statsManager.recalculateStats) {
            player.statsManager.recalculateStats();
        }
    }

    /**
     * Apply level scaling to an enemy combatant.
     * HP scales quadratically, damage scales linearly, speed stays fixed.
     */
    applyEnemyLevelScaling(enemy, level) {
        if (level <= 1) return;
        const hpMultiplier = 1 + (level - 1) * 0.5 + Math.pow(level - 1, 1.5) * 0.02;
        const dmgMultiplier = 1 + (level - 1) * 0.15;

        enemy.maxHp = Math.floor(enemy.maxHp * hpMultiplier);
        enemy.hp = enemy.maxHp;
        enemy.damageMultiplier = dmgMultiplier;
    }

    spawnP1() {
        if (this.p1) {
            if (this.p1.sprite) this.p1.sprite.destroy();
        }
        
        if (this.p1Class === 'custom_npc_male' || this.p1Class === 'custom_npc_female') {
            const gender = this.p1Class === 'custom_npc_male' ? 'male' : 'female';
            const npcData = window.CharacterComposer.generateRandomNPC(this, gender);
            this.p1Class = npcData.spriteKey;
            this.p1CustomWeaponType = npcData.weaponType;
        }

        // Player 1 spawn coordinates
        this.p1 = new PlayerController(this, 300, 450, this.inputManager, {
            isAI: this.p1Mode === 'ai',
            classId: this.p1Class,
            weaponType: this.p1CustomWeaponType || 'sword'
        });
        this.p1.alignment = this.p1Alignment;
        
        // Apply fighter loadout (level, weapon, artifact)
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
        if (heroClasses.includes(this.p1Class) || (this.p1Class && (
            this.p1Class.startsWith('custom_npc_') || 
            this.p1Class.startsWith('witch_') || 
            this.p1Class.startsWith('priest_') || 
            this.p1Class.startsWith('pyromancer_') ||
            this.p1Class.startsWith('dark_elf_') ||
            this.p1Class.startsWith('mimic_') ||
            this.p1Class.startsWith('gorgon_') ||
            this.p1Class.includes('_golem')
        ))) {
            this.applyHeroLoadout(this.p1, this.p1Level, this.p1Weapon, this.p1Artifact);
        }

        this.p1.sprite.setCollideWorldBounds(true);
        this.physics.add.collider(this.p1.sprite, this.floor);
        this.heroGroup.add(this.p1.sprite);

        // Scale up P1 (hero class)
        const scale = (this.p1.baseScale || 1.5) * (2.5 / 1.5);
        this.p1.setScaleWithPhysics(scale);

        // Expose globally so managers/controllers can find this.player
        this.player = this.p1;

        // Setup custom taking damage tracking for P1
        this.p1._originalTakeDamage = this.p1.takeDamage;
        this.p1.takeDamage = function(amount, knockbackDirection) {
            if (this.scene.matchActive) {
                this._originalTakeDamage(amount, knockbackDirection);
            } else {
                // In sandbox, just show floating text damage indicator without actual HP depletion
                if (typeof this.scene.showFloatingText === 'function') {
                    this.scene.showFloatingText(this.sprite.x, this.sprite.y - 20, amount, 0xff0000);
                }
                
                // Play damage reaction anim if alive
                if (this.sprite && this.sprite.active) {
                    this.isHit = true;
                    this.currentAnimKey = null;
                    const hitKey = this.classId ? `${this.classId}_hit` : `${this.textureKey || this.type}-hit`;
                    if (this.scene.anims.exists(hitKey)) {
                        this.sprite.play(hitKey);
                        this.sprite.off('animationcomplete-' + hitKey);
                        this.sprite.once('animationcomplete-' + hitKey, () => {
                            this.isHit = false;
                        });
                    } else {
                        this.scene.time.delayedCall(400, () => {
                            this.isHit = false;
                        });
                    }
                    this.sprite.setTint(0xff4444);
                    this.scene.time.delayedCall(200, () => {
                        if (this.sprite && this.sprite.active) this.sprite.clearTint();
                    });
                }
            }
        };
    }

    spawnP2() {
        if (this.p2) {
            if (this.p2.sprite) this.p2.sprite.destroy();
        }

        if (this.p2Class === 'custom_npc_male' || this.p2Class === 'custom_npc_female') {
            const gender = this.p2Class === 'custom_npc_male' ? 'male' : 'female';
            const npcData = window.CharacterComposer.generateRandomNPC(this, gender);
            this.p2Class = npcData.spriteKey;
            this.p2CustomWeaponType = npcData.weaponType;
        }

        // Player 2 spawn coordinates
        if (this.p2IsHero) {
            this.p2 = new PlayerController(this, 980, 450, this.inputManager, {
                isAI: true,
                classId: this.p2Class,
                weaponType: this.p2CustomWeaponType || 'sword'
            });
            this.p2.alignment = this.p2Alignment;
            this.p2.aiState = 'hostile'; // targets player.scene.player (P1)
            this.enemies.add(this.p2.sprite);

            // Apply fighter loadout for hero P2
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
            if (heroClasses.includes(this.p2Class) || (this.p2Class && (
                this.p2Class.startsWith('custom_npc_') || 
                this.p2Class.startsWith('witch_') || 
                this.p2Class.startsWith('priest_') || 
                this.p2Class.startsWith('pyromancer_') ||
                this.p2Class.startsWith('dark_elf_') ||
                this.p2Class.startsWith('mimic_') ||
                this.p2Class.startsWith('gorgon_') ||
                this.p2Class.includes('_golem')
            ))) {
                this.applyHeroLoadout(this.p2, this.p2Level, this.p2Weapon, this.p2Artifact);
            }

            // Scale up P2 (hero class)
            const scale = (this.p2.baseScale || 1.5) * (2.5 / 1.5);
            this.p2.setScaleWithPhysics(scale);
        } else {
            // Enemy controller takes (scene, x, y, targetPlayer, gemini, type)
            this.p2 = new EnemyController(this, 980, 450, this.p1, null, this.p2Class);
            this.enemies.add(this.p2.sprite);

            // Apply level scaling for enemy P2
            this.applyEnemyLevelScaling(this.p2, this.p2Level);
        }

        this.p2.sprite.setCollideWorldBounds(true);
        this.physics.add.collider(this.p2.sprite, this.floor);

        // Adjust orientation to face P1
        this.p2.facingDirection = -1;
        if (this.p2IsHero) {
            const cd2 = this.p2.classData || {};
            this.p2.sprite.setFlipX(cd2.flipX ? false : true);
        } else {
            const facesLeftByDefault = ['goblin', 'bat', 'mushroom', 'orc', 'plague_flies', 'burning_skull_blue', 'old_demon', 'male_damned', 'female_damned', 'tree_damned', 'twisted_damned', 'burning_damned', 'burning_skull', 'imp', 'cheeky_devil', 'mummy', 'zombie', 'zombie_v1', 'zombie_v2', 'zombie_v3', 'dragon', 'willowisp', 'bloated_damned'].includes(this.p2Class) || (this.p2Class && this.p2Class.startsWith('special_enemy_'));
            this.p2.sprite.setFlipX(facesLeftByDefault ? false : true);
        }

        // Setup custom taking damage tracking
        this.p2._originalTakeDamage = this.p2.takeDamage;
        this.p2.takeDamage = function(amount, knockbackDirection) {
            if (this.scene.matchActive) {
                this._originalTakeDamage(amount, knockbackDirection);
            } else {
                // In sandbox, just show floating text damage indicator without actual HP depletion
                if (typeof this.scene.showFloatingText === 'function') {
                    this.scene.showFloatingText(this.sprite.x, this.sprite.y - 20, amount, 0xff0000);
                }
                
                // Play damage reaction anim if alive
                if (this.sprite && this.sprite.active) {
                    this.isHit = true;
                    this.currentAnimKey = null;
                    const hitKey = this.classId ? `${this.classId}_hit` : `${this.textureKey || this.type}-hit`;
                    if (this.scene.anims.exists(hitKey)) {
                        this.sprite.play(hitKey);
                        this.sprite.off('animationcomplete-' + hitKey);
                        this.sprite.once('animationcomplete-' + hitKey, () => {
                            this.isHit = false;
                        });
                    } else {
                        this.scene.time.delayedCall(400, () => {
                            this.isHit = false;
                        });
                    }
                    this.sprite.setTint(0xff4444);
                    this.scene.time.delayedCall(200, () => {
                        if (this.sprite && this.sprite.active) this.sprite.clearTint();
                    });
                }
            }
        };
    }

    enterSandboxMode() {
        this.matchActive = false;
        const banner = document.getElementById('fighter-banner');
        if (banner) {
            banner.textContent = "SANDBOX PRACTICE MODE";
            banner.style.color = "#00ff88";
        }
        
        // Hide round UI
        const timerContainer = document.getElementById('fighter-timer-container');
        if (timerContainer) timerContainer.style.display = 'none';

        const winnerScreen = document.getElementById('fighter-winner-screen');
        if (winnerScreen) winnerScreen.style.display = 'none';

        // Clear status text
        const statusOverlay = document.getElementById('fighter-status');
        if (statusOverlay) statusOverlay.innerHTML = '';

        // Remove match-fighting class so menu is visible and pointer events are enabled
        const uiSuite = document.getElementById('ui-fighter-suite');
        if (uiSuite) uiSuite.classList.remove('match-fighting');

        // Reset the start button UI
        const btnStart = document.getElementById('btn-start-fight');
        if (btnStart) {
            btnStart.textContent = "START FIGHT";
            btnStart.classList.remove('from-blue-600', 'to-cyan-500');
            btnStart.classList.add('from-red-600', 'to-orange-500');
        }

        this.resetMatch();
    }

    startMatch() {
        this.matchActive = true;
        const banner = document.getElementById('fighter-banner');
        if (banner) {
            banner.textContent = "FIGHT!";
            banner.style.color = "#ef4444";
        }

        // Show round UI
        const timerContainer = document.getElementById('fighter-timer-container');
        if (timerContainer) timerContainer.style.display = 'block';

        const winnerScreen = document.getElementById('fighter-winner-screen');
        if (winnerScreen) winnerScreen.style.display = 'none';

        // Clear the REMATCH / winner text from status
        const statusOverlay = document.getElementById('fighter-status');
        if (statusOverlay) statusOverlay.innerHTML = '';

        // Hide setup pane and disable pointer events during the fight
        const uiSuite = document.getElementById('ui-fighter-suite');
        if (uiSuite) {
            uiSuite.classList.add('match-fighting');
            uiSuite.classList.remove('menu-hidden');
        }

        // Sync start button UI
        const btnStart = document.getElementById('btn-start-fight');
        if (btnStart) {
            btnStart.textContent = "STOP FIGHT";
            btnStart.classList.remove('from-red-600', 'to-orange-500');
            btnStart.classList.add('from-blue-600', 'to-cyan-500');
        }

        this.resetMatch();
    }


    resetMatch() {
        this.matchTime = 99;
        const timerEl = document.getElementById('fighter-timer');
        if (timerEl) timerEl.textContent = this.matchTime;

        // Clean up projectiles
        this.enemyProjectiles.clear(true, true);
        this.playerAttacks.clear(true, true);
        this.playerProjectiles.clear(true, true);

        // Clean up summoned minions and other temporary entities
        if (this.enemies) {
            this.enemies.getChildren().forEach(sprite => {
                if (sprite && sprite !== (this.p1 ? this.p1.sprite : null) && sprite !== (this.p2 ? this.p2.sprite : null)) {
                    if (sprite.controller) {
                        if (sprite.controller.hpText && sprite.controller.hpText.destroy) sprite.controller.hpText.destroy();
                        if (sprite.controller.aiText && sprite.controller.aiText.destroy) sprite.controller.aiText.destroy();
                    }
                    sprite.destroy();
                }
            });
        }
        if (this.heroGroup) {
            this.heroGroup.getChildren().forEach(sprite => {
                if (sprite && sprite !== (this.p1 ? this.p1.sprite : null) && sprite !== (this.p2 ? this.p2.sprite : null)) {
                    if (sprite.controller) {
                        if (sprite.controller.hpText && sprite.controller.hpText.destroy) sprite.controller.hpText.destroy();
                        if (sprite.controller.aiText && sprite.controller.aiText.destroy) sprite.controller.aiText.destroy();
                    }
                    sprite.destroy();
                }
            });
        }

        // Re-enable updates
        this.p1.isDummy = false;
        this.p2.isDummy = false;

        // Respawn/Reset health to full
        this.p1.hp = this.p1.maxHp;
        this.p1.mp = this.p1.maxMp;
        this.p2.hp = this.p2.maxHp;
        if (this.p2.maxMp) this.p2.mp = this.p2.maxMp;

        // Reset positions
        this.p1.sprite.setPosition(300, 450);
        this.p2.sprite.setPosition(980, 450);
        
        this.p1.sprite.setVelocity(0, 0);
        this.p2.sprite.setVelocity(0, 0);

        this.updateUIBars();

        // Timer interval
        if (this.timerEvent) this.timerEvent.destroy();
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.matchActive) return;
                this.matchTime--;
                const timerEl = document.getElementById('fighter-timer');
                if (timerEl) timerEl.textContent = this.matchTime;

                if (this.matchTime <= 0) {
                    this.endMatch("TIME UP");
                }
            },
            callbackScope: this,
            loop: true
        });
    }

    endMatch(reason) {
        this.matchActive = false;
        if (this.timerEvent) this.timerEvent.destroy();

        // Make dummy again
        this.p1.isDummy = true;
        this.p2.isDummy = true;

        let winnerText = "DRAW";
        if (reason === "TIME UP") {
            const p1Pct = this.p1.hp / this.p1.maxHp;
            const p2Pct = this.p2.hp / this.p2.maxHp;
            if (p1Pct > p2Pct) {
                winnerText = "PLAYER 1 WINS!";
            } else if (p2Pct > p1Pct) {
                winnerText = "PLAYER 2 WINS!";
            }
        } else {
            winnerText = reason;
        }

        const statusOverlay = document.getElementById('fighter-status');
        if (statusOverlay) {
            statusOverlay.innerHTML = `
                <div class="flex flex-col items-center gap-3">
                    <span class="text-[32px] font-bold text-tertiary glow-text tracking-widest">${winnerText}</span>
                    <button onclick="window._fighterScene.startMatch()" class="px-6 py-2 bg-primary/20 hover:bg-primary/40 border border-primary/50 text-primary font-bold uppercase rounded cursor-pointer transition-colors text-[14px]">Rematch</button>
                </div>
            `;
        }

        // Re-enable pointer events on the UI so REMATCH / Show Menu can be clicked
        const uiSuite = document.getElementById('ui-fighter-suite');
        if (uiSuite) uiSuite.classList.remove('match-fighting');
    }

    updatePlayerAI(player, opponent, time, delta) {
        if (!player || !player.sprite || !player.sprite.active || player.hp <= 0) return;
        if (!opponent || !opponent.sprite || !opponent.sprite.active || opponent.hp <= 0) return;

        // Reset inputs
        player.aiInput.left = false;
        player.aiInput.right = false;
        player.aiInput.up = false;
        player.aiInput.down = false;

        const selfX = player.sprite.x;
        const oppX = opponent.sprite.x;
        const dist = Math.abs(selfX - oppX);

        // AI faces target
        player.aiTargetDx = oppX - selfX;
        
        // Choose behavior based on class range
        const isRanged = ['wizard', 'ranger', 'dark_elf_queen', 'dark_elf_queen_rival'].includes(player.classId);
        let targetRange = isRanged ? 240 : 50;
        if (player.classId && player.classId.includes('dark_elf_guard')) {
            targetRange = 150;
        }

        if (dist > targetRange + 20) {
            // Move closer
            if (selfX < oppX) {
                player.aiInput.right = true;
            } else {
                player.aiInput.left = true;
            }
            // Randomly dash
            if (Math.random() < 0.03) {
                if (selfX < oppX) player.aiInput.dashRight = true;
                else player.aiInput.dashLeft = true;
            }
        } else if (isRanged && dist < targetRange - 60) {
            // Move away to keep range
            if (selfX < oppX) {
                player.aiInput.left = true;
            } else {
                player.aiInput.right = true;
            }
        } else {
            // We are in range! Attack!
            if (time - (player.lastAIAttackTime || 0) > 350) {
                player.lastAIAttackTime = time;
                const r = Math.random();
                if (r < 0.70) {
                    player.aiInput.attack = true;
                } else if (r < 0.82 && player.mp >= 30) {
                    player.aiInput.superSpell = true;
                } else if (r < 0.92 && player.mp >= 50) {
                    player.aiInput.megaSpell = true;
                } else if (player.mp >= 40) {
                    player.aiInput.summonSpell = true;
                }
            }
        }

        // Jump occasionally if target is higher or randomly
        const selfY = player.sprite.y;
        const oppY = opponent.sprite.y;
        if (oppY < selfY - 50 && Math.random() < 0.06) {
            player.aiInput.up = true;
        } else if (Math.random() < 0.008) {
            player.aiInput.up = true;
        }
    }

    toggleFighterMenu() {
        const uiSuite = document.getElementById('ui-fighter-suite');
        if (uiSuite) {
            const isHidden = uiSuite.classList.contains('menu-hidden');
            if (isHidden) {
                // Show the menu!
                uiSuite.classList.remove('menu-hidden');
                
                // If a fight was active, exit match fighting mode and return to sandbox!
                if (this.matchActive) {
                    this.enterSandboxMode();
                }

                // Pause the scene execution
                if (this.scene && !this.scene.isPaused()) {
                    this.scene.pause();
                }
            } else {
                // Hide the menu!
                uiSuite.classList.add('menu-hidden');

                // Resume the scene execution
                if (this.scene && this.scene.isPaused()) {
                    this.scene.resume();
                }
            }
        }
    }

    _updateDebugHUD() {
        const el = document.getElementById('debug-content');
        if (!el) return;

        const fps = Math.round(this.game.loop.actualFps);
        const mode = this.matchActive ? "ACTIVE BATTLE" : "SANDBOX / PRACTICE";
        const timer = this.matchActive ? `${this.matchTime}s` : 'N/A';

        // P1 info
        let p1Info = 'N/A';
        if (this.p1) {
            const p1X = this.p1.sprite ? Math.round(this.p1.sprite.x) : '?';
            const p1Y = this.p1.sprite ? Math.round(this.p1.sprite.y) : '?';
            const p1Vx = this.p1.sprite && this.p1.sprite.body ? Math.round(this.p1.sprite.body.velocity.x) : 0;
            const p1Vy = this.p1.sprite && this.p1.sprite.body ? Math.round(this.p1.sprite.body.velocity.y) : 0;
            const p1Hp = `${Math.round(this.p1.hp)}/${Math.round(this.p1.maxHp)}`;
            const p1Anim = this.p1.sprite && this.p1.sprite.anims && this.p1.sprite.anims.currentAnim ? this.p1.sprite.anims.currentAnim.key : 'none';
            p1Info = `
<b>P1 Class:</b> ${this.p1Class} (${this.p1Mode})<br/>
<b>P1 Position:</b> ${p1X}, ${p1Y}<br/>
<b>P1 Velocity:</b> ${p1Vx}, ${p1Vy}<br/>
<b>P1 HP:</b> ${p1Hp}<br/>
<b>P1 Anim:</b> ${p1Anim}<br/>
<b>P1 Attacking:</b> ${this.p1.isAttacking || false} | <b>Hit:</b> ${this.p1.isHit || false}
`;
        }

        // P2 info
        let p2Info = 'N/A';
        if (this.p2) {
            const p2X = this.p2.sprite ? Math.round(this.p2.sprite.x) : '?';
            const p2Y = this.p2.sprite ? Math.round(this.p2.sprite.y) : '?';
            const p2Vx = this.p2.sprite && this.p2.sprite.body ? Math.round(this.p2.sprite.body.velocity.x) : 0;
            const p2Vy = this.p2.sprite && this.p2.sprite.body ? Math.round(this.p2.sprite.body.velocity.y) : 0;
            const p2Hp = `${Math.round(this.p2.hp)}/${Math.round(this.p2.maxHp)}`;
            const p2Anim = this.p2.sprite && this.p2.sprite.anims && this.p2.sprite.anims.currentAnim ? this.p2.sprite.anims.currentAnim.key : 'none';
            const p2Type = this.p2IsHero ? "Hero AI" : "Enemy AI";
            p2Info = `
<b>P2 Class:</b> ${this.p2Class} (${p2Type})<br/>
<b>P2 Position:</b> ${p2X}, ${p2Y}<br/>
<b>P2 Velocity:</b> ${p2Vx}, ${p2Vy}<br/>
<b>P2 HP:</b> ${p2Hp}<br/>
<b>P2 Anim:</b> ${p2Anim}<br/>
<b>P2 Attacking:</b> ${this.p2.isAttacking || false} | <b>Hit:</b> ${this.p2.isHit || false}
`;
        }

        const projectiles = this.enemyProjectiles.getChildren().length + this.playerProjectiles.getChildren().length + this.playerAttacks.getChildren().length;

        el.innerHTML = `
<div style="margin-bottom: 6px;"><b>FPS:</b> ${fps} | <b>Mode:</b> ${mode}</div>
<div style="margin-bottom: 6px;"><b>Round Timer:</b> ${timer} | <b>Projectiles:</b> ${projectiles}</div>
<hr style="border: 0; border-top: 1px solid rgba(0,255,0,0.2); margin: 6px 0;"/>
<div style="margin-bottom: 6px;">${p1Info}</div>
<hr style="border: 0; border-top: 1px solid rgba(0,255,0,0.2); margin: 6px 0;"/>
<div>${p2Info}</div>
`;
    }

    update(time, delta) {
        if (!this.p1 || !this.p2) return;

        // Run AI routines
        if (this.matchActive) {
            if (this.p1Mode === 'ai') {
                this.updatePlayerAI(this.p1, this.p2, time, delta);
            }
            if (this.p2IsHero) {
                this.updatePlayerAI(this.p2, this.p1, time, delta);
            }

            // K.O. Checks
            if (this.p1.hp <= 0) {
                this.endMatch("PLAYER 2 WINS!");
            } else if (this.p2.hp <= 0) {
                this.endMatch("PLAYER 1 WINS!");
            }
        }

        // Call update on controllers
        this.p1.update(time, delta);
        this.p2.update(time, delta);

        // Update all other active entities (like summoned skeletons)
        if (this.enemies) {
            this.enemies.getChildren().forEach(enemySprite => {
                if (enemySprite && enemySprite.active && enemySprite.controller && enemySprite.controller !== this.p1 && enemySprite.controller !== this.p2) {
                    enemySprite.controller.update(time, delta);
                }
            });
        }
        if (this.heroGroup) {
            this.heroGroup.getChildren().forEach(heroSprite => {
                if (heroSprite && heroSprite.active && heroSprite.controller && heroSprite.controller !== this.p1 && heroSprite.controller !== this.p2) {
                    heroSprite.controller.update(time, delta);
                }
            });
        }

        this.updateUIBars();

        // Update Debug HUD if visible (throttled to 4x/sec)
        const hud = document.getElementById('debug-hud');
        if (hud && hud.style.display !== 'none') {
            if (!this._lastDebugUpdate || time - this._lastDebugUpdate > 250) {
                this._lastDebugUpdate = time;
                this._updateDebugHUD();
            }
        }
    }

    updateUIBars() {
        // Player 1 HP/MP
        const p1HpBar = document.getElementById('p1-hp-fill');
        const p1MpBar = document.getElementById('p1-mp-fill');
        const p1HpText = document.getElementById('p1-hp-text');
        const p1MpText = document.getElementById('p1-mp-text');

        if (this.p1) {
            const hpPct = Math.max(0, Math.min(100, (this.p1.hp / this.p1.maxHp) * 100));
            const mpPct = Math.max(0, Math.min(100, (this.p1.mp / this.p1.maxMp) * 100));
            if (p1HpBar) p1HpBar.style.width = `${hpPct}%`;
            if (p1MpBar) p1MpBar.style.width = `${mpPct}%`;
            if (p1HpText) p1HpText.textContent = `${Math.ceil(this.p1.hp)} / ${this.p1.maxHp}`;
            if (p1MpText) p1MpText.textContent = `${Math.ceil(this.p1.mp)} / ${this.p1.maxMp}`;
        }

        // Player 2 HP/MP
        const p2HpBar = document.getElementById('p2-hp-fill');
        const p2MpBar = document.getElementById('p2-mp-fill');
        const p2HpText = document.getElementById('p2-hp-text');
        const p2MpText = document.getElementById('p2-mp-text');
        const p2MpRow = document.getElementById('p2-mp-row');

        if (this.p2) {
            const hpPct = Math.max(0, Math.min(100, (this.p2.hp / this.p2.maxHp) * 100));
            if (p2HpBar) p2HpBar.style.width = `${hpPct}%`;
            if (p2HpText) p2HpText.textContent = `${Math.ceil(this.p2.hp)} / ${this.p2.maxHp}`;

            if (this.p2IsHero) {
                if (p2MpRow) p2MpRow.style.display = 'block';
                const mpPct = Math.max(0, Math.min(100, (this.p2.mp / this.p2.maxMp) * 100));
                if (p2MpBar) p2MpBar.style.width = `${mpPct}%`;
                if (p2MpText) p2MpText.textContent = `${Math.ceil(this.p2.mp)} / ${this.p2.maxMp}`;
            } else {
                if (p2MpRow) p2MpRow.style.display = 'none';
            }
        }
    }

    setupUIListeners() {
        window._fighterScene = this;

        // Select buttons triggers in index.html will spawn characters and call enterSandboxMode()
        // We will wire up animation tester triggers:
        const testerButtons = ['btn-test-idle', 'btn-test-walk', 'btn-test-attack', 'btn-test-magic', 'btn-test-hit', 'btn-test-die', 'btn-test-fly'];
        
        // Find which target is selected (Combatant 1 or 2)
        const getSelectedTarget = () => {
            const radio1 = document.getElementById('radio-target-p1');
            if (radio1 && radio1.checked) {
                return this.p1;
            }
            return this.p2;
        };

        testerButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                // Clear any existing click listeners by replacing button with clone
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);

                newBtn.addEventListener('click', () => {
                    const target = getSelectedTarget();
                    if (!target || !target.sprite) return;

                    const prefix = target.classId || target.type;
                    const action = btnId.replace('btn-test-', '');
                    
                    if (!(target instanceof EnemyController)) {
                        // For players, delegate to their controller methods for attack/magic to test actual combat logic
                        if (action === 'attack') {
                            const now = this.time.now;
                            const canCombo = target.isAttacking && target.classData.attack2Frames && (!target._lastAttackTime || (now - target._lastAttackTime > 150));
                            if (!target.isAttacking || canCombo) {
                                target.attack();
                            }
                            return;
                        }
                        if (action === 'magic') {
                            if (!target.isAttacking) {
                                target.superComboSpell();
                            }
                            return;
                        }
                    }

                    let animKey = '';
                    if (target instanceof EnemyController) {
                        // Enemy format is goblin-idle
                        const keyMap = {
                            idle: 'idle',
                            walk: 'move',
                            attack: 'attack',
                            magic: 'attack2',
                            hit: 'hit',
                            die: 'die',
                            fly: 'fly'
                        };
                        const mappedAction = keyMap[action] || action;
                        animKey = `${prefix}-${mappedAction}`;
                    } else {
                        // Player format is knight_idle
                        animKey = `${prefix}_${action}`;
                    }

                    if (this.anims.exists(animKey)) {
                        target.sprite.play(animKey, true);
                    } else {
                        // Fallbacks
                        if (action === 'magic') {
                            if (this.anims.exists(`${prefix}_combo`)) {
                                target.sprite.play(`${prefix}_combo`, true);
                            } else if (this.anims.exists(`${prefix}_attack`)) {
                                target.sprite.play(`${prefix}_attack`, true);
                            } else {
                                this.showFloatingText(target.sprite.x, target.sprite.y - 60, "Anim Not Found!", 0xff4444);
                            }
                        } else if (action === 'walk' && this.anims.exists(`${prefix}_move`)) {
                            target.sprite.play(`${prefix}_move`, true);
                        } else {
                            this.showFloatingText(target.sprite.x, target.sprite.y - 60, "Anim Not Found!", 0xff4444);
                        }
                    }
                });
            }
        });
    }

    showFloatingText(x, y, message, color) {
        let colorStr = '#ffffff';
        if (typeof color === 'number') {
            colorStr = '#' + color.toString(16).padStart(6, '0');
        } else if (typeof color === 'string') {
            colorStr = color;
        }

        // Round numeric messages to prevent decimals
        let displayMessage = message;
        if (typeof message === 'number') {
            displayMessage = String(Math.round(message));
        } else if (typeof message === 'string') {
            const num = Number(message);
            if (!isNaN(num)) {
                displayMessage = String(Math.round(num));
            }
        }

        const offsetX = (Math.random() - 0.5) * 30;
        
        const text = this.add.text(x + offsetX, y, displayMessage, {
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '22px',
            fill: colorStr,
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 280, useAdvancedWrap: true }
        });
        text.setOrigin(0.5, 1.0);
        text.setScale(0.5);
        text.setDepth(1000);

        this.tweens.add({
            targets: text,
            scale: 1.2,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: text,
                    y: y - 50,
                    scale: 0.8,
                    alpha: 0,
                    duration: 900,
                    ease: 'Power2',
                    onComplete: () => text.destroy()
                });
            }
        });
    }

    shutdown() {
        if (this.timerEvent) {
            this.timerEvent.destroy();
            this.timerEvent = null;
        }

        // Clean up Sprite Debugger DOM elements
        const dbPanel = document.getElementById('debug-panel');
        if (dbPanel) {
            dbPanel.remove();
        }

        if (this._debugKeyDownListener) {
            document.removeEventListener('keydown', this._debugKeyDownListener);
            this._debugKeyDownListener = null;
        }
        window._debugKeyBound = false;

        if (this._debugMouseUpListener) {
            window.removeEventListener('mouseup', this._debugMouseUpListener);
            this._debugMouseUpListener = null;
        }
    }
}
window.FighterScene = FighterScene;
