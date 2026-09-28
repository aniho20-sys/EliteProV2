# Rebuilds public/fonts/NotoSansHK-Regular-TT.ttf — the Chinese font the invoice and
# monthly report PDFs embed — from Noto Sans HK Regular (CFF outlines, as Google ships it).
#
#   pip install fonttools
#   python3 scripts/cjk-font-to-truetype.py NotoSansHK-Regular.otf public/fonts/NotoSansHK-Regular-TT.ttf
#
# Why (public/fonts/README.md): @pdf-lib/fontkit cannot subset CID-keyed CFF — it writes
# data FreeType refuses to open, so Chinese text came out blank in Chrome/Android's PDF
# viewer. It subsets TrueType correctly, provided every glyph is an even number of bytes
# (see glyf.padding below). Converting outlines cubic -> quadratic is lossless to the eye
# at MAX_ERR 1 unit of 1000. After fontTools' Snippets/otf2ttf.py. Output is SIL OFL 1.1,
# like the input.
import sys
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

MAX_ERR = 1.0

src, dst = sys.argv[1], sys.argv[2]
font = TTFont(src)
glyphOrder = font.getGlyphOrder()
glyphSet = font.getGlyphSet()
glyf = newTable('glyf'); glyf.glyphOrder = glyphOrder; glyf.glyphs = {}
for name in glyphOrder:
    pen = TTGlyphPen(glyphSet)
    glyphSet[name].draw(Cu2QuPen(pen, MAX_ERR, reverse_direction=True))
    glyf[name] = pen.glyph()
font['glyf'] = glyf
# @pdf-lib/fontkit's subsetter writes short loca (offset / 2) for small subsets and
# assumes every glyph is an even number of bytes. fontTools leaves a large font's glyphs
# unpadded, so one odd-length glyph shifted every glyph after it in the PDF.
glyf.padding = 4
font['loca'] = newTable('loca')
for t in ('CFF ', 'VORG'):
    if t in font: del font[t]
post = font['post']; post.formatType = 3.0

maxp = font['maxp']; maxp.tableVersion = 0x00010000
for f in ('maxZones','maxTwilightPoints','maxStorage','maxFunctionDefs','maxInstructionDefs','maxStackElements','maxSizeOfInstructions','maxComponentElements'):
    setattr(maxp, f, 0)
maxp.maxZones = 1
font['head'].indexToLocFormat = 1
font['head'].glyphDataFormat = 0
font.sfntVersion = '\x00\x01\x00\x00'
font.save(dst)
