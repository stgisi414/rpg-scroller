using System;
using System.Drawing;

class Program {
    static void Main() {
        var img = new Bitmap(@"C:\Code2\rpg-scroller\src\assets\GandalfHardcore Pixel Art Spider\GandalfHardcore Pixel Art Spider\GandalfHardcore Pixel Art Spider.png");
        for (int row=0; row<6; row++) {
            Console.WriteLine("Row " + row + ":");
            for (int col=0; col<16; col++) {
                bool hasPixel = false;
                for (int x=0; x<96 && !hasPixel; x++) {
                    for (int y=0; y<96 && !hasPixel; y++) {
                        if (img.GetPixel(col*96 + x, row*96 + y).A > 0) hasPixel = true;
                    }
                }
                Console.Write(hasPixel ? "1" : "0");
            }
            Console.WriteLine();
        }
    }
}
