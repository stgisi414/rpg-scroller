class SpriteDebugger {
    constructor(scene) {
        this.scene = scene;
    }

    createDebugPanel() {
        if (document.getElementById('debug-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.style.cssText = 'display: none; position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; z-index: 9999; width: 400px; height: 90vh; overflow-y: auto; font-family: monospace; font-size: 12px;';

        let html = '<div style="display:flex; justify-content:space-between; align-items:center;">';
        html += '<h3 style="margin:0;">Sprite Debugger</h3>';
        html += '<button id="debug-close" style="background:#cc0000; color:white; border:none; padding:2px 6px; cursor:pointer; font-weight:bold;">X</button>';
        html += '</div>';
        html += '<div style="margin-bottom: 10px; font-size: 10px; color: #aaa;">Press ` (backtick) to toggle</div>';
        html += '<select id="debug-sprite" style="width: 100%; margin-bottom: 10px; color: black; background: white;">';
        ['house_inside_tiles', 'summon_angel', 'npc_male_skin1', 'npc_female_skin1'].forEach(key => {
            html += `<option value="${key}">${key}</option>`;
        });
        html += '</select>';
        html += '<div id="debug-weapon-row" style="display: none; margin-bottom: 10px; flex-direction: column; gap: 4px;">';
        html += '<label style="font-size: 11px; color: #aaa;">Overlay Weapon:</label>';
        html += '<select id="debug-weapon" style="width: 100%; color: black; background: white;"></select>';
        html += '</div>';

        html += '<div style="position: relative; overflow: auto; width: 100%; height: 200px; border: 1px solid #444; margin-bottom: 10px;">';
        html += '<canvas id="debug-canvas" width="1024" height="512"></canvas>';
        html += '<div id="debug-hover-info" style="position: absolute; top: 5px; left: 5px; background: rgba(0,0,0,0.8); color: #fff; padding: 3px 6px; font-weight: bold; font-size: 11px; border-radius: 4px; pointer-events: none; display: none;"></div>';
        html += '</div>';

        html += '<div id="debug-controls"></div>';

        html += '<button id="debug-apply" style="margin-top: 10px; width: 100%; padding: 8px; background: #00aa00; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;">Apply & Restart</button>';

        panel.innerHTML = html;
        document.body.appendChild(panel);

        const canvas = document.getElementById('debug-canvas');
        const ctx = canvas.getContext('2d');
        const select = document.getElementById('debug-sprite');
        const controls = document.getElementById('debug-controls');

        let activeEditCols = null;

        if (!window.sliceColData) {
            try {
                const saved = localStorage.getItem('sprite_slice_coldata');
                window.sliceColData = saved ? JSON.parse(saved) : {};
            } catch(e) { window.sliceColData = {}; }
        }
        if (!window.debugMode) window.debugMode = 'rows';
        if (!window.debugColRow) window.debugColRow = 'all';

        const getDefaultCols = (key) => {
            if (key === 'house_inside_tiles') {
                const arr = [];
                for (let c = 0; c < 14; c++) arr.push({ x: c * 32, w: 32 });
                return arr;
            }
            if (key === 'summon_angel') {
                const arr = [];
                for (let c = 0; c < 10; c++) arr.push({ x: c * 96, w: 96 });
                return arr;
            }
            if (key.startsWith('npc_male') || key.startsWith('npc_female')) {
                const arr = [];
                for (let c = 0; c < 8; c++) arr.push({ x: c * 100, w: 100 });
                return arr;
            }
            const colW = 102;
            const count = 10;
            const arr = [];
            for (let c = 0; c < count; c++) arr.push({ x: c * colW, w: colW });
            return arr;
        };

        const renderControls = () => {
            const key = select.value;
            let rowData = window.sliceData[key];
            if (!rowData || (key === 'summon_angel' && rowData.length !== 1)) {
                if (key === 'house_inside_tiles') {
                    rowData = window.sliceData[key] = [];
                    for (let r = 0; r < 13; r++) rowData.push({ y: r * 32, h: 32 });
                } else if (key === 'skeleton' || key === 'frost_giant') {
                    rowData = window.sliceData[key] = [
                        { y: 0, h: 128 }, { y: 128, h: 128 }, { y: 256, h: 128 }, { y: 384, h: 128 }
                    ];
                } else if (key === 'summon_angel') {
                    rowData = window.sliceData[key] = [
                        { y: 0, h: 96 }
                    ];
                } else if (key.startsWith('npc_male') || key.startsWith('npc_female')) {
                    rowData = window.sliceData[key] = [];
                    for (let r = 0; r < 7; r++) {
                        const h = (r === 3) ? 60 : 64;
                        rowData.push({ y: r * 64, h: h });
                    }
                } else {
                    rowData = window.sliceData[key] = [
                        { y: 0, h: 85 }, { y: 85, h: 85 }, { y: 170, h: 85 }, { y: 255, h: 85 }, { y: 340, h: 85 }, { y: 425, h: 87 }
                    ];
                }
            }
            let colData = window.sliceColData[key];
            if (!colData) colData = window.sliceColData[key] = getDefaultCols(key);

            const colRow = window.debugColRow || 'all';
            if (colRow !== 'all') {
                const overrideKey = key + '_r' + colRow;
                if (!window.sliceColData[overrideKey]) {
                    window.sliceColData[overrideKey] = JSON.parse(JSON.stringify(colData));
                }
                activeEditCols = window.sliceColData[overrideKey];
            } else {
                activeEditCols = colData;
            }

            const mode = window.debugMode;
            let html = '';

            html += `<div style="margin-bottom: 8px; padding: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; display:flex; gap:15px; align-items:center;">`;
            html += `<label style="cursor:pointer;"><input type="radio" name="debug-mode" value="rows" ${mode === 'rows' ? 'checked' : ''} style="margin-right:4px;">Rows (${rowData.length})</label>`;
            html += `<label style="cursor:pointer;"><input type="radio" name="debug-mode" value="cols" ${mode === 'cols' ? 'checked' : ''} style="margin-right:4px;">Columns (${activeEditCols.length})</label>`;
            html += `<button id="debug-add" style="margin-left:auto; padding:2px 8px; background:#0077cc; color:white; border:none; cursor:pointer; border-radius:3px; font-size:11px;">+ Add</button>`;
            html += `<button id="debug-remove" style="padding:2px 8px; background:#cc3300; color:white; border:none; cursor:pointer; border-radius:3px; font-size:11px;">− Remove</button>`;
            html += `</div>`;

            if (mode === 'rows') {
                for (let r = 0; r < rowData.length; r++) {
                    html += `<div style="margin-bottom: 5px; border-bottom: 1px solid #444; padding-bottom: 5px;">`;
                    html += `<b>Row ${r}</b><br>`;
                    html += `Y: <input type="number" id="debug-${key}-r${r}-y" value="${rowData[r].y}" style="width: 60px; color: black; background: white;"> `;
                    html += `H: <input type="number" id="debug-${key}-r${r}-h" value="${rowData[r].h}" style="width: 60px; color: black; background: white;">`;
                    html += `</div>`;
                }
            } else {
                html += `<div style="margin-bottom: 8px; padding: 4px 6px; background: rgba(255,255,255,0.05); border-radius: 3px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">`;
                html += `<span style="font-size:11px; color:#aaa;">Cols for:</span>`;
                html += `<select id="debug-col-row" style="color:black; background:white; font-size:11px; padding:2px;">`;
                html += `<option value="all" ${colRow === 'all' ? 'selected' : ''}>All rows (default)</option>`;
                for (let r = 0; r < rowData.length; r++) {
                    const hasOverride = !!window.sliceColData[key + '_r' + r];
                    html += `<option value="${r}" ${colRow == r ? 'selected' : ''}>Row ${r}${hasOverride ? ' ★' : ''}</option>`;
                }
                html += `</select>`;
                if (colRow !== 'all') {
                    html += `<button id="debug-clear-override" style="padding:2px 6px; background:#cc6600; color:white; border:none; cursor:pointer; border-radius:3px; font-size:10px;">Clear Override</button>`;
                    html += `<span style="font-size:10px; color:#6f6;">(override active)</span>`;
                }
                html += `</div>`;

                for (let c = 0; c < activeEditCols.length; c++) {
                    html += `<div style="margin-bottom: 5px; border-bottom: 1px solid #444; padding-bottom: 5px;">`;
                    html += `<b>Col ${c}</b><br>`;
                    html += `X: <input type="number" id="debug-${key}-c${c}-x" value="${activeEditCols[c].x}" style="width: 60px; color: black; background: white;"> `;
                    html += `W: <input type="number" id="debug-${key}-c${c}-w" value="${activeEditCols[c].w}" style="width: 60px; color: black; background: white;">`;
                    html += `</div>`;
                }
            }

            controls.innerHTML = html;

            document.querySelectorAll('input[name="debug-mode"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    window.debugMode = e.target.value;
                    renderControls();
                });
            });

            const colRowSelect = document.getElementById('debug-col-row');
            if (colRowSelect) {
                colRowSelect.addEventListener('change', (e) => {
                    window.debugColRow = e.target.value;
                    renderControls();
                });
            }

            const clearBtn = document.getElementById('debug-clear-override');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    delete window.sliceColData[key + '_r' + colRow];
                    window.debugColRow = 'all';
                    renderControls();
                });
            }

            document.getElementById('debug-add').addEventListener('click', () => {
                if (mode === 'rows') {
                    const last = rowData[rowData.length - 1];
                    rowData.push({ y: last.y + last.h, h: last.h });
                } else {
                    const last = activeEditCols[activeEditCols.length - 1];
                    activeEditCols.push({ x: last.x + last.w, w: last.w });
                }
                renderControls();
            });

            document.getElementById('debug-remove').addEventListener('click', () => {
                if (mode === 'rows' && rowData.length > 1) rowData.pop();
                else if (mode === 'cols' && activeEditCols.length > 1) activeEditCols.pop();
                renderControls();
            });

            if (mode === 'rows') {
                for (let r = 0; r < rowData.length; r++) {
                    document.getElementById(`debug-${key}-r${r}-y`).addEventListener('input', updateData);
                    document.getElementById(`debug-${key}-r${r}-h`).addEventListener('input', updateData);
                }
            } else {
                for (let c = 0; c < activeEditCols.length; c++) {
                    const cx = document.getElementById(`debug-${key}-c${c}-x`);
                    const cw = document.getElementById(`debug-${key}-c${c}-w`);
                    cx.addEventListener('input', () => { activeEditCols[c].x = parseInt(cx.value) || 0; drawCanvas(); });
                    cw.addEventListener('input', () => { activeEditCols[c].w = parseInt(cw.value) || 0; drawCanvas(); });
                }
            }

            document.getElementById('debug-apply').addEventListener('click', () => {
                localStorage.setItem('sprite_slice_data', JSON.stringify(window.sliceData));
                localStorage.setItem('sprite_slice_coldata', JSON.stringify(window.sliceColData));
                const btn = document.getElementById('debug-apply');
                btn.textContent = '✓ Restarting...';
                btn.style.background = '#006600';
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            });

            drawCanvas();
        };

        const updateData = () => {
            const key = select.value;
            const data = window.sliceData[key];
            if (!data) return;
            for (let r = 0; r < data.length; r++) {
                const yElem = document.getElementById(`debug-${key}-r${r}-y`);
                const hElem = document.getElementById(`debug-${key}-r${r}-h`);
                if (yElem) data[r].y = parseInt(yElem.value) || 0;
                if (hElem) data[r].h = parseInt(hElem.value) || 0;
            }
            drawCanvas();
        };

        const drawCanvas = () => {
            const key = select.value;
            let img = null;
            if (key === 'house_inside_tiles') img = this.scene.registry.get('debug_tex_house_tiles');
            if (key === 'summon_angel') img = this.scene.registry.get('debug_tex_summon_angel');

            if (!img && this.scene.textures.exists(key)) {
                img = this.scene.textures.get(key).getSourceImage();
            }

            const weaponSelectElem = document.getElementById('debug-weapon');
            const weaponKey = weaponSelectElem ? weaponSelectElem.value : '';
            let weaponImg = null;
            if (weaponKey && this.scene.textures.exists(weaponKey)) {
                weaponImg = this.scene.textures.get(weaponKey).getSourceImage();
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (img && img.src) {
                try { ctx.drawImage(img, 0, 0); } catch(e) { console.warn("Failed to draw image to debug canvas", e); }
            }
            if (weaponImg && weaponImg.src) {
                try { ctx.drawImage(weaponImg, 0, 0); } catch(e) { console.warn("Failed to draw weapon overlay to debug canvas", e); }
            }

            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            const data = window.sliceData[key];
            if (data) {
                for (let r = 0; r < data.length; r++) {
                    const rowY = data[r].y;
                    const rowH = data[r].h;

                    if (dragState.active && dragState.row === r) {
                        ctx.strokeStyle = 'yellow';
                        ctx.lineWidth = 2;
                    } else {
                        ctx.strokeStyle = 'red';
                        ctx.lineWidth = 1;
                    }

                    ctx.strokeRect(0, rowY, 1024, rowH);

                    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                    ctx.fillRect(0, rowY, 1024, rowH);

                    ctx.fillStyle = 'white';
                    ctx.font = '16px monospace';
                    ctx.fillText(`ROW ${r}`, 10, rowY + 20);

                    const overrideKey = key + '_r' + r;
                    const rowCols = window.sliceColData[overrideKey] || window.sliceColData[key];
                    if (rowCols) {
                        const isOverride = !!window.sliceColData[overrideKey];
                        ctx.strokeStyle = isOverride
                            ? 'rgba(0, 255, 100, 0.9)'
                            : 'rgba(0, 150, 255, 0.9)';
                        ctx.lineWidth = 1.5;
                        for (let c = 0; c < rowCols.length; c++) {
                            ctx.strokeRect(rowCols[c].x, rowY, rowCols[c].w, rowH);
                        }
                        if (isOverride) {
                            ctx.fillStyle = 'rgba(0, 255, 100, 0.7)';
                            ctx.font = '10px monospace';
                            ctx.fillText(`${rowCols.length} cols`, rowCols[0].x + 2, rowY + rowH - 3);
                        }
                    }
                    ctx.strokeStyle = 'red';
                }
            }
        };

        let dragState = { active: false, axis: null, idx: -1, edge: null, startPos: 0, startVal: 0, startSize: 0 };

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            const key = select.value;
            const rowData = window.sliceData[key];

            if (activeEditCols) {
                for (let c = activeEditCols.length - 1; c >= 0; c--) {
                    const colX = activeEditCols[c].x;
                    const colRight = activeEditCols[c].x + activeEditCols[c].w;
                    if (Math.abs(mx - colX) < 10) {
                        dragState = { active: true, axis: 'col', idx: c, edge: 'left', startPos: mx, startVal: colX, startSize: activeEditCols[c].w };
                        return;
                    }
                    if (Math.abs(mx - colRight) < 10) {
                        dragState = { active: true, axis: 'col', idx: c, edge: 'right', startPos: mx, startVal: colX, startSize: activeEditCols[c].w };
                        return;
                    }
                }
            }

            if (rowData) {
                for (let r = rowData.length - 1; r >= 0; r--) {
                    const rowY = rowData[r].y;
                    const rowBottom = rowData[r].y + rowData[r].h;
                    if (Math.abs(my - rowY) < 10) {
                        dragState = { active: true, axis: 'row', idx: r, edge: 'top', startPos: my, startVal: rowY, startSize: rowData[r].h };
                        return;
                    }
                    if (Math.abs(my - rowBottom) < 10) {
                        dragState = { active: true, axis: 'row', idx: r, edge: 'bottom', startPos: my, startVal: rowY, startSize: rowData[r].h };
                        return;
                    }
                }
                for (let r = rowData.length - 1; r >= 0; r--) {
                    const rowY = rowData[r].y;
                    const rowBottom = rowData[r].y + rowData[r].h;
                    if (my >= rowY + 10 && my <= rowBottom - 10) {
                        dragState = { active: true, axis: 'row', idx: r, edge: 'middle', startPos: my, startVal: rowY, startSize: rowData[r].h };
                        return;
                    }
                }
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            const key = select.value;
            const rowData = window.sliceData[key];

            if (dragState.active) {
                const i = dragState.idx;
                if (dragState.axis === 'row') {
                    const dy = my - dragState.startPos;
                    if (dragState.edge === 'top') {
                        rowData[i].y = Math.round(dragState.startVal + dy);
                        rowData[i].h = Math.round(dragState.startSize - dy);
                    } else if (dragState.edge === 'bottom') {
                        rowData[i].h = Math.round(dragState.startSize + dy);
                    } else {
                        rowData[i].y = Math.round(dragState.startVal + dy);
                    }
                    const yInput = document.getElementById(`debug-${key}-r${i}-y`);
                    const hInput = document.getElementById(`debug-${key}-r${i}-h`);
                    if (yInput) yInput.value = rowData[i].y;
                    if (hInput) hInput.value = rowData[i].h;
                } else if (dragState.axis === 'col' && activeEditCols) {
                    const dx = mx - dragState.startPos;
                    if (dragState.edge === 'left') {
                        activeEditCols[i].x = Math.round(dragState.startVal + dx);
                        activeEditCols[i].w = Math.round(dragState.startSize - dx);
                    } else if (dragState.edge === 'right') {
                        activeEditCols[i].w = Math.round(dragState.startSize + dx);
                    }
                    const xInput = document.getElementById(`debug-${key}-c${i}-x`);
                    const wInput = document.getElementById(`debug-${key}-c${i}-w`);
                    if (xInput) xInput.value = activeEditCols[i].x;
                    if (wInput) wInput.value = activeEditCols[i].w;
                }
                drawCanvas();
            } else {
                let cursor = 'default';
                if (activeEditCols) {
                    for (let c = 0; c < activeEditCols.length; c++) {
                        if (Math.abs(mx - activeEditCols[c].x) < 10 || Math.abs(mx - (activeEditCols[c].x + activeEditCols[c].w)) < 10) {
                            cursor = 'ew-resize'; break;
                        }
                    }
                }
                if (cursor === 'default' && rowData) {
                    for (let r = 0; r < rowData.length; r++) {
                        if (Math.abs(my - rowData[r].y) < 10 || Math.abs(my - (rowData[r].y + rowData[r].h)) < 10) {
                            cursor = 'ns-resize'; break;
                        }
                    }
                }
                canvas.style.cursor = cursor;

                let hoveredRow = -1;
                let hoveredCol = -1;
                if (rowData) {
                    for (let r = 0; r < rowData.length; r++) {
                        if (my >= rowData[r].y && my <= rowData[r].y + rowData[r].h) {
                            hoveredRow = r; break;
                        }
                    }
                }
                if (hoveredRow !== -1) {
                    const hoverOverrideKey = key + '_r' + hoveredRow;
                    const hoverCols = window.sliceColData[hoverOverrideKey] || window.sliceColData[key];
                    if (hoverCols) {
                        for (let c = 0; c < hoverCols.length; c++) {
                            if (mx >= hoverCols[c].x && mx <= hoverCols[c].x + hoverCols[c].w) {
                                hoveredCol = c; break;
                            }
                        }
                    }
                }

                const hoverInfo = document.getElementById('debug-hover-info');
                if (hoverInfo) {
                    if (hoveredRow !== -1 && hoveredCol !== -1) {
                        hoverInfo.style.display = 'block';
                        const hoverOverrideKey = key + '_r' + hoveredRow;
                        const isOverride = !!window.sliceColData[hoverOverrideKey];
                        hoverInfo.innerText = `Row ${hoveredRow}, Col ${hoveredCol}${isOverride ? ' (override)' : ''}`;
                    } else {
                        hoverInfo.style.display = 'none';
                    }
                }
            }
        });

        canvas.addEventListener('mouseleave', () => {
            const hoverInfo = document.getElementById('debug-hover-info');
            if (hoverInfo) hoverInfo.style.display = 'none';
        });

        if (this.scene._debugMouseUpListener) {
            window.removeEventListener('mouseup', this.scene._debugMouseUpListener);
        }
        this.scene._debugMouseUpListener = () => {
            if (dragState.active) {
                dragState.active = false;
                drawCanvas();
            }
        };
        window.addEventListener('mouseup', this.scene._debugMouseUpListener);

        const weaponNames = [
            { name: 'None', suffix: '' },
            { name: 'Basket', suffix: 'basket' },
            { name: 'Bronze Axe', suffix: 'bronze_axe' },
            { name: 'Bronze Pickaxe', suffix: 'bronze_pickaxe' },
            { name: 'Bronze Sword', suffix: 'bronze_sword' },
            { name: 'Diamond Axe', suffix: 'diamond_axe' },
            { name: 'Diamond Pickaxe', suffix: 'diamond_pickaxe' },
            { name: 'Diamond Sword', suffix: 'diamond_sword' },
            { name: 'Flower', suffix: 'flower' },
            { name: 'Golden Axe', suffix: 'golden_axe' },
            { name: 'Golden Pickaxe', suffix: 'golden_pickaxe' },
            { name: 'Golden Sword', suffix: 'golden_sword' },
            { name: 'Hoe', suffix: 'hoe' },
            { name: 'Iron Axe', suffix: 'iron_axe' },
            { name: 'Iron Pickaxe', suffix: 'iron_pickaxe' },
            { name: 'Iron Sword', suffix: 'iron_sword' },
            { name: 'Stick', suffix: 'stick' },
            { name: 'Wooden Axe', suffix: 'wooden_axe' },
            { name: 'Wooden Pickaxe', suffix: 'wooden_pickaxe' },
            { name: 'Wooden Sword', suffix: 'wooden_sword' }
        ];

        const updateWeaponOverlayVisibility = () => {
            const key = select.value;
            const row = document.getElementById('debug-weapon-row');
            const weaponSelect = document.getElementById('debug-weapon');
            if (key.startsWith('npc_male') || key.startsWith('npc_female')) {
                if (row) row.style.display = 'flex';
                if (weaponSelect) {
                    weaponSelect.innerHTML = '';
                    const isMale = key.startsWith('npc_male');
                    weaponNames.forEach(w => {
                        const opt = document.createElement('option');
                        opt.value = w.suffix ? `mod_${w.suffix}_${isMale ? 'm' : 'f'}` : '';
                        opt.textContent = w.name;
                        weaponSelect.appendChild(opt);
                    });
                }
            } else {
                if (row) row.style.display = 'none';
                if (weaponSelect) weaponSelect.innerHTML = '';
            }
        };

        select.addEventListener('change', () => {
            window.debugColRow = 'all';
            updateWeaponOverlayVisibility();
            renderControls();
            updateData();
        });

        const weaponSelect = document.getElementById('debug-weapon');
        if (weaponSelect) {
            weaponSelect.addEventListener('change', () => {
                drawCanvas();
            });
        }

        document.getElementById('debug-close').addEventListener('click', () => {
            panel.style.display = 'none';
        });

        if (!window._debugKeyBound) {
            window._debugKeyBound = true;
            this.scene._debugKeyDownListener = (e) => {
                if (e.key === '`' || e.key === '~') {
                    const p = document.getElementById('debug-panel');
                    if (p) {
                        p.style.display = p.style.display === 'none' ? 'block' : 'none';
                    }
                }
            };
            document.addEventListener('keydown', this.scene._debugKeyDownListener);
        }

        updateWeaponOverlayVisibility();
        renderControls();
        updateData();
    }
}
