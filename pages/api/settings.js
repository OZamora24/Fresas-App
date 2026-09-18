import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { isValidSession } from '../../lib/adminSession';

export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    // Public — the customer page needs this to know whether to show the
    // order form, so no auth check here.
    const { data, error } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not load settings.' });
    }
    return res.status(200).json({ settings: data });
  }

  if (req.method === 'PATCH') {
    if (!isValidSession(req)) {
      return res.status(401).json({ error: 'Not authorized.' });
    }
    const { is_open, closed_message, slot_limit, sold_out_flavors } = req.body || {};
    const updates = {};
    if (is_open !== undefined) updates.is_open = is_open;
    if (closed_message !== undefined) updates.closed_message = closed_message;
    if (slot_limit !== undefined) updates.slot_limit = slot_limit;
    if (sold_out_flavors !== undefined) updates.sold_out_flavors = sold_out_flavors;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const { data, error } = await supabase.from('shop_settings').update(updates).eq('id', 1).select().single();
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not update settings.' });
    }
    return res.status(200).json({ settings: data });
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end('Method not allowed');
}
