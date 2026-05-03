import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@studyflow/shared', '@studyflow/db', '@studyflow/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xqzaiejgbxmimgwsvlos.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
