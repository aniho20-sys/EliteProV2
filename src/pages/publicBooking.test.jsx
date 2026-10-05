// @vitest-environment jsdom
//
// B38: the public booking page a stranger opens, the coach's Profile card that turns it
// on, and the trial requests on the coach's dashboard — driven through the real
// components. The server side (what is offered, what is stored, budgets, bots) is
// functions/test/publicBooking.test.js. Firebase is replaced (#38).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within, act } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null }, functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => vi.fn() }));

const { AppContext } = await import('../context/AppContext');
const { ToastProvider } = await import('../context/ToastContext');
const { LanguageProvider } = await import('../i18n/LanguageContext');
const { default: PublicBookingPage } = await import('./PublicBookingPage');
const { default: PublicBookingCard } = await import('../components/PublicBookingCard');
const { default: TrialRequestsCard } = await import('../components/TrialRequestsCard');

const PAGE = {
  coachName: 'Ani Ho Fitness', price: 20, currency: 'GBP', minutes: 60, timeZone: 'Europe/London',
  slots: [
    { date: '2026-10-05', time: '09:00' }, { date: '2026-10-05', time: '10:00' },
    { date: '2026-10-06', time: '14:00' },
  ],
};
const callableError = (code, message = '') => Object.assign(new Error(message), { code: `functions/${code}`, message });

