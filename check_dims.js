const fs = require('fs');
const sizeOf = require('image-size');

function check(path) {
    if(fs.existsSync(path)) {
        const dim = sizeOf(path);
        console.log(path + " => " + dim.width + "x" + dim.height);
        console.log("Cols (if 100px): " + dim.width / 100 + " Rows (if 64px): " + dim.height / 64);
    } else {
        console.log("Not found: " + path);
    }
}

check('src/assets/GandalfHardcore FREE Character Asset Pack/GandalfHardcore Character Asset Pack/Male Hand/Male Sword.png');
check('src/assets/GandalfHardcore 36x Hand Items/GandalfHardcore 35x Hand Items/Male Hand/Diamond Sword.png');
check('src/assets/GandalfHardcore Character Asset Pack/GandalfHardcore Character Asset Pack/Male Hair/Male Hair1.png');
check('src/assets/GandalfHardcore 39x Hats/GandalfHardcore 39x Hats/Male Hat/Hat1.png');
