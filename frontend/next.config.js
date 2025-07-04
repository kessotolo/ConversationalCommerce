/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Set build time flag for conditional auth components
    IS_BUILD_TIME: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
    dirs: ['src'],
  },
  images: {
    domains: ['res.cloudinary.com'],
  },
};

export default nextConfig;
