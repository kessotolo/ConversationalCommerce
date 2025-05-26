/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      }
    ],
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
