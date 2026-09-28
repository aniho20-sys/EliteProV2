import { anyNeedsCjkFont, needsCjkFont, embedCjkFont } from './pdfFont';
import { wrapText } from './invoicePdf';
import { formatCurrency } from './currencyUtils';
import { calcVolume } from './workoutUtils';
import { reportMonthLabel, reportDateLabel } from './monthlyReport';

// The monthly training report as a real PDF (pdf-lib), in the student's language.
//
// It used to be an HTML page opened in a new window and printed with window.print(),
// which on an iPhone does nothing at all (CLAUDE.md #30) — the report could not be made
// on the only device Ani uses. Same pipeline as invoicePdf.js: Helvetica for everything
// it can encode, the Noto Sans HK fallback only when a string needs it, share sheet via
// sharePdf.js.
//
// Every label goes through `t`, the translator for the READER (the student), from
// translatorFor(client, trainer) — Ani 2026-09-28: the report follows the student's
// language. Exercise names, RPE, kg and the trainer's own text are data and are printed
// as they are (#39).

const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const RIGHT = PAGE_WIDTH - MARGIN;
const LINE = 14;

// Measurement labels. Literal t() calls, because t only takes a literal key (#39).
const bodyLabel = (t, key) => ({
  weight: t('metric.weight'),
  bodyFat: t('metric.body_fat'),
  chest: t('metric.chest'),
  waist: t('metric.waist'),
  hips: t('metric.hips'),
  arms: t('metric.arms'),
  legs: t('metric.legs'),
}[key]);

const locale = (lang) => (lang === 'zh-HK' ? 'zh-HK' : 'en-GB');

const num = (n, lang, digits = 0) => Number(n).toLocaleString(locale(lang), {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
});
const signed = (n, lang) => `${n > 0 ? '+' : ''}${num(n, lang, 1)}`;

// Everything the PDF will print, as plain strings, before anything is drawn — so the
// decision to fetch the CJK font is made once, over the whole document.
export function reportContent({ report, client, trainer, lang, t, now = new Date(), exName, includeWorkoutSummary, fee }) {
  const monthLabel = reportMonthLabel(report.month, lang);
  const firstName = String(client?.name || '').split(' ')[0];

  const stats = [
    { value: String(report.completed.length), label: t('rpdf.stat_sessions') },
    ...(report.attendancePct !== null ? [{ value: `${report.attendancePct}%`, label: t('rpdf.stat_attendance') }] : []),
    { value: String(report.monthLogs.length), label: t('rpdf.stat_logs') },
    ...(report.totalVolume > 0 ? [{ value: `${num(report.totalVolume / 1000, lang, 1)}t`, label: t('rpdf.stat_volume') }] : []),
  ];

  const sections = [];
  const { body } = report;
  if (body) {
    const unit = (v, u) => `${num(v, lang, 1)}${u}`;
    if (body.mode === 'snapshot') {
      sections.push({
        title: t('rpdf.body_title'),
        note: t('rpdf.body_snapshot_note'),
        columns: [t('rpdf.col_measurement'), t('rpdf.col_latest', { date: body.date })],
        widths: [0.5, 0.5],
        rows: body.rows.map(r => [bodyLabel(t, r.key), unit(r.value, r.unit)]),
      });
    } else {
      sections.push({
        title: t('rpdf.body_title'),
        columns: [
          t('rpdf.col_measurement'),
          t('rpdf.col_start', { date: body.startDate }),
          body.endDate ? t('rpdf.col_end_dated', { date: body.endDate }) : t('rpdf.col_end'),
        ],
        widths: [0.34, 0.33, 0.33],
        rows: body.rows.map(r => [
          bodyLabel(t, r.key),
          unit(r.start, r.unit),
          r.end !== null ? `${unit(r.end, r.unit)}${r.delta !== null ? `  (${signed(r.delta, lang)})` : ''}` : '—',
        ]),
      });
    }
  }

  if (report.topPRs.length > 0) {
    sections.push({
      title: t('rpdf.pr_title'),
      columns: [t('rpdf.col_exercise'), t('rpdf.col_best'), t('rpdf.col_achieved')],
      widths: [0.5, 0.25, 0.25],
      rows: report.topPRs.map(pr => [exName(pr.exerciseId), `${num(pr.weight, lang, pr.weight % 1 ? 1 : 0)} kg`, pr.date || '—']),
    });
  }

  if (report.completed.length > 0) {
    sections.push({
      title: t('rpdf.sessions_title'),
      columns: [t('rpdf.col_date'), t('rpdf.col_time'), t('rpdf.col_type')],
      widths: [0.3, 0.2, 0.5],
      rows: report.completed.map(s => [s.date, s.time || '—', s.type || '—']),
    });
  }

  if (includeWorkoutSummary && report.monthLogs.length > 0) {
    sections.push({
      title: t('rpdf.workouts_title'),
      columns: [t('rpdf.col_date'), t('rpdf.col_exercises'), t('rpdf.col_volume'), t('rpdf.col_intensity')],
      widths: [0.18, 0.5, 0.17, 0.15],
      rows: report.monthLogs.map(l => {
        const vol = calcVolume(l.entries);
        return [
          l.date,
          (l.entries || []).map(e => exName(e.exerciseId, e.name)).join(', '),
          vol > 0 ? `${num(vol, lang)} kg` : '—',
          l.rpe ? `RPE ${l.rpe}` : '—',
        ];
      }),
    });
  }

  const feeBlock = fee ? {
    title: t('rpdf.fee_title'),
    line: t('rpdf.fee_line', { month: monthLabel }),
    amount: formatCurrency(fee.amount, fee.currency),
    due: fee.dueDate ? [t('rpdf.fee_due'), fee.dueDate] : null,
    payment: fee.paymentInfo ? t('rpdf.fee_payment', { info: fee.paymentInfo }) : null,
  } : null;

  return {
    title: t('rpdf.title'),
    subtitle: t('rpdf.subtitle'),
    trainerName: trainer?.businessName || trainer?.name || '',
    trainerLine: trainer?.speciality || '',
    today: reportDateLabel(now, lang),
    clientName: client?.name || '',
    goal: client?.goals ? t('rpdf.goal', { goal: client.goals }) : '',
    periodLabel: t('rpdf.period'),
    monthLabel,
    greeting: firstName ? t('rpdf.greeting', { name: firstName }) : '',
    stats,
    sections,
    noData: report.hasAnyData ? '' : t('rpdf.no_data'),
    fee: feeBlock,
    footerLeft: t('rpdf.footer_left'),
    footerRight: t('rpdf.footer_right'),
  };
}

