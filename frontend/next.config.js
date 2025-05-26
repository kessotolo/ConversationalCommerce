/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com'],
  },
  async redirects() {
    return [
      {
        source: '/auth/sign-in',
        destination: '/',
        permanent: false,
      },
      {
        source: '/auth/sign-up',
        destination: '/',
        permanent: false,
      },
    ];
  },
}

module.exports = nextConfig
