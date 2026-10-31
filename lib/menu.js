// Shared menu data and pricing logic, imported by both the customer-facing
// order page (pages/index.js) and the admin edit form (pages/admin.js), so
// prices and rules never drift out of sync between the two.

export const BASES = [
  { id: 'regular', name: 'Regular Fresas', freeToppings: 3 },
  { id: 'raffaello', name: 'Fresas Raffaello', freeToppings: 3 },
  { id: 'biscoff', name: 'Biscoff Cookie Butter', freeToppings: 3 },
  { id: 'ferrero', name: 'Ferrero Rocher', freeToppings: 3 },
  { id: 'bananapudding', name: 'Banana Pudding', freeToppings: 3 },
  { id: 'gansito', name: 'Gansito', freeToppings: 3 },
];

export const PRICES = {
  '12': { regular: 7.0, raffaello: 8.0, biscoff: 8.0, ferrero: 9.0, bananapudding: 9.0, gansito: 9.0 },
  '24': { regular: 12.0, raffaello: 15.0, biscoff: 15.0, ferrero: 17.0, bananapudding: 17.0, gansito: 17.0 },
};

export const TOPPINGS = [
  { name: 'Whipped Cream' }, { name: 'Fruity Pebbles' }, { name: 'Wafer Cookie' },
  { name: 'Almonds' }, { name: 'Granola' }, { name: 'Oreo' },
  { name: 'Coconut Flakes' },
  { name: 'Cheesecake', alwaysExtra: true }, { name: 'Ice Cream', alwaysExtra: true },
];

export const SYRUPS = ['Chocolate', 'Caramel', 'Lechera', 'Nutella', 'Strawberry'];

// ---------------------------------------------------------------------------
// Mini Pancakes — a second product line sold alongside the cups. Each size is
// a fixed-price pack that includes a set number of toppings and drizzles (no
// per-topping charges). Pancake packs travel in the same `items` list as cups,
// marked with kind: 'pancakes' on the order page and base: 'Mini Pancakes' once
// saved, so the server, admin, and sales pages can all recognize them.
// Drizzles reuse SYRUPS, and sold-out toggles reuse the existing
// sold_out_toppings / sold_out_syrups lists, so no database change is needed.
// ---------------------------------------------------------------------------
export const PANCAKE_BASE_NAME = 'Mini Pancakes';

export const PANCAKE_SIZES = [
  { count: 10, price: 5.0, toppings: 2, drizzles: 1 },
  { count: 20, price: 9.0, toppings: 3, drizzles: 2 },
];

// Hello Kitty Pancakes — a plate of 5 Hello Kitty pancakes with 10 regular
// mini pancakes around them (15 pieces). It rides the same pancake-pack
// plumbing as Mini Pancakes (price, toppings, drizzles, extras, validation).
// `count` is an internal ID that tells the plate (14) from "just the Kitty
// pancakes" (4); it is NOT the number of pieces, so it stays 14 to keep saved
// carts and old orders working. Use pancakePieces() for the real number of
// pieces. Saved order items carry base: 'Hello Kitty Pancakes'. Has its own
// admin on/off switch.
export const KITTY_BASE_NAME = 'Hello Kitty Pancakes';
export const KITTY_COUNT = 14; // internal ID of the plate (5 Kitty + 10 regular = 15 pieces)
export const KITTY_ONLY_COUNT = 4; // just the 4 Kitty pancakes
export const KITTY_SIZES = [
  { count: KITTY_COUNT, price: 14.0, toppings: 4, drizzles: 2, kittyMinis: 5, regularMinis: 10 },
  { count: KITTY_ONLY_COUNT, price: 8.0, toppings: 2, drizzles: 2, kittyMinis: 4, regularMinis: 0 },
];

// Paid extra toppings: past a pack's included toppings, each one costs this
// much, up to PANCAKE_MAX_EXTRA_TOPPINGS extras per pack. Only allowed while
// the admin "extra pancake toppings" switch is on.
export const PANCAKE_EXTRA_TOPPING_PRICE = 1.0;
export const PANCAKE_MAX_EXTRA_TOPPINGS = 3;

// Optional ice cream add-on for any pancake pack or Kitty plate: +$1 per
// pack, always available (it does not need the extra-toppings switch). The
// cart form uses `iceCream`, the saved order form uses `ice_cream`.
export const PANCAKE_ICE_CREAM_PRICE = 1.0;
export function pancakeHasIceCream(item) {
  return !!(item?.iceCream ?? item?.ice_cream);
}

export const PANCAKE_TOPPINGS = [
  'Banana', 'Strawberry', 'Fruity Pebbles', 'Cinnamon Toast Crunch',
  'Oreo', 'Biscoff', 'Whipped Cream', 'Powdered Sugar',
];

// True for a pancake pack, whether it's a cart item on the order page
// (kind: 'pancakes') or a saved order item (base: 'Mini Pancakes').
export function isPancakeItem(item) {
  return !!item && (item.kind === 'pancakes' || item.base === PANCAKE_BASE_NAME || item.base === KITTY_BASE_NAME);
}

