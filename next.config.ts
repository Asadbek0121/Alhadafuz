import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.samsung.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'olcha.uz',
      },
      {
        protocol: 'https',
        hostname: 'mi-store.uz',
      },
      {
        protocol: 'https',
        hostname: 'fdn2.gsmarena.com',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
