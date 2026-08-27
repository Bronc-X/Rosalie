import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  webpack(config, { webpack }) {
    if (process.env.VERCEL === '1') {
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /^cloudflare:workers$/,
        path.resolve(process.cwd(), 'lib/cloudflare-workers-stub.ts'),
      ));
    }
    return config;
  },
  async headers() {
    const securityHeaders = {
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    };
    const cachedAssets = [
      '/aurora-rainbow-bg.jpg',
      '/soft-pull-controller.webp',
      '/soft-pull-cursor.webp',
      '/match-rosette.webp',
      '/match-charm.webp',
    ].map((source) => ({
      source,
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
    }));
    return [securityHeaders, ...cachedAssets];
  },
};

export default nextConfig;
