import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { isValidSession } from '../../lib/adminSession';

const BUCKET = 'site-photos';

// A single 4.5MB request-body cap keeps this within Vercel's default
// serverless function payload limit — plenty for phone photos, since
// they're sent base64-encoded from the admin upload form.
export const config = {
  api: { bodyParser: { sizeLimit: '4.5mb' } },
};

export default async function handler(req, res) {
  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    // Public — anyone visiting the Photos page can list what's there.
    const { data, error } = await supabase.storage.from(BUCKET).list('', {
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not load photos.' });
    }
    const photos = (data || [])
      .filter((f) => f.name && !f.name.startsWith('.'))
      .map((f) => {
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(f.name);
        return { path: f.name, url: pub.publicUrl, created_at: f.created_at };
      });
    return res.status(200).json({ photos });
  }

  if (req.method === 'POST') {
    if (!isValidSession(req)) {
      return res.status(401).json({ error: 'Not authorized.' });
    }
    const { filename, dataBase64, contentType } = req.body || {};
    if (!filename || !dataBase64) {
      return res.status(400).json({ error: 'Missing file data.' });
    }
    const buffer = Buffer.from(dataBase64, 'base64');
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image is too large — please use a photo under 4MB.' });
    }
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: contentType || 'image/jpeg',
      upsert: false,
    });
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not upload photo.' });
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return res.status(200).json({ ok: true, photo: { path, url: pub.publicUrl } });
  }

  if (req.method === 'DELETE') {
    if (!isValidSession(req)) {
      return res.status(401).json({ error: 'Not authorized.' });
    }
    const { path } = req.body || {};
    if (!path) return res.status(400).json({ error: 'Missing path.' });

    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Could not delete photo.' });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end('Method not allowed');
}
