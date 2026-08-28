import { createWechatSignature, normalizeShareUrl } from '@/lib/wechat.mjs';

export const runtime = 'edge';

type TicketCache = {
  value: string;
  expiresAt: number;
};

let ticketCache: TicketCache | null = null;

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const candidateUrl = new URL(request.url).searchParams.get('url');
  if (!candidateUrl) {
    return Response.json({ error: 'missing_url' }, { status: 400, headers });
  }

  let shareUrl: string;
  try {
    shareUrl = normalizeShareUrl(candidateUrl);
  } catch {
    return Response.json({ error: 'invalid_url' }, { status: 400, headers });
  }

  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    return Response.json({ error: 'wechat_not_configured' }, { status: 503, headers });
  }

  try {
    if (!ticketCache || ticketCache.expiresAt <= Date.now()) {
      const tokenResponse = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`,
        { cache: 'no-store', redirect: 'error' },
      );
      const tokenData = (await tokenResponse.json()) as {
        access_token?: string;
        expires_in?: number;
        errcode?: number;
      };
      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error(`token_error_${tokenData.errcode ?? tokenResponse.status}`);
      }

      const ticketResponse = await fetch(
        `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${encodeURIComponent(tokenData.access_token)}&type=jsapi`,
        { cache: 'no-store', redirect: 'error' },
      );
      const ticketData = (await ticketResponse.json()) as {
        ticket?: string;
        expires_in?: number;
        errcode?: number;
      };
      if (!ticketResponse.ok || ticketData.errcode !== 0 || !ticketData.ticket) {
        throw new Error(`ticket_error_${ticketData.errcode ?? ticketResponse.status}`);
      }

      const lifetimeSeconds = Math.min(
        tokenData.expires_in ?? 7_200,
        ticketData.expires_in ?? 7_200,
      );
      ticketCache = {
        value: ticketData.ticket,
        expiresAt: Date.now() + Math.max(300, lifetimeSeconds - 300) * 1_000,
      };
    }

    const randomValues = crypto.getRandomValues(new Uint32Array(4));
    const nonceStr = Array.from(randomValues, (value) => value.toString(16).padStart(8, '0')).join('');
    const timestamp = Math.floor(Date.now() / 1_000);
    const signature = await createWechatSignature({
      jsapiTicket: ticketCache.value,
      nonceStr,
      timestamp,
      url: shareUrl,
    });

    return Response.json({ appId, timestamp, nonceStr, signature }, { headers });
  } catch {
    return Response.json({ error: 'wechat_upstream_unavailable' }, { status: 502, headers });
  }
}
