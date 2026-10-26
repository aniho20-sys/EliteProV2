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
  test('a client with a coach who has not agreed — including a "no" from before agreeing was required', () => {
    expect(needsHealthSharingAnswer(AMY)).toBe(true);
    expect(needsHealthSharingAnswer({ ...AMY, healthSharing: 'no' })).toBe(true);
    expect(needsHealthSharingAnswer({ ...AMY, healthSharing: 'yes' })).toBe(false);
    expect(needsHealthSharingAnswer({ ...AMY, trainerId: null, healthSharing: 'no' })).toBe(false);
    expect(needsHealthSharingAnswer({ ...AMY, managed: true })).toBe(false);
    expect(needsHealthSharingAnswer(COACH)).toBe(false);
  });
});

describe('the question (Ani 2026-10-26: agreeing is part of training with a coach)', () => {
  const appWithAnswers = (over) => appFor(AMY, { declineHealthSharing: vi.fn(async () => {}), ...over });

  test('names the coach, what they would see, and that not agreeing disconnects; no way to skip', () => {
    renderWith(appWithAnswers(), <HealthSharingPrompt />);
    expect(screen.getByRole('dialog', { name: 'Share your health information with Ani Ho?' })).toBeTruthy();
    expect(screen.getByText(/including any injuries you list/)).toBeTruthy();
    expect(screen.getByText(/If you don't agree, you will be disconnected from Ani Ho/)).toBeTruthy();
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(['Agree', "Don't agree"]);
  });

  test('Agree saves yes', async () => {
    const app = appWithAnswers();
    renderWith(app, <HealthSharingPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Agree' }));
    await waitFor(() => expect(app.setHealthSharing).toHaveBeenCalledWith('yes'));
    expect(app.declineHealthSharing).not.toHaveBeenCalled();
  });

  test('"Don\'t agree" asks once more, saying they will be disconnected; Disconnect leaves the coach', async () => {
    const app = appWithAnswers();
    renderWith(app, <HealthSharingPrompt />);
    fireEvent.click(screen.getByRole('button', { name: "Don't agree" }));
    expect(app.declineHealthSharing).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Disconnect from Ani Ho?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(app.declineHealthSharing).toHaveBeenCalled());
  });

  test('…and Cancel goes back to the question, nothing saved', () => {
    const app = appWithAnswers();
    renderWith(app, <HealthSharingPrompt />);
    fireEvent.click(screen.getByRole('button', { name: "Don't agree" }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Agree' })).toBeTruthy();
    expect(app.declineHealthSharing).not.toHaveBeenCalled();
    expect(app.setHealthSharing).not.toHaveBeenCalled();
  });

  test('a failed save says so and stays open', async () => {
    const app = appWithAnswers({ setHealthSharing: vi.fn(async () => { throw new Error('offline'); }) });
    renderWith(app, <HealthSharingPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Agree' }));
    expect(await screen.findByText(/Could not save your choice/)).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  test('not shown once agreed', () => {
    renderWith(appFor({ ...AMY, healthSharing: 'yes' }), <HealthSharingPrompt />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Profile', () => {
  test('agreed: says what the coach sees; stopping means disconnecting, after a second tap', async () => {
    const app = appFor({ ...AMY, healthSharing: 'yes' }, { declineHealthSharing: vi.fn(async () => {}) });
    renderWith(app, <ProfilePage />, '/profile');
    expect(screen.getByText(/Your coach can see your body measurements/)).toBeTruthy();
    expect(screen.getByText(/To stop sharing, disconnect from your coach/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect from coach' }));
    expect(app.declineHealthSharing).not.toHaveBeenCalled();
    expect(screen.getByText(/You will no longer be connected to Ani Ho/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(app.declineHealthSharing).toHaveBeenCalled());
  });
});

describe('the coach’s page for that client', () => {
  const open = (app) => renderWith(app, <ClientDetailPage />, `/clients/${AMY.id}`, '/clients/:clientId');

  test('not agreed (a "no" from before it was required): the coach is told, on the overview, body stats and questionnaire — never shown empty as if there were none', async () => {
    const app = appFor(COACH, { healthShared: () => false, getBodyStats: () => [] });
    open(app);
    const note = /Amy Chen has not agreed to share their body measurements and training profile yet/;
    expect(screen.getAllByText(note).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Progress' }));
    expect(screen.getByText(note)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add measurement/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Training Profile|Intake/ }));
    expect(screen.getByText(note)).toBeTruthy();
  });

  test('shared: no such note', () => {
    open(appFor(COACH));
    expect(screen.queryByText(/has not agreed to share/)).toBeNull();
  });
});