// True for a Hello Kitty pack: a cart item (size 14) or a saved order item.
export function isKittyItem(item) {
  return !!item && (item.base === KITTY_BASE_NAME || isKittySize(item.size ?? item.pancake_size));
}

export function isKittySize(count) {
  return KITTY_SIZES.some((s) => s.count === Number(count));
}

// Real number of pieces on the plate/pack for a pack's `count` ID (the Kitty
// plate's ID is 14 but it holds 15 pieces; all other packs are their count).
export function pancakePieces(count) {
  const k = KITTY_SIZES.find((s) => s.count === Number(count));
  return k ? k.kittyMinis + k.regularMinis : Number(count);
}

export function pancakeSizeFor(count) {
  return [...PANCAKE_SIZES, ...KITTY_SIZES].find((s) => s.count === Number(count)) || null;
}

// The pack size of a pancake item: the cart form uses `size`, the saved
// order form uses `pancake_size`.
export function pancakeItemCount(item) {
  return Number(item?.size ?? item?.pancake_size) || null;
}

// How many toppings of an item are paid extras (past the pack's included ones).
export function pancakeExtraCount(item) {
  const size = pancakeSizeFor(pancakeItemCount(item));
  if (!size) return 0;
  return Math.max(0, (item.toppings || []).length - size.toppings);
}

// What one pancake item costs: (pack price + paid extra toppings + ice cream) × quantity.
export function pancakeItemCost(item) {
  const size = pancakeSizeFor(pancakeItemCount(item));
  if (!size) return 0;
  const iceCream = pancakeHasIceCream(item) ? PANCAKE_ICE_CREAM_PRICE : 0;
  return (size.price + pancakeExtraCount(item) * PANCAKE_EXTRA_TOPPING_PRICE + iceCream) * (item.qty || 1);
}

// Checks a pancake item's shape against its size's limits. Returns an error
// string, or null when it is valid. Used by the server before saving.
export function validatePancakeItem(item, extrasEnabled = false) {
  const size = pancakeSizeFor(pancakeItemCount(item));
  if (!size) return 'Unknown pancake size.';
  const toppings = item.toppings || [];
  const drizzles = item.syrups || [];
  const maxToppings = size.toppings + (extrasEnabled ? PANCAKE_MAX_EXTRA_TOPPINGS : 0);
  if (toppings.length > maxToppings) return `${isKittySize(size.count) ? 'Hello Kitty pancakes' : `Mini pancakes (${size.count})`} include up to ${size.toppings} toppings${extrasEnabled ? ` plus ${PANCAKE_MAX_EXTRA_TOPPINGS} extra` : ''}.`;
  if (new Set(toppings).size !== toppings.length) return 'Each pancake topping can only be picked once.';
  if (drizzles.length > size.drizzles) return `${isKittySize(size.count) ? 'Hello Kitty pancakes' : `Mini pancakes (${size.count})`} include up to ${size.drizzles} drizzle${size.drizzles === 1 ? '' : 's'}.`;
  if (toppings.some((t) => !PANCAKE_TOPPINGS.includes(t))) return 'One of the pancake toppings is not on the menu.';
  if (drizzles.some((d) => !SYRUPS.includes(d))) return 'One of the pancake drizzles is not on the menu.';
  const qty = item.qty || 1;
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) return 'Invalid pancake quantity.';
  return null;
}

// A customer can add more than one unit of an "always extra" topping
// (Cheesecake, Ice Cream) by tapping +/- on it — see addToppingUnit in
// pages/order.js — which is represented as that name simply appearing more
// than once in the `toppings` array. This is the ceiling on how many units
// of a single always-extra topping one cup can carry.
export const MAX_EXTRA_TOPPING_QTY = 5;

// `toppings` is an array of topping names, one entry per unit — a standard
// (free-eligible) topping normally appears at most once, but an
// "always extra" topping (Cheesecake, Ice Cream) can appear multiple times
// to represent multiple units. Cost only cares about how many times each
// name occurs, so this already prices duplicates correctly without any
// special-casing.
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

// "Buy 3, get the 4th free" deal (shop_settings.free_cup_deal). Stored on
// an order in the promo_code column under this label, so it shows up
// wherever promo codes already do without a separate column.
export const FREE_CUP_DEAL_CODE = 'BUY3GET1';
export const FREE_CUP_EVERY = 4;

// Every 4th cup in an order is free — the cheapest cups are the free ones,
// and only their base price comes off (extra toppings on a free cup are
// still charged). `cups` is a list of { baseId, cupSize: '12' | '24', qty }.
// Shared by the order page and the server so both land on the same number.
export function freeCupDeal(cups) {
  const unitPrices = [];
  (cups || []).forEach((c) => {
    const price = PRICES[c.cupSize]?.[c.baseId];
    if (price === undefined) return;
    for (let i = 0; i < (c.qty || 1); i++) unitPrices.push({ baseId: c.baseId, cupSize: c.cupSize, price });
  });
  const cupCount = unitPrices.length;
  const freeCount = Math.floor(cupCount / FREE_CUP_EVERY);
  const freeCups = unitPrices.sort((a, b) => a.price - b.price).slice(0, freeCount);
  const discount = freeCups.reduce((sum, c) => sum + c.price, 0);
  return { cupCount, freeCount, freeCups, discount };
}

