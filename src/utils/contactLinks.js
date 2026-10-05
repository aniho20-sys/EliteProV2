// The way to reach someone who asked for a trial session (B38): the phone number or email
// address they typed on the public booking page. Turned into links the coach's phone
// opens directly. The phone's own dialler handles a local number correctly, so call/text
// links use the number as typed.
//
// WhatsApp is different: wa.me needs the full international number, and a wrong country
// code would message a stranger (#35). So a WhatsApp link is offered only when the number
// is certain: it was typed with + or 00, or it is a UK mobile (07 + 9 digits — a shape no
// other country's numbers share) and the coach is in the UK (their saved time zone).
// Anything else gets no WhatsApp button rather than a guessed one.
const UK_ZONES = ['Europe/London', 'Europe/Belfast'];

function whatsappDigits(dial, timeZone) {
  if (dial.startsWith('+')) return dial.slice(1);
  if (dial.startsWith('00')) return dial.slice(2);
  if (/^07\d{9}$/.test(dial) && UK_ZONES.includes(timeZone)) return `44${dial.slice(1)}`;
  return null;
}

export function contactLinks(contact, { timeZone } = {}) {
  const value = String(contact || '').trim();
  if (!value) return null;
  // href: the one link to use where there is room for only one.
  if (value.includes('@')) return { kind: 'email', email: `mailto:${value}`, href: `mailto:${value}` };
  // "+44 (0)7700 900123" is written that way in the UK; the (0) is not dialled after +44.
  const dial = value.replace(/\(0\)/g, '').replace(/[^0-9+]/g, '');
  const wa = whatsappDigits(dial, timeZone);
  return {
    kind: 'phone', call: `tel:${dial}`, text: `sms:${dial}`, href: `tel:${dial}`,
    whatsapp: wa && /^\d{8,15}$/.test(wa) ? `https://wa.me/${wa}` : null,
  };
}
