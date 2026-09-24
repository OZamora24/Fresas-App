import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { PRICES, toppingsCost, baseIdFromName } from '../../../lib/menu';

// Public — the order page calls this as the customer types a promo code,
// before they've placed the order. Recomputes the cart subtotal itself
// from the item list (using the same shared pricing table the order page
// uses) rather than trusting a number the browser sends, so the discount
// shown here can't be inflated by editing the page.
function computeSubtotalFromItems(items) {
  return items.reduce((sum, item) => {
    const baseId = baseIdFromName(item.base);
    const cupSizeKey = String(item.cup_size || '').startsWith('24') ? '24' : '12';
    const perCup = PRICES[cupSizeKey][baseId] + toppingsCost(baseId, item.toppings || []);
    return sum + perCup * (item.qty || 1);
  }, 0);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }

  const { code, items } = req.body || {};
  if (!code || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ valid: false, message: 'Missing code or cart.' });
  }

  const supabase = getSupabaseAdmin();
  const normalizedCode = String(code).trim().toUpperCase();

  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', normalizedCode)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({ valid: false, message: 'Could not check that code — please try again.' });
  }

  if (!promo || !promo.active) {
    return res.status(200).json({ valid: false, message: "That code isn't valid." });
  }

  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return res.status(200).json({ valid: false, message: 'That code has expired.' });
  }

  if (promo.max_uses && promo.times_used >= promo.max_uses) {
    return res.status(200).json({ valid: false, message: 'That code has already reached its usage limit.' });
  }

  const subtotal = computeSubtotalFromItems(items);
  const discountValue = promo.discount_type === 'percent'
    ? Math.round(subtotal * (promo.discount_amount / 100) * 100) / 100
    : Math.min(promo.discount_amount, subtotal);

  return res.status(200).json({
    valid: true,
    code: promo.code,
    discount_type: promo.discount_type,
    discount_amount: promo.discount_amount,
    subtotal,
    discount_value: discountValue,
  });
}
