import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

// Public — a customer looks up their OWN last order by entering their own
// phone number. To limit what this can reveal, it returns only the order
// composition (what they ordered), never the name or any other customer's
// data — matching is done on a digits-only copy of the phone number.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }

  const raw = req.query?.phone || '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 10) {
    return res.status(200).json({ order: null });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('orders')
    .select('base, cup_size, toppings, syrups, payment_method')
    .eq('customer_phone_digits', digits)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(200).json({ order: null });
  }

  return res.status(200).json({ order: data || null });
}
