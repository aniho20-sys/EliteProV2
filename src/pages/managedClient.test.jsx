// @vitest-environment jsdom
//
// B35: a coach adds a client who does not use the app, and the screens stop offering
// anything that could only reach a client through the app. Driven through the real pages.
// Firebase is replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: ClientsPage } = await import('./ClientsPage');
const { default: TrainerDashboard } = await import('./TrainerDashboard');
const { default: MessagesPage } = await import('./MessagesPage');

const COACH = { id: 'coach-1', name: 'Ani Ho', role: 'trainer', inviteCode: 'ANI123' };
const REAL = { id: 'real-1', name: 'Rita Real', role: 'client', trainerId: 'coach-1' };
const NO_APP = { id: 'managed-1759200000000-ab12', name: 'Nora NoApp', role: 'client', trainerId: 'coach-1', managed: true };

function appWith(overrides = {}) {
  const clients = overrides.clients || [REAL, NO_APP];
  return {
    currentUser: COACH, setLanguage: vi.fn(),
    getClients: () => clients,
    getClient: (id) => clients.find(c => c.id === id) || (id === COACH.id ? COACH : undefined),
    getBodyStats: () => [],
    getInviteCode: vi.fn(async () => 'ANI123'),
    addManagedClient: vi.fn(async (name) => ({ ...NO_APP, id: 'managed-1759200000001-cd34', name: name.trim() })),
    getSchedule: () => overrides.schedule || [],
    getUnreadCount: () => 0,
    getMessages: () => [],
    getWorkoutPlans: () => [],
    getWorkoutLogs: () => [],
    // Both clients are out of sessions, so both land in "renewal due".
    getSessionStats: () => ({ used: 10, total: 10, remaining: 0 }),
    updateScheduleItem: vi.fn(), updateClient: vi.fn(), sendMessage: vi.fn(), markMessagesRead: vi.fn(),
    ...overrides,
  };
}

