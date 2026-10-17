export const PAGE_CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://plausible.io",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://usewraith.xyz",
  "connect-src 'self' https://plausible.io https://soroban-testnet.stellar.org https://soroban-rpc.stellar.org https://horizon-testnet.stellar.org https://horizon.stellar.org https://status.usewraith.xyz",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
] as const;

export const PAGE_CONTENT_SECURITY_POLICY = PAGE_CSP_DIRECTIVES.join('; ');

export const API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'";

export const FEED_CONTENT_SECURITY_POLICY =
  "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'";

export const COMMON_SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export const PAGE_SECURITY_HEADERS: Record<string, string> = {
  ...COMMON_SECURITY_HEADERS,
  'Content-Security-Policy': PAGE_CONTENT_SECURITY_POLICY,
};

export const SUBSCRIBE_API_SECURITY_HEADERS: Record<string, string> = {
  ...COMMON_SECURITY_HEADERS,
  'Content-Security-Policy': API_CONTENT_SECURITY_POLICY,
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

export const OG_API_SECURITY_HEADERS: Record<string, string> = {
  ...COMMON_SECURITY_HEADERS,
  'Content-Security-Policy': API_CONTENT_SECURITY_POLICY,
};

export const FEED_SECURITY_HEADERS: Record<string, string> = {
  ...COMMON_SECURITY_HEADERS,
  'Content-Security-Policy': FEED_CONTENT_SECURITY_POLICY,
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
};

export const IMMUTABLE_ASSET_HEADERS: Record<string, string> = {
  ...COMMON_SECURITY_HEADERS,
  'Content-Security-Policy': PAGE_CONTENT_SECURITY_POLICY,
  'Cache-Control': 'public, max-age=31536000, immutable',
};

export const FONT_ASSET_HEADERS: Record<string, string> = {
  ...IMMUTABLE_ASSET_HEADERS,
  'Access-Control-Allow-Origin': '*',
};

export const STATIC_MEDIA_HEADERS: Record<string, string> = {
  ...COMMON_SECURITY_HEADERS,
  'Content-Security-Policy': PAGE_CONTENT_SECURITY_POLICY,
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
};

export interface RouteHeaderResolution {
  contentType?: string;
  cacheControl: string;
  headers: Record<string, string>;
}

/**
 * Resolves route-appropriate security, cache, and content-type headers for
 * pages, feeds, static assets, and API responses so the preview server and
 * edge/serverless handlers mirror `vercel.json`.
 */
export function resolveStaticRouteHeaders(
  urlPath: string,
  candidateExt: string,
): RouteHeaderResolution {
  const normalizedPath = urlPath.split('?')[0] ?? '/';

  // RSS feeds (`/feed.xml` and `/feed/tag/*.xml`)
  if (
    normalizedPath === '/feed.xml' ||
    (normalizedPath.startsWith('/feed/tag/') && normalizedPath.endsWith('.xml'))
  ) {
    return {
      contentType: 'application/rss+xml; charset=utf-8',
      cacheControl: FEED_SECURITY_HEADERS['Cache-Control']!,
      headers: { ...FEED_SECURITY_HEADERS },
    };
  }

  // XML sitemap (`/sitemap.xml`)
  if (normalizedPath === '/sitemap.xml' || candidateExt === '.xml') {
    return {
      contentType: 'application/xml; charset=utf-8',
      cacheControl: FEED_SECURITY_HEADERS['Cache-Control']!,
      headers: { ...FEED_SECURITY_HEADERS },
    };
  }

  // Self-hosted fonts (`/fonts/*`)
  if (
    normalizedPath.startsWith('/fonts/') ||
    candidateExt === '.woff2' ||
    candidateExt === '.woff'
  ) {
    return {
      cacheControl: FONT_ASSET_HEADERS['Cache-Control']!,
      headers: { ...FONT_ASSET_HEADERS },
    };
  }

  // Fingerprinted Vite bundle assets (`/assets/*`)
  if (normalizedPath.startsWith('/assets/')) {
    return {
      cacheControl: IMMUTABLE_ASSET_HEADERS['Cache-Control']!,
      headers: { ...IMMUTABLE_ASSET_HEADERS },
    };
  }

  // Static OG images & press kit assets (`/og/*`, `/press-kit/*`, `/press-kit.zip`)
  if (
    normalizedPath.startsWith('/og/') ||
    normalizedPath.startsWith('/press-kit/') ||
    normalizedPath === '/press-kit.zip'
  ) {
    return {
      cacheControl: STATIC_MEDIA_HEADERS['Cache-Control']!,
      headers: { ...STATIC_MEDIA_HEADERS },
    };
  }

  // HTML documents / SPA routes
  if (candidateExt === '.html' || candidateExt === '') {
    return {
      contentType: 'text/html; charset=utf-8',
      cacheControl: 'no-store',
      headers: {
        ...PAGE_SECURITY_HEADERS,
        'Cache-Control': 'no-store',
      },
    };
  }

  // Other public root assets (`favicon.svg`, `robots.txt`, etc.)
  return {
    cacheControl: 'public, max-age=3600',
    headers: {
      ...PAGE_SECURITY_HEADERS,
      'Cache-Control': 'public, max-age=3600',
    },
  };
}
