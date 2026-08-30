export type ImportPreviewStatus = 'extracted' | 'partial' | 'link_only';

export type QuickAddPreview = {
  status: ImportPreviewStatus;
  sourceUrl: string;
  title: string;
  address: string;
  openingHours: string;
  notes: string;
  imageUrl: string;
  coordinates?: {
    lat: number;
    lng: number;
    system: 'wgs84';
  };
};

const GOOGLE_MAPS_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
]);
const MAX_REDIRECTS = 4;
const MAX_HTML_BYTES = 256 * 1024;

export type QuickAddClassification = {
  kind: 'google_maps' | 'link_only';
  url: URL;
};

function isGoogleMapsUrl(url: URL): boolean {
  if (!GOOGLE_MAPS_HOSTS.has(url.hostname) || url.port) return false;
  if (url.hostname === 'maps.app.goo.gl' || url.hostname === 'maps.google.com') return true;
  if (url.hostname === 'goo.gl') return url.pathname === '/maps' || url.pathname.startsWith('/maps/');
  return url.pathname === '/maps' || url.pathname.startsWith('/maps/');
}

export function classifyQuickAddUrl(value: string): QuickAddClassification {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('A valid HTTPS URL is required');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new TypeError('Only HTTPS links without embedded credentials are allowed');
  }
  return { kind: isGoogleMapsUrl(url) ? 'google_maps' : 'link_only', url };
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/&#(\d+);/gu, (_, number: string) => String.fromCodePoint(Number(number)))
    .trim();
}

function readMeta(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const forward = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    'iu',
  );
  const reverse = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
    'iu',
  );
  return decodeHtml(html.match(forward)?.[1] ?? html.match(reverse)?.[1] ?? '');
}

function coordinatesFromUrl(url: URL): QuickAddPreview['coordinates'] | undefined {
  const atCoordinates = decodeURIComponent(url.pathname + url.search).match(
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:,|\b)/u,
  );
  const dataCoordinates = decodeURIComponent(url.pathname + url.search).match(
    /!3d(-?\d{1,2}(?:\.\d+)?).*?!4d(-?\d{1,3}(?:\.\d+)?)/u,
  );
  const match = atCoordinates ?? dataCoordinates;
  if (!match) return undefined;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return undefined;
  }
  return { lat, lng, system: 'wgs84' };
}

function titleFromUrl(url: URL): string {
  const encodedTitle = url.pathname.match(/^\/maps\/place\/([^/]+)/u)?.[1];
  if (!encodedTitle) return '';
  try {
    return decodeURIComponent(encodedTitle).replaceAll('+', ' ').trim();
  } catch {
    return '';
  }
}

function previewFromUrl(url: URL): QuickAddPreview | null {
  const title = titleFromUrl(url);
  const coordinates = coordinatesFromUrl(url);
  if (!title && !coordinates) return null;
  return {
    status: 'partial',
    sourceUrl: url.toString(),
    title,
    address: '',
    openingHours: '',
    notes: '',
    imageUrl: '',
    ...(coordinates ? { coordinates } : {}),
  };
}

function redirectLocation(response: Response, current: URL): URL | null {
  if (response.status < 300 || response.status >= 400) return null;
  const location = response.headers.get('location');
  if (!location) throw new Error('Google Maps redirect did not include a Location');
  return new URL(location, current);
}

async function readTextWithLimit(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('Google Maps preview response is too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export async function previewGoogleMapsUrl(
  value: string,
  options: {
    fetcher?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<QuickAddPreview> {
  const classification = classifyQuickAddUrl(value);
  if (classification.kind !== 'google_maps') throw new TypeError('URL is not an allowed Google Maps link');
  const fetcher = options.fetcher ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000);
  let current = classification.url;

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      let response: Response;
      try {
        response = await fetcher(current.toString(), {
          method: 'GET',
          redirect: 'manual',
          headers: {
            accept: 'text/html,application/xhtml+xml',
            'user-agent': 'ToniRosalieExperience/1.0',
          },
          signal: controller.signal,
        });
      } catch (error) {
        const fallback = previewFromUrl(current);
        if (fallback) return fallback;
        throw error;
      }
      const redirect = redirectLocation(response, current);
      if (redirect) {
        if (redirectCount === MAX_REDIRECTS) throw new Error('Google Maps redirect limit exceeded');
        const next = classifyQuickAddUrl(redirect.toString());
        if (next.kind !== 'google_maps') throw new Error('Google Maps redirect host is not allowed');
        current = next.url;
        continue;
      }
      if (!response.ok) throw new Error(`Google Maps responded with ${response.status}`);
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.startsWith('text/html') && !contentType.startsWith('application/xhtml+xml')) {
        throw new Error('Google Maps preview returned an unsupported content type');
      }
      const contentLength = Number(response.headers.get('content-length') ?? '0');
      if (contentLength > MAX_HTML_BYTES) throw new Error('Google Maps preview response is too large');
      const html = await readTextWithLimit(response, MAX_HTML_BYTES);
      const title = readMeta(html, 'og:title') || titleFromUrl(current);
      const address = readMeta(html, 'og:description');
      const coordinates = coordinatesFromUrl(current);
      const fieldCount = Number(Boolean(title)) + Number(Boolean(address)) + Number(Boolean(coordinates));
      return {
        status: fieldCount === 3 ? 'extracted' : 'partial',
        sourceUrl: current.toString(),
        title,
        address,
        openingHours: '',
        notes: '',
        imageUrl: '',
        ...(coordinates ? { coordinates } : {}),
      };
    }
    throw new Error('Google Maps redirect limit exceeded');
  } finally {
    clearTimeout(timeout);
  }
}

export async function previewQuickAddUrl(
  value: string,
  options: { fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<QuickAddPreview> {
  const classification = classifyQuickAddUrl(value);
  if (classification.kind === 'google_maps') {
    return previewGoogleMapsUrl(classification.url.toString(), options);
  }
  return {
    status: 'link_only',
    sourceUrl: classification.url.toString(),
    title: '',
    address: '',
    openingHours: '',
    notes: '',
    imageUrl: '',
  };
}