function renderPage(element, app, path = '/') {
  return render(
    <AppContext.Provider value={app}>
      <LanguageProvider><ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/clients/:clientId" element={<div>detail page</div>} />
            <Route path="*" element={element} />
          </Routes>
        </MemoryRouter>
      </ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('adding a client from the Clients page', () => {
  const open = () => fireEvent.click(screen.getByRole('button', { name: /Add client/ }));

  test('type a name, tap Add → the client is created and their page opens', async () => {
    const app = appWith();
    renderPage(<ClientsPage />, app, '/clients');
    open();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Sam Taylor ' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Add client/ }).at(-1));
    await waitFor(() => expect(app.addManagedClient).toHaveBeenCalledWith('  Sam Taylor '));
    expect(await screen.findByText('detail page')).toBeTruthy();
    expect(await screen.findByText('Sam Taylor added')).toBeTruthy();
  });

  test('the Add button stays off until a name is typed', () => {
    renderPage(<ClientsPage />, appWith(), '/clients');
    open();
    expect(screen.getAllByRole('button', { name: /Add client/ }).at(-1).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });
    expect(screen.getAllByRole('button', { name: /Add client/ }).at(-1).disabled).toBe(true);
  });

  test('two quick taps create one client', async () => {
    let finish;
    const app = appWith({ addManagedClient: vi.fn(() => new Promise(r => { finish = r; })) });
    renderPage(<ClientsPage />, app, '/clients');
    open();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sam' } });
    const form = screen.getByLabelText('Name').closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);
    finish({ ...NO_APP, name: 'Sam' });
    await waitFor(() => expect(app.addManagedClient).toHaveBeenCalledTimes(1));
  });

  test('a failure says so and keeps what was typed', async () => {
    const app = appWith({ addManagedClient: vi.fn(async () => { throw new Error('offline'); }) });
    renderPage(<ClientsPage />, app, '/clients');
    open();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sam' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Add client/ }).at(-1));
    expect(await screen.findByText(/Couldn't add the client/)).toBeTruthy();
    expect(screen.getByLabelText('Name').value).toBe('Sam');
  });

  test('a client without the app is marked as such in the list; one with it is not', () => {
    renderPage(<ClientsPage />, appWith(), '/clients');
    const card = (name) => screen.getByText(name).closest('.client-card');
    expect(within(card('Nora NoApp')).queryByText('No app')).toBeTruthy();
    expect(within(card('Rita Real')).queryByText('No app')).toBeNull();
  });
});

describe('nothing is offered that could only reach a client through the app', () => {
  const itemFor = (name) => screen.getAllByText(name).map(n => n.closest('.needs-attention-item')).find(Boolean);

  test('renewal due: a reminder button for the client with the app, none for the one without', () => {
    renderPage(<TrainerDashboard />, appWith());
    expect(within(itemFor('Rita Real')).queryByText(/reminder/i)).toBeTruthy();
    expect(within(itemFor('Nora NoApp')).queryByText(/reminder/i)).toBeNull();
  });

  test('no check-in message, and no training-profile nudge, for a client without the app', () => {
    // Both have sessions left, no activity, no training profile and a session coming up:
    // both are "at risk", and only the one with the app can be asked for a profile.
    const upcoming = (clientId) => ({ id: `s-${clientId}`, trainerId: 'coach-1', clientId, date: '2999-01-01', time: '10:00', status: 'confirmed' });
    renderPage(<TrainerDashboard />, appWith({
      getSessionStats: () => ({ used: 0, total: 10, remaining: 10 }),
      getSchedule: ({ clientId } = {}) => [REAL, NO_APP].filter(c => !clientId || c.id === clientId).map(c => upcoming(c.id)),
    }));
    fireEvent.click(screen.getByText(/Show all|View all|more/i));
    const items = (name) => screen.getAllByText(name).map(n => n.closest('.needs-attention-item')).filter(Boolean);
    expect(items('Rita Real').some(i => within(i).queryAllByText(/check-in/i).length)).toBe(true);
    expect(items('Rita Real').some(i => within(i).queryAllByText(/Ask to complete profile/i).length)).toBe(true);
    expect(items('Nora NoApp').some(i => within(i).queryAllByText(/check-in/i).length)).toBe(false);
    expect(items('Nora NoApp').some(i => within(i).queryAllByText(/Ask to complete profile/i).length)).toBe(false);
  });

  test('completing a session: a recap message is offered and sent to the client with the app only', async () => {
    const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    const session = (c) => ({ id: `s-${c.id}`, trainerId: 'coach-1', clientId: c.id, date: today, time: '09:00', type: 'PT', status: 'confirmed' });
    const app = appWith({
      getSessionStats: () => ({ used: 0, total: 10, remaining: 10 }),
      getSchedule: () => [session(REAL), session(NO_APP)],
      updateScheduleItem: vi.fn(async () => {}),
      sendMessage: vi.fn(async () => {}),
    });
    renderPage(<TrainerDashboard />, app);
    const complete = () => screen.getAllByTitle('Mark as complete');

    fireEvent.click(complete()[1]); // NO_APP's session
    expect(screen.queryByText('Send recap message to client')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Mark Complete|Complete/ }));
    await waitFor(() => expect(app.updateScheduleItem).toHaveBeenCalledWith(`s-${NO_APP.id}`, { status: 'completed' }));
    expect(app.sendMessage).not.toHaveBeenCalled();

    fireEvent.click(complete()[0]); // REAL's session
    expect(screen.getByText('Send recap message to client')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Mark Complete|Complete/ }));
    await waitFor(() => expect(app.sendMessage).toHaveBeenCalledWith('coach-1', REAL.id, expect.stringContaining('Session Recap')));
  });

  test('Messages lists only clients who can read a message', () => {
    renderPage(<MessagesPage />, appWith(), '/messages');
    expect(screen.queryAllByText('Rita Real').length).toBeGreaterThan(0);
    expect(screen.queryByText('Nora NoApp')).toBeNull();
  });
});
