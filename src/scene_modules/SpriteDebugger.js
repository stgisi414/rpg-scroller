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
        ['lich_lord', 'skeleton', 'the_devil', 'frost_giant', 'house_inside_tiles'].forEach(key => {
            html += `<option value="${key}">${key}</option>`;
        });
        html += '</select>';
        
        html += '<div style="position: relative; overflow: auto; width: 100%; height: 200px; border: 1px solid #444; margin-bottom: 10px;">';
        html += '<canvas id="debug-canvas" width="1024" height="512"></canvas>';
        html += '<div id="debug-hover-info" style="position: absolute; top: 5px; left: 5px; background: rgba(0,0,0,0.8); color: #fff; padding: 3px 6px; font-weight: bold; font-size: 11px; border-radius: 4px; pointer-events: none; display: none;"></div>';
        html += '</div>';

        html += '<div id="debug-controls"></div>';
        
        html += '<button id="debug-apply" style="width: 100%; padding: 5px; margin-top: 10px;">Apply & Restart</button>';
        
        panel.innerHTML = html;
        document.body.appendChild(panel);

        const canvas = document.getElementById('debug-canvas');
        const ctx = canvas.getContext('2d');
        const select = document.getElementById('debug-sprite');
        const controls = document.getElementById('debug-controls');
        
        // Store per-sprite column slice data
        if (!window.sliceColData) {
            try {
                const saved = localStorage.getItem('sprite_slice_coldata');
                window.sliceColData = saved ? JSON.parse(saved) : {};
            } catch(e) { window.sliceColData = {}; }
        }
        // Force reset the cached slices for house_inside_tiles so the 32x32 grid applies
        delete window.sliceColData['house_inside_tiles'];
        if (window.sliceData) delete window.sliceData['house_inside_tiles'];
        // Track which mode the debugger is in
        if (!window.debugMode) window.debugMode = 'rows';

        const getDefaultCols = (key) => {
            if (key === 'house_inside_tiles') {
                const arr = [];
                for (let c = 0; c < 14; c++) arr.push({ x: c * 32, w: 32 });
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
            if (!rowData) {
                if (key === 'house_inside_tiles') {
                    rowData = window.sliceData[key] = [];
                    for (let r = 0; r < 13; r++) rowData.push({ y: r * 32, h: 32 });
                } else {
                    rowData = window.sliceData[key] = [
                        { y: 0, h: 85 }, { y: 85, h: 85 }, { y: 170, h: 85 }, { y: 255, h: 85 }, { y: 340, h: 85 }, { y: 425, h: 87 }
                    ];
                }
            }
            let colData = window.sliceColData[key];
            if (!colData) colData = window.sliceColData[key] = getDefaultCols(key);

            const mode = window.debugMode;
            let html = '';

            // Radio buttons
            html += `<div style="margin-bottom: 8px; padding: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; display:flex; gap:15px; align-items:center;">`;
            html += `<label style="cursor:pointer;"><input type="radio" name="debug-mode" value="rows" ${mode === 'rows' ? 'checked' : ''} style="margin-right:4px;">Rows (${rowData.length})</label>`;
            html += `<label style="cursor:pointer;"><input type="radio" name="debug-mode" value="cols" ${mode === 'cols' ? 'checked' : ''} style="margin-right:4px;">Columns (${colData.length})</label>`;
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
                for (let c = 0; c < colData.length; c++) {
                    html += `<div style="margin-bottom: 5px; border-bottom: 1px solid #444; padding-bottom: 5px;">`;
                    html += `<b>Col ${c}</b><br>`;
                    html += `X: <input type="number" id="debug-${key}-c${c}-x" value="${colData[c].x}" style="width: 60px; color: black; background: white;"> `;
                    html += `W: <input type="number" id="debug-${key}-c${c}-w" value="${colData[c].w}" style="width: 60px; color: black; background: white;">`;
                    html += `</div>`;
                }
            }

            html += `<button id="debug-apply" style="margin-top: 10px; width: 100%; padding: 8px; background: #00aa00; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;">Apply & Save</button>`;
            controls.innerHTML = html;

            // Radio change handler
            document.querySelectorAll('input[name="debug-mode"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    window.debugMode = e.target.value;
                    renderControls();
                });
            });

            // Add button
            document.getElementById('debug-add').addEventListener('click', () => {
                if (mode === 'rows') {
                    const last = rowData[rowData.length - 1];
                    rowData.push({ y: last.y + last.h, h: last.h });
                } else {
                    const last = colData[colData.length - 1];
                    colData.push({ x: last.x + last.w, w: last.w });
                }
                renderControls();
            });

            // Remove button
            document.getElementById('debug-remove').addEventListener('click', () => {
                if (mode === 'rows' && rowData.length > 1) rowData.pop();
                else if (mode === 'cols' && colData.length > 1) colData.pop();
                renderControls();
            });

            // Input handlers
            if (mode === 'rows') {
                for (let r = 0; r < rowData.length; r++) {
                    document.getElementById(`debug-${key}-r${r}-y`).addEventListener('input', updateData);
                    document.getElementById(`debug-${key}-r${r}-h`).addEventListener('input', updateData);
                }
            } else {
                for (let c = 0; c < colData.length; c++) {
                    const cx = document.getElementById(`debug-${key}-c${c}-x`);
                    const cw = document.getElementById(`debug-${key}-c${c}-w`);
                    cx.addEventListener('input', () => { colData[c].x = parseInt(cx.value) || 0; drawCanvas(); });
                    cw.addEventListener('input', () => { colData[c].w = parseInt(cw.value) || 0; drawCanvas(); });
                }
            }

            // Apply & Save
            document.getElementById('debug-apply').addEventListener('click', () => {
                localStorage.setItem('sprite_slice_data', JSON.stringify(window.sliceData));
                localStorage.setItem('sprite_slice_coldata', JSON.stringify(window.sliceColData));
                const btn = document.getElementById('debug-apply');
                btn.textContent = '✓ Saved!';
                btn.style.background = '#006600';
                setTimeout(() => { btn.textContent = 'Apply & Save'; btn.style.background = '#00aa00'; }, 1500);
            });

            drawCanvas();
        };

        const updateData = () => {
            const key = select.value;
            const data = window.sliceData[key];
            if (!data) return;
            for (let r = 0; r < data.length; r++) {
                data[r].y = parseInt(document.getElementById(`debug-${key}-r${r}-y`).value) || 0;
                data[r].h = parseInt(document.getElementById(`debug-${key}-r${r}-h`).value) || 0;
            }
            drawCanvas();
        };

        const drawCanvas = () => {
            const key = select.value;
            let img = null;
            if (key === 'lich_lord') img = this.scene.registry.get('debug_tex_lich');
            if (key === 'skeleton') img = this.scene.registry.get('debug_tex_skeleton');
            if (key === 'the_devil') img = this.scene.registry.get('debug_tex_devil');
            if (key === 'frost_giant') img = this.scene.registry.get('debug_tex_frost_giant');
            if (key === 'house_inside_tiles') img = this.scene.registry.get('debug_tex_house_tiles');
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (img && img.src) {
                try { ctx.drawImage(img, 0, 0); } catch(e) { console.warn("Failed to draw image to debug canvas", e); }
            }
            
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 1;
            const data = window.sliceData[key];
            if (data) {
                for (let r = 0; r < data.length; r++) {
                    const rowY = data[r].y;
                    const rowH = data[r].h;
                    
                    // Highlight the edge if we are hovering or dragging it
                    if (dragState.active && dragState.row === r) {
                        ctx.strokeStyle = 'yellow';
                        ctx.lineWidth = 2;
                    } else {
                        ctx.strokeStyle = 'red';
                        ctx.lineWidth = 1;
                    }
                    
                    // Draw bounding box for the entire row
                    ctx.strokeRect(0, rowY, 1024, rowH);
                    
                    // Fill the box lightly so it's obvious it's a box
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                    ctx.fillRect(0, rowY, 1024, rowH);
                    
                    // Label the row
                    ctx.fillStyle = 'white';
                    ctx.font = '16px monospace';
                    ctx.fillText(`ROW ${r}`, 10, rowY + 20);
                    
                    // Draw vertical guides for the columns
                    const colData = window.sliceColData[key];
                    if (colData) {
                        ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)';
                        ctx.lineWidth = 1.5;
                        for (let c = 0; c < colData.length; c++) {
                            ctx.strokeRect(colData[c].x, rowY, colData[c].w, rowH);
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
            const colData = window.sliceColData[key];
            
            // Check column edges first (left/right)
            if (colData) {
                for (let c = colData.length - 1; c >= 0; c--) {
                    const colX = colData[c].x;
                    const colRight = colData[c].x + colData[c].w;
                    if (Math.abs(mx - colX) < 10) {
                        dragState = { active: true, axis: 'col', idx: c, edge: 'left', startPos: mx, startVal: colX, startSize: colData[c].w };
                        return;
                    }
                    if (Math.abs(mx - colRight) < 10) {
                        dragState = { active: true, axis: 'col', idx: c, edge: 'right', startPos: mx, startVal: colX, startSize: colData[c].w };
                        return;
                    }
                }
            }
            
            // Check row edges (top/bottom)
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
                // Middle drag for rows
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
            const colData = window.sliceColData[key];
            
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
                } else if (dragState.axis === 'col') {
                    const dx = mx - dragState.startPos;
                    if (dragState.edge === 'left') {
                        colData[i].x = Math.round(dragState.startVal + dx);
                        colData[i].w = Math.round(dragState.startSize - dx);
                    } else if (dragState.edge === 'right') {
                        colData[i].w = Math.round(dragState.startSize + dx);
                    }
                    const xInput = document.getElementById(`debug-${key}-c${i}-x`);
                    const wInput = document.getElementById(`debug-${key}-c${i}-w`);
                    if (xInput) xInput.value = colData[i].x;
                    if (wInput) wInput.value = colData[i].w;
                }
                drawCanvas();
            } else {
                // Cursor hints
                let cursor = 'default';
                if (colData) {
                    for (let c = 0; c < colData.length; c++) {
                        if (Math.abs(mx - colData[c].x) < 10 || Math.abs(mx - (colData[c].x + colData[c].w)) < 10) {
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

                // Update hover info display
                let hoveredRow = -1;
                let hoveredCol = -1;
                if (rowData) {
                    for (let r = 0; r < rowData.length; r++) {
                        if (my >= rowData[r].y && my <= rowData[r].y + rowData[r].h) {
                            hoveredRow = r; break;
                        }
                    }
                }
                if (colData) {
                    for (let c = 0; c < colData.length; c++) {
                        if (mx >= colData[c].x && mx <= colData[c].x + colData[c].w) {
                            hoveredCol = c; break;
                        }
                    }
                }
                
                const hoverInfo = document.getElementById('debug-hover-info');
                if (hoverInfo) {
                    if (hoveredRow !== -1 && hoveredCol !== -1) {
                        hoverInfo.style.display = 'block';
                        hoverInfo.innerText = `Row ${hoveredRow}, Col ${hoveredCol}`;
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

        select.addEventListener('change', () => {
            renderControls();
            updateData();
        });

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

        renderControls();
        updateData();
    }
}
