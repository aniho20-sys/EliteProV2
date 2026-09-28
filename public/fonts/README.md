# Bundled PDF font

`NotoSansHK-Regular-TT.ttf` — Noto Sans Hong Kong, Regular, converted to TrueType
outlines. SIL Open Font License 1.1 (`OFL.txt`). Rebuilt with
`scripts/cjk-font-to-truetype.py`.

## Why this file is here, and why it is 5.7 MB

`pdf-lib` can only draw text with fonts it has embedded, and its three built-in
fonts are WinAnsi-encoded: drawing a single Chinese character throws
`WinAnsi cannot encode "陳" (0x9673)`. Every invoice for a client with a Chinese
name crashed on that line (CLAUDE.md B2).

## Why TrueType outlines, converted by us

`@pdf-lib/fontkit` subsets a **glyf** (TrueType) font correctly. Noto Sans HK is
published with **CFF** outlines, and fontkit cannot subset CID-keyed CFF: it
writes data FreeType refuses to open (`FT_New_Memory_Face: unknown file
format`), so the Chinese in the PDF rendered blank anywhere FreeType does the
drawing — Chrome, Android's viewer.

**Correction, 2026-09-28.** Until then this file was called
`NotoSansHK-Regular.ttf` and this README said it was glyf-based. It was not: its
header was `OTTO` and it carried a `CFF ` table. The 23 KB "subset worked"
measurement below the old heading was real, but a small file is not a readable
one — nobody had opened a Chinese invoice in a FreeType viewer. Found while
building the monthly report PDF; checked by rendering with MuPDF, which uses
FreeType.

The fix is `scripts/cjk-font-to-truetype.py`: the same font, outlines converted
cubic → quadratic (fontTools `cu2qu`, max error 1/1000 em), with every glyph
padded to 4 bytes. The padding matters too — for a small subset fontkit writes
the short `loca` format, which stores offset ÷ 2, and one odd-length glyph
shifted every glyph after it (a second bug, found the same day: `陳` and `G`
vanished while `大` survived).

`src/utils/invoicePdf.test.js` checks both: the bundled font must be TrueType,
and every glyph an even number of bytes.

**The file was renamed** so its URL changed: the service worker caches it
`CacheFirst` for a year, and phones that had already made a Chinese invoice
would otherwise have kept the broken font.

| Source | Result in a one-line document |
|---|---|
| Noto Sans HK, CFF (as shipped) | 35 KB, font unreadable by FreeType |
| Converted, unpadded | 6 KB, some glyphs shifted/missing |
| **Converted, padded (bundled)** | **6 KB, every glyph renders** |

So the 6.7 MB is paid once, over the network, by the trainer generating the
PDF — and never by the person receiving it, whose file is a few KB.

## How it is loaded

`src/utils/pdfFont.js` fetches this file **only when the document actually
contains a character Helvetica cannot encode**. An all-English invoice never
touches it.

It is deliberately **not** in the service worker precache — `globPatterns` in
`vite.config.js` does not list `ttf`, so adding it would have more than doubled
the app's install size for a file most sessions never need. It is runtime-cached
instead, so the download is paid once per device rather than once per invoice.
