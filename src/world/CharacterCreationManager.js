// src/world/CharacterCreationManager.js - Manages character selection screen and starting stats allocation UI grid

window.creationAllocations = {}; // Stores { skillId: rank }

window.renderCreationSkillsGrid = function() {
    const grid = document.getElementById('create-skills-grid');
    const counter = document.getElementById('create-skill-points-counter');
    const tooltip = document.getElementById('create-skills-tooltip');
    const btnAwaken = document.getElementById('btn-awaken');

    console.log("[DIAGNOSTIC] renderCreationSkillsGrid: grid=" + !!grid + 
                ", selectedClassData=" + (window.selectedClassData ? window.selectedClassData.id : 'null') + 
                ", PASSIVE_SKILLS_DATA=" + (typeof PASSIVE_SKILLS_DATA !== 'undefined' ? (Array.isArray(PASSIVE_SKILLS_DATA) ? PASSIVE_SKILLS_DATA.length : typeof PASSIVE_SKILLS_DATA) : 'undefined'));

    if (!grid || !window.selectedClassData || !PASSIVE_SKILLS_DATA) return;

    const classId = window.selectedClassData.id;
    const classSkills = PASSIVE_SKILLS_DATA.filter(s => s.classId === classId);
    
    let allocated = 0;
    for (const key in window.creationAllocations) {
        allocated += window.creationAllocations[key] || 0;
    }
    if (counter) counter.innerText = `${allocated} / 3`;

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
        const rank = window.creationAllocations[skill.id] || 0;
        const iconUrl = `src/assets/skills/${skill.id}.png`;
        const activeClass = rank > 0 ? 'border-primary bg-primary/20 shadow-[0_0_8px_rgba(45,219,222,0.4)]' : 'border-outline-variant hover:border-on-surface-variant';
        
        return `
            <div data-skill-id="${skill.id}" class="create-skill-icon-box relative w-10 h-10 border-2 rounded flex items-center justify-center cursor-pointer transition-all duration-150 ${activeClass}" style="image-rendering: pixelated;">
                <img src="${iconUrl}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2FhYSI+PHBhdGggZD0iTTEyIDJDMiAyIDIgMTIgMiAxMnMxMCAxMCAxMCAxMCAxMCAxMCAxMCAxMFMyIDEyIDEyIDJ6Ii8+PC9zdmc+'" class="w-8 h-8 object-contain" />
                ${rank > 0 ? `<span class="absolute -bottom-1 -right-1 bg-primary text-background font-bold text-[9px] px-1 rounded border border-primary shadow">${rank}</span>` : ''}
            </div>
        `;
    }).join('');

    grid.querySelectorAll('.create-skill-icon-box').forEach(box => {
        const skillId = box.dataset.skillId;
        const skill = classSkills.find(s => s.id === skillId);

        box.addEventListener('mouseenter', () => {
            const rank = window.creationAllocations[skillId] || 0;
            if (tooltip) tooltip.innerHTML = `<strong>${skill.name}</strong> [Rank ${rank}/5]: ${skill.description}`;
        });

        box.addEventListener('click', () => {
            const rank = window.creationAllocations[skillId] || 0;
            if (allocated < 3 && rank < 5) {
                window.creationAllocations[skillId] = rank + 1;
            } else if (rank > 0) {
                window.creationAllocations[skillId] = rank - 1;
                if (window.creationAllocations[skillId] === 0) {
                    delete window.creationAllocations[skillId];
                }
            }
            window.renderCreationSkillsGrid();
            
            const newRank = window.creationAllocations[skillId] || 0;
            if (tooltip) tooltip.innerHTML = `<strong>${skill.name}</strong> [Rank ${newRank}/5]: ${skill.description}`;
        });
    });
};

