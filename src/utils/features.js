// Parts of the app that are switched off, not deleted (Ani 2026-10-23, B55): their pages,
// code and data all stay, and flipping a value back to true brings the part back as it was.
//
//   analytics       — Analytics page (/analytics), out of the menu
//   invoices        — Invoices page (/invoices), out of the menu
//   dashboardChart  — the week's sessions chart at the foot of the coach's home page (on again 2026-10-27)
//   chat            — chatting in the app: the Messages page and every way into it (the
//                     coach's unread count and messages card, clients' "Message your coach").
//                     Ani and her clients talk on WhatsApp. NOT switched off: what the app
//                     sends a client on the coach's behalf — session recaps, renewal
//                     reminders, the notes thread — which still arrive as push notifications.
export const FEATURES = {
  analytics: false,
  invoices: false,
  dashboardChart: true, // back on: Ani 2026-10-27
  chat: false,
};

// Routes a feature owns, for the menus.
const ROUTE_FEATURE = { '/analytics': 'analytics', '/invoices': 'invoices', '/messages': 'chat' };

export const routeShown = (route) => !(route in ROUTE_FEATURE) || FEATURES[ROUTE_FEATURE[route]];
