/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Set build time flag for conditional auth components
    IS_BUILD_TIME: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  },
  // Temporarily disable TypeScript checking to get a successful build
  // We'll incrementally re-enable checks as we fix module issues
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // We still need to disable ESLint during builds as we restore architectural rules
    ignoreDuringBuilds: false,
    dirs: ['src'],
  },
  images: {
    domains: ['res.cloudinary.com'],
  },
};

export default nextConfig;