function renderWith(element, app, path = '/book/abcdefgh23') {
  return render(
    <AppContext.Provider value={{ currentUser: null, setLanguage: vi.fn(), ...app }}>
      <LanguageProvider><ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/book/:slug" element={element} />
            <Route path="/privacy" element={<div>privacy page</div>} />
            <Route path="*" element={element} />
          </Routes>
        </MemoryRouter>
      </ToastProvider></LanguageProvider>
    </AppContext.Provider>,
  );
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('the page a stranger opens', () => {
  const pageApp = (over = {}) => ({
    getPublicBookingPage: vi.fn(async () => PAGE),
    requestTrialSession: vi.fn(async () => {}),
    ...over,
  });
  const fill = () => {
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jo Bloggs' } });
    fireEvent.change(screen.getByLabelText('Phone number or email'), { target: { value: '07700 900123' } });
    fireEvent.click(screen.getByRole('checkbox'));
  };

  test('pick a time, fill in name and contact, agree → the request goes with exactly that, and it says what happens next', async () => {
    const app = pageApp();
    renderWith(<PublicBookingPage />, app);
    expect(await screen.findByText('Book a trial session with Ani Ho Fitness')).toBeTruthy();
    expect(app.getPublicBookingPage).toHaveBeenCalledWith('abcdefgh23');
    expect(screen.getByText(/GBP 20\.00 · 60 minutes/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '10:00' }));
    const send = screen.getByRole('button', { name: /Send request/ });
    expect(send.disabled).toBe(true);
    fill();
    expect(send.disabled).toBe(false);
    fireEvent.click(send);

    await waitFor(() => expect(app.requestTrialSession).toHaveBeenCalledTimes(1));
    expect(app.requestTrialSession).toHaveBeenCalledWith({
      slug: 'abcdefgh23', date: '2026-10-05', time: '10:00',
      name: 'Jo Bloggs', contact: '07700 900123', message: '', consent: true, website: '',
    });
    expect(await screen.findByText('Request sent')).toBeTruthy();
    expect(screen.getByText(/Ani Ho Fitness will contact you to confirm/)).toBeTruthy();
  });

  test('another day shows that day\'s times', async () => {
    renderWith(<PublicBookingPage />, pageApp());
    await screen.findByText('Book a trial session with Ani Ho Fitness');
    expect(screen.queryByRole('button', { name: '14:00' })).toBeNull();
    const dayButtons = within(screen.getByRole('group', { name: 'Choose a day' })).getAllByRole('button');
    expect(dayButtons).toHaveLength(2);
    fireEvent.click(dayButtons[1]);
    expect(screen.getByRole('button', { name: '14:00' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '09:00' })).toBeNull();
  });

  // Ani 2026-10-05: her request said "sent" and never arrived. The hidden bot trap was named
  // "website", which phone AutoFill fills from the contact card — so a person was taken for
  // a bot and their request silently dropped. The trap must carry no name AutoFill knows.
  test('the hidden bot trap has a name no AutoFill recognises, and AutoFill is off', async () => {
    renderWith(<PublicBookingPage />, pageApp());
    fireEvent.click(await screen.findByRole('button', { name: '09:00' }));
    const trap = document.querySelector('.public-book-trap input');
    expect(trap.getAttribute('autocomplete')).toBe('off');
    expect(trap.getAttribute('name')).not.toMatch(/web|url|site|homepage|company|org|name|mail|phone|tel|address|city|zip|post/i);
    expect(trap.id || '').not.toMatch(/web|url|site/i);
  });

  test('no agreement, no request', async () => {
    const app = pageApp();
    renderWith(<PublicBookingPage />, app);
    fireEvent.click(await screen.findByRole('button', { name: '09:00' }));
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jo' } });
    fireEvent.change(screen.getByLabelText('Phone number or email'), { target: { value: 'jo@example.test' } });
    fireEvent.submit(screen.getByLabelText('Your name').closest('form'));
    expect(app.requestTrialSession).not.toHaveBeenCalled();
  });

  test('two quick taps send one request', async () => {
    let finish;
    const app = pageApp({ requestTrialSession: vi.fn(() => new Promise(r => { finish = r; })) });
    renderWith(<PublicBookingPage />, app);
    fireEvent.click(await screen.findByRole('button', { name: '09:00' }));
    fill();
    const form = screen.getByLabelText('Your name').closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);
    finish();
    await screen.findByText('Request sent');
    expect(app.requestTrialSession).toHaveBeenCalledTimes(1);
  });

  test('a time taken meanwhile: says so, keeps what was typed, and shows fresh times', async () => {
    const app = pageApp({ requestTrialSession: vi.fn(async () => { throw callableError('failed-precondition', 'Slot taken'); }) });
    renderWith(<PublicBookingPage />, app);
    fireEvent.click(await screen.findByRole('button', { name: '09:00' }));
    fill();
    fireEvent.click(screen.getByRole('button', { name: /Send request/ }));
    expect(await screen.findByText(/that time has just been taken/)).toBeTruthy();
    await waitFor(() => expect(app.getPublicBookingPage).toHaveBeenCalledTimes(2));
    // The form closes until another time is picked; the details are still there when it reopens.
    expect(screen.queryByLabelText('Your name')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '10:00' }));
    expect(screen.getByLabelText('Your name').value).toBe('Jo Bloggs');
  });

  test('server limits and a bad contact each get their own message', async () => {
    for (const [err, text] of [
      [callableError('resource-exhausted'), /Too many requests today/],
      [callableError('invalid-argument', 'contact'), /phone number or an email address/],
      [new Error('offline'), /Couldn't send your request/],
    ]) {
      const app = pageApp({ requestTrialSession: vi.fn(async () => { throw err; }) });
      renderWith(<PublicBookingPage />, app);
      fireEvent.click(await screen.findByRole('button', { name: '09:00' }));
      fill();
      fireEvent.click(screen.getByRole('button', { name: /Send request/ }));
      expect(await screen.findByText(text)).toBeTruthy();
      cleanup();
    }
  });

  test('free, no times, unknown link, and a failed load', async () => {
    renderWith(<PublicBookingPage />, pageApp({ getPublicBookingPage: vi.fn(async () => ({ ...PAGE, price: 0, slots: [] })) }));
    expect(await screen.findByText(/Free · 60 minutes/)).toBeTruthy();
    expect(screen.getByText('No free times in the next two weeks')).toBeTruthy();
    cleanup();

    renderWith(<PublicBookingPage />, pageApp({ getPublicBookingPage: vi.fn(async () => { throw callableError('not-found'); }) }));
    expect(await screen.findByText("This booking page isn't available")).toBeTruthy();
    cleanup();

    const app = pageApp({ getPublicBookingPage: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(PAGE) });
    renderWith(<PublicBookingPage />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Book a trial session with Ani Ho Fitness')).toBeTruthy();
  });
});

