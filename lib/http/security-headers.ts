export function buildSecurityHeaders(nonce: string, isDevelopment: boolean) {
  const scriptPolicy = isDevelopment
    ? `'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;
  const stylePolicy = isDevelopment ? `'self' 'unsafe-inline'` : `'self'`;
  const contentSecurityPolicy = [
    `default-src 'self'`,
    `script-src ${scriptPolicy}`,
    `style-src ${stylePolicy}`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob: https://tile.openstreetmap.org`,
    `font-src 'self' data:`,
    `connect-src 'self' https://tile.openstreetmap.org`,
    `worker-src 'self' blob:`,
    `base-uri 'none'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
  ].join('; ');

  return {
    'Content-Security-Policy': contentSecurityPolicy,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  } as const;
}
