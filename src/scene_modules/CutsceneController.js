class CutsceneController {
    constructor(scene) {
        this.scene = scene;
    }

    playCutscene(lines, onComplete) {
        this.cancelCutscene(); // Cancel any existing cutscene before starting a new one
        this.scene.isCutscene = true;
        this.scene.physics.pause();
        
        const overlay = document.getElementById('cutscene-overlay');
        const textContainer = document.getElementById('cutscene-text');
        
        if (overlay && textContainer) {
            overlay.style.display = 'flex';
            // Trigger reflow
            void overlay.offsetWidth;
            overlay.style.opacity = '1';
            
            textContainer.innerHTML = '';
            let i = 0;
            this.scene.cutsceneInterval = setInterval(() => {
                if (i < lines.length) {
                    textContainer.innerHTML += lines.charAt(i);
                    i++;
                } else {
                    clearInterval(this.scene.cutsceneInterval);
                    this.scene.cutsceneTimeout1 = setTimeout(() => {
                        overlay.style.opacity = '0';
                        this.scene.cutsceneTimeout2 = setTimeout(() => {
                            overlay.style.display = 'none';
                            this.scene.isCutscene = false;
                            this.scene.physics.resume();
                            if (onComplete) onComplete();
                        }, 500);
                    }, 3000); // Read time
                }
            }, 30); // Typing speed
        } else {
            this.cancelCutscene();
            if (onComplete) onComplete();
        }
    }

    cancelCutscene() {
        if (this.scene.cutsceneInterval) clearInterval(this.scene.cutsceneInterval);
        if (this.scene.cutsceneTimeout1) clearTimeout(this.scene.cutsceneTimeout1);
        if (this.scene.cutsceneTimeout2) clearTimeout(this.scene.cutsceneTimeout2);
        this.scene.cutsceneInterval = null;
        this.scene.cutsceneTimeout1 = null;
        this.scene.cutsceneTimeout2 = null;
        
        const overlay = document.getElementById('cutscene-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        this.scene.isCutscene = false;
        if (this.scene.physics && this.scene.physics.world && this.scene.physics.world.isPaused) {
            this.scene.physics.resume();
        }
    }
}