describe('English or 繁體中文, and the usual price (Ani 2026-10-05)', () => {
  const pageApp = (over = {}) => ({ getPublicBookingPage: vi.fn(async () => PAGE), requestTrialSession: vi.fn(), ...over });

  test('a visitor switches the page to 繁體中文 and back; nothing is saved', async () => {
    const app = pageApp({ setLanguage: vi.fn() });
    renderWith(<PublicBookingPage />, app);
    expect(await screen.findByText('Book a trial session with Ani Ho Fitness')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '繁體中文' }));
    expect(await screen.findByText('預約與Ani Ho Fitness的體驗堂')).toBeTruthy();
    expect(screen.getByRole('button', { name: '繁體中文' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByText('Book a trial session with Ani Ho Fitness')).toBeTruthy();
    expect(app.setLanguage).not.toHaveBeenCalled();
  });

  test('leaving the page drops the choice, so a signed-in coach is back in their own language', async () => {
    const { useLanguage } = await import('../i18n/LanguageContext');
    function Probe() { const { lang } = useLanguage(); return <div>lang={lang}</div>; }
    function Harness() {
      const [onPage, setOnPage] = useState(true);
      return <><button type="button" onClick={() => setOnPage(false)}>leave</button>{onPage ? <PublicBookingPage /> : <Probe />}</>;
    }
    renderWith(<Harness />, pageApp());
    await screen.findByText('Book a trial session with Ani Ho Fitness');
    fireEvent.click(screen.getByRole('button', { name: '繁體中文' }));
    await screen.findByText('預約與Ani Ho Fitness的體驗堂');
    fireEvent.click(screen.getByRole('button', { name: 'leave' }));
    expect(await screen.findByText('lang=en')).toBeTruthy();
  });

  test('the usual price beside a cheaper trial, and only then', async () => {
    renderWith(<PublicBookingPage />, pageApp({ getPublicBookingPage: vi.fn(async () => ({ ...PAGE, price: 25, usualPrice: 65 })) }));
    expect(await screen.findByText('Usually GBP 65.00')).toBeTruthy();
    cleanup();

    renderWith(<PublicBookingPage />, pageApp({ getPublicBookingPage: vi.fn(async () => ({ ...PAGE, usualPrice: null })) }));
    await screen.findByText('Book a trial session with Ani Ho Fitness');
    expect(screen.queryByText(/Usually/)).toBeNull();
  });
});

