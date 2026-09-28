// @vitest-environment jsdom
//
// B10: the monthly report button, driven as a trainer would. It used to open a window and
// call window.print(), which on an iPhone does nothing (#30). It now builds a PDF in the
// student's language and hands it to the share sheet. Firebase is replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const shared = vi.hoisted(() => ({ calls: [], fail: false }));

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));
vi.mock('../utils/sharePdf', () => ({
  sharePdf: async (bytes, filename) => {
    if (shared.fail) throw new Error('share failed');
    shared.calls.push({ bytes, filename });
  },
}));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider, LanguageContext } = await import('../i18n/LanguageContext');
const { default: MonthlyReportModal } = await import('./MonthlyReportModal');

const month = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
const CLIENT = { id: 'c1', name: 'Sam Lee', role: 'client', trainerId: 't1', language: 'zh-HK' };
const TRAINER = { id: 't1', name: 'Ani', role: 'trainer', currency: 'GBP' };

const ctx = {
  currentUser: TRAINER,
  setLanguage: vi.fn(),
  getBodyStats: () => [{ date: `${month}-01`, weight: 80 }],
  getWorkoutLogs: () => [{ date: `${month}-02`, entries: [{ exerciseId: 'bench-press', sets: [{ weight: 60, reps: 8 }] }] }],
  getSchedule: () => [{ date: `${month}-02`, time: '18:00', status: 'completed' }],
  getPersonalRecords: () => ({ 'bench-press': { weight: 60, date: `${month}-02` } }),
  getExercises: () => [{ id: 'bench-press', name: 'Bench Press' }],
};

// Wraps the real LanguageProvider so the test can see whose translator the report asked for.
let askedFor;
function SpyTranslator({ children }) {
  return (
    <LanguageContext.Consumer>
      {(value) => (
        <LanguageContext.Provider value={{
          ...value,
          translatorFor: async (recipient, sender) => { askedFor = { recipient, sender }; return value.translatorFor(recipient, sender); },
        }}>{children}</LanguageContext.Provider>
      )}
    </LanguageContext.Consumer>
  );
}

function renderModal() {
  return render(
    <AppContext.Provider value={ctx}>
      <LanguageProvider><SpyTranslator><ToastProvider>
        <MonthlyReportModal client={CLIENT} onClose={() => {}} />
      </ToastProvider></SpyTranslator></LanguageProvider>
    </AppContext.Provider>,
  );
}

// The student reads Chinese, so the month label alone needs the Chinese font. The browser
// fetches it over HTTP; here it comes from disk.
const FONT = readFileSync(join(cwd(), 'public/fonts/NotoSansHK-Regular-TT.ttf'));

beforeEach(() => {
  shared.calls = []; shared.fail = false; askedFor = null;
  // Copied into this realm's ArrayBuffer: jsdom's differs from Node's Buffer, and pdf-lib
  // type-checks it.
  vi.stubGlobal('fetch', async () => ({ ok: true, arrayBuffer: async () => Uint8Array.from(FONT).buffer }));
  vi.spyOn(window, 'open');
  vi.spyOn(window, 'print').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('monthly report', () => {
  test("Create PDF shares a real PDF, built in the student's language — no print dialog", async () => {
    renderModal();
    fireEvent.click(screen.getByText('Create PDF'));
    await waitFor(() => expect(shared.calls).toHaveLength(1), { timeout: 10000 });

    const { bytes, filename } = shared.calls[0];
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(filename).toBe(`Report-${month}-SamLee.pdf`);
    expect(askedFor).toEqual({ recipient: CLIENT, sender: TRAINER });
    expect(window.open).not.toHaveBeenCalled();
    expect(window.print).not.toHaveBeenCalled();
  });

  test('the button cannot be tapped twice while the PDF is being made', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Create PDF'));
    const busy = await screen.findByText('Creating PDF…');
    expect(busy.closest('button').disabled).toBe(true);
    await waitFor(() => expect(shared.calls).toHaveLength(1), { timeout: 10000 });
    expect(await screen.findByText('Create PDF')).toBeTruthy();
  });

  test('a failure says so and the button works again', async () => {
    shared.fail = true;
    renderModal();
    fireEvent.click(screen.getByText('Create PDF'));
    expect(await screen.findByText('Could not create the PDF. Check your connection and try again.')).toBeTruthy();
    expect(screen.getByText('Create PDF').closest('button').disabled).toBe(false);
  });

  test("the fee currency starts as the trainer's own", () => {
    renderModal();
    fireEvent.click(screen.getByText('Include fee summary'));
    expect(screen.getByDisplayValue('GBP')).toBeTruthy();
  });

  test('the preview shows the same numbers the PDF prints', () => {
    renderModal();
    expect(screen.getAllByText('1')).toHaveLength(2); // one session, one workout log
    expect(screen.getByText('0.5t')).toBeTruthy(); // 60 × 8 = 480 kg
  });
});
