import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev server requests from local network IPs (e.g. accessing from phone/another device)
  allowedDevOrigins: [
    'http://192.168.1.155:3000',
    'http://localhost:3000',
    '192.168.1.155',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    return [
      // Proxy /api/* to the Express backend during development
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
