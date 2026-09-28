import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import en from '../i18n/en';
import { translate } from '../i18n/t';
import { buildMonthlyReport } from './monthlyReport';
import { reportContent, generateMonthlyReportPdfBytes, reportPdfFilename } from './reportPdf';
import { __resetFontCache } from './pdfFont';

// The monthly report PDF (B10). It replaced an HTML page printed with window.print(),
// which is a silent no-op on iPhone (#30). Font handling is shared with invoicePdf.js and
// guarded there; this file checks the report builds, in either language, at any length.

const ROOT = new URL('../..', import.meta.url).pathname;
const FONT = readFileSync(join(ROOT, 'public/fonts/NotoSansHK-Regular-TT.ttf'));

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

const tEn = (key, vars) => translate({ en, zh: null }, 'en', key, vars);
// Stand-in for an approved Chinese dictionary: every label comes back in Chinese.
const tZh = (key, vars) => `報告${tEn(key, vars)}`.replace(/[A-Za-z]/g, '');

const set = (weight, reps) => ({ weight, reps, completed: true });
const fullMonth = buildMonthlyReport({
  month: '2026-09',
  logs: [{ date: '2026-09-03', rpe: 8, entries: [{ exerciseId: 'bench-press', sets: [set(60, 8), set(60, 8)] }] }],
  schedule: [{ date: '2026-09-03', time: '18:00', type: 'PT Session', status: 'completed' }],
  bodyStats: [{ date: '2026-09-01', weight: 80, waist: 90 }, { date: '2026-09-28', weight: 78.5, waist: 88 }],
  prs: { 'bench-press': { weight: 60, date: '2026-09-03' } },
});

const build = (over = {}) => reportContent({
  report: fullMonth,
  client: { name: 'Sam Lee', goals: 'Get stronger' },
  trainer: { name: 'Ani', speciality: 'Strength' },
  lang: 'en',
  t: tEn,
  now: new Date(2026, 8, 30),
  exName: (id, name) => name || { 'bench-press': 'Bench Press' }[id] || id,
  includeWorkoutSummary: true,
  fee: { amount: 400, currency: 'GBP', dueDate: '2026-10-05', paymentInfo: 'Bank transfer' },
  ...over,
});

const isPdf = (bytes) => new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';

describe('report content', () => {
  test('every section a full month has', () => {
    const c = build();
    expect(c.stats.map(s => s.label)).toEqual(['Sessions completed', 'Attendance', 'Workout logs', 'Total volume']);
    expect(c.sections.map(s => s.title)).toEqual(['Body composition', 'All-time personal bests', 'Sessions', 'Workout summary']);
    expect(c.sections[0].rows[0]).toEqual(['Weight', '80.0kg', '78.5kg  (-1.5)']);
    expect(c.fee.amount).toBe('GBP 400.00');
    expect(c.monthLabel).toBe('September 2026');
    expect(c.today).toBe('30 September 2026');
  });

  test('exercise names, RPE and kg are printed as data, never translated (#39)', () => {
    const c = build({ lang: 'zh-HK', t: tZh });
    const workouts = c.sections.find(s => s.rows.some(r => r.includes('RPE 8')));
    expect(workouts.rows[0]).toEqual(['2026-09-03', 'Bench Press', '960 kg', 'RPE 8']);
    expect(c.monthLabel).toBe('2026年9月');
  });

  test('workout summary and fees are left out when unticked', () => {
    const c = build({ includeWorkoutSummary: false, fee: null });
    expect(c.sections.map(s => s.title)).not.toContain('Workout summary');
    expect(c.fee).toBeNull();
  });
});

describe('the PDF', () => {
  test('an English report is a PDF and fetches no Chinese font', async () => {
    const bytes = await generateMonthlyReportPdfBytes(build());
    expect(isPdf(bytes)).toBe(true);
    expect(fetchCalls).toEqual([]);
  });

  test('a Chinese report builds instead of throwing WinAnsi, and stays small enough to send', async () => {
    const bytes = await generateMonthlyReportPdfBytes(build({ lang: 'zh-HK', t: tZh, client: { name: '陳大文' } }));
    expect(isPdf(bytes)).toBe(true);
    expect(fetchCalls).toEqual(['/fonts/NotoSansHK-Regular-TT.ttf']);
    expect(bytes.length).toBeLessThan(300 * 1024);
  });

  test('an empty month still makes a PDF, with the empty message', async () => {
    const empty = buildMonthlyReport({ month: '2026-09', logs: [], schedule: [], bodyStats: [], prs: {} });
    const c = build({ report: empty, fee: null });
    expect(c.noData).toBe('No training recorded for this month yet.');
    expect(isPdf(await generateMonthlyReportPdfBytes(c))).toBe(true);
  });

  test('a long month flows onto more pages instead of running off the bottom', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const logs = Array.from({ length: 60 }, (_, i) => ({
      date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
      entries: [{ exerciseId: 'bench-press', sets: [set(60, 8)] }, { name: 'A very long custom exercise name that has to wrap', sets: [] }],
    }));
    const long = buildMonthlyReport({ month: '2026-09', logs, schedule: [], bodyStats: [], prs: {} });
    const bytes = await generateMonthlyReportPdfBytes(build({ report: long }));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });
});

test('file name', () => {
  expect(reportPdfFilename({ name: 'Sam Lee' }, '2026-09')).toBe('Report-2026-09-SamLee.pdf');
  expect(reportPdfFilename({ name: '陳大文' }, '2026-09')).toBe('Report-2026-09.pdf');
});
