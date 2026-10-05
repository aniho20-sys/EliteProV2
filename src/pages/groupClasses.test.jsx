// @vitest-environment jsdom
//
// B40: group classes on the public booking page — a stranger joining one, and the coach
// putting one on, seeing who has booked, and cancelling it. Driven through the real
// components; the server side is the 'group classes' block in
// functions/test/publicBooking.test.js. Firebase is replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: PublicBookingPage } = await import('./PublicBookingPage');
const { default: GroupClassesCard } = await import('../components/GroupClassesCard');
const { default: TrialRequestsCard } = await import('../components/TrialRequestsCard');

const CLASS = { id: 'gc1', date: '2099-01-06', time: '18:00', minutes: 60, title: 'Strength circuit', price: 15, spotsLeft: 2 };
const PAGE = {
  coachName: 'Ani Ho Fitness', price: 25, currency: 'GBP', minutes: 60, timeZone: 'Europe/London',
  slots: [{ date: '2099-01-05', time: '09:00' }], groupClasses: [CLASS],
};
const callableError = (code, message = '') => Object.assign(new Error(message), { code: `functions/${code}`, message });

function renderWith(element, app, path = '/book/abcdefgh23') {
  return render(
    <AppContext.Provider value={{ currentUser: null, setLanguage: vi.fn(), ...app }}>
      <LanguageProvider><ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/book/:slug" element={element} />
            <Route path="*" element={element} />
          </Routes>
        </MemoryRouter>
      </ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); window.scrollTo = vi.fn(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('joining a class from the public page', () => {
  const pageApp = (over = {}) => ({
    getPublicBookingPage: vi.fn(async () => PAGE), requestTrialSession: vi.fn(async () => {}), ...over,
  });
  const fill = () => {
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jo Bloggs' } });
    fireEvent.change(screen.getByLabelText('Phone number or email'), { target: { value: '07700 900123' } });
    fireEvent.click(screen.getByRole('checkbox'));
  };

  test('pick "Group class", pick a class, send → the request names the class', async () => {
    const app = pageApp();
    renderWith(<PublicBookingPage />, app);
    await screen.findByText('Book a trial session with Ani Ho Fitness');
    fireEvent.click(screen.getByRole('button', { name: 'Group class' }));
    expect(screen.getByText('Join a group class with Ani Ho Fitness')).toBeTruthy();
    const option = screen.getByRole('button', { name: /Strength circuit/ });
    expect(within(option).getByText(/GBP 15\.00 per person · 2 places left/)).toBeTruthy();
    fireEvent.click(option);
    fill();
    fireEvent.click(screen.getByRole('button', { name: /Send request/ }));
    await waitFor(() => expect(app.requestTrialSession).toHaveBeenCalledTimes(1));
    expect(app.requestTrialSession.mock.calls[0][0]).toMatchObject({ slug: 'abcdefgh23', groupClassId: 'gc1' });
    expect(await screen.findByText(/confirm your place on/)).toBeTruthy();
  });

  test('switching back to 1-to-1 shows the trial times again, with nothing chosen', async () => {
    renderWith(<PublicBookingPage />, pageApp());
    await screen.findByText('Book a trial session with Ani Ho Fitness');
    fireEvent.click(screen.getByRole('button', { name: 'Group class' }));
    fireEvent.click(screen.getByRole('button', { name: /Strength circuit/ }));
    fireEvent.click(screen.getByRole('button', { name: '1-to-1 trial' }));
    expect(screen.getByRole('button', { name: '09:00' })).toBeTruthy();
    expect(screen.queryByLabelText('Your name')).toBeNull();
  });

  test('no 1-to-1 times but a class on: the class is what is shown', async () => {
    renderWith(<PublicBookingPage />, pageApp({ getPublicBookingPage: vi.fn(async () => ({ ...PAGE, slots: [] })) }));
    expect(await screen.findByText('Join a group class with Ani Ho Fitness')).toBeTruthy();
  });

  test('no classes: no choice offered at all', async () => {
    renderWith(<PublicBookingPage />, pageApp({ getPublicBookingPage: vi.fn(async () => ({ ...PAGE, groupClasses: [] })) }));
    await screen.findByText('Book a trial session with Ani Ho Fitness');
    expect(screen.queryByRole('button', { name: 'Group class' })).toBeNull();
  });

  test('a class that fills meanwhile: says so and shows fresh classes', async () => {
    const app = pageApp({ requestTrialSession: vi.fn(async () => { throw callableError('failed-precondition', 'Class full'); }) });
    renderWith(<PublicBookingPage />, app);
    await screen.findByText('Book a trial session with Ani Ho Fitness');
    fireEvent.click(screen.getByRole('button', { name: 'Group class' }));
    fireEvent.click(screen.getByRole('button', { name: /Strength circuit/ }));
    fill();
    fireEvent.click(screen.getByRole('button', { name: /Send request/ }));
    expect(await screen.findByText(/that class has just filled up/)).toBeTruthy();
    await waitFor(() => expect(app.getPublicBookingPage).toHaveBeenCalledTimes(2));
  });
});

describe('the coach\'s Group classes card', () => {
  const COACH = { id: 'coach-1', role: 'trainer', currency: 'GBP', timeZone: 'Europe/London', publicBooking: { enabled: true } };
  const OPEN = { id: 'gc1', trainerId: 'coach-1', date: '2099-01-06', time: '18:00', title: 'Strength circuit', price: 15, capacity: 3, minPeople: 2, status: 'open' };
  const cardApp = (over = {}) => ({
    currentUser: COACH,
    getSchedule: () => [
      { id: 's1', trainerId: 'coach-1', clientId: 'c1', groupClassId: 'gc1', status: 'confirmed' },
      { id: 's2', trainerId: 'coach-1', clientId: 'c2', groupClassId: 'gc1', status: 'cancelled' },
      { id: 'gc-gc1', trainerId: 'coach-1', clientId: '', groupClassId: 'gc1', isBlocked: true, status: 'blocked' },
    ],
    subscribeGroupClasses: vi.fn((cb) => { cb([OPEN, { ...OPEN, id: 'old', status: 'cancelled' }]); return () => {}; }),
    subscribeTrialRequests: vi.fn((cb) => { cb([{ id: 'r1', groupClassId: 'gc1' }, { id: 'r2' }]); return () => {}; }),
    saveGroupClass: vi.fn(async () => ({ id: 'gc2' })),
    cancelGroupClass: vi.fn(async () => ({ tell: [{ name: 'Jo Bloggs', contact: '07700 900123' }] })),
    ...over,
  });
  const renderCard = (app) => renderWith(<GroupClassesCard />, app, '/profile');

  test('an open class: places booked (not cancelled ones, not the calendar block), and requests waiting', () => {
    renderCard(cardApp());
    expect(screen.getByText('Strength circuit')).toBeTruthy();
    expect(screen.getByText(/1 of 3 booked · runs with 2 or more/)).toBeTruthy();
    expect(screen.getByText(/1 waiting for your OK/)).toBeTruthy();
    expect(screen.getAllByText('Strength circuit')).toHaveLength(1); // the cancelled one is not listed
  });

  test('adding a class sends the numbers as numbers', async () => {
    const app = cardApp();
    renderCard(app);
    fireEvent.click(screen.getByRole('button', { name: /Add class/ }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-02-01' } });
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '07:30' } });
    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Price per person (GBP)'), { target: { value: '12.5' } });
    fireEvent.change(screen.getByLabelText('Class name (optional)'), { target: { value: 'Mobility' } });
    fireEvent.submit(screen.getByLabelText('Date').closest('form'));
    await waitFor(() => expect(app.saveGroupClass).toHaveBeenCalledWith({
      date: '2099-02-01', time: '07:30', title: 'Mobility', capacity: 4, minPeople: 2, price: 12.5,
    }));
  });

  test('a class over something already in the calendar is refused with a reason', async () => {
    renderCard(cardApp({ saveGroupClass: vi.fn(async () => { throw callableError('failed-precondition'); }) }));
    fireEvent.click(screen.getByRole('button', { name: /Add class/ }));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-02-01' } });
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '07:30' } });
    fireEvent.change(screen.getByLabelText('Price per person (GBP)'), { target: { value: '10' } });
    fireEvent.submit(screen.getByLabelText('Date').closest('form'));
    expect(await screen.findByText('You already have something at that time')).toBeTruthy();
  });

  test('cancelling asks first, then lists who to tell — with WhatsApp where the number is certain', async () => {
    const app = cardApp();
    renderCard(app);
    fireEvent.click(screen.getByRole('button', { name: /Cancel class/ }));
    expect(app.cancelGroupClass).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));
    await waitFor(() => expect(app.cancelGroupClass).toHaveBeenCalledWith('gc1'));
    expect(await screen.findByText('Let them know')).toBeTruthy();
    expect(screen.getByText('Jo Bloggs')).toBeTruthy();
    expect(screen.getByText('WhatsApp').closest('a').getAttribute('href')).toBe('https://wa.me/447700900123');
  });

  test('page off: says the classes will not be seen until it is on', () => {
    renderCard(cardApp({ currentUser: { ...COACH, publicBooking: { enabled: false } } }));
    expect(screen.getByText(/Turn on your public booking page/)).toBeTruthy();
  });
});

test('a request for a class says which class on the dashboard', async () => {
  renderWith(<TrialRequestsCard />, {
    currentUser: { id: 'coach-1' },
    subscribeTrialRequests: (cb) => { cb([{ id: 'r1', name: 'Jo Bloggs', contact: 'jo@example.test', date: '2099-01-06', time: '18:00', groupClassId: 'gc1', classTitle: 'Strength circuit' }]); return () => {}; },
    respondTrialRequest: vi.fn(async () => ({ confirmed: true })),
  }, '/');
  expect(await screen.findByText('Group class · Strength circuit')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Confirm & add client/ }));
  expect(await screen.findByText(/Jo Bloggs added — place confirmed/)).toBeTruthy();
});
