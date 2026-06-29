class CutsceneController {
    constructor(scene) {
        this.scene = scene;
        this.dialogueQueue = [];
        this.currentIndex = 0;
        this.isTyping = false;
        this.currentLineText = "";
        this.typingInterval = null;
        this.onCompleteCallback = null;
        this.keyHandler = null;
    }

    playCutscene(lines, onComplete) {
        this.cancelCutscene();
        this.scene.isCutscene = true;
        
        // Pause physics securely if possible
        if (this.scene.physics && this.scene.physics.pause) {
            this.scene.physics.pause();
        }
        
        // Normalize input: can be a single string, an array of strings, or an array of objects
        if (typeof lines === 'string') {
            this.dialogueQueue = [{ speaker: "Narrator", text: lines }];
        } else if (Array.isArray(lines)) {
            this.dialogueQueue = lines.map(line => {
                if (typeof line === 'string') {
                    return { speaker: "Narrator", text: line };
                }
                return line; // already { speaker, text, portrait, side }
            });
        } else {
            this.dialogueQueue = [{ speaker: "Narrator", text: String(lines) }];
        }
        
        this.currentIndex = 0;
        this.onCompleteCallback = onComplete;
        
        const overlay = document.getElementById('cutscene-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            // Trigger reflow
            void overlay.offsetWidth;
            overlay.style.opacity = '1';
            
            // Set up click advance on the bottom bar/overlay
            overlay.style.cursor = 'pointer';
            overlay.onclick = (e) => {
                e.stopPropagation();
                this.advanceCutscene();
            };
            
            // Set up keyboard listener (Space/Enter to advance)
            this.keyHandler = (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    this.advanceCutscene();
                }
            };
            window.addEventListener('keydown', this.keyHandler);
            
            this.showLine();
        } else {
            this.cancelCutscene();
            if (onComplete) onComplete();
        }
    }

    showLine() {
        if (this.currentIndex >= this.dialogueQueue.length) {
            this.finishCutscene();
            return;
        }

        if (this.typingInterval) clearInterval(this.typingInterval);
        
        const line = this.dialogueQueue[this.currentIndex];
        this.currentLineText = line.text;
        this.isTyping = true;
        
        const textContainer = document.getElementById('cutscene-text');
        const nameplate = document.getElementById('cutscene-nameplate');
        const portLeft = document.getElementById('cutscene-portrait-left');
        const portRight = document.getElementById('cutscene-portrait-right');
        const canvasLeft = document.getElementById('cutscene-canvas-left');
        const canvasRight = document.getElementById('cutscene-canvas-right');
        
        if (nameplate) {
            nameplate.innerText = line.speaker || "";
            nameplate.style.display = line.speaker ? 'block' : 'none';
        }
        
        // Reset portrait states
        if (portLeft) {
            portLeft.style.display = 'none';
            portLeft.style.opacity = '0';
            portLeft.style.transform = 'translateX(-50px)';
        }
        if (portRight) {
            portRight.style.display = 'none';
            portRight.style.opacity = '0';
            portRight.style.transform = 'translateX(50px)';
        }

        // Draw portrait if specified
        if (line.portrait && (line.side === 'left' || !line.side)) {
            if (portLeft && canvasLeft) {
                portLeft.style.display = 'flex';
                this.drawPortrait(canvasLeft, line.portrait);
                // Animate entry
                setTimeout(() => {
                    portLeft.style.opacity = '1';
                    portLeft.style.transform = 'translateX(0)';
                }, 50);
            }
        } else if (line.portrait && line.side === 'right') {
            if (portRight && canvasRight) {
                portRight.style.display = 'flex';
                this.drawPortrait(canvasRight, line.portrait);
                // Animate entry
                setTimeout(() => {
                    portRight.style.opacity = '1';
                    portRight.style.transform = 'translateX(0)';
                }, 50);
            }
        }

        if (textContainer) {
            textContainer.innerHTML = '';
            let charIndex = 0;
            this.typingInterval = setInterval(() => {
                if (charIndex < line.text.length) {
                    textContainer.innerHTML += line.text.charAt(charIndex);
                    charIndex++;
                } else {
                    clearInterval(this.typingInterval);
                    this.isTyping = false;
                }
            }, 25); // typing speed
        }
    }

    advanceCutscene() {
        if (this.isTyping) {
            // Speed up: show full text immediately
            if (this.typingInterval) clearInterval(this.typingInterval);
            const textContainer = document.getElementById('cutscene-text');
            if (textContainer) {
                textContainer.innerHTML = this.currentLineText;
            }
            this.isTyping = false;
        } else {
            // Advance to next segment
            this.currentIndex++;
            this.showLine();
        }
    }

    drawPortrait(canvas, textureKey) {
        if (!this.scene || !this.scene.textures) return;
        const texture = this.scene.textures.get(textureKey);
        if (!texture) return;
        
        // Use frame 0 (idle front-facing)
        const frame = texture.get(0);
        if (!frame) return;

        canvas.width = frame.width;
        canvas.height = frame.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Disable smoothing for sharp pixel art
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            frame.source.image, 
            frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 
            0, 0, frame.width, frame.height
        );
    }

    finishCutscene() {
        const overlay = document.getElementById('cutscene-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                this.cancelCutscene();
                if (this.onCompleteCallback) this.onCompleteCallback();
            }, 400);
        } else {
            this.cancelCutscene();
            if (this.onCompleteCallback) this.onCompleteCallback();
        }
    }

    cancelCutscene() {
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.typingInterval = null;
        
        if (this.keyHandler) {
            window.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        
        const overlay = document.getElementById('cutscene-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.onclick = null;
        }
        
        this.scene.isCutscene = false;
        if (this.scene.physics && this.scene.physics.world && this.scene.physics.world.isPaused) {
            this.scene.physics.resume();
        }
    }
}
