const { Jimp } = require('jimp');

async function run() {
    try {
        const sheetPath = 'src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Healing Sheet.png';
        const image = await Jimp.read(sheetPath);

        // Crop to x=16, w=16, h=128
        image.crop({ x: 16, y: 0, w: 16, h: 128 });

        // Mana Sheet (blue)
        const manaSheet = image.clone();
        manaSheet.scan(0, 0, manaSheet.bitmap.width, manaSheet.bitmap.height, function(x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            const a = this.bitmap.data[idx + 3];

            if (a > 0) {
                this.bitmap.data[idx + 0] = b; 
                this.bitmap.data[idx + 1] = g; 
                this.bitmap.data[idx + 2] = r; 
            }
        });
        await manaSheet.write('src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Mana Sheet.png');

        // Stamina Sheet (green)
        const stamSheet = image.clone();
        stamSheet.scan(0, 0, stamSheet.bitmap.width, stamSheet.bitmap.height, function(x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            const a = this.bitmap.data[idx + 3];

            if (a > 0) {
                this.bitmap.data[idx + 0] = g; 
                this.bitmap.data[idx + 1] = r; 
                this.bitmap.data[idx + 2] = b; 
            }
        });
        await stamSheet.write('src/assets/GandalfHardcore healing Items/GandalfHardcore healing Items/Stamina Sheet.png');
        console.log('Success');
    } catch (e) {
        console.error('Error:', e);
    }
}
run();