function allStrings(c) {
  return [
    c.title, c.subtitle, c.trainerName, c.trainerLine, c.today, c.clientName, c.goal,
    c.periodLabel, c.monthLabel, c.greeting, c.noData, c.footerLeft, c.footerRight,
    ...c.stats.flatMap(s => [s.value, s.label]),
    ...c.sections.flatMap(s => [s.title, s.note, ...s.columns, ...s.rows.flat()]),
    ...(c.fee ? [c.fee.title, c.fee.line, c.fee.amount, ...(c.fee.due || []), c.fee.payment] : []),
  ].map(v => String(v ?? ''));
}

export async function generateMonthlyReportPdfBytes(content) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const BLACK = rgb(0.07, 0.07, 0.07);
  const GRAY = rgb(0.42, 0.45, 0.5);
  const LIGHT = rgb(0.9, 0.91, 0.92);
  const PANEL = rgb(0.96, 0.97, 0.98);
  const ACCENT = rgb(0.15, 0.39, 0.92);

  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const cjk = anyNeedsCjkFont(allStrings(content)) ? await embedCjkFont(doc) : null;
  const fontFor = (s, bold) => (cjk && needsCjkFont(s) ? cjk : (bold ? helvBold : helv));

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const FOOTER_SPACE = 30;
  const ensure = (needed) => {
    if (y - needed < MARGIN + FOOTER_SPACE) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };
  const draw = (str, x, size, { bold = false, color = BLACK, align = 'left' } = {}) => {
    const s = String(str ?? '');
    if (!s) return;
    const font = fontFor(s, bold);
    const w = font.widthOfTextAtSize(s, size);
    const at = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    page.drawText(s, { x: at, y, size, font, color });
  };
  const rule = (color = LIGHT, thickness = 1) => {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: RIGHT, y }, thickness, color });
  };

  // Header
  draw(content.title, MARGIN, 18, { bold: true, color: ACCENT });
  draw(content.trainerName, RIGHT, 11, { bold: true, align: 'right' });
  y -= 16;
  draw(content.subtitle, MARGIN, 9, { color: GRAY });
  if (content.trainerLine) { draw(content.trainerLine, RIGHT, 9, { color: GRAY, align: 'right' }); y -= 12; }
  draw(content.today, RIGHT, 9, { color: GRAY, align: 'right' });
  y -= 12;
  rule(ACCENT, 2);
  y -= 28;

  // Client and period
  draw(content.clientName, MARGIN, 14, { bold: true });
  draw(content.periodLabel, RIGHT, 8, { color: GRAY, align: 'right' });
  y -= 14;
  draw(content.monthLabel, RIGHT, 11, { bold: true, color: ACCENT, align: 'right' });
  if (content.goal) {
    for (const line of wrapText(content.goal, fontFor(content.goal), 9, (RIGHT - MARGIN) * 0.6)) {
      draw(line, MARGIN, 9, { color: GRAY });
      y -= 12;
    }
  } else {
    y -= 12;
  }
  y -= 14;
  if (content.greeting) {
    draw(content.greeting, MARGIN, 11, { bold: true, color: rgb(0.09, 0.64, 0.29) });
    y -= 26;
  }

  // Stat boxes
  const gap = 10;
  const boxW = (RIGHT - MARGIN - gap * (content.stats.length - 1)) / content.stats.length;
  const boxH = 50;
  content.stats.forEach((s, i) => {
    const x = MARGIN + i * (boxW + gap);
    page.drawRectangle({ x, y: y - boxH + 12, width: boxW, height: boxH, color: PANEL, borderColor: LIGHT, borderWidth: 1 });
    const cx = x + boxW / 2;
    const top = y;
    y = top - 12;
    draw(s.value, cx, 18, { bold: true, color: ACCENT, align: 'center' });
    y = top - 28;
    draw(s.label, cx, 8, { color: GRAY, align: 'center' });
    y = top;
  });
  y -= boxH + 18;

  // Sections
  const tableWidth = RIGHT - MARGIN;
  for (const section of content.sections) {
    ensure(LINE * 4);
    draw(section.title, MARGIN, 12, { bold: true });
    y -= 8;
    rule();
    y -= 16;
    if (section.note) {
      draw(section.note, MARGIN, 8, { color: GRAY });
      y -= 16;
    }
    const xs = [];
    let acc = MARGIN;
    for (const w of section.widths) { xs.push(acc); acc += w * tableWidth; }
    const colW = (i) => section.widths[i] * tableWidth - 8;

    const header = () => {
      page.drawRectangle({ x: MARGIN, y: y - 4, width: tableWidth, height: 16, color: PANEL });
      section.columns.forEach((c, i) => draw(c, xs[i] + 4, 8, { color: GRAY }));
      y -= LINE + 6;
    };
    header();
    for (const row of section.rows) {
      const cells = row.map((cell, i) => wrapText(cell, fontFor(String(cell ?? '')), 9, colW(i)));
      const height = Math.max(...cells.map(c => c.length)) * 12 + 6;
      if (y - height < MARGIN + FOOTER_SPACE) {
        ensure(height + LINE * 2);
        header();
      }
      const top = y;
      cells.forEach((lines, i) => {
        y = top;
        for (const line of lines) { draw(line, xs[i] + 4, 9); y -= 12; }
      });
      y = top - height + 6;
      page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: RIGHT, y: y + 2 }, thickness: 0.5, color: LIGHT });
      y -= 10;
    }
    y -= 14;
  }

  if (content.noData) {
    ensure(LINE * 3);
    y -= 10;
    draw(content.noData, PAGE_WIDTH / 2, 10, { color: GRAY, align: 'center' });
    y -= 30;
  }

  // Fee summary
  if (content.fee) {
    const f = content.fee;
    const paymentLines = f.payment ? wrapText(f.payment, fontFor(f.payment), 9, tableWidth) : [];
    ensure(18 + 18 + 16 + (f.due ? 16 : 0) + paymentLines.length * 12);
    rule(LIGHT, 1);
    y -= 18;
    draw(f.title, MARGIN, 9, { bold: true, color: GRAY });
    y -= 18;
    draw(f.line, MARGIN, 10);
    draw(f.amount, RIGHT, 10, { bold: true, align: 'right' });
    y -= 16;
    if (f.due) {
      draw(f.due[0], MARGIN, 9, { color: GRAY });
      draw(f.due[1], RIGHT, 9, { color: GRAY, align: 'right' });
      y -= 16;
    }
    for (const line of paymentLines) {
      draw(line, MARGIN, 9);
      y -= 12;
    }
  }

  // Footer on every page
  for (const p of doc.getPages()) {
    page = p;
    y = MARGIN;
    page.drawLine({ start: { x: MARGIN, y: y + 14 }, end: { x: RIGHT, y: y + 14 }, thickness: 0.5, color: LIGHT });
    draw(content.footerLeft, MARGIN, 8, { color: GRAY });
    draw(content.footerRight, RIGHT, 8, { color: GRAY, align: 'right' });
  }

  return doc.save();
}

export function reportPdfFilename(client, month) {
  const name = String(client?.name || '').trim().replace(/[^a-zA-Z0-9]+/g, '');
  return name ? `Report-${month}-${name}.pdf` : `Report-${month}.pdf`;
}
