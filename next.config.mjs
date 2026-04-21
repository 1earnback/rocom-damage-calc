/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  output: 'export',
  basePath: isDev ? '' : '/rocom-damage-calc',
  env: {
    NEXT_PUBLIC_BASE_PATH: isDev ? '' : '/rocom-damage-calc',
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
