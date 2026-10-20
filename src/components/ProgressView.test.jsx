// @vitest-environment jsdom
//
// B52: deleting a body measurement used to fire and forget — a failed delete still said
// "Measurement deleted". Firebase is replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: ProgressView } = await import('./ProgressView');

const STAT = { id: 'stat-1', date: '2026-10-01', weight: 70 };

function renderView(deleteBodyStat) {
  return render(
    <AppContext.Provider value={{ currentUser: { id: 'c1', role: 'client' }, setLanguage: vi.fn(), getBodyStats: () => [STAT], deleteBodyStat }}>
      <LanguageProvider><ToastProvider><ProgressView clientId="c1" canDelete /></ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
}

beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('deleting a measurement', () => {
  test('a failed delete says so — never "deleted"', async () => {
    renderView(vi.fn(async () => { throw new Error('offline'); }));
    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    expect(await screen.findByText('Couldn’t delete the measurement. Please try again.')).toBeTruthy();
    expect(screen.queryByText('Measurement deleted')).toBeNull();
  });
  test('a delete that went through says so, once it has', async () => {
    const del = vi.fn(async () => {});
    renderView(del);
    fireEvent.click(screen.getAllByTitle('Delete')[0]);
    expect(await screen.findByText('Measurement deleted')).toBeTruthy();
    expect(del).toHaveBeenCalledWith('c1', 'stat-1');
  });
});
