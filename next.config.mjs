/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/rocom-damage-calc',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/rocom-damage-calc',
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
