// Invite codes are 6-char uppercase alphanumeric (see generateInviteCode in AppContext).
// Clients type or paste them, so normalise defensively before comparing: iOS keyboards
// insert non-breaking spaces, and copy/paste from WhatsApp or a share sheet can carry
// zero-width joiners, directional marks and stray punctuation that are invisible on
// screen but make an exact string comparison fail.
export function normalizeInviteCode(code) {
  if (typeof code !== 'string') return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
