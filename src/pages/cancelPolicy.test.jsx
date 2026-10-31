// @vitest-environment jsdom
//
// B82 (Ani 2026-10-29): a coach sets their own cancellation rule in Profile; the server
// refunds by what is saved (functions/test/bookSession.test.js). Real page, data replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

window.matchMedia = window.matchMedia || ((query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));
vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => ({ permission: 'default', supported: false, requestPermission: vi.fn(), token: null }),
}));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { ThemeProvider } = await import('../context/ThemeContext');
const { default: ProfilePage } = await import('./ProfilePage');

const COACH = { id: 'coach-1', name: 'Ani Ho', role: 'trainer', inviteCode: 'ANI123' };

function renderProfile(currentUser, over = {}) {
  const app = {
    currentUser, firebaseUser: { uid: currentUser.id, providerData: [] }, setLanguage: vi.fn(), data: { users: [] },
    getClient: () => undefined, getClients: () => [], getExercises: () => [], getSchedule: () => [],
    updateClient: vi.fn(async () => {}), logout: vi.fn(), sendPasswordReset: vi.fn(), getInviteCode: vi.fn(async () => 'ANI123'),
    connectToTrainer: vi.fn(), deleteAccount: vi.fn(), getPaymentConnection: vi.fn(async () => null),
    getSubscriptions: vi.fn(async () => []), getStripeStatus: vi.fn(async () => ({ configured: false })),
    getClientErrors: vi.fn(async () => []), getPlatformStats: vi.fn(async () => null),
    watchClientHistory: () => () => {}, historyComplete: () => true, historyStart: () => null, extendScheduleTo: () => {},
    subscribeGroupClasses: () => () => {}, subscribeTrialRequests: () => () => {},
    ...over,
  };
  render(
    <AppContext.Provider value={app}>
      <ThemeProvider><LanguageProvider><ToastProvider>
        <MemoryRouter><ProfilePage /></MemoryRouter>
      </ToastProvider></LanguageProvider></ThemeProvider>
    </AppContext.Provider>,
  );
  return app;
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('the coach’s cancellation rule card', () => {
  test('starts at 24 hours, twice a month — and shows what clients will read', () => {
    renderProfile(COACH);
    expect(screen.getByLabelText('Clients must cancel at least').value).toBe('24');
    expect(screen.getByLabelText('Sessions given back each month').value).toBe('2');
    expect(screen.getByLabelText('Clients can book up to').value).toBe('12');
    expect(screen.getByText(/Your clients see: You can book up to 12 hours before a session\. Cancel at least 24 hours before .*up to 2 times a month/)).toBeTruthy();
  });

  test('changing it shows the new wording, and Save stores exactly the chosen rule', async () => {
    const app = renderProfile(COACH);
    fireEvent.change(screen.getByLabelText('Clients must cancel at least'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Sessions given back each month'), { target: { value: 'unlimited' } });
    fireEvent.change(screen.getByLabelText(/Anything else clients should know/), { target: { value: '  Ill? Message me.  ' } });
    expect(screen.getByText(/Your clients see: You can book up to 12 hours .*Cancel at least 12 hours before to get the session back\. Later/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));
    await waitFor(() => expect(app.updateClient).toHaveBeenCalledWith('coach-1', {
      cancelPolicy: { noticeHours: 12, freePerMonth: null, note: 'Ill? Message me.' },
      bookingNoticeHours: 12,
    }));
    expect(await screen.findByText('Cancellation rules saved')).toBeTruthy();
  });

  test('a saved rule is what the card opens with; a failed save says so', async () => {
    const app = renderProfile({ ...COACH, cancelPolicy: { noticeHours: 48, freePerMonth: 0, note: '' } },
      { updateClient: vi.fn(async () => { throw new Error('offline'); }) });
    expect(screen.getByLabelText('Clients must cancel at least').value).toBe('48');
    expect(screen.getByText(/Your clients see: .*Cancelled sessions are not given back\./)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));
    expect(await screen.findByText(/Could not save the rules/)).toBeTruthy();
    expect(app.updateClient).toHaveBeenCalled();
  });

  test('B83: how late clients may book is saved with the rule; “any time” is 0 and drops the line', async () => {
    const app = renderProfile(COACH);
    fireEvent.change(screen.getByLabelText('Clients can book up to'), { target: { value: '0' } });
    expect(screen.queryByText(/You can book up to/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));
    await waitFor(() => expect(app.updateClient).toHaveBeenCalledWith('coach-1', expect.objectContaining({ bookingNoticeHours: 0 })));
  });

  test('clients do not get the card', () => {
    renderProfile({ id: 'amy', name: 'Amy', role: 'client', trainerId: null });
    expect(screen.queryByText('Booking and cancellation rules')).toBeNull();
  });
});
