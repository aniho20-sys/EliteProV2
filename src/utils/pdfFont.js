// CJK text in generated PDFs.
//
// pdf-lib's three built-in fonts are WinAnsi-encoded, so a single Chinese
// character throws `WinAnsi cannot encode "陳" (0x9673)` and takes the whole
// PDF with it. Every invoice addressed to a client with a Chinese name failed
// on that line. Helvetica stays the font for everything it CAN encode — this
// module only supplies a fallback for the strings it cannot, so an all-English
// invoice is byte-for-byte what it was before and costs no extra download.
//
// See public/fonts/README.md for why the bundled font is a 5.7 MB TTF rather
// than the 1.2 MB woff2 (short version: @pdf-lib/fontkit can only subset glyf
// outlines, and silently embeds the entire font for CFF ones — 23 KB vs
// 3.1 MB in the same one-line document).

const FONT_URL = '/fonts/NotoSansHK-Regular.ttf';

// WinAnsi is Latin-1 plus the CP1252 0x80–0x9F block, which is where the
// typographic characters live: the em dash, curly quotes, the ellipsis, the
// euro sign. Those are above U+00FF but Helvetica can encode them perfectly
// well, and a trainer writing an English note with an em dash in it should not
// trigger a 5.7 MB font download for one punctuation mark. So the check is the
// real WinAnsi set, not "anything above Latin-1".
const WINANSI_EXTRAS = new Set(Array.from(
  '\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D'
  + '\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178',
).map((ch) => ch.codePointAt(0)));

export function needsCjkFont(str) {
  const s = String(str ?? '');
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp > 0xFF && !WINANSI_EXTRAS.has(cp)) return true;
  }
  return false;
}

// True if any string in the document needs the fallback. Callers pass every
// string they are going to draw, so the 5.7 MB fetch happens once per document
// and only when it is genuinely required.
export function anyNeedsCjkFont(strings) {
  return strings.some(needsCjkFont);
}

// The raw font bytes, fetched at most once per page load. Kept as the promise
// rather than the result so two PDFs generated in quick succession share one
// request instead of racing.
let fontBytesPromise = null;

export class CjkFontUnavailableError extends Error {
  constructor(cause) {
    super('CJK font could not be loaded');
    this.name = 'CjkFontUnavailableError';
    this.cause = cause;
  }
}

async function loadFontBytes() {
  if (!fontBytesPromise) {
    fontBytesPromise = fetch(FONT_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .catch((err) => {
        // Don't cache a failure — the trainer may simply have been offline for
        // a moment, and the next attempt should be a real one.
        fontBytesPromise = null;
        throw new CjkFontUnavailableError(err);
      });
  }
  return fontBytesPromise;
}

// Embeds the fallback font into `doc` and returns it. `subset: true` is what
// keeps the finished PDF at ~25 KB instead of ~5 MB; it works here because the
// bundled file is glyf-based (see the README next to it).
export async function embedCjkFont(doc) {
  const [{ default: fontkit }, bytes] = await Promise.all([
    import('@pdf-lib/fontkit'),
    loadFontBytes(),
  ]);
  doc.registerFontkit(fontkit);
  return doc.embedFont(bytes, { subset: true });
}

// Test seam: the module-level cache would otherwise leak between test cases.
export function __resetFontCache() {
  fontBytesPromise = null;
}
