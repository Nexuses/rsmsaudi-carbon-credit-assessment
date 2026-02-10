/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["cdn-nexlink.s3.us-east-2.amazonaws.com", "rsm-saudi.s3.us-east-2.amazonaws.com"],
  },
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["framer-motion"],
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'canvas': 'canvas',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
