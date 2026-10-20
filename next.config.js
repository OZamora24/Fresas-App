/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
