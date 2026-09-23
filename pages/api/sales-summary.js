import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { isValidSession } from '../../lib/adminSession';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }
  if (!isValidSession(req)) {
    return res.status(401).json({ error: 'Not authorized.' });
  }

  const supabase = getSupabaseAdmin();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  // Pull everything from the last 90 days for the flavor/pickup-time
  // breakdowns, and derive today/week from the same set to avoid extra
  // round trips.
  const startOfWindow = new Date(now);
  startOfWindow.setDate(startOfWindow.getDate() - 90);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('base, qty, pickup_time, total, toppings, syrups, items, created_at')
    .gte('created_at', startOfWindow.toISOString());

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not load sales data.' });
  }

  let todayRevenue = 0, todayOrders = 0;
  let weekRevenue = 0, weekOrders = 0;
  let allRevenue = 0, allOrders = orders.length;
  const flavorCounts = {};
  const pickupCounts = {};
  const toppingCounts = {};
  const syrupCounts = {};

  for (const o of orders) {
    const created = new Date(o.created_at);
    const total = Number(o.total || 0);
    allRevenue += total;

    if (created >= startOfWeek) {
      weekRevenue += total;
      weekOrders += 1;
    }
    if (created >= startOfToday) {
      todayRevenue += total;
      todayOrders += 1;
    }

    pickupCounts[o.pickup_time] = (pickupCounts[o.pickup_time] || 0) + 1;

    // Multi-cup orders carry their own list of cups — count each cup by
    // its own quantity so a 3-cup order of Ferrero Rocher counts as 3,
    // not 1. Older/simpler orders just have the top-level fields.
    const cups = Array.isArray(o.items) && o.items.length > 0
      ? o.items
      : [{ base: o.base, toppings: o.toppings || [], syrups: o.syrups || [], qty: o.qty || 1 }];

    for (const cup of cups) {
      const cupQty = cup.qty || 1;
      flavorCounts[cup.base] = (flavorCounts[cup.base] || 0) + cupQty;
      for (const tp of cup.toppings || []) {
        toppingCounts[tp] = (toppingCounts[tp] || 0) + cupQty;
      }
      for (const s of cup.syrups || []) {
        syrupCounts[s] = (syrupCounts[s] || 0) + cupQty;
      }
    }
  }

  const topFlavors = Object.entries(flavorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topPickupTimes = Object.entries(pickupCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([time, count]) => ({ time, count }));

  const topToppings = Object.entries(toppingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topSyrups = Object.entries(syrupCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return res.status(200).json({
    today: { revenue: todayRevenue, orders: todayOrders },
    week: { revenue: weekRevenue, orders: weekOrders },
    allTime90d: { revenue: allRevenue, orders: allOrders },
    topFlavors,
    topPickupTimes,
    topToppings,
    topSyrups,
  });
}
