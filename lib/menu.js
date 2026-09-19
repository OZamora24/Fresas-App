// Shared menu data and pricing logic, imported by both the customer-facing
// order page (pages/index.js) and the admin edit form (pages/admin.js), so
// prices and rules never drift out of sync between the two.

export const BASES = [
  { id: 'regular', name: 'Regular Fresas', freeToppings: 3 },
  { id: 'raffaello', name: 'Fresas Raffaello', freeToppings: 0 },
  { id: 'biscoff', name: 'Biscoff Cookie Butter', freeToppings: 0 },
  { id: 'ferrero', name: 'Ferrero Rocher', freeToppings: 0 },
  { id: 'bananapudding', name: 'Banana Pudding', freeToppings: 0 },
  { id: 'gansito', name: 'Gansito', freeToppings: 0 },
];

export const PRICES = {
  '12': { regular: 7.0, raffaello: 8.0, biscoff: 8.0, ferrero: 9.0, bananapudding: 9.0, gansito: 9.0 },
  '24': { regular: 12.0, raffaello: 15.0, biscoff: 15.0, ferrero: 17.0, bananapudding: 17.0, gansito: 17.0 },
};

export const TOPPINGS = [
  { name: 'Whipped Cream' }, { name: 'Fruity Pebbles' }, { name: 'Wafer Cookie' },
  { name: 'Almonds' }, { name: 'Granola' }, { name: 'Oreo' },
  { name: 'Coconut Flakes' }, { name: 'Mini Marshmallows' },
  { name: 'Cheesecake', alwaysExtra: true }, { name: 'Ice Cream', alwaysExtra: true },
];

export const SYRUPS = ['Chocolate', 'Caramel', 'Lechera', 'Nutella', 'Strawberry'];

export function toppingsCost(baseId, toppings) {
  const base = BASES.find((b) => b.id === baseId);
  const standard = toppings.filter((t) => !TOPPINGS.find((x) => x.name === t)?.alwaysExtra);
  const premiumCount = toppings.length - standard.length;
  let cost = premiumCount * 1;
  const extraStandard = Math.max(0, standard.length - base.freeToppings);
  cost += extraStandard * 1;
  return cost;
}

export function orderTotal(baseId, cupSize, toppings, qty) {
  const basePrice = PRICES[cupSize][baseId];
  const perCup = basePrice + toppingsCost(baseId, toppings);
  return perCup * qty;
}

export function buildPickupTimes() {
  const times = [];
  const start = 17 * 60; // 5:00 PM
  const end = 21 * 60; // 9:00 PM
  for (let mins = start; mins <= end; mins += 15) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    times.push(`${h12}:${m.toString().padStart(2, '0')} ${suffix}`);
  }
  return times;
}

// Order.base is stored as the display name ("Regular Fresas"); this finds
// the matching base id ("regular") for editing purposes.
export function baseIdFromName(name) {
  const match = BASES.find((b) => b.name === name);
  return match ? match.id : BASES[0].id;
}

// The shop's own timezone (Rialto, CA). This matters a lot: the customer's
// browser and the server (Vercel functions run in UTC) each have their own
// idea of "local time", which can silently disagree with the shop's actual
// time — especially right around a UTC day rollover, which lands in the
// middle of the pickup window (4-5pm Pacific). Every "what time is it for
// the shop right now" calculation below goes through this fixed timezone
// instead of trusting whichever machine happens to run the code.
export const SHOP_TIMEZONE = 'America/Los_Angeles';

function nowPartsInShopTz() {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour: parseInt(parts.hour, 10) % 24, // midnight can format as "24" with hour12:false
    minute: parseInt(parts.minute, 10),
  };
}

// YYYY-MM-DD for a Date object, calendar-day only — used for adding/
// comparing whole days (safe regardless of timezone since no time-of-day
// is involved).
export function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysToDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return toDateKey(new Date(y, m - 1, d + days));
}

// "Today" according to the shop's own clock, not the browser's or the
// server's. This is the one that matters for pickup dates.
export function todayDateKey() {
  const { year, month, day } = nowPartsInShopTz();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Minutes since midnight, shop time — used to compare against pickup slots
// like "5:00 PM".
export function nowMinutesInShopTz() {
  const { hour, minute } = nowPartsInShopTz();
  return hour * 60 + minute;
}

// Parses "5:00 PM" -> 1020 (minutes since midnight).
export function timeStringToMinutes(timeStr) {
  const m = /^(\d+):(\d+)\s*(AM|PM)$/i.exec(timeStr || '');
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

// How far in advance customers can pre-order (days).
export const MAX_PREORDER_DAYS = 30;

export function maxPreorderDateKey() {
  return addDaysToDateKey(todayDateKey(), MAX_PREORDER_DAYS);
}

// Minimum notice required to book a same-day slot — keeps someone from
// grabbing a pickup time that's already here or seconds away.
export const PICKUP_LEAD_MINUTES = 30;

// The pickup times that are still bookable for a given date. For any
// future date, that's the full daily schedule. For today, it's whatever
// hasn't already passed (plus the lead-time buffer) on the shop's clock.
// Used identically on the client (to gray out the dropdown) and the
// server (to reject a stale submission) so they can never disagree.
export function getAvailablePickupTimes(dateKey, leadMinutes = PICKUP_LEAD_MINUTES) {
  const all = buildPickupTimes();
  if (dateKey !== todayDateKey()) return all;
  const cutoff = nowMinutesInShopTz() + leadMinutes;
  return all.filter((t) => timeStringToMinutes(t) > cutoff);
}

// Friendly display like "Today", "Tomorrow", or "Fri, Sep 20" for a
// YYYY-MM-DD date key, in the given language.
export function formatDateKey(dateKey, lang = 'en') {
  const today = todayDateKey();
  const tomorrow = addDaysToDateKey(today, 1);
  if (dateKey === today) return lang === 'es' ? 'Hoy' : 'Today';
  if (dateKey === tomorrow) return lang === 'es' ? 'Mañana' : 'Tomorrow';
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const WEEKDAY_NAMES = {
  en: ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'],
  es: ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'],
};

// Turns [0, 6] into "Sundays & Saturdays" (or the Spanish equivalent) for
// showing which days catering is available.
export function formatWeekdaysList(days, lang = 'en') {
  if (!days || days.length === 0) return '';
  const names = WEEKDAY_NAMES[lang === 'es' ? 'es' : 'en'];
  const labels = [...days].sort((a, b) => a - b).map((d) => names[d]);
  if (labels.length === 1) return labels[0];
  const last = labels[labels.length - 1];
  const rest = labels.slice(0, -1).join(', ');
  return `${rest}${lang === 'es' ? ' y ' : ' & '}${last}`;
}
