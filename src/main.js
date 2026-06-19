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
        npcPersona: 'A burly dwarf who can forge and upgrade any weapon — for a price.',
        floorTint: 0x555555,
        action: 'forge'
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
        desc: 'Pray for blessings',
        npcSprite: 'npc',
        npcName: 'High Priestess',
        npcPersona: 'A serene priestess who can bestow divine blessings upon worthy souls.',
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
            jump: { start: 40, end: 43 },
            fall: { start: 50, end: 53 }
        },
        comboStartFrame: 120, comboEndFrame: 129, // Row 13 for GandalfHardcore Warrior
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
        comboStartFrame: 24, // Row 4 (4 * 6)
        comboEndFrame: 41,   // End of Row 6 ((6 * 6) + 5)
        previewScale: 0.6,
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
            duck: { frames: [0] },
            jump: { frames: [0] },
            fall: { frames: [0] }
        },
        idleFrames: 5, idleRow: 0,
        slotPortraitX: -6, slotPortraitY: -20,
        stats: { vit: 11, str: 12, dex: 15, int: 9 }
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
classesData.megaboss_rival = { ...classesData.heavy_knight, id: 'megaboss_rival', stats: { vit: 150, str: 50, dex: 20, int: 20 }, animFrames: JSON.parse(JSON.stringify(classesData.heavy_knight.animFrames || {})) };
classesData.megaboss_rival.image = 'src/assets/Heavy Knight/Heavy Knight/Red heavy.png';

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
        // Show only the first frame of the sprite sheet
        // Base scale entirely on height (64px) so all characters are equally tall
        const scale = 256 / data.frameHeight;
        
        // Hide image until ready to prevent flashing the full sheet
        container.style.backgroundImage = 'none';
        container.style.backgroundRepeat = 'no-repeat';
        container.style.imageRendering = 'pixelated';
        container.style.transform = data.flipX ? 'scaleX(-1)' : 'none';
        
        // Load image to get actual sheet dimensions for proper scaling
        const tempImg = new Image();
        tempImg.src = data.image;
        tempImg.onload = () => {
            const currentContainer = document.getElementById('create-class-image');
            if (!currentContainer || currentContainer !== container) return;
            container.style.backgroundSize = `${tempImg.width * scale}px ${tempImg.height * scale}px`;
            container.style.backgroundImage = `url('${data.image}')`;
            
            // Calculate dynamic offsets for sprites with different frame widths (e.g. Knight is 80px wide)
            const frameWidthPx = data.frameWidth * scale;
            const frameHeightPx = data.frameHeight * scale;
            const rowOffset = (data.idleRow || 0) * frameHeightPx;
            
            // Center the frame inside the 256px container horizontally
            const offsetX = (256 - frameWidthPx) / 2;
            
            // Allow per-class vertical adjustment for taller sprites
            const previewYShift = (data.previewOffsetY || 0) * scale;
            
            // Animate background-position from initial offset
            window.currentPreviewAnim = container.animate([
                { backgroundPosition: `${offsetX}px ${-rowOffset + previewYShift}px` },
                { backgroundPosition: `${offsetX - (data.idleFrames * frameWidthPx)}px ${-rowOffset + previewYShift}px` }
            ], {
                duration: data.idleFrames * 150, // 150ms per frame
                easing: `steps(${data.idleFrames}, end)`,
                iterations: Infinity
            });
        };
        container.style.backgroundSize = 'auto';
        container.innerHTML = '';
    } else {
        // It's a standalone image/gif — use an <img> tag
        container.style.backgroundImage = 'none';
        container.style.transform = 'none';
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

    // We pass both the base class data and the specific save data
    window.selectedClass = classesData[saveData.classId];
    window.saveData = JSON.parse(JSON.stringify(saveData));

    const config = {
        type: Phaser.AUTO,
        width: 1280,
        height: 720,
        parent: 'game-container',
        pixelArt: true,
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
    // Boot the title screen Phaser canvas
    initTitleScreen();

    document.getElementById('btn-new-game').addEventListener('click', showCreateScreen);
    
    // Continue Screen Logic
    const btnContinue = document.getElementById('btn-continue');
    
    function renderContinueScreen() {
        const saves = getSaves();
        const container = document.getElementById('save-slots-container');
        container.innerHTML = '';
        
        for (let i = 0; i < 4; i++) {
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
        if (saves.length >= 4) {
            alert('No empty save slots available! Please overwrite a save (feature coming soon).');
            return;
        }
        
        const newSave = {
            id: Date.now().toString(),
            name: name,
            classId: selectedClassData.id,
            level: 1,
            playTime: 0,
            lastSaved: Date.now(),
            isNewGame: true
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
});

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
