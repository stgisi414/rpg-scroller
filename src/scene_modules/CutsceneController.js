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
        this.isFinishing = false;

        this.dialoguePatterns = {};
        this.lastPlayedIndices = {};
        this.videoFailed = false;

        if (typeof fetch !== 'undefined') {
            fetch('src/assets/dialogue_patterns.json')
                .then(res => res.json())
                .then(data => {
                    this.dialoguePatterns = data;
                })
                .catch(err => {
                    console.warn("Failed to load dialogue patterns:", err);
                });
        }
    }

    substitutePlaceholders(str, context) {
        if (typeof str !== 'string') return str;
        return str.replace(/\{(\w+)\}/g, (match, key) => {
            return context[key] !== undefined ? context[key] : match;
        });
    }

    renderTraditionalPortraitsForLine(line) {
        const portLeft = document.getElementById('cutscene-portrait-left');
        const portRight = document.getElementById('cutscene-portrait-right');
        const canvasLeft = document.getElementById('cutscene-canvas-left');
        const canvasRight = document.getElementById('cutscene-canvas-right');
        
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

        if (line.portrait && (line.side === 'left' || !line.side)) {
            if (portLeft && canvasLeft) {
                const success = this.drawPortrait(canvasLeft, line.portrait);
                if (success) {
                    portLeft.style.display = 'flex';
                    setTimeout(() => {
                        portLeft.style.opacity = '1';
                        portLeft.style.transform = 'translateX(0)';
                    }, 50);
                } else {
                    portLeft.style.display = 'none';
                }
            }
        } else if (line.portrait && line.side === 'right') {
            if (portRight && canvasRight) {
                const success = this.drawPortrait(canvasRight, line.portrait);
                if (success) {
                    portRight.style.display = 'flex';
                    setTimeout(() => {
                        portRight.style.opacity = '1';
                        portRight.style.transform = 'translateX(0)';
                    }, 50);
                } else {
                    portRight.style.display = 'none';
                }
            }
        }
    }

    playCutscene(linesOrCategory, contextOrOnComplete, onComplete) {
        this.cancelCutscene();
        this.scene.isCutscene = true;
        
        // Pause physics securely if possible
        if (this.scene.physics && this.scene.physics.pause) {
            this.scene.physics.pause();
        }
        
        let lines = [];
        let finalOnComplete = null;
        let isCategory = false;

        if (typeof linesOrCategory === 'string' && this.dialoguePatterns && this.dialoguePatterns[linesOrCategory]) {
            isCategory = true;
            finalOnComplete = onComplete;
            
            const category = linesOrCategory;
            const patterns = this.dialoguePatterns[category];
            const context = contextOrOnComplete || {};
            
            if (patterns && patterns.length > 0) {
                let chosenIndex = 0;
                if (patterns.length > 1) {
                    const lastIndex = this.lastPlayedIndices[category];
                    const availableIndices = [];
                    for (let i = 0; i < patterns.length; i++) {
                        if (i !== lastIndex) {
                            availableIndices.push(i);
                        }
                    }
                    if (availableIndices.length > 0) {
                        chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                    } else {
                        chosenIndex = Math.floor(Math.random() * patterns.length);
                    }
                } else {
                    chosenIndex = 0;
                }
                this.lastPlayedIndices[category] = chosenIndex;
                
                const pattern = patterns[chosenIndex];
                lines = pattern.map(line => {
                    const clonedLine = { ...line };
                    if (clonedLine.speaker) {
                        clonedLine.speaker = this.substitutePlaceholders(clonedLine.speaker, context);
                    }
                    if (clonedLine.text) {
                        clonedLine.text = this.substitutePlaceholders(clonedLine.text, context);
                    }
                    if (clonedLine.portrait) {
                        clonedLine.portrait = this.substitutePlaceholders(clonedLine.portrait, context);
                        if (clonedLine.portrait === 'player_portrait') {
                            if (this.scene.player && this.scene.player.classData) {
                                clonedLine.portrait = this.scene.player.classData.id;
                            }
                        }
                    }
                    return clonedLine;
                });
            }
        } else {
            // Backwards compatibility for raw dialogue array or string
            finalOnComplete = contextOrOnComplete;
            if (typeof linesOrCategory === 'string') {
                lines = [{ speaker: "Narrator", text: linesOrCategory }];
            } else if (Array.isArray(linesOrCategory)) {
                lines = linesOrCategory.map(line => {
                    if (typeof line === 'string') {
                        return { speaker: "Narrator", text: line };
                    }
                    const clonedLine = { ...line };
                    if (clonedLine.portrait === 'player_portrait') {
                        if (this.scene.player && this.scene.player.classData) {
                            clonedLine.portrait = this.scene.player.classData.id;
                        }
                    }
                    return clonedLine;
                });
            } else {
                lines = [{ speaker: "Narrator", text: String(linesOrCategory) }];
            }
        }

        this.dialogueQueue = lines;
        this.currentIndex = 0;
        this.onCompleteCallback = finalOnComplete;
        this.isFinishing = false;
        
        const overlay = document.getElementById('cutscene-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            void overlay.offsetWidth;
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
            
            overlay.style.cursor = 'pointer';
            overlay.onclick = (e) => {
                e.stopPropagation();
                this.advanceCutscene();
            };
            
            this.keyHandler = (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    this.advanceCutscene();
                }
            };
            window.addEventListener('keydown', this.keyHandler);

            const cutsceneMode = localStorage.getItem("cutscene_mode") || "traditional";
            this.videoFailed = false;

            const videoContainer = document.getElementById('cutscene-video-container');
            const videoElement = document.getElementById('cutscene-video');

            if (cutsceneMode === 'omni' && videoElement && videoContainer) {
                if (this.scene.geminiService && this.scene.geminiService.apiKey) {
                    // Always generate dynamically on-the-fly to keep the cutscenes different and immersive!
                    const gs = this.scene.geminiService;
                    const loadingLabel = document.getElementById('cutscene-video-loading');
                    
                    if (videoContainer) videoContainer.style.display = 'flex';
                    if (loadingLabel) loadingLabel.style.display = 'block';
                    if (videoElement) videoElement.style.display = 'none';

                    // Capture game canvas as visual reference
                    const gameCanvas = this.scene.game.canvas;
                    const screenshotBase64 = gameCanvas ? gameCanvas.toDataURL('image/png') : null;

                    // Draw the high-detail portrait onto the canvas first to capture it as reference
                    const currentLine = this.dialogueQueue[this.currentIndex];
                    this.renderTraditionalPortraitsForLine(currentLine);

                    const portraitLeftCanvas = document.getElementById('cutscene-canvas-left');
                    const portraitLeftBase64 = (portraitLeftCanvas && portraitLeftCanvas.style.display !== 'none') ? portraitLeftCanvas.toDataURL('image/png') : null;

                    const portraitRightCanvas = document.getElementById('cutscene-canvas-right');
                    const portraitRightBase64 = (portraitRightCanvas && portraitRightCanvas.style.display !== 'none') ? portraitRightCanvas.toDataURL('image/png') : null;

                    // Hide the traditional portraits again so they don't overlay on top of the video
                    const portLeft = document.getElementById('cutscene-portrait-left');
                    const portRight = document.getElementById('cutscene-portrait-right');
                    if (portLeft) portLeft.style.display = 'none';
                    if (portRight) portRight.style.display = 'none';

                    // Extract detailed game state to make the generated video immersive and unique
                    const wm = this.scene.worldManager;
                    const p = this.scene.player;
                    const zoneName = wm && wm.currentZoneData ? wm.currentZoneData.name : 'unknown region';
                    const zoneBiome = wm && wm.currentZoneData ? wm.currentZoneData.biome : 'forest';
                    const playerClass = p && p.classData ? p.classData.id : 'adventurer';
                    const playerLevel = p ? p.level : 1;
                    const playerAlignment = p && p.questManager ? p.questManager.alignment : 0;
                    
                    let alignmentStr = "Neutral";
                    if (playerAlignment > 5) alignmentStr = "Radiant Light";
                    else if (playerAlignment < -5) alignmentStr = "Scourge Dark";

                    const speakerName = currentLine ? currentLine.speaker : 'Someone';
                    const currentLineText = currentLine ? currentLine.text : '';

                    const videoCategory = isCategory ? linesOrCategory : 'default';
                    const OMNI_PROMPTS = {
                        'town_entrance': 'A cinematic video of entering a medieval fantasy capital gate. Stone arches, flags waving, guards standing watch, bustling town inside, golden hour lighting.',
                        'rival_ambush': 'A dramatic, dark fantasy forest ambush scene. A cocky rival rogue steping out of the shadows, camera rotating around them, foggy woods.',
                        'boss_monologue': 'An epic fantasy boss monologue arena. A dark wizard or overlord standing on a platform, channeling dark purple magical energy, floating runes, menacing cinematic look.',
                        'heaven_encounter': 'A celestial, divine realm in the high heavens. A radiant angel with glowing wings floating amidst golden clouds, soft volumetric sun rays, peaceful but awe-inspiring.',
                        'hell_encounter': 'An infernal, fiery hellscape abyss. A giant towering demon laughing amongst bubbling lava and scorched volcanic rocks, red ambient glow, cinematic dramatic angles.',
                        'throne_room_entrance': 'A grand royal throne room entrance. Golden pillars, high arches, a majestic monarch sitting on a throne, guards lined up, carpet leading up, sunlight streaming through windows.',
                        'guard_warning': 'A medieval checkpoint warning. Alert guards holding spears, blocking a stone bridge pathway, warning sign, tense atmospheric sunset lighting.'
                    };
                    
                    const basePrompt = OMNI_PROMPTS[videoCategory] || `Cinematic fantasy game scene: ${currentLineText}`;
                    const promptText = `A cinematic fantasy cutscene video backdrop.
Location: ${zoneName} (${zoneBiome} biome).
Current speaker: ${speakerName}, saying: "${currentLineText}".
The main hero is a Level ${playerLevel} ${playerClass} with ${alignmentStr} alignment.
Description: ${basePrompt}
Style: Majestic fantasy adventure cinematic video, matching the screenshot layout, rich atmospheric lighting, 5 seconds duration.`;

                    const overlayEl = document.getElementById('cutscene-overlay');
                    const fallbackToTraditional = () => {
                        this.isGeneratingVideo = false;
                        if (overlayEl) overlayEl.style.cursor = 'pointer';
                        this.videoFailed = true;
                        if (loadingLabel) loadingLabel.style.display = 'none';
                        if (videoContainer) videoContainer.style.display = 'none';
                        if (videoElement) {
                            videoElement.style.display = 'block';
                            if (typeof videoElement.pause === 'function') videoElement.pause();
                            videoElement.src = "";
                        }
                        if (currentLine) {
                            this.renderTraditionalPortraitsForLine(currentLine);
                        }
                    };

                    this.isGeneratingVideo = true;
                    if (overlayEl) overlayEl.style.cursor = 'wait';

                    // Call the async on-the-fly generator
                    gs.generateOmniVideoOnTheFly(videoCategory, promptText, screenshotBase64, portraitLeftBase64, portraitRightBase64)
                        .then(videoUrl => {
                            this.isGeneratingVideo = false;
                            if (overlayEl) overlayEl.style.cursor = 'pointer';
                            if (loadingLabel) loadingLabel.style.display = 'none';
                            if (videoElement) videoElement.style.display = 'block';

                            if (videoUrl) {
                                videoElement.src = videoUrl;
                                if (typeof videoElement.load === 'function') videoElement.load();
                                if (typeof videoElement.play === 'function') {
                                    videoElement.play().catch(err => {
                                        console.warn("Failed to auto-play on-the-fly video:", err);
                                        fallbackToTraditional();
                                    });
                                }
                            } else {
                                fallbackToTraditional();
                            }
                        })
                        .catch(err => {
                            console.error("[CutsceneController] On-the-fly video generation failed:", err);
                            fallbackToTraditional();
                        });
                } else {
                    // Fail over to traditional rendering immediately if no API key
                    this.videoFailed = true;
                    if (videoContainer) videoContainer.style.display = 'none';
                    if (videoElement) {
                        if (typeof videoElement.pause === 'function') videoElement.pause();
                        videoElement.src = "";
                    }
                    const currentLine = this.dialogueQueue[this.currentIndex];
                    if (currentLine) {
                        this.renderTraditionalPortraitsForLine(currentLine);
                    }
                }
            } else {
                if (videoContainer) videoContainer.style.display = 'none';
                if (videoElement) {
                    if (typeof videoElement.pause === 'function') videoElement.pause();
                    videoElement.src = "";
                }
            }
            
            this.showLine();
        } else {
            this.cancelCutscene();
            if (finalOnComplete) finalOnComplete();
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
        
        if (nameplate) {
            nameplate.innerText = line.speaker || "";
            nameplate.style.display = line.speaker ? 'block' : 'none';
        }
        
        const cutsceneMode = localStorage.getItem("cutscene_mode") || "traditional";
        const isOmni = cutsceneMode === 'omni';
        const portLeft = document.getElementById('cutscene-portrait-left');
        const portRight = document.getElementById('cutscene-portrait-right');

        if (isOmni && !this.videoFailed) {
            if (portLeft) portLeft.style.display = 'none';
            if (portRight) portRight.style.display = 'none';
        } else {
            this.renderTraditionalPortraitsForLine(line);
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
            }, 25);
        }
    }

    advanceCutscene() {
        if (this.isGeneratingVideo) {
            console.log("[CutsceneController] Cannot advance cutscene while generating video backdrop.");
            return;
        }
        if (this.isFinishing) return;
        if (this.isTyping) {
            if (this.typingInterval) clearInterval(this.typingInterval);
            const textContainer = document.getElementById('cutscene-text');
            if (textContainer) {
                textContainer.innerHTML = this.currentLineText;
            }
            this.isTyping = false;
        } else {
            this.currentIndex++;
            this.showLine();
        }
    }

    drawPortrait(canvas, textureKey) {
        if (window.drawDetailedPortrait && window.drawDetailedPortrait(canvas, textureKey)) {
            // Drawn high-detail portrait successfully!
            return true;
        }

        if (!this.scene || !this.scene.textures) return false;

        // Fallbacks for generic NPC portrait keys that might be referenced but not loaded
        let mappedKey = textureKey;
        if (textureKey === 'npc_guard') mappedKey = 'heavy_knight';
        else if (textureKey === 'npc_crier') mappedKey = 'wizard';
        else if (textureKey === 'npc_angel') mappedKey = 'priest';
        else if (textureKey === 'npc_demon') mappedKey = 'witch';
        else if (textureKey === 'npc_king') mappedKey = 'human_king';
        else if (textureKey === 'npc_queen') mappedKey = 'human_queen';
        else if (textureKey === 'npc_fiend') mappedKey = 'witch';
        else if (textureKey === 'npc_chancellor') mappedKey = 'wizard';
        else if (textureKey === 'npc_sentinel') mappedKey = 'samurai';

        // Check if texture actually exists in Phaser's cache to avoid drawing the __MISSING green slash texture
        if (!this.scene.textures.exists(mappedKey)) {
            return false;
        }

        const texture = this.scene.textures.get(mappedKey);
        if (!texture) return false;
        
        const frame = texture.get(0);
        if (!frame) return false;

        canvas.width = frame.width;
        canvas.height = frame.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            frame.source.image, 
            frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 
            0, 0, frame.width, frame.height
        );
        return true;
    }

    finishCutscene() {
        if (this.isFinishing) return;
        this.isFinishing = true;

        const overlay = document.getElementById('cutscene-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            if (this.keyHandler) {
                window.removeEventListener('keydown', this.keyHandler);
                this.keyHandler = null;
            }
            overlay.onclick = null;
            overlay.style.pointerEvents = 'none';

            setTimeout(() => {
                this.isFinishing = false;
                overlay.style.pointerEvents = 'auto';
                this.cancelCutscene();
                const cb = this.onCompleteCallback;
                this.onCompleteCallback = null;
                if (cb) cb();
            }, 400);
        } else {
            this.isFinishing = false;
            this.cancelCutscene();
            const cb = this.onCompleteCallback;
            this.onCompleteCallback = null;
            if (cb) cb();
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

        const videoContainer = document.getElementById('cutscene-video-container');
        const videoElement = document.getElementById('cutscene-video');
        if (videoContainer) videoContainer.style.display = 'none';
        if (videoElement) {
            if (typeof videoElement.pause === 'function') videoElement.pause();
            videoElement.src = "";
        }
        
        this.scene.isCutscene = false;
        if (this.scene.physics && this.scene.physics.world && this.scene.physics.world.isPaused) {
            this.scene.physics.resume();
        }
    }
}
