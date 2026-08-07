/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@portal-alvim/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
