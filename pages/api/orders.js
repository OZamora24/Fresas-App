import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { isValidSession } from '../../lib/adminSession';
import { baseIdFromName, formatDateKey, todayDateKey, getAvailablePickupTimes, PRICES, toppingsCost } from '../../lib/menu';

const APP_URL = 'https://fresas-app-zeta.vercel.app';

// Recomputes the cart subtotal server-side from the item list, using the
// same shared pricing table the order page uses — this is what lets a
// promo code's discount be checked against a real number instead of
// whatever the browser happens to send.
function computeSubtotalFromItems(items) {
  return items.reduce((sum, item) => {
    const baseId = baseIdFromName(item.base);
    const cupSizeKey = String(item.cup_size || '').startsWith('24') ? '24' : '12';
    const perCup = PRICES[cupSizeKey][baseId] + toppingsCost(baseId, item.toppings || []);
    return sum + perCup * (item.qty || 1);
  }, 0);
}

async function sendPushToAdmin(order) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) return; // push not configured yet — order is still saved

  const isMultiCup = Array.isArray(order.items) && order.items.length > 1;
  const promoSuffix = order.promo_code ? ` — promo ${order.promo_code} (-$${Number(order.discount_amount || 0).toFixed(2)})` : '';
  const summaryLine = (isMultiCup
    ? `${order.items.length} different cups — $${order.total.toFixed(2)} — pickup ${order.pickup_time}`
    : `${order.qty}x ${order.base} — $${order.total.toFixed(2)} — pickup ${order.pickup_time}`) + promoSuffix;

  const body = {
    app_id: appId,
    target_channel: 'push',
    filters: [{ field: 'tag', key: 'role', relation: '=', value: 'admin' }],
    headings: { en: `New order #${order.order_number}! 🍓` },
    contents: {
      en: summaryLine,
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
  const address = '1526 W Bonnie View Dr, Rialto, CA 92376';
  const arrivedLink = `${APP_URL}/arrived/${order.id}?lang=${order.language === 'es' ? 'es' : 'en'}`;
  const body = order.language === 'es'
    ? `🍓 ¡Recibimos tu orden de Fresas con Crema (#${order.order_number})! Te enviaremos un mensaje cuando esté lista para recoger (${dateLabel}, ${order.pickup_time}). Recoger en: ${address}\n\nCuando llegues, avísanos aquí: ${arrivedLink}`
    : `🍓 Got your Fresas con Crema order (#${order.order_number})! We'll text you when it's ready for pickup (${dateLabel}, ${order.pickup_time}). Pickup at: ${address}\n\nWhen you arrive, let us know here: ${arrivedLink}`;
  await sendSms(to, body);
}

async function sendReadyTextToCustomer(order) {
  const to = normalizePhone(order.customer_phone);
  if (!to) return;
  const body = order.language === 'es'
    ? `🍓 ¡La orden #${order.order_number} de Fresas con Crema está lista para recoger! Nos vemos pronto.`
    : `🍓 Order #${order.order_number} is ready for pickup! See you soon.`;
  await sendSms(to, body);
}

export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();

  if (req.method === 'POST') {
    const { base, cup_size, toppings, syrups, qty, pickup_time, pickup_date, customer_name, customer_phone, notes, total, payment_method, payment_confirmed, language, include_rim, items, promo_code } = req.body || {};

    if (!base || !pickup_time || !customer_name || typeof total !== 'number') {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    const finalPickupDate = pickup_date || todayDateKey();

    // Reject new orders while the shop is marked closed, or if this
    // specific flavor has been marked sold out. Fetched first so the
    // shop's configured hours (which can differ on weekends) are on hand
    // for the pickup-time check right below.
    const { data: settingsRow } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
    if (settingsRow && settingsRow.is_open === false) {
      return res.status(403).json({
        error: 'closed',
        message: settingsRow.closed_message || "We're not taking orders right now — please check back soon!",
      });
    }

    // Reject if this pickup time has already passed (or is inside the
    // minimum lead-time window) on the shop's own clock — catches both a
    // stale page left open past closing and any direct API call.
    if (!getAvailablePickupTimes(finalPickupDate, settingsRow).includes(pickup_time)) {
      return res.status(409).json({ error: 'time_passed', message: 'That pickup time has already passed — please choose a later time or another date.' });
    }

    // A multi-cup order lists every cup in `items`; an older/simpler
    // client might only send the single-cup fields. Either way, check
    // every cup for sold-out flavors/toppings/syrups — not just the first
    // one — so a sold-out item hiding in cup #2 doesn't slip through.
    const cupsToCheck = Array.isArray(items) && items.length > 0
      ? items
      : [{ base, cup_size, toppings: toppings || [], syrups: syrups || [], qty: qty || 1 }];

    for (const cup of cupsToCheck) {
      const cupBaseId = baseIdFromName(cup.base);
      if (settingsRow?.sold_out_flavors?.includes(cupBaseId)) {
        return res.status(409).json({ error: 'sold_out', message: `${cup.base} is sold out right now — please remove it.` });
      }
      const soldOutToppingHit = (cup.toppings || []).find((t) => settingsRow?.sold_out_toppings?.includes(t));
      if (soldOutToppingHit) {
        return res.status(409).json({ error: 'sold_out', message: `${soldOutToppingHit} is sold out right now — please remove it.` });
      }
      const soldOutSyrupHit = (cup.syrups || []).find((s) => settingsRow?.sold_out_syrups?.includes(s));
      if (soldOutSyrupHit) {
        return res.status(409).json({ error: 'sold_out', message: `${soldOutSyrupHit} syrup is sold out right now — please remove it.` });
      }
    }
    // Re-check any promo code against the database (never trust the
    // discounted total the browser sends) — this is the same check used
    // while the customer is still on the order page, run again here in
    // case the code expired, got turned off, or hit its usage limit in
    // the meantime.
    let appliedPromoRow = null;
    let discountAmount = 0;
    if (promo_code) {
      const normalizedCode = String(promo_code).trim().toUpperCase();
      const { data: promoRow } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', normalizedCode)
        .maybeSingle();

      const nowValid = promoRow
        && promoRow.active
        && (!promoRow.expires_at || new Date(promoRow.expires_at).getTime() >= Date.now())
        && (!promoRow.max_uses || promoRow.times_used < promoRow.max_uses);

      if (!nowValid) {
        return res.status(409).json({ error: 'promo_invalid', message: 'That promo code is no longer valid — please remove it and try again.' });
      }

      const subtotal = computeSubtotalFromItems(cupsToCheck);
      discountAmount = promoRow.discount_type === 'percent'
        ? Math.round(subtotal * (promoRow.discount_amount / 100) * 100) / 100
        : Math.min(promoRow.discount_amount, subtotal);

      const expectedTotal = Math.max(0, subtotal - discountAmount);
      if (Math.abs(expectedTotal - total) > 0.01) {
        return res.status(409).json({ error: 'promo_invalid', message: 'Your order total changed — please review your order and try again.' });
      }
      appliedPromoRow = promoRow;
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
        items: Array.isArray(items) && items.length > 0 ? items : null,
        pickup_time,
        pickup_date: finalPickupDate,
        customer_name,
        customer_phone: customer_phone || '',
        customer_phone_digits: customer_phone ? String(customer_phone).replace(/\D/g, '') : null,
        notes: notes || '',
        total,
        promo_code: appliedPromoRow ? appliedPromoRow.code : null,
        discount_amount: discountAmount,
        status: 'new',
        payment_method: payment_method || 'zelle',
        customer_confirmed_payment: !!payment_confirmed,
        paid: false,
        language: language === 'es' ? 'es' : 'en',
        include_rim: include_rim === false ? false : true,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not save order.' });
    }

    if (appliedPromoRow) {
      await supabase.from('promo_codes').update({ times_used: appliedPromoRow.times_used + 1 }).eq('id', appliedPromoRow.id);
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
      'pickup_time', 'pickup_date', 'customer_name', 'customer_phone', 'notes', 'total', 'include_rim',
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
