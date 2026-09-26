import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sendArrivedPushToAdmin(order) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) return; // push not configured yet — arrival is still saved

  const label = order.order_number ? `#${order.order_number}` : 'Order';
  const body = {
    app_id: appId,
    target_channel: 'push',
    filters: [{ field: 'tag', key: 'role', relation: '=', value: 'admin' }],
    headings: { en: `🍓 ${order.customer_name || 'A customer'} has arrived!` },
    contents: { en: `${label} — pickup ${order.pickup_time}. They're here waiting.` },
  };

  try {
    await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // Don't fail the request if the push fails — the arrival is already saved.
    console.error('OneSignal arrived push failed', e);
  }
}

// Public — reached only by tapping the link texted to a customer after they
// place an order. Knowing the order's id (a random, never-listed UUID) is
// treated as proof this is that customer, the same way a mailed receipt
// number would be — nothing sensitive is exposed by this endpoint either
// way, since it only ever accepts an id and never returns order details.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }

  const { id } = req.body || {};
  if (!id || !UUID_RE.test(String(id))) {
    return res.status(400).json({ error: 'Missing or invalid order id.' });
  }

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, pickup_time, pickup_date, language, arrived_at, status')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not look up that order.' });
  }
  if (!order) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (order.arrived_at) {
    // Already marked — don't re-notify on a second tap (link opened twice,
    // back button, a messaging app pre-loading the page, etc.)
    return res.status(200).json({ ok: true, already: true, order_number: order.order_number });
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ arrived_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    console.error(updateError);
    return res.status(500).json({ error: 'Could not save your arrival.' });
  }

  await sendArrivedPushToAdmin(order);

  return res.status(200).json({ ok: true, already: false, order_number: order.order_number });
}
