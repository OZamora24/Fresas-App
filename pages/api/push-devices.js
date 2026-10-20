import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { isValidSession } from '../../lib/adminSession';

// Keeps a simple count of phones that allowed customer notifications.
//   POST  public -> a customer's phone checks in (saved once per phone)
//   GET   admin  -> how many phones, plus how many review requests were sent
// OneSignal only tells us a phone is subscribed at the moment it checks in, so
// this is "phones that allowed notifications as of their last visit".
export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();

  if (req.method === 'POST') {
    const { subscription_id, order_id } = req.body || {};
    if (typeof subscription_id !== 'string' || subscription_id.length < 8 || subscription_id.length > 100) {
      return res.status(400).json({ error: 'Bad subscription id.' });
    }
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const { error } = await supabase.from('push_devices').upsert({
      subscription_id,
      last_seen: new Date().toISOString(),
      last_order_id: typeof order_id === 'string' && uuid.test(order_id) ? order_id : null,
    });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not save.' });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    if (!isValidSession(req)) return res.status(401).json({ error: 'Not authorized.' });
    const [devices, sent] = await Promise.all([
      supabase.from('push_devices').select('subscription_id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('review_push_sent', true),
    ]);
    return res.status(200).json({ devices: devices.count || 0, reviewPushesSent: sent.count || 0 });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method not allowed');
}
