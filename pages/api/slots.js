import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

// Public — the customer page needs this to gray out full pickup times for
// whichever pickup date the customer has selected (today or a future date).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }

  const supabase = getSupabaseAdmin();

  const { data: settingsRow } = await supabase.from('shop_settings').select('slot_limit').eq('id', 1).single();
  const slotLimit = settingsRow?.slot_limit ?? 3;

  // Default to today (server's local date) if no date was requested.
  const today = new Date();
  const defaultDateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dateKey = (req.query?.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) ? req.query.date : defaultDateKey;

  const { data: dayOrders, error } = await supabase
    .from('orders')
    .select('pickup_time')
    .eq('pickup_date', dateKey);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not load slot counts.' });
  }

  const counts = {};
  for (const o of dayOrders) {
    counts[o.pickup_time] = (counts[o.pickup_time] || 0) + 1;
  }

  return res.status(200).json({ counts, slotLimit, date: dateKey });
}
