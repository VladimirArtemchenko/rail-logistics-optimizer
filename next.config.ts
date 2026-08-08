import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  allowedDevOrigins: ['192.168.0.104'],
  serverExternalPackages: ['xlsx'],
};

export default nextConfig;
