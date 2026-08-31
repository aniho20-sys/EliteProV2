/* global module */
// Invite code normalisation, server side.
//
// This is a deliberate second copy of src/utils/inviteCodeUtils.js. functions/ is its own
// npm package with its own module system and cannot import from src/, and the two must
// agree exactly: the client normalises what the student typed, the server normalises it
// again before querying, and a disagreement means a valid code silently stops matching —
// the same class of failure as the 2026-08-04 invite bug (CLAUDE.md #34).
//
// src/utils/inviteCodeUtils.test.js loads BOTH implementations and asserts they return the
// same string for the same input, so the copies cannot drift apart unnoticed. If you change
// one, change the other, and that test will tell you if you forgot.
function normalizeInviteCode(code) {
  if (typeof code !== 'string') return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

module.exports = { normalizeInviteCode };
