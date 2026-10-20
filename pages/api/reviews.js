import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { isValidSession } from '../../lib/adminSession';

// Customer reviews.
//   GET            public  -> approved reviews + average + count
//   GET ?all=1     admin   -> every review, newest first (pending included)
//   POST           public  -> submit a review (saved as pending, shown after approval)
//   PATCH / DELETE admin   -> approve or hide / remove a review
export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    if (req.query?.all) {
      if (!isValidSession(req)) return res.status(401).json({ error: 'Not authorized.' });
      const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Could not load reviews.' });
      }
      return res.status(200).json({ reviews: data });
    }
    const { data, error } = await supabase
      .from('reviews')
      .select('id, created_at, name, rating, comment')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not load reviews.' });
    }
    const count = data.length;
    const average = count ? data.reduce((sum, r) => sum + r.rating, 0) / count : 0;
    return res.status(200).json({ reviews: data, count, average });
  }

  if (req.method === 'POST') {
    const { rating, comment, name, lang, website, orderIds } = req.body || {};
    // Hidden "website" field: real customers never fill it in, bots do.
    if (website) return res.status(200).json({ ok: true });
    const stars = parseInt(rating, 10);
    const text = (comment || '').toString().trim();
    const who = (name || '').toString().trim().slice(0, 40);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Pick 1 to 5 stars.' });
    }
    if (text.length < 2 || text.length > 600) {
      return res.status(400).json({ error: 'Write a short comment (up to 600 characters).' });
    }
    // Only customers who placed an order may review, one review per order.
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ids = (Array.isArray(orderIds) ? orderIds : []).filter((x) => typeof x === 'string' && uuid.test(x)).slice(0, 20);
    if (ids.length === 0) {
      return res.status(403).json({ error: 'order_required' });
    }
    const { data: found } = await supabase.from('orders').select('id').in('id', ids);
    if (!found || found.length === 0) {
      return res.status(403).json({ error: 'order_required' });
    }
    const { data: used } = await supabase.from('reviews').select('order_id').in('order_id', found.map((o) => o.id));
    const usedSet = new Set((used || []).map((r) => r.order_id));
    const orderId = found.map((o) => o.id).find((id) => !usedSet.has(id));
    if (!orderId) {
      return res.status(409).json({ error: 'already_reviewed' });
    }
    const { error } = await supabase.from('reviews').insert({
      order_id: orderId,
      rating: stars,
      comment: text,
      name: who || null,
      lang: lang === 'es' ? 'es' : 'en',
      approved: false,
    });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not save your review.' });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (!isValidSession(req)) return res.status(401).json({ error: 'Not authorized.' });
    const { id, approved } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id.' });
    const { error } = req.method === 'DELETE'
      ? await supabase.from('reviews').delete().eq('id', id)
      : await supabase.from('reviews').update({ approved: !!approved }).eq('id', id);
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not update the review.' });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).end('Method not allowed');
}
