export const config = {
  matcher: ['/roadmap', '/stellar', '/usecases'],
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
];

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  const isBot = BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));

  if (!isBot) {
    return;
  }

  const routeMap: Record<string, { title: string; subtitle?: string }> = {
    '/roadmap': { title: 'Roadmap', subtitle: 'The future of Wraith' },
    '/stellar': { title: 'Stellar Ecosystem', subtitle: 'Seamless Integration' },
    '/usecases': { title: 'Use Cases' },
  };

  const routeData = routeMap[url.pathname];

  if (!routeData) {
    return;
  }

  try {
    const response = await fetch(url.origin);
    let html = await response.text();

    const ogImageUrl = `${url.origin}/api/og?title=${encodeURIComponent(routeData.title)}${
      routeData.subtitle ? `&subtitle=${encodeURIComponent(routeData.subtitle)}` : ''
    }`;

    const customMetaTags = `
      <meta property="og:title" content="${routeData.title} | Wraith" />
      <meta property="og:image" content="${ogImageUrl}" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${routeData.title} | Wraith" />
      <meta name="twitter:image" content="${ogImageUrl}" />
    </head>`;

    html = html.replace('</head>', customMetaTags);

    return new Response(html, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
        'cache-control': 'public, max-age=0, s-maxage=0',
      },
    });
  } catch (error) {
    console.error('Middleware HTML rewrite failed:', error);
    return;
  }
}
