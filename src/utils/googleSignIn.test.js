// Ani 2026-10-21: Google sign-in from the iPhone home-screen app ended on a Firebase page
// saying "missing initial state". Three things have to hold together for it to work.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { googleSignInMethod } from './deviceUtils';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('Google sign-in on an iPhone home-screen app', () => {
  test('goes by redirect there, and by popup everywhere else', () => {
    expect(googleSignInMethod({ ios: true, standalone: true })).toBe('redirect');
    expect(googleSignInMethod({ ios: true, standalone: false })).toBe('popup');   // Safari tab
    expect(googleSignInMethod({ ios: false, standalone: true })).toBe('popup');   // Android / desktop app
    expect(googleSignInMethod({ ios: false, standalone: false })).toBe('popup');
  });
  test('finishes on the app’s own domain, where the sign-in’s saved state can be read', () => {
    expect(read('../firebase.js')).toMatch(/authDomain:\s*'elitepro-16718\.web\.app'/);
  });
  test('the offline cache never answers Firebase’s own /__/ pages with the app', () => {
    expect(read('../../vite.config.js')).toMatch(/navigateFallbackDenylist:[^\n]*\/\^\\\/__\\\/\//);
  });
});