describe('the coach turns the page on (Profile)', () => {
  const coach = (publicBooking) => ({
    id: 'coach-1', name: 'Ani Ho', role: 'trainer', currency: 'GBP',
    workingHours: { start: '07:00', end: '20:00' }, ...(publicBooking ? { publicBooking } : {}),
  });

  test('on, a price, the days ticked → saved through the server', async () => {
    const savePublicBooking = vi.fn(async () => ({}));
    renderWith(<PublicBookingCard />, { currentUser: coach(), savePublicBooking }, '/profile');
    expect(screen.getByText(/working hours \(07:00–20:00\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Trial session price (GBP)'), { target: { value: '25' } });
    const days = within(screen.getByRole('group', { name: 'Days you take trial sessions' })).getAllByRole('button');
    expect(days.map(b => b.textContent)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    fireEvent.click(days[5]);  // Saturday on
    fireEvent.click(days[0]);  // Monday off
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(savePublicBooking).toHaveBeenCalledWith({ enabled: true, price: 25, days: [2, 3, 4, 5, 6] }));
    expect(await screen.findByText('Booking page is on')).toBeTruthy();
  });

  test('turning on with no days, or a nonsense price, is stopped before the server', async () => {
    const savePublicBooking = vi.fn();
    renderWith(<PublicBookingCard />, { currentUser: coach({ enabled: false, price: 0, days: [] }), savePublicBooking }, '/profile');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    expect(await screen.findByText('Choose at least one day')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Trial session price (GBP)'), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    expect(await screen.findByText('Enter a price from 0 to 1000')).toBeTruthy();
    expect(savePublicBooking).not.toHaveBeenCalled();
  });

  test('the link appears once the page is on, and only then', () => {
    renderWith(<PublicBookingCard />, { currentUser: coach({ enabled: true, price: 0, days: [1], slug: 'abcdefgh23' }), savePublicBooking: vi.fn() }, '/profile');
    // No # in the shared link: its preview names the coach (functions/bookingPreview.js).
    expect(screen.getByText('https://elitepro-16718.web.app/book/abcdefgh23')).toBeTruthy();
    cleanup();
    renderWith(<PublicBookingCard />, { currentUser: coach({ enabled: false, price: 0, days: [1], slug: 'abcdefgh23' }), savePublicBooking: vi.fn() }, '/profile');
    expect(screen.queryByText(/\/book\//)).toBeNull();
  });

  test('a failed save says so', async () => {
    renderWith(<PublicBookingCard />, { currentUser: coach(), savePublicBooking: vi.fn(async () => { throw new Error('offline'); }) }, '/profile');
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    expect(await screen.findByText("Couldn't save. Please try again.")).toBeTruthy();
  });
});

describe('trial requests on the coach\'s dashboard', () => {
  const REQUESTS = [
    { id: 'r1', name: 'Jo Bloggs', contact: '07700 900123', message: 'Bad back', date: '2026-10-05', time: '10:00' },
    { id: 'r2', name: 'Sam Lee', contact: 'sam@example.test', message: '', date: '2026-10-06', time: '14:00' },
  ];
  const item = (name) => screen.getByText(name).closest('.trial-request');
  // What AppContext.subscribeTrialRequests does: report the list now, and again on change.
  let push;
  const live = (list) => vi.fn((onChange) => { push = onChange; onChange(list); return () => {}; });

  test('each request: who, when, how to reach them', async () => {
    renderWith(<TrialRequestsCard />, { subscribeTrialRequests: live(REQUESTS), respondTrialRequest: vi.fn() }, '/');
    await screen.findByText('Jo Bloggs');
    expect(within(item('Jo Bloggs')).getByText('Call').closest('a').getAttribute('href')).toBe('tel:07700900123');
    expect(within(item('Jo Bloggs')).getByText('Text').closest('a').getAttribute('href')).toBe('sms:07700900123');
    expect(within(item('Jo Bloggs')).getByText('Bad back')).toBeTruthy();
    expect(within(item('Sam Lee')).getByText('Email').closest('a').getAttribute('href')).toBe('mailto:sam@example.test');
    expect(within(item('Sam Lee')).queryByText('Call')).toBeNull();
  });

  test('WhatsApp for a UK mobile when the coach is in the UK; none when the country is unsure', async () => {
    renderWith(<TrialRequestsCard />, { currentUser: { id: 'c', timeZone: 'Europe/London' }, subscribeTrialRequests: live(REQUESTS), respondTrialRequest: vi.fn() }, '/');
    await screen.findByText('Jo Bloggs');
    expect(within(item('Jo Bloggs')).getByText('WhatsApp').closest('a').getAttribute('href')).toBe('https://wa.me/447700900123');
    expect(within(item('Sam Lee')).queryByText('WhatsApp')).toBeNull(); // an email
    cleanup();
    renderWith(<TrialRequestsCard />, { currentUser: { id: 'c' }, subscribeTrialRequests: live(REQUESTS), respondTrialRequest: vi.fn() }, '/');
    await screen.findByText('Jo Bloggs');
    expect(within(item('Jo Bloggs')).queryByText('WhatsApp')).toBeNull();
  });

  test('confirm: answered on the server, gone from the list', async () => {
    const respondTrialRequest = vi.fn(async () => ({ confirmed: true }));
    renderWith(<TrialRequestsCard />, { subscribeTrialRequests: live(REQUESTS), respondTrialRequest }, '/');
    await screen.findByText('Jo Bloggs');
    fireEvent.click(within(item('Jo Bloggs')).getByRole('button', { name: /Confirm & add client/ }));
    await waitFor(() => expect(respondTrialRequest).toHaveBeenCalledWith('r1', 'confirm'));
    await waitFor(() => expect(screen.queryByText('Jo Bloggs')).toBeNull());
    expect(screen.getByText(/Jo Bloggs added — trial session booked/)).toBeTruthy();
    expect(screen.getByText('Sam Lee')).toBeTruthy();
  });

  test('decline asks once more, because it deletes the request', async () => {
    const respondTrialRequest = vi.fn(async () => ({ declined: true }));
    renderWith(<TrialRequestsCard />, { subscribeTrialRequests: live(REQUESTS), respondTrialRequest }, '/');
    await screen.findByText('Sam Lee');
    fireEvent.click(within(item('Sam Lee')).getByRole('button', { name: /Decline/ }));
    expect(respondTrialRequest).not.toHaveBeenCalled();
    fireEvent.click(within(item('Sam Lee')).getByRole('button', { name: 'Keep' }));
    fireEvent.click(within(item('Sam Lee')).getByRole('button', { name: /Decline/ }));
    fireEvent.click(within(item('Sam Lee')).getByRole('button', { name: 'Yes, decline' }));
    await waitFor(() => expect(respondTrialRequest).toHaveBeenCalledWith('r2', 'decline'));
    await waitFor(() => expect(screen.queryByText('Sam Lee')).toBeNull());
  });

  test('a failure keeps the request and says so', async () => {
    renderWith(<TrialRequestsCard />, {
      subscribeTrialRequests: live(REQUESTS),
      respondTrialRequest: vi.fn(async () => { throw new Error('offline'); }),
    }, '/');
    await screen.findByText('Jo Bloggs');
    fireEvent.click(within(item('Jo Bloggs')).getByRole('button', { name: /Confirm & add client/ }));
    expect(await screen.findByText(/Couldn't update the request/)).toBeTruthy();
    expect(screen.getByText('Jo Bloggs')).toBeTruthy();
  });

  test('nothing to answer, or nothing loadable: no card at all', async () => {
    const empty = live([]);
    const { container } = renderWith(<TrialRequestsCard />, { subscribeTrialRequests: empty, respondTrialRequest: vi.fn() }, '/');
    await waitFor(() => expect(empty).toHaveBeenCalled());
    expect(container.querySelector('.card')).toBeNull();
    cleanup();
    const failing = vi.fn((_onChange, onError) => { onError(new Error('permission-denied')); return () => {}; });
    const second = renderWith(<TrialRequestsCard />, { subscribeTrialRequests: failing, respondTrialRequest: vi.fn() }, '/');
    await waitFor(() => expect(failing).toHaveBeenCalled());
    expect(second.container.querySelector('.card')).toBeNull();
  });

  // Ani 2026-10-05: sent a request from a student account, the coach side showed nothing.
  // The card read the list once, when the dashboard opened; an installed app keeps its
  // screen, so a request sent afterwards never appeared.
  test('a request sent while the dashboard is open appears without reloading', async () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((onChange) => { push = onChange; onChange([]); return unsubscribe; });
    const { unmount } = renderWith(<TrialRequestsCard />, { subscribeTrialRequests: subscribe, respondTrialRequest: vi.fn() }, '/');
    expect(screen.queryByText('Trial requests')).toBeNull();
    act(() => push([REQUESTS[0]]));
    expect(await screen.findByText('Jo Bloggs')).toBeTruthy();
    expect(subscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

// A callable the app calls by a name the server does not export fails only on a phone,
// as "not found". Covers every callable in AppContext, not just this feature's.
test('every callable AppContext calls is exported by functions/index.js', () => {
  const app = readFileSync(join(cwd(), 'src/context/AppContext.jsx'), 'utf8');
  const server = readFileSync(join(cwd(), 'functions/index.js'), 'utf8');
  const called = [...app.matchAll(/httpsCallable\(functions, '(\w+)'\)/g)].map(m => m[1]);
  const exported = new Set([...server.matchAll(/^exports\.(\w+) = functions\.https\.onCall/gm)].map(m => m[1]));
  expect(called).toEqual(expect.arrayContaining(['savePublicBooking', 'respondTrialRequest', 'getPublicBookingPage', 'requestTrialSession']));
  expect(called.filter(name => !exported.has(name))).toEqual([]);
});
