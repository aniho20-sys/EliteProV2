import { renewalRates } from './renewalRates';

// A new coach's four steps to taking bookings and payments (B39, 2026-10-05). Each step is
// worked out from what the coach has actually done — not from taps on this card — so it
// stays until the last one is done, and comes back if, say, the price is cleared. The old
// card had three steps and vanished as soon as one client existed, so a coach was never
// told to set a price, bank details or a session pack.
export function setupSteps({ currentUser, clients, schedule }) {
  const firstWithoutSessions = clients.find(c => c.totalSessions === null || c.totalSessions === undefined);
  return [
    { key: 'client', done: clients.length > 0, to: '/clients' },
    {
      key: 'price',
      done: renewalRates(currentUser).now !== null && !!currentUser.bankDetails?.accountNumber,
      to: '/profile', state: { focus: 'pricing' },
    },
    {
      key: 'sessions',
      done: clients.some(c => c.totalSessions !== null && c.totalSessions !== undefined),
      to: firstWithoutSessions ? `/clients/${firstWithoutSessions.id}` : '/clients',
    },
    { key: 'book', done: schedule.some(s => !s.isBlocked && s.clientId), to: '/schedule' },
  ];
}
