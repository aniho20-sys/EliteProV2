// The way to reach someone who asked for a trial session (B38): the phone number or email
// address they typed on the public booking page. Turned into links the coach's phone
// opens directly. No country code is guessed for a number without one — a wrong guess
// would dial a stranger (#35); the phone's own dialler handles a local number correctly.
export function contactLinks(contact) {
  const value = String(contact || '').trim();
  if (!value) return null;
  // href: the one link to use where there is room for only one.
  if (value.includes('@')) return { kind: 'email', email: `mailto:${value}`, href: `mailto:${value}` };
  // "+44 (0)7700 900123" is written that way in the UK; the (0) is not dialled after +44.
  const dial = value.replace(/\(0\)/g, '').replace(/[^0-9+]/g, '');
  return { kind: 'phone', call: `tel:${dial}`, text: `sms:${dial}`, href: `tel:${dial}` };
}
