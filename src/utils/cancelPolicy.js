// Each coach's own cancellation rule (Ani 2026-10-29, B82): how many hours before a session a
// client must cancel to get it back, and how many times a calendar month (null = no limit).
// The server applies the same rule when it refunds — functions/cancelPolicy.js, kept in step
// by src/utils/cancelPolicy.test.js. Until a coach chooses: 24 hours, twice a month, which is
// what every coach had before. A cancel by the coach is always refunded (B77), whatever this says.

export const NOTICE_OPTIONS = [6, 12, 24, 48];
export const FREE_OPTIONS = [0, 1, 2, 3, 4, null];
export const NOTE_MAX = 300;
export const DEFAULT_CANCEL_POLICY = { noticeHours: 24, freePerMonth: 2, note: '' };

export function cancelPolicy(coach) {
  const p = (coach && coach.cancelPolicy) || {};
  return {
    noticeHours: NOTICE_OPTIONS.includes(p.noticeHours) ? p.noticeHours : DEFAULT_CANCEL_POLICY.noticeHours,
    freePerMonth: FREE_OPTIONS.includes(p.freePerMonth) ? p.freePerMonth : DEFAULT_CANCEL_POLICY.freePerMonth,
    note: typeof p.note === 'string' ? p.note.slice(0, NOTE_MAX) : '',
  };
}

// Whether a cancel now would be a late one: the session has not started and starts within the
// coach's notice period.
export function isLateCancel(policy, sessionMs, nowMs = Date.now()) {
  const hours = (sessionMs - nowMs) / (1000 * 60 * 60);
  return hours >= 0 && hours < policy.noticeHours;
}

// The rule in words, as the coach or a client should read it. One literal t() per branch:
// t() takes only a literal key (#39 lint rule).
export function cancelRuleText(t, policy, forCoach) {
  const { noticeHours: hours, freePerMonth: count } = policy;
  if (count === 0) return forCoach ? t('cancel.coach_none') : t('cancel.client_none');
  if (count === null) return forCoach ? t('cancel.coach_unlimited', { hours }) : t('cancel.client_unlimited', { hours });
  return forCoach ? t('cancel.coach_limited', { hours, count }) : t('cancel.client_limited', { hours, count });
}