window.setCreationStep = function(step) {
    window.creationStep = step;
    const gridSelect = document.getElementById('class-select-grid');
    const statsArea = document.getElementById('create-stats-area');
    const skillsArea = document.getElementById('create-skills-area');
    
    const btnBack = document.getElementById('btn-create-back');
    const btnPrev = document.getElementById('btn-create-prev');
    const btnNext = document.getElementById('btn-create-next');
    const btnAwaken = document.getElementById('btn-awaken');

    const headerTitle = document.querySelector('#ui-create h3');

    if (step === 1) {
        if (gridSelect) gridSelect.style.display = 'grid';
        if (statsArea) statsArea.style.display = 'flex';
        if (skillsArea) skillsArea.style.display = 'none';

        if (btnBack) btnBack.style.display = 'block';
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) btnNext.style.display = 'block';
        if (btnAwaken) btnAwaken.style.display = 'none';

        if (headerTitle) headerTitle.innerText = "CHOOSE ORIGIN";
    } else {
        if (gridSelect) gridSelect.style.display = 'none';
        if (statsArea) statsArea.style.display = 'none';
        if (skillsArea) skillsArea.style.display = 'flex';

        if (btnBack) btnBack.style.display = 'none';
        if (btnPrev) btnPrev.style.display = 'block';
        if (btnNext) btnNext.style.display = 'none';
        if (btnAwaken) btnAwaken.style.display = 'block';

        if (headerTitle) headerTitle.innerText = "SELECT PASSIVES";
        
        // Render starting passives grid
        window.renderCreationSkillsGrid();
    }
};

window.showTitleScreen = function() {
    document.getElementById('ui-create').style.display = 'none';
    document.getElementById('ui-title').style.display = 'flex';
    if (window.initTitleScreen) window.initTitleScreen();
};

window.showCreateScreen = function() {
    console.log("[DIAGNOSTIC] showCreateScreen called");
    document.getElementById('ui-title').style.display = 'none';
    document.getElementById('ui-create').style.display = 'block';
    window.setCreationStep(1);
    window.selectClass('knight');
};

window.selectClass = function(classId) {
    console.log("[DIAGNOSTIC] selectClass called with " + classId);
    const data = window.classesData[classId];
    window.selectedClassData = data;

    document.getElementById('create-class-name').innerText = data.name;
    document.getElementById('create-class-tagline').innerText = data.tagline;
    document.getElementById('create-class-desc').innerText = data.desc;
    
    const container = document.getElementById('create-class-image');
    
    if (window.currentPreviewAnim) {
        window.currentPreviewAnim.cancel();
        window.currentPreviewAnim = null;
    }

    if (data.isSheet) {
        const baseScale = 256 / data.frameHeight;
        const userScale = data.createPreviewScale || 1;
        const scale = baseScale * userScale;

        const frameWidthPx = data.frameWidth * scale;
        const frameHeightPx = data.frameHeight * scale;
        container.style.width = `${frameWidthPx}px`;
        container.style.height = `${frameHeightPx}px`;

        container.style.position = 'absolute';
        container.style.left = '50%';
        container.style.transform = `translateX(-50%) ${data.flipX ? 'scaleX(-1)' : ''}`;
        
        const raiseAmount = (data.previewOffsetY || 0);
        container.style.bottom = `${raiseAmount}px`;
        container.style.top = 'auto';

        container.style.backgroundImage = 'none';
        container.style.backgroundRepeat = 'no-repeat';
        container.style.imageRendering = 'pixelated';
        
        const tempImg = new Image();
        tempImg.src = data.image;
        tempImg.onload = () => {
            const currentContainer = document.getElementById('create-class-image');
            if (!currentContainer || currentContainer !== container) return;
            container.style.backgroundSize = `${tempImg.width * scale}px ${tempImg.height * scale}px`;
            container.style.backgroundImage = `url('${data.image}')`;
            
            const rowOffset = (data.idleRow || 0) * frameHeightPx;
            
            window.currentPreviewAnim = container.animate([
                { backgroundPosition: `0px ${-rowOffset}px` },
                { backgroundPosition: `${-(data.idleFrames * frameWidthPx)}px ${-rowOffset}px` }
            ], {
                duration: data.idleFrames * 150,
                easing: `steps(${data.idleFrames}, end)`,
                iterations: Infinity
            });
        };
        container.style.backgroundSize = 'auto';
        container.innerHTML = '';
    } else {
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

    const maxStat = 20;
    const updateStat = (stat, val) => {
        document.getElementById(`stat-${stat}-val`).innerText = val;
        document.getElementById(`stat-${stat}-bar`).style.width = `${(val / maxStat) * 100}%`;
    };
    updateStat('vit', data.stats.vit);
    updateStat('str', data.stats.str);
    updateStat('dex', data.stats.dex);
    updateStat('int', data.stats.int);

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

    window.creationAllocations = {};
    window.renderCreationSkillsGrid();
};
