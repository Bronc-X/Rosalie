import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: '11mb' },
    proxyClientMaxBodySize: '11mb',
  },
  webpack(config, { webpack }) {
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(
      /^cloudflare:workers$/,
      path.resolve(process.cwd(), 'lib/cloudflare-workers-stub.ts'),
    ));
    return config;
  },
  async headers() {
    const developmentEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
    const securityHeaders = {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: `default-src 'self'; script-src 'self' 'unsafe-inline'${developmentEval} https://res.wx.qq.com; connect-src 'self'; img-src 'self' data: blob: https://a.tile.openstreetmap.fr https://tile.openstreetmap.org https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`,
        },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        { key: 'X-DNS-Prefetch-Control', value: 'off' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    };
    const cachedAssets = [
      '/aurora-rainbow-bg.jpg',
      '/aurora-rainbow-original.webp',
      '/soft-pull-controller.webp',
      '/soft-pull-cursor.webp',
      '/match-rosette.webp',
      '/match-charm.webp',
      '/food/shantou-qilou-food-v1.webp',
      '/food/restaurants/:path*',
    ].map((source) => ({
      source,
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
    }));
    return [securityHeaders, ...cachedAssets];
  },
};

export default nextConfig;
