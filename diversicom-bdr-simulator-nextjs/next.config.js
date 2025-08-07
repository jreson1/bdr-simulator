/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://www.diversicomcorp.com https://diversicomcorp.com",
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
