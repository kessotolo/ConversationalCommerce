/** @type {import('next').NextConfig} */
const nextConfig = {
  // Completely disable TypeScript type checking and ESLint
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: 'tsconfig.json',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  // Remove invalid swcMinify option

  experimental: {
    // Remove invalid experimental options
    // Only include valid Next.js 15 options
  },
  // Disable source maps in production to reduce build size
  productionBrowserSourceMaps: false,
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
      },
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
};

module.exports = nextConfig;
