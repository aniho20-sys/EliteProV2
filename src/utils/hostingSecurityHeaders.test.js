// Security headers on every file the site serves (firebase.json → hosting.headers).
//
// Grok Bot review, 2026-10-24: the site sent none, so any page could put ElitePro in a frame
// and lay its own buttons over it (clickjacking), and browsers could guess file types.
// SAMEORIGIN / frame-ancestors 'self', not DENY: Firebase Auth loads its /__/auth/iframe from
// authDomain, which is this same site (src/firebase.js), and DENY would refuse that frame
// too. The same site also answers on elitepro-16718.firebaseapp.com, whose pages frame that
// sign-in page cross-origin, so frame-ancestors names it; browsers that read frame-ancestors
// ignore X-Frame-Options, which is kept for those that do not. There is deliberately no
// full Content-Security-Policy yet — one wrong source in it blanks the app on a phone; it
// needs a report-only trial first.

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const rules = JSON.parse(readFileSync(join(cwd(), 'firebase.json'), 'utf8')).hosting.headers;
const firebaseSource = readFileSync(join(cwd(), 'src/firebase.js'), 'utf8');

const everything = rules.find(r => r.source === '**');
const header = (key) => everything?.headers.find(h => h.key.toLowerCase() === key.toLowerCase())?.value;

describe('hosting security headers', () => {
  test('one rule covers every path', () => {
    expect(everything, 'no header rule with source "**"').toBeTruthy();
  });

  test.each([
    ['X-Content-Type-Options', 'nosniff'],
    ['X-Frame-Options', 'SAMEORIGIN'],
    ['Content-Security-Policy', "frame-ancestors 'self' https://elitepro-16718.firebaseapp.com"],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ])('%s: %s', (key, value) => {
    expect(header(key)).toBe(value);
  });

  // If authDomain ever moves to another domain (e.g. firebaseapp.com), its sign-in frame
  // becomes cross-origin and these headers would block Google sign-in.
  test('sign-in still frames from this same site', () => {
    expect(firebaseSource).toMatch(/authDomain:\s*'elitepro-16718\.web\.app'/);
  });
});
