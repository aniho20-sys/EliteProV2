import { describe, test, expect } from 'vitest';
import { createRequire } from 'node:module';
import { normalizeInviteCode } from './inviteCodeUtils';

// functions/ is a separate npm package and cannot import from src/, so the normaliser
// exists twice on purpose. The copies must agree exactly: the browser normalises what the
// student typed, resolveInviteCode normalises it again before querying, and if they ever
// disagree a valid code stops matching — student onboarding breaks silently, which is the
// 2026-08-04 failure all over again (CLAUDE.md #34).
const require = createRequire(import.meta.url);
const { normalizeInviteCode: serverNormalize } = require('../../functions/inviteCode.js');

// Inputs chosen for what actually reaches this function from a phone: iOS keyboards insert
// non-breaking spaces, WhatsApp and share sheets carry zero-width joiners and directional
// marks, and people type codes in lower case with hyphens they invented themselves.
const CASES = [
  ['3XQPKM', '3XQPKM'],
  ['3xqpkm', '3XQPKM'],
  ['3XQ-PKM', '3XQPKM'],
  ['  3XQPKM  ', '3XQPKM'],
  ['3XQ PKM', '3XQPKM'],       // non-breaking space
  ['3XQ‍PKM', '3XQPKM'],       // zero-width joiner
  ['‪3XQPKM‬', '3XQPKM'], // directional marks
  ['3XQPKM\n', '3XQPKM'],
  ['', ''],
  ['---', ''],
  [null, ''],
  [undefined, ''],
  [123456, ''],
  [{}, ''],
];

describe('normalizeInviteCode', () => {
  test.each(CASES)('%p → %p', (input, expected) => {
    expect(normalizeInviteCode(input)).toBe(expected);
  });

  test('a non-string never throws — it is whatever the network handed us', () => {
    expect(() => normalizeInviteCode([])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN
// ---------------------------------------------------------------------------
describe('GUARDIAN: the client and server copies cannot drift apart', () => {
  test.each(CASES)('both implementations agree on %p', (input) => {
    expect(serverNormalize(input)).toBe(normalizeInviteCode(input));
  });
});