// Fallback hours if the shop hasn't set any yet (matches the original
// fixed schedule).
const DEFAULT_HOURS = {
  hours_weekday_start: '17:00',
  hours_weekday_end: '21:00',
  hours_weekend_start: '12:00',
  hours_weekend_end: '21:00',
};

function hhmmToMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// True for a YYYY-MM-DD date key that falls on a Saturday or Sunday.
function isWeekendDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay(); // 0=Sun ... 6=Sat
  return day === 0 || day === 6;
}

// The bookable pickup-time slots for a given date, using the shop's
// admin-configured weekday or weekend hours (falling back to the default
// schedule if none are set yet). `hours` is the subset of shop_settings
// fields above — pass the settings row straight through.
export function buildPickupTimes(dateKey, hours) {
  const h = { ...DEFAULT_HOURS, ...(hours || {}) };
  // A date the shop has scheduled as closed in advance (vacation, a
  // holiday, etc.) has no bookable slots at all, regardless of what the
  // weekday/weekend hours say.
  if (dateKey && Array.isArray(h.closed_dates) && h.closed_dates.includes(dateKey)) return [];
  const weekend = dateKey ? isWeekendDateKey(dateKey) : false;
  const start = hhmmToMinutes(weekend ? h.hours_weekend_start : h.hours_weekday_start)
    ?? hhmmToMinutes(weekend ? DEFAULT_HOURS.hours_weekend_start : DEFAULT_HOURS.hours_weekday_start);
  const end = hhmmToMinutes(weekend ? h.hours_weekend_end : h.hours_weekday_end)
    ?? hhmmToMinutes(weekend ? DEFAULT_HOURS.hours_weekend_end : DEFAULT_HOURS.hours_weekday_end);
  const times = [];
  for (let mins = start; mins <= end; mins += PICKUP_SLOT_MINUTES) {
    const hh = Math.floor(mins / 60);
    const m = mins % 60;
    const suffix = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
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

// `date` defaults to right now, but accepts any Date so callers (like the
// sales summary in pages/api/sales-summary.js) can ask "what day/time was
// it at the shop" for a moment other than the current one — e.g. when a
// past order was actually placed.
function partsInShopTz(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour: parseInt(parts.hour, 10) % 24, // midnight can format as "24" with hour12:false
    minute: parseInt(parts.minute, 10),
  };
}

function nowPartsInShopTz() {
  return partsInShopTz();
}

// YYYY-MM-DD for ANY Date/timestamp (not just "now"), using the shop's own
// timezone rather than the machine's. This is what a server function
// (which runs in UTC) needs in order to say what calendar day an order's
// created_at falls on for the shop — a plain UTC-based "start of today"
// cutoff silently uses UTC midnight, which lands mid-afternoon in Pacific
// time, so comparing calendar-day strings like this instead of an instant
// cutoff is what keeps "today" actually meaning today at the shop.
export function shopDateKeyForDate(date) {
  const { year, month, day } = partsInShopTz(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
// Minutes between bookable pickup times.
export const PICKUP_SLOT_MINUTES = 20;
export const PICKUP_LEAD_MINUTES = 20;

// The pickup times that are still bookable for a given date. A date before
// today has none — the whole day is already over, however the hours look —
// which matters because a customer can end up with an old dateKey in play
// (a saved draft restored a day later, a stale page never reloaded) without
// ever consciously picking a past date themselves. For any future date,
// availability is the full daily schedule. For today, it's whatever hasn't
// already passed (plus the lead-time buffer) on the shop's clock.
// Used identically on the client (to gray out the dropdown) and the
// server (to reject a stale submission) so they can never disagree.
export function getAvailablePickupTimes(dateKey, hours, leadMinutes = PICKUP_LEAD_MINUTES) {
  const all = buildPickupTimes(dateKey, hours);
  const today = todayDateKey();
  if (dateKey < today) return [];
  if (dateKey !== today) return all;
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


// ---- Pickup hold + "running late" ----
// An order is held for HOLD_MINUTES after its pickup time. A customer who tells
// us they are running late (LATE_MINUTE_OPTIONS) pushes that deadline back by
// the same number of minutes. Pickup times are saved as labels like "5:30 PM".
export const HOLD_MINUTES = 15;
export const LATE_MINUTE_OPTIONS = [5, 10, 15, 20, 25, 30];

export function timeLabelToMinutes(label) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(label || '').trim());
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + parseInt(m[2], 10);
}

export function addMinutesToTimeLabel(label, add) {
  const base = timeLabelToMinutes(label);
  if (base === null) return label || '';
  const total = (((base + add) % 1440) + 1440) % 1440;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
}

// "5:30 PM" + 10 minutes late -> held until "5:55 PM".
export function heldUntilLabel(pickupTime, lateMinutes = 0) {
  return addMinutesToTimeLabel(pickupTime, HOLD_MINUTES + (Number(lateMinutes) || 0));
}
