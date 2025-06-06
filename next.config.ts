import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://comfortable-fulfillment-production.up.railway.app/:path*', // Proxy to Backend
      }
    ];
  },
};

export default nextConfig;
