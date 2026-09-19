import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { isValidSession } from '../../lib/adminSession';
import { baseIdFromName, formatDateKey, todayDateKey, getAvailablePickupTimes } from '../../lib/menu';

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

function normalizePhone(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

async function sendSms(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from || !to) return; // Twilio not configured, or no phone on file

  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', from);
  params.append('Body', body);

  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      },
      body: params,
    });
  } catch (e) {
    console.error('Twilio SMS failed', e);
  }
}

async function sendConfirmationTextToCustomer(order) {
  const to = normalizePhone(order.customer_phone);
  if (!to) return;
  const dateLabel = formatDateKey(order.pickup_date || todayDateKey(), order.language);
  const body = order.language === 'es'
    ? `🍓 ¡Recibimos tu orden de Fresas con Crema! Te enviaremos un mensaje cuando esté lista para recoger (${dateLabel}, ${order.pickup_time}).`
    : `🍓 Got your Fresas con Crema order! We'll text you when it's ready for pickup (${dateLabel}, ${order.pickup_time}).`;
  await sendSms(to, body);
}

async function sendReadyTextToCustomer(order) {
  const to = normalizePhone(order.customer_phone);
  if (!to) return;
  const body = order.language === 'es'
    ? '🍓 ¡Tu orden de Fresas con Crema está lista para recoger! Nos vemos pronto.'
    : '🍓 Your Fresas con Crema order is ready for pickup! See you soon.';
  await sendSms(to, body);
}

export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();

  if (req.method === 'POST') {
    const { base, cup_size, toppings, syrups, qty, pickup_time, pickup_date, customer_name, customer_phone, notes, total, payment_method, payment_confirmed, language } = req.body || {};

    if (!base || !pickup_time || !customer_name || typeof total !== 'number') {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    const finalPickupDate = pickup_date || todayDateKey();

    // Reject if this pickup time has already passed (or is inside the
    // minimum lead-time window) on the shop's own clock — catches both a
    // stale page left open past closing and any direct API call.
    if (!getAvailablePickupTimes(finalPickupDate).includes(pickup_time)) {
      return res.status(409).json({ error: 'time_passed', message: 'That pickup time has already passed — please choose a later time or another date.' });
    }

    // Reject new orders while the shop is marked closed, or if this
    // specific flavor has been marked sold out.
    const { data: settingsRow } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
    if (settingsRow && settingsRow.is_open === false) {
      return res.status(403).json({
        error: 'closed',
        message: settingsRow.closed_message || "We're not taking orders right now — please check back soon!",
      });
    }
    const baseId = baseIdFromName(base);
    if (settingsRow?.sold_out_flavors?.includes(baseId)) {
      return res.status(409).json({ error: 'sold_out', message: `${base} is sold out right now — please pick another flavor.` });
    }
    const soldOutToppingHit = (toppings || []).find((t) => settingsRow?.sold_out_toppings?.includes(t));
    if (soldOutToppingHit) {
      return res.status(409).json({ error: 'sold_out', message: `${soldOutToppingHit} is sold out right now — please remove it.` });
    }
    const soldOutSyrupHit = (syrups || []).find((s) => settingsRow?.sold_out_syrups?.includes(s));
    if (soldOutSyrupHit) {
      return res.status(409).json({ error: 'sold_out', message: `${soldOutSyrupHit} syrup is sold out right now — please remove it.` });
    }
    const slotLimit = settingsRow?.slot_limit ?? 3;

    // Reject if this pickup slot (on the selected pickup date) is already
    // at capacity.
    const { count: slotCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('pickup_time', pickup_time)
      .eq('pickup_date', finalPickupDate);

    if ((slotCount || 0) >= slotLimit) {
      return res.status(409).json({ error: 'slot_full', message: 'That pickup time just filled up — please choose another.' });
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        base,
        cup_size: cup_size || '12 oz',
        toppings: toppings || [],
        syrups: syrups || [],
        qty: qty || 1,
        pickup_time,
        pickup_date: finalPickupDate,
        customer_name,
        customer_phone: customer_phone || '',
        customer_phone_digits: customer_phone ? String(customer_phone).replace(/\D/g, '') : null,
        notes: notes || '',
        total,
        status: 'new',
        payment_method: payment_method || 'zelle',
        customer_confirmed_payment: !!payment_confirmed,
        paid: false,
        language: language === 'es' ? 'es' : 'en',
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not save order.' });
    }

    await sendPushToAdmin(data);
    await sendConfirmationTextToCustomer(data);
    return res.status(200).json({ ok: true, order: data });
  }

  if (req.method === 'GET') {
    if (!isValidSession(req)) {
      return res.status(401).json({ error: 'Not authorized.' });
    }
    const { start, end, limit } = req.query || {};

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (start) query = query.gte('created_at', start);
    if (end) query = query.lte('created_at', end);
    query = query.limit(limit ? parseInt(limit, 10) : 200);

    const { data, error } = await query;

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
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id.' });

    const allowedFields = [
      'status', 'paid', 'base', 'cup_size', 'toppings', 'syrups', 'qty',
      'pickup_time', 'pickup_date', 'customer_name', 'customer_phone', 'notes', 'total',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const { error, data } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not update order.' });
    }

    if (updates.status === 'done' && data?.customer_phone) {
      await sendReadyTextToCustomer(data);
    }

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!isValidSession(req)) {
      return res.status(401).json({ error: 'Not authorized.' });
    }
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Missing ids to delete.' });
    }

    const { error } = await supabase.from('orders').delete().in('id', ids);
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not delete order(s).' });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).end('Method not allowed');
}
