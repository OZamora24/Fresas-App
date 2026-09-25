import { isValidSession } from '../../lib/adminSession';

// Admin-only: sends a push notification to every customer who opted into
// "Get notified about deals" on the order confirmation screen (tagged
// role=customer in OneSignal, as opposed to role=admin which is used for
// the new-order alerts in api/orders.js). Used for things like "a new
// promo code just went live" or "we added a new flavor."
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }
  if (!isValidSession(req)) {
    return res.status(401).json({ error: 'Not authorized.' });
  }

  const { title, message } = req.body || {};
  const heading = (title || '').trim();
  const body = (message || '').trim();
  if (!heading || !body) {
    return res.status(400).json({ error: 'Enter a title and message.' });
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    return res.status(500).json({ error: 'Push notifications are not configured on this server yet.' });
  }

  const payload = {
    app_id: appId,
    target_channel: 'push',
    filters: [{ field: 'tag', key: 'role', relation: '=', value: 'customer' }],
    headings: { en: heading },
    contents: { en: body },
  };

  try {
    const r = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));

    // OneSignal can return HTTP 200 with an `errors` array instead of a
    // non-2xx status — e.g. when nobody currently matches the filter — so
    // both need to be treated as "this didn't actually send."
    if (!r.ok || json.errors) {
      const msg = Array.isArray(json.errors) ? json.errors[0] : (json.errors || 'OneSignal rejected the notification.');
      console.error('OneSignal customer push failed', json);
      return res.status(502).json({ error: msg });
    }

    return res.status(200).json({ ok: true, recipients: json.recipients ?? 0 });
  } catch (e) {
    console.error('OneSignal customer push failed', e);
    return res.status(500).json({ error: 'Could not reach OneSignal.' });
  }
}
