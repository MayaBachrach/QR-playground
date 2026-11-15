from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

# Hebrew display alphabet drawn on a five-by-seven pixel grid.
patterns = """
.####/#...#/##..#/.#.#./..##./.#..#/#...#
.####/....#/....#/....#/....#/....#/#####
...##/....#/....#/....#/...##/..#.#/##..#
#####/...#./...#./...#./...#./...#./...#.
#####/....#/....#/#...#/#...#/#...#/#...#
..##./...#./...#./...#./...#./...#./...#.
.####/..#../..#../..#../..#../..#../..#..
#####/#...#/#...#/#...#/#...#/#...#/#...#
#...#/#...#/#.#.#/#.#.#/#...#/#...#/.###.
..###/....#/....#/...../...../...../.....
#####/....#/....#/....#/....#/....#/....#
####./....#/....#/....#/....#/....#/####.
#..../#..../#####/....#/...#./..#../.#...
#####/#...#/#...#/#...#/#...#/#...#/#####
#..#./##..#/##..#/#...#/#...#/#...#/#.###
..##./...#./...#./...#./...#./...#./...#.
...##/....#/....#/....#/....#/....#/.####
.###./#...#/#...#/#...#/#...#/#...#/.###.
#...#/#...#/.#..#/..#.#/...#./..#../##...
#####/#...#/#...#/.##.#/....#/....#/....#
#####/#...#/#...#/.##.#/....#/....#/####.
#...#/.#..#/..##./...#./..#../.#.../.#...
#...#/.#..#/..##./...#./....#/....#/#####
#####/....#/....#/#...#/#..#./#.#../#....
####./....#/....#/....#/....#/....#/....#
#.#.#/#.#.#/#.#.#/#.#.#/#...#/.#..#/.###.
#####/.#..#/.#..#/.#..#/.#..#/.#..#/##..#
""".split()
glyphs = {".notdef": TTGlyphPen(None).glyph()}
cmap = {}
for char, pattern in zip("אבגדהוזחטיךכלםמןנסעףפץצקרשת", patterns, strict=True):
    name = f"uni{ord(char):04X}"
    cmap[ord(char)] = name
    pen = TTGlyphPen(None)
    descender = 150 if char in "ךןףץ" else 0
    for row, pixels in enumerate(pattern.split("/")):
        for col, pixel in enumerate(pixels):
            if pixel != "#":
                continue
            x, y = 50 + 100 * col, 600 - 100 * row - descender
            pen.moveTo((x, y))
            pen.lineTo((x, y + 100))
            pen.lineTo((x + 100, y + 100))
            pen.lineTo((x + 100, y))
            pen.closePath()
    glyphs[name] = pen.glyph()

font = FontBuilder(1000, isTTF=True)
font.setupGlyphOrder(list(glyphs))
font.setupCharacterMap(cmap)
font.setupGlyf(glyphs)
font.setupHorizontalMetrics({name: (600, glyph.xMin if glyph.numberOfContours else 0) for name, glyph in glyphs.items()})
font.setupHorizontalHeader(ascent=850, descent=-150)
font.setupNameTable({"familyName": "qArt OSD", "styleName": "Regular", "uniqueFontIdentifier": "qArt OSD Regular", "fullName": "qArt OSD Regular", "psName": "qArtOSD-Regular"})
font.setupOS2(sTypoAscender=850, sTypoDescender=-150, usWinAscent=850, usWinDescent=150)
font.setupPost()
font.save("qart-osd.ttf")
