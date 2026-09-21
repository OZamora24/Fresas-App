import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

// Public — a customer looks up their OWN order history by entering their
// own phone number. To limit what this can reveal, it returns only order
// composition (what they ordered), never the name or any other customer's
// data — matching is done on a digits-only copy of the phone number.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }

  const raw = req.query?.phone || '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 10) {
    return res.status(200).json({ orders: [], order: null });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('orders')
    .select('base, cup_size, toppings, syrups, payment_method, created_at')
    .eq('customer_phone_digits', digits)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    return res.status(200).json({ orders: [], order: null });
  }

  // Dedupe identical repeat combos (same base + cup size + toppings +
  // syrups) so a customer who always orders the same thing sees one entry,
  // not five copies of it — then cap at the 5 most recent distinct orders.
  const seen = new Set();
  const distinct = [];
  for (const o of data || []) {
    const key = [o.base, o.cup_size, (o.toppings || []).slice().sort().join(','), (o.syrups || []).slice().sort().join(',')].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    distinct.push(o);
    if (distinct.length >= 5) break;
  }

  // order: kept for backward compatibility with any older client code.
  return res.status(200).json({ orders: distinct, order: distinct[0] || null });
}
