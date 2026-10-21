/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Shop photos live in Supabase Storage; Next resizes them to phone-friendly
  // WebP thumbnails (and caches them) instead of sending the full-size originals.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // Serve the "Add to contacts" file as a real vCard so iPhones open the
  // "New Contact" sheet instead of showing raw text.
  async headers() {
    return [
      {
        source: '/fresas-con-crema.vcf',
        headers: [
          { key: 'Content-Type', value: 'text/vcard; charset=utf-8' },
          { key: 'Content-Disposition', value: 'inline; filename="Fresas-con-Crema.vcf"' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
