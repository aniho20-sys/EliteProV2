import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateInvoicePdfBytes, wrapText } from './invoicePdf';
import { needsCjkFont, __resetFontCache } from './pdfFont';

const ROOT = new URL('../..', import.meta.url).pathname;
const FONT = readFileSync(join(ROOT, 'public/fonts/NotoSansHK-Regular-TT.ttf'));

// The browser fetches /fonts/… over HTTP; under vitest there is no server, so
// the same path is served from disk. Everything else about the code path —
// which strings trigger the load, subsetting, embedding — is the real thing.
let fetchCalls;
beforeEach(() => {
  fetchCalls = [];
  __resetFontCache();
  vi.stubGlobal('fetch', async (url) => {
    fetchCalls.push(String(url));
    return { ok: true, arrayBuffer: async () => FONT.buffer.slice(FONT.byteOffset, FONT.byteOffset + FONT.byteLength) };
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

const invoice = (over = {}) => ({
  invoiceNumber: 'INV-001',
  issueDate: '2026-09-22',
  dueDate: '2026-10-06',
  currency: 'GBP',
  status: 'sent',
  items: [{ description: 'Personal training', qty: 4, unitPrice: 50 }],
  ...over,
});

describe('needsCjkFont', () => {
  test('anything Helvetica can encode is left alone', () => {
    expect(needsCjkFont('Personal training')).toBe(false);
    expect(needsCjkFont('Beyoncé — £50')).toBe(false); // Latin-1 + WinAnsi punctuation
    expect(needsCjkFont('')).toBe(false);
    expect(needsCjkFont(null)).toBe(false);
  });

  test('CJK is flagged', () => {
    expect(needsCjkFont('陳大文')).toBe(true);
    expect(needsCjkFont('Session 1 私人訓練')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN: a Chinese name must not crash the invoice, and must not bloat it.
// ---------------------------------------------------------------------------
// Two failures in one test on purpose, because the obvious fix for the first
// causes the second. Embedding a CJK font at all clears the crash; embedding it
// without a working subset produced a 3.1 MB invoice, which is not a fix for
// someone who has to send it over WhatsApp. Measured 2026-09-22: 23 KB with a
// glyf-based TTF, 3144 KB with the CFF woff2 @pdf-lib/fontkit cannot subset.
describe('GUARDIAN: CJK invoices', () => {
  test('a Chinese client name renders instead of throwing WinAnsi', async () => {
    const bytes = await generateInvoicePdfBytes(
      invoice(), { name: '教練', email: 'coach@example.com' }, { name: '陳大文', email: 'c@example.com' },
    );
    expect(bytes.length).toBeGreaterThan(0);
  });

  test('the finished PDF stays small — the subset really subsets', async () => {
    const bytes = await generateInvoicePdfBytes(
      invoice({ notes: '多謝惠顧，請於到期日前付款。' }),
      { businessName: '陳大文私人教練', email: 'coach@example.com' },
      { name: '李小明', email: 'c@example.com' },
    );
    expect(bytes.length).toBeLessThan(200 * 1024);
  });

  test('an all-English invoice never downloads the font', async () => {
    const bytes = await generateInvoicePdfBytes(
      invoice(), { name: 'Ani', email: 'a@example.com' }, { name: 'John Smith', email: 'j@example.com' },
    );
    expect(fetchCalls).toEqual([]);
    expect(bytes.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN: Chinese has no spaces, so the old word-splitter could not wrap it.
// ---------------------------------------------------------------------------
describe('GUARDIAN: CJK line wrapping', () => {
  // A stand-in for a pdf-lib font: every character is 10 points wide, so the
  // arithmetic in the assertions below is obvious rather than font-dependent.
  const fakeFont = { widthOfTextAtSize: (s) => Array.from(s).length * 10 };

  test('a long Chinese run breaks across lines instead of running off the page', () => {
    const lines = wrapText('私人訓練課程共十堂包括體能評估', fakeFont, 10, 50);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(Array.from(line).length).toBeLessThanOrEqual(5);
  });

  test('English still breaks on spaces, not mid-word', () => {
    const lines = wrapText('Personal training session', fakeFont, 10, 100);
    expect(lines.every((l) => !l.startsWith(' ') && !l.endsWith(' '))).toBe(true);
    expect(lines.join(' ')).toBe('Personal training session');
  });

  test('a space the source had is kept either side of Chinese', () => {
    expect(wrapText('私人訓練 Personal training', fakeFont, 10, 1000)).toEqual(['私人訓練 Personal training']);
    expect(wrapText('Goal: 增肌減脂', fakeFont, 10, 1000)).toEqual(['Goal: 增肌減脂']);
    expect(wrapText('Session 1 私人訓練', fakeFont, 10, 1000)).toEqual(['Session 1 私人訓練']);
  });

  test('a mixed line keeps the English word whole', () => {
    const lines = wrapText('Session 私人訓練', fakeFont, 10, 100);
    expect(lines.join('')).toContain('Session');
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN: the bundled font must be one @pdf-lib/fontkit can subset.
// ---------------------------------------------------------------------------
// Both found 2026-09-28 by rendering a Chinese invoice with MuPDF (FreeType):
//  1. The font had CFF outlines. fontkit's CFF subset could not be opened at all, so
//     Chinese came out blank in Chrome and Android's viewer — while every test above
//     passed, because a PDF with an unreadable font is still a small, valid PDF.
//  2. After converting to TrueType, glyphs were not padded. fontkit writes short loca
//     (offset / 2) for a small subset, so one odd-length glyph shifted all later ones.
// See public/fonts/README.md and scripts/cjk-font-to-truetype.py.
describe('GUARDIAN: the bundled CJK font', () => {
  const u16 = (o) => FONT.readUInt16BE(o);
  const u32 = (o) => FONT.readUInt32BE(o);
  const tables = () => {
    const out = {};
    for (let i = 0; i < u16(4); i++) {
      const rec = 12 + i * 16;
      out[FONT.toString('latin1', rec, rec + 4)] = { offset: u32(rec + 8), length: u32(rec + 12) };
    }
    return out;
  };

  test('has TrueType (glyf) outlines, not CFF', () => {
    expect(u32(0)).toBe(0x00010000); // 'OTTO' is CFF
    expect(Object.keys(tables())).toContain('glyf');
    expect(Object.keys(tables())).not.toContain('CFF ');
  });

  test('every glyph is an even number of bytes', () => {
    const t = tables();
    const longLoca = u16(t.head.offset + 50) === 1;
    const numGlyphs = u16(t.maxp.offset + 4);
    const at = (i) => (longLoca ? u32(t.loca.offset + i * 4) : u16(t.loca.offset + i * 2) * 2);
    let odd = 0;
    for (let i = 0; i < numGlyphs; i++) if ((at(i + 1) - at(i)) % 2) odd++;
    expect(odd).toBe(0);
  });
});
