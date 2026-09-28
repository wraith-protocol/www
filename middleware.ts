import {
  resolveRouteMetadata,
  isIndexableRoute,
  ogImageSlugFor,
  CACHE_CONTROL,
  OG_LOCALE_TAGS,
} from './src/utils/og-metadata';

export const config = {
  matcher: ['/:path*'],
};

const BOT_USER_AGENTS = [
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'telegrambot',
  'whatsapp',
  'pinterest',
  'googlebot',
  'bingbot',
  'applebot',
  'yandexbot',
  'baiduspider',
];

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  const isBot = BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));

  if (!isBot) {
    return;
  }

  if (!isIndexableRoute(url.pathname)) {
    return;
  }

  const metadata = resolveRouteMetadata(url.pathname);

  if (!metadata) {
    return;
  }

  try {
    const response = await fetch(url.origin);
    let html = await response.text();

    const imageSlug = ogImageSlugFor(url.pathname, metadata.locale);
    const ogImageUrl = imageSlug
      ? `${url.origin}/og/${imageSlug}.png`
      : `${url.origin}/api/og?title=${encodeURIComponent(metadata.ogImage.title)}${
          metadata.ogImage.subtitle
            ? `&subtitle=${encodeURIComponent(metadata.ogImage.subtitle)}`
            : ''
        }${metadata.ogImage.chainBadge ? `&badge=${encodeURIComponent(metadata.ogImage.chainBadge)}` : ''}${
          metadata.locale === 'en' ? '' : `&lang=${metadata.locale}`
        }`;

    const title = metadata.title;
    const description = metadata.description;

    const customMetaTags = [
      `<meta name="description" content="${escapeHtmlAttr(description)}" />`,
      `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`,
      `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`,
      `<meta property="og:image" content="${escapeHtmlAttr(ogImageUrl)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:url" content="${escapeHtmlAttr(metadata.ogUrl)}" />`,
      `<meta property="og:type" content="${metadata.ogType}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`,
      `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`,
      `<meta name="twitter:image" content="${escapeHtmlAttr(ogImageUrl)}" />`,
    ].join('\n      ');

    const localeTag = `<meta property="og:locale" content="${OG_LOCALE_TAGS[metadata.locale]}" />`;

    html = html.replace('</head>', `${customMetaTags}\n      ${localeTag}\n    </head>`);

    html = html.replace(/<title>[^<]*<\/title>/g, `<title>${escapeHtmlAttr(title)}</title>`);

    html = html.replace(/<html lang="(en|es|pt)"\s*>/i, `<html lang="${metadata.locale}">`);

    const headers = new Headers();
    headers.set('content-type', 'text/html;charset=UTF-8');
    headers.set('cache-control', CACHE_CONTROL);

    return new Response(html, { headers });
  } catch (error) {
    console.error('Middleware HTML rewrite failed:', error);
    return;
  }
}
