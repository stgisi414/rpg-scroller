class WeatherManager {
    constructor(scene) {
        this.scene = scene;
        this.currentWeather = 'clear'; // 'clear', 'rain', 'snow'
        
        // Groups for physics
        this.particles = this.scene.physics.add.group({
            allowGravity: false
        });

        // Setup physics collisions with platforms
        this.scene.physics.add.collider(this.particles, this.scene.platforms, this.handleCollision, null, this);

        // Overlay for darkening the scene during rain
        this.darknessOverlay = this.scene.add.rectangle(0, 0, 1280, 720, 0x000010, 0);
        this.darknessOverlay.setScrollFactor(0);
        this.darknessOverlay.setDepth(99); // Draw over the scene but under UI
        this.darknessOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

        // Timers
        this.spawnTimer = 0;
        
        // Setup animations
        if (!this.scene.anims.exists('rain_splash')) {
            this.scene.anims.create({
                key: 'rain_splash',
                frames: this.scene.anims.generateFrameNumbers('weather_rain_collision', { start: 0, end: 2 }),
                frameRate: 15,
                repeat: 0,
                hideOnComplete: true
            });
        }
        if (!this.scene.anims.exists('snow_melt')) {
            this.scene.anims.create({
                key: 'snow_melt',
                frames: this.scene.anims.generateFrameNumbers('weather_blur_collision', { start: 0, end: 2 }),
                frameRate: 10,
                repeat: 0,
                hideOnComplete: true
            });
        }
    }

    setWeather(weatherType) {
        this.currentWeather = weatherType;
        
        if (weatherType === 'rain') {
            this.scene.tweens.add({
                targets: this.darknessOverlay,
                alpha: 0.4,
                duration: 2000
            });
        } else {
            this.scene.tweens.add({
                targets: this.darknessOverlay,
                alpha: 0,
                duration: 2000
            });
        }
    }

    update(time, delta) {
        if (this.currentWeather === 'clear' || this.scene.isIndoors) {
            // Clean up off-screen particles if any
            this.particles.getChildren().forEach(p => {
                if (p.y > this.scene.cameras.main.scrollY + 800) {
                    p.destroy();
                }
            });
            return;
        }

        this.spawnTimer += delta;
        
        const spawnInterval = this.currentWeather === 'rain' ? 20 : 50;

        if (this.spawnTimer > spawnInterval) {
            this.spawnTimer = 0;
            this.spawnParticle();
        }

        // Apply movement logic for snow and cleanup offscreen particles
        const camY = this.scene.cameras.main.scrollY;
        this.particles.getChildren().forEach(p => {
            if (this.currentWeather === 'snow' && !p.isColliding) {
                // Sine wave falling motion for snow
                p.x += Math.sin(time / 200 + p.randomOffset) * 1.5;
            }
            if (p.y > camY + 800) {
                p.destroy();
            }
        });
    }

    spawnParticle() {
        const cam = this.scene.cameras.main;
        // Spawn slightly offscreen top, randomly across the screen width plus some buffer
        const x = cam.scrollX + Math.random() * (cam.width + 400) - 200;
        const y = cam.scrollY - 50;

        let spriteKey = this.currentWeather === 'rain' ? 'weather_rain' : 'weather_snow';
        const p = this.particles.create(x, y, spriteKey);
        
        if (!p) return;

        p.setDepth(10);
        p.isColliding = false;
        
        if (this.currentWeather === 'rain') {
            p.setVelocityY(500 + Math.random() * 200);
            p.setVelocityX(-50 + Math.random() * 100);
            p.setAlpha(0.6);
            p.setRotation(Math.atan2(p.body.velocity.y, p.body.velocity.x) - Math.PI/2);
        } else {
            p.setVelocityY(50 + Math.random() * 50);
            p.randomOffset = Math.random() * 1000; // For snow sine wave
            p.setAlpha(0.8);
            p.setScale(0.5 + Math.random() * 0.5);
        }
    }

    handleCollision(particle, platform) {
        if (particle.isColliding) return;
        particle.isColliding = true;
        
        particle.setVelocity(0, 0);
        particle.body.enable = false;

        if (this.currentWeather === 'rain') {
            particle.setRotation(0);
            particle.play('rain_splash');
        } else {
            particle.play('snow_melt');
        }

        particle.once('animationcomplete', () => {
            particle.destroy();
        });
    }
}
