import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { isValidSession } from '../../lib/adminSession';

async function sendPushToAdmin(order) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) return; // push not configured yet — order is still saved

  const body = {
    app_id: appId,
    target_channel: 'push',
    filters: [{ field: 'tag', key: 'role', relation: '=', value: 'admin' }],
    headings: { en: 'New order! 🍓' },
    contents: {
      en: `${order.qty}x ${order.base} — $${order.total.toFixed(2)} — pickup ${order.pickup_time}`,
    },
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
    // Don't fail the order if the push fails — the order is already saved.
    console.error('OneSignal push failed', e);
  }
}

export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();

  if (req.method === 'POST') {
    const { base, toppings, syrups, qty, pickup_time, customer_name, notes, total, payment_method, payment_confirmed } = req.body || {};

    if (!base || !pickup_time || !customer_name || typeof total !== 'number') {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        base,
        toppings: toppings || [],
        syrups: syrups || [],
        qty: qty || 1,
        pickup_time,
        customer_name,
        notes: notes || '',
        total,
        status: 'new',
        payment_method: payment_method || 'zelle',
        customer_confirmed_payment: !!payment_confirmed,
        paid: false,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not save order.' });
    }

    await sendPushToAdmin(data);
    return res.status(200).json({ ok: true, order: data });
  }

  if (req.method === 'GET') {
    if (!isValidSession(req)) {
      return res.status(401).json({ error: 'Not authorized.' });
    }
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not load orders.' });
    }
    return res.status(200).json({ orders: data });
  }

  if (req.method === 'PATCH') {
    if (!isValidSession(req)) {
      return res.status(401).json({ error: 'Not authorized.' });
    }
    const { id, status, paid } = req.body || {};
    if (!id || (status === undefined && paid === undefined)) {
      return res.status(400).json({ error: 'Missing id or a field to update.' });
    }

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (paid !== undefined) updates.paid = paid;

    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not update order.' });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).end('Method not allowed');
}
