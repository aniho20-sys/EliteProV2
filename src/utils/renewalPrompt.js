import { localToday, parseLocalDate } from './dateUtils';
import { RENEWAL_PROMPT_THRESHOLD } from './sessionUtils';

// How long "Remind me later" holds the prompt back. Long enough not to nag on every
// booking, short enough that a client burning through a small balance still hears about
// the rate lock before it lapses.
export const RENEWAL_SNOOZE_DAYS = 3;

// The field the client writes when they snooze. Deliberately NOT `renewalSnoozedUntil`,
// which TrainerDashboard already uses for the trainer snoozing their own Needs Attention
// row — sharing one field would let either side silently clear the other's snooze.
export const RENEWAL_SNOOZE_FIELD = 'renewalPromptSnoozedUntil';

// Date maths on an explicit day rather than "now", so the caller (and the tests) decide
// what today is. dateUtils' localDateAdd is always relative to the system clock.
const addDays = (dateStr, days) => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const renewalSnoozeUntil = (today = localToday()) => addDays(today, RENEWAL_SNOOZE_DAYS);

export const isRenewalPromptSnoozed = (client, today = localToday()) => {
  const until = client?.[RENEWAL_SNOOZE_FIELD];
  return !!until && until > today;
};

// Which renewal message a client should see after a booking, or null for none.
//
// `remainingAfter` is the balance the booking leaves behind, which is one lower than the
// figure on screen when it was made — the credit is deducted server-side by
// onScheduleBooked and the listener has not caught up yet at the point of asking.
//
// Returns a kind rather than a string so the caller owns the copy, and so the decision
// stays testable without rendering anything.
export const renewalPromptKind = ({ remainingAfter, trainer, client, today = localToday() }) => {
  if (remainingAfter === null || remainingAfter === undefined) return null;
  if (!trainer?.renewalRate || !trainer?.renewalRateNext) return null;
  if (isRenewalPromptSnoozed(client, today)) return null;
  if (remainingAfter < 0) return 'overdraft';
  if (remainingAfter <= RENEWAL_PROMPT_THRESHOLD) return 'low';
  return null;
};
