// Temporary script to monitor NPC bobbing
setInterval(() => {
    if (!window.game) return;
    const scene = window.game.scene.getScene('GameScene');
    if (!scene || !scene.ambientNPCs) return;
    
    scene.ambientNPCs.forEach(npc => {
        if (npc.spriteKey && npc.spriteKey.includes('female') && npc.sprite && npc.sprite.anims.currentAnim && npc.sprite.anims.currentAnim.key.includes('idle')) {
            if (!npc._lastYMonitor) npc._lastYMonitor = npc.sprite.y;
            if (Math.abs(npc.sprite.y - npc._lastYMonitor) > 0.5) {
                console.log(`NPC ${npc.npcName || npc.spriteKey} Y CHANGED: ${npc._lastYMonitor} -> ${npc.sprite.y} (diff: ${npc.sprite.y - npc._lastYMonitor})`);
            }
            npc._lastYMonitor = npc.sprite.y;
        }
    });
}, 100);
