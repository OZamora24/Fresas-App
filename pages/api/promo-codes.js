import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { isValidSession } from '../../lib/adminSession';

// Admin-only management of promo codes: list, create, edit (including
// turning a code on/off), and delete. Customers never hit this route —
// see pages/api/promo/check.js for the public-facing "is this code good"
// check used on the order page.
export default async function handler(req, res) {
  if (!isValidSession(req)) {
    return res.status(401).json({ error: 'Not authorized.' });
  }

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not load promo codes.' });
    }
    return res.status(200).json({ promoCodes: data });
  }

  if (req.method === 'POST') {
    const { code, discount_type, discount_amount, expires_at, active } = req.body || {};
    const normalizedCode = (code || '').trim().toUpperCase();
    const amount = parseFloat(discount_amount);

    if (!normalizedCode) {
      return res.status(400).json({ error: 'Enter a code.' });
    }
    if (!['percent', 'fixed'].includes(discount_type)) {
      return res.status(400).json({ error: 'Invalid discount type.' });
    }
    if (!amount || amount <= 0 || (discount_type === 'percent' && amount > 100)) {
      return res.status(400).json({ error: 'Enter a valid discount amount.' });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code: normalizedCode,
        discount_type,
        discount_amount: amount,
        expires_at: expires_at || null,
        active: active !== false,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      if (error.code === '23505') {
        return res.status(409).json({ error: `A promo code called ${normalizedCode} already exists.` });
      }
      return res.status(500).json({ error: 'Could not create promo code.' });
    }
    return res.status(200).json({ promoCode: data });
  }

  if (req.method === 'PATCH') {
    const { id, code, discount_type, discount_amount, expires_at, active } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id.' });

    const updates = {};
    if (code !== undefined) updates.code = String(code).trim().toUpperCase();
    if (discount_type !== undefined) {
      if (!['percent', 'fixed'].includes(discount_type)) {
        return res.status(400).json({ error: 'Invalid discount type.' });
      }
      updates.discount_type = discount_type;
    }
    if (discount_amount !== undefined) {
      const amount = parseFloat(discount_amount);
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Enter a valid discount amount.' });
      }
      updates.discount_amount = amount;
    }
    if (expires_at !== undefined) updates.expires_at = expires_at || null;
    if (active !== undefined) updates.active = !!active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A promo code with that code already exists.' });
      }
      return res.status(500).json({ error: 'Could not update promo code.' });
    }
    return res.status(200).json({ promoCode: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id.' });

    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not delete promo code.' });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).end('Method not allowed');
}
