import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { LATE_MINUTE_OPTIONS, addMinutesToTimeLabel, heldUntilLabel } from '../../../lib/menu';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sendLatePushToAdmin(order, minutes) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) return; // push not configured, the update is still saved

  const label = order.order_number ? `#${order.order_number}` : 'Order';
  const body = {
    app_id: appId,
    target_channel: 'push',
    filters: [{ field: 'tag', key: 'role', relation: '=', value: 'admin' }],
    headings: { en: `\u{1F353} ${order.customer_name || 'A customer'} is running late` },
    contents: {
      en: `${label} — ${minutes} min late. New pickup ${addMinutesToTimeLabel(order.pickup_time, minutes)}. Holding until ${heldUntilLabel(order.pickup_time, minutes)}.`,
    },
    url: 'https://www.lovelyfresitas.app/admin',
  };
  try {
    await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Key ${apiKey}` },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('OneSignal late push failed', e);
  }
}

// Public, like /api/orders/arrive: knowing the order's random id (from the
// confirmation screen or the link we text) is the proof. It only ever returns
// the pickup time and late minutes of that one order.
//   GET  ?id=<uuid>             -> { pickup_time, late_minutes, arrived }
//   POST { id, minutes }        -> saves "running N min late" and alerts the admin
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const id = String(req.query?.id || '');
    if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Missing or invalid order id.' });
    const supabase = getSupabaseAdmin();
    const { data: order, error } = await supabase
      .from('orders')
      .select('pickup_time, late_minutes, arrived_at, status')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not look up that order.' });
    }
    if (!order) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({
      pickup_time: order.pickup_time,
      late_minutes: order.late_minutes || 0,
      arrived: !!order.arrived_at,
      closed: order.status === 'done',
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method not allowed');
  }

  const { id, minutes } = req.body || {};
  const mins = parseInt(minutes, 10);
  if (!id || !UUID_RE.test(String(id))) return res.status(400).json({ error: 'Missing or invalid order id.' });
  if (!LATE_MINUTE_OPTIONS.includes(mins)) return res.status(400).json({ error: 'Pick how late you will be.' });
  const supabase = getSupabaseAdmin();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, pickup_time, late_minutes, arrived_at, status')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not look up that order.' });
  }
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (order.arrived_at || order.status === 'done') {
    return res.status(409).json({ error: 'already_arrived' });
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ late_minutes: mins, late_reported_at: new Date().toISOString() })
    .eq('id', id);
  if (updateError) {
    console.error(updateError);
    return res.status(500).json({ error: 'Could not save that. Please try again.' });
  }

  // A second tap on the same number (or a double tap) is saved but not re-announced.
  if (order.late_minutes !== mins) await sendLatePushToAdmin(order, mins);

  return res.status(200).json({ ok: true, late_minutes: mins });
}
