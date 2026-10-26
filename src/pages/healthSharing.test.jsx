// @vitest-environment jsdom
//
// B79 (Grok #27, Ani 2026-10-26): a client decides whether their coach sees their health
// information — body stats and the training profile, injuries included. Asked once per
// coach, either answer keeps them with their coach, changeable in Profile; the coach is told
// plainly when it is private. Driven through the real screens, data replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// jsdom has no matchMedia; the theme and device checks ask it.
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
const { default: HealthSharingPrompt } = await import('../components/HealthSharingPrompt');
const { default: ProfilePage } = await import('./ProfilePage');
const { default: ClientDetailPage } = await import('./ClientDetailPage');
const { needsHealthSharingAnswer } = await import('../utils/healthSharing');

const COACH = { id: 'coach-1', name: 'Ani Ho', role: 'trainer', inviteCode: 'ANI123' };
const AMY = { id: 'amy', name: 'Amy Chen', role: 'client', trainerId: 'coach-1', intakeCompleted: true, joinDate: '2026-01-01' };

function appFor(currentUser, over = {}) {
  const people = [COACH, AMY];
  return {
    currentUser, firebaseUser: { uid: currentUser.id, providerData: [] }, setLanguage: vi.fn(), data: { users: [] },
    getClient: (id) => people.find(p => p.id === id), getClients: () => [AMY],
    setHealthSharing: vi.fn(async () => {}), healthShared: () => true,
    getBodyStats: () => [{ id: 'b1', date: '2026-10-01', weight: 70 }], getIntakeForm: vi.fn(async () => ({ injuries: 'Left knee', goals: [] })),
    getWorkoutPlans: () => [], getWorkoutLogs: () => [], getExercises: () => [], getSchedule: () => [],
    getSessionStats: () => ({ used: 0, total: 10, remaining: 10 }), getMessages: () => [], getUnreadCount: () => 0,
    watchClientHistory: () => () => {}, historyComplete: () => true, historyStart: () => null, extendScheduleTo: () => {},
    updateClient: vi.fn(), logout: vi.fn(), sendPasswordReset: vi.fn(), getInviteCode: vi.fn(async () => 'ANI123'),
    connectToTrainer: vi.fn(), deleteAccount: vi.fn(), getPaymentConnection: vi.fn(async () => null),
    getSubscriptions: vi.fn(async () => []), getStripeStatus: vi.fn(async () => ({ configured: false })),
    getClientErrors: vi.fn(async () => []), getPlatformStats: vi.fn(async () => null), getCreditLedger: vi.fn(async () => []),
    getTrainerSubscriptions: vi.fn(async () => []),
    ...over,
  };
}

function renderWith(app, element, path = '/', route = '*') {
  return render(
    <AppContext.Provider value={app}>
      <ThemeProvider><LanguageProvider><ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes><Route path={route} element={element} /></Routes>
        </MemoryRouter>
      </ToastProvider></LanguageProvider></ThemeProvider>
    </AppContext.Provider>,
  );
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('who is asked', () => {
  test('a client with a coach who has not answered — no one else', () => {
    expect(needsHealthSharingAnswer(AMY)).toBe(true);
    expect(needsHealthSharingAnswer({ ...AMY, healthSharing: 'no' })).toBe(false);
    expect(needsHealthSharingAnswer({ ...AMY, healthSharing: 'yes' })).toBe(false);
    expect(needsHealthSharingAnswer({ ...AMY, trainerId: null })).toBe(false);
    expect(needsHealthSharingAnswer({ ...AMY, managed: true })).toBe(false);
    expect(needsHealthSharingAnswer(COACH)).toBe(false);
  });
});

describe('the question', () => {
  test('names the coach and what they would see; two answers of equal weight, no way to skip', () => {
    renderWith(appFor(AMY), <HealthSharingPrompt />);
    expect(screen.getByRole('dialog', { name: 'Share your health information with Ani Ho?' })).toBeTruthy();
    expect(screen.getByText(/including any injuries you list/)).toBeTruthy();
    expect(screen.getByText(/You can train with Ani Ho either way/)).toBeTruthy();
    const share = screen.getByRole('button', { name: 'Share' });
    const dont = screen.getByRole('button', { name: "Don't share" });
    expect(share.className).toBe(dont.className);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  test('"Don\'t share" saves no', async () => {
    const app = appFor(AMY);
    renderWith(app, <HealthSharingPrompt />);
    fireEvent.click(screen.getByRole('button', { name: "Don't share" }));
    await waitFor(() => expect(app.setHealthSharing).toHaveBeenCalledWith('no'));
  });

  test('a failed save says so and stays open', async () => {
    const app = appFor(AMY, { setHealthSharing: vi.fn(async () => { throw new Error('offline'); }) });
    renderWith(app, <HealthSharingPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(await screen.findByText(/Could not save your choice/)).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  test('not shown once answered', () => {
    renderWith(appFor({ ...AMY, healthSharing: 'yes' }), <HealthSharingPrompt />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Profile', () => {
  test('sharing: says what the coach sees, and Stop sharing saves no', async () => {
    const app = appFor({ ...AMY, healthSharing: 'yes' });
    renderWith(app, <ProfilePage />, '/profile');
    expect(screen.getByText(/Your coach can see your body measurements/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Stop sharing' }));
    await waitFor(() => expect(app.setHealthSharing).toHaveBeenCalledWith('no'));
  });

  test('private: says so, and Share with my coach saves yes', async () => {
    const app = appFor({ ...AMY, healthSharing: 'no' });
    renderWith(app, <ProfilePage />, '/profile');
    expect(screen.getByText(/Your coach cannot see them/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Share with my coach' }));
    await waitFor(() => expect(app.setHealthSharing).toHaveBeenCalledWith('yes'));
  });
});

describe('the coach’s page for that client', () => {
  const open = (app) => renderWith(app, <ClientDetailPage />, `/clients/${AMY.id}`, '/clients/:clientId');

  test('private: the coach is told, on the overview, body stats and questionnaire — never shown empty as if there were none', async () => {
    const app = appFor(COACH, { healthShared: () => false, getBodyStats: () => [] });
    open(app);
    const note = /Amy Chen keeps their body measurements and training profile private/;
    expect(screen.getAllByText(note).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    expect(screen.getByText(note)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add measurement/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Training Profile|Intake/ }));
    expect(screen.getByText(note)).toBeTruthy();
  });

  test('shared: no such note', () => {
    open(appFor(COACH));
    expect(screen.queryByText(/keeps their body measurements and training profile private/)).toBeNull();
  });
});
