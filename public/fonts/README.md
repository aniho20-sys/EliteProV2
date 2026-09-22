# Bundled PDF font

`NotoSansHK-Regular.ttf` — Noto Sans Hong Kong, Regular. SIL Open Font
License 1.1 (`OFL.txt`).

## Why this file is here, and why it is 5.7 MB

`pdf-lib` can only draw text with fonts it has embedded, and its three built-in
fonts are WinAnsi-encoded: drawing a single Chinese character throws
`WinAnsi cannot encode "陳" (0x9673)`. Every invoice for a client with a Chinese
name crashed on that line (CLAUDE.md B2).

## Why a TTF and not the 1.2 MB woff2

`@pdf-lib/fontkit` can subset a **glyf**-based (TrueType) font down to only the
characters actually used. It cannot subset **CFF** (OpenType/PostScript)
outlines, and silently embeds the whole font instead. Measured on 2026-09-22
with the same one-line document:

| Source | `subset: true` | Result |
|---|---|---|
| Noto Sans HK **woff2** (CFF) | 3 144 KB | subsetting silently did nothing |
| Noto Sans HK **TTF** (glyf) | **23 KB** | correct |

So the 5.7 MB is paid once, over the network, by the trainer generating the
PDF — and never by the person receiving it, whose file is ~25 KB.

## How it is loaded

`src/utils/pdfFont.js` fetches this file **only when the document actually
contains a character Helvetica cannot encode**. An all-English invoice never
touches it.

It is deliberately **not** in the service worker precache — `globPatterns` in
`vite.config.js` does not list `ttf`, so adding it would have more than doubled
the app's install size for a file most sessions never need. It is runtime-cached
instead, so the download is paid once per device rather than once per invoice.
