import { getInvoiceTotal } from './invoiceUtils';

const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

// pdf-lib does not wrap text on its own — long descriptions/notes would
// otherwise run past the page edge and be clipped/unreadable.
function wrapText(str, font, size, maxWidth) {
  const words = String(str ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// Builds a real, standalone PDF for an invoice using pdf-lib (pure JS, no
// browser rendering engine needed) — this is what actually produces a
// PDF file the caller can hand to navigator.share()/download, since iOS
// Safari has no JS-callable print-to-PDF API at all (see invoicePdf usage
// in InvoicePage.jsx for why this exists instead of window.print()).
// pdf-lib is imported dynamically here (not at module top-level) so it's
// only fetched when a PDF is actually requested, not bundled into the
// InvoicePage route chunk eagerly.
export async function generateInvoicePdfBytes(invoice, trainer, client) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const BLACK = rgb(0, 0, 0);
  const GRAY = rgb(0.45, 0.45, 0.45);
  const LINE_GRAY = rgb(0.8, 0.8, 0.8);

  const doc = await PDFDocument.create();
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN;

  const newPageIfNeeded = (needed) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const text = (str, x, size, useBold, color) => {
    page.drawText(String(str ?? ''), { x, y, size, font: useBold ? bold : font, color: color || BLACK });
  };

  const textRight = (str, rightX, size, useBold, color) => {
    const f = useBold ? bold : font;
    const s = String(str ?? '');
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: rightX - w, y, size, font: f, color: color || BLACK });
  };

  const rightEdge = PAGE_WIDTH - MARGIN;

  // Header: business identity (left) + invoice meta (right)
  const brand = trainer?.businessName || trainer?.name || '';
  text(brand, MARGIN, 18, true);
  textRight(invoice.invoiceNumber, rightEdge, 14, true);
  y -= 20;
  text(trainer?.email || '', MARGIN, 10, false, GRAY);
  textRight(`Issue date  ${invoice.issueDate}`, rightEdge, 9, false, GRAY);
  y -= 14;
  textRight(`Due date  ${invoice.dueDate}`, rightEdge, 9, false, GRAY);
  y -= 32;

  // Bill to
  text('BILL TO', MARGIN, 8, false, GRAY);
  y -= 14;
  text(client?.name || '', MARGIN, 11, true);
  y -= 14;
  text(client?.email || '', MARGIN, 9, false, GRAY);
  y -= 28;

  // Table header
  const colDesc = MARGIN;
  const colQty = 340;
  const colPrice = 410;
  const colAmount = rightEdge;
  text('DESCRIPTION', colDesc, 8, false, GRAY);
  textRight('QTY', colQty, 8, false, GRAY);
  textRight('UNIT PRICE', colPrice, 8, false, GRAY);
  textRight('AMOUNT', colAmount, 8, false, GRAY);
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: rightEdge, y }, thickness: 1, color: LINE_GRAY });
  y -= 16;

  const descColWidth = colQty - colDesc - 12;
  for (const item of invoice.items || []) {
    const descLines = wrapText(item.description, font, 10, descColWidth);
    newPageIfNeeded(descLines.length * 14 + 6);
    const amount = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
    const rowTop = y;
    for (const line of descLines) {
      text(line, colDesc, 10, false);
      y -= 14;
    }
    y = rowTop;
    textRight(item.qty, colQty, 10, false);
    textRight(`${invoice.currency} ${Number(item.unitPrice).toFixed(2)}`, colPrice, 10, false);
    textRight(`${invoice.currency} ${amount.toFixed(2)}`, colAmount, 10, false);
    y -= descLines.length * 14 + 4;
    page.drawLine({ start: { x: MARGIN, y: y + 6 }, end: { x: rightEdge, y: y + 6 }, thickness: 0.5, color: LINE_GRAY });
  }

  newPageIfNeeded(40);
  y -= 6;
  page.drawLine({ start: { x: MARGIN, y: y + 14 }, end: { x: rightEdge, y: y + 14 }, thickness: 1, color: LINE_GRAY });
  const total = getInvoiceTotal(invoice.items);
  textRight('Total', colPrice, 11, true);
  textRight(`${invoice.currency} ${total.toFixed(2)}`, colAmount, 12, true);
  y -= 34;

  if (invoice.notes) {
    const notesLines = wrapText(invoice.notes, font, 10, rightEdge - MARGIN);
    newPageIfNeeded(14 + notesLines.length * 14 + 14);
    text('NOTES', MARGIN, 8, false, GRAY);
    y -= 14;
    for (const line of notesLines) {
      text(line, MARGIN, 10, false);
      y -= 14;
    }
    y -= 14;
  }

  newPageIfNeeded(20);
  const statusText = invoice.status === 'paid'
    ? `Status: PAID${invoice.paidDate ? ` on ${invoice.paidDate}` : ''}`
    : 'Status: UNPAID';
  text(statusText, MARGIN, 10, true);

  return doc.save();
}

function sanitizeForFilename(str) {
  return String(str || '').trim().replace(/[^a-zA-Z0-9]+/g, '');
}

export function invoicePdfFilename(invoice, client) {
  const number = invoice.invoiceNumber || 'invoice';
  const clientPart = sanitizeForFilename(client?.name);
  return clientPart ? `${number}-${clientPart}.pdf` : `${number}.pdf`;
}
