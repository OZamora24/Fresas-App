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

// YYYY-MM-DD for a Date object, in local time (not UTC) — used for the
// pickup-date picker and for matching orders to a specific pickup day.
export function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayDateKey() {
  return toDateKey(new Date());
}

// How far in advance customers can pre-order (days).
export const MAX_PREORDER_DAYS = 30;

export function maxPreorderDateKey() {
  const d = new Date();
  d.setDate(d.getDate() + MAX_PREORDER_DAYS);
  return toDateKey(d);
}

// Friendly display like "Today", "Tomorrow", or "Fri, Sep 20" for a
// YYYY-MM-DD date key, in the given language.
export function formatDateKey(dateKey, lang = 'en') {
  const today = todayDateKey();
  const tomorrow = toDateKey(new Date(Date.now() + 86400000));
  if (dateKey === today) return lang === 'es' ? 'Hoy' : 'Today';
  if (dateKey === tomorrow) return lang === 'es' ? 'Mañana' : 'Tomorrow';
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
