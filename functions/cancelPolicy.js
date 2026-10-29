// The coach's own cancellation rule (Ani 2026-10-29, B82) — the server twin of
// src/utils/cancelPolicy.js, which a test keeps in step. Unchosen: 24 hours, twice a month.

const NOTICE_OPTIONS = [6, 12, 24, 48];
const FREE_OPTIONS = [0, 1, 2, 3, 4, null];
const DEFAULT_CANCEL_POLICY = { noticeHours: 24, freePerMonth: 2 };

function cancelPolicy(coach) {
  const p = (coach && coach.cancelPolicy) || {};
  return {
    noticeHours: NOTICE_OPTIONS.includes(p.noticeHours) ? p.noticeHours : DEFAULT_CANCEL_POLICY.noticeHours,
    freePerMonth: FREE_OPTIONS.includes(p.freePerMonth) ? p.freePerMonth : DEFAULT_CANCEL_POLICY.freePerMonth,
  };
}

module.exports = { cancelPolicy, NOTICE_OPTIONS, FREE_OPTIONS, DEFAULT_CANCEL_POLICY };
