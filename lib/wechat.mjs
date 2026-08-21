const SHARE_ORIGIN = 'https://rosalie.toni.asia';

export function normalizeShareUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error('Share URL is not allowed');
  }

  if (url.origin !== SHARE_ORIGIN) {
    throw new Error('Share URL is not allowed');
  }

  url.hash = '';
  return url.toString();
}

export async function createWechatSignature({ jsapiTicket, nonceStr, timestamp, url }) {
  const source = [
    `jsapi_ticket=${jsapiTicket}`,
    `noncestr=${nonceStr}`,
    `timestamp=${timestamp}`,
    `url=${url}`,
  ].join('&');
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(source),
  );

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
