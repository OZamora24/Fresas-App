import { makeSessionCookie } from '../../lib/adminSession';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }

  const { password } = req.body || {};
  const correct = process.env.ADMIN_PASSWORD;

  if (!correct) {
    return res.status(500).json({ error: 'Server is missing ADMIN_PASSWORD.' });
  }
  if (password !== correct) {
    return res.status(401).json({ error: 'Wrong password.' });
  }

  res.setHeader('Set-Cookie', makeSessionCookie());
  return res.status(200).json({ ok: true });
}
