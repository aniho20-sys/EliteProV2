import { describe, test, expect } from 'vitest';
import { setupSteps } from './setupSteps';

// The "first booking" step (B39). The coach's app loads only recent sessions (B76), so a
// coach whose bookings are all older than that must not be told to book their first one.
const coach = { id: 'coach', renewalRate: 40, bankDetails: { accountNumber: '12345678' } };
const book = (args) => setupSteps({ currentUser: coach, ...args }).find(s => s.key === 'book').done;

describe('setup checklist: first booking', () => {
  test('a booking with a client in what is loaded: done', () => {
    expect(book({ clients: [{ id: 'c1' }], schedule: [{ clientId: 'c1', date: '2026-10-20' }] })).toBe(true);
  });
  test('no booking loaded, but a client has used a session: done — the booking is just older', () => {
    expect(book({ clients: [{ id: 'c1', totalSessions: 10, sessionOffset: 3 }], schedule: [] })).toBe(true);
  });
  test('no booking and no session used: not done', () => {
    expect(book({ clients: [{ id: 'c1', totalSessions: 10, sessionOffset: 0 }], schedule: [] })).toBe(false);
  });
  test('only a blocked-out hour: not done', () => {
    expect(book({ clients: [{ id: 'c1' }], schedule: [{ isBlocked: true, date: '2026-10-20' }] })).toBe(false);
  });
});
