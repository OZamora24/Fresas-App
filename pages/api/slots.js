import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

// Public — the customer page needs this to gray out full pickup times.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }

  const supabase = getSupabaseAdmin();

  const { data: settingsRow } = await supabase.from('shop_settings').select('slot_limit').eq('id', 1).single();
  const slotLimit = settingsRow?.slot_limit ?? 3;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: todaysOrders, error } = await supabase
    .from('orders')
    .select('pickup_time')
    .gte('created_at', startOfDay.toISOString());

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not load slot counts.' });
  }

  const counts = {};
  for (const o of todaysOrders) {
    counts[o.pickup_time] = (counts[o.pickup_time] || 0) + 1;
  }

  return res.status(200).json({ counts, slotLimit });
}
