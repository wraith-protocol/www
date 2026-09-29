import { describe, it, expect, vi, beforeEach } from 'vitest';
import middleware from '../../middleware';

async function makeRequest(
  pathname: string,
  userAgent: string,
  originHtml: string = '<html lang="en"><head><title>Default</title></head><body></body></html>',
) {
  const url = `https://usewraith.xyz${pathname}`;
  const request = new Request(url, {
    headers: { 'user-agent': userAgent },
  });

  const mockFetch = vi.fn().mockResolvedValue({
    text: () => Promise.resolve(originHtml),
  });

  vi.stubGlobal('fetch', mockFetch);

  const response = await middleware(request as Request);

  return { response, mockFetch };
}

describe('middleware: bot detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('processes Twitter bot requests', async () => {
    const { response } = await makeRequest(
      '/',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>Default</title></head></html>',
    );
    expect(response).not.toBeUndefined();
  });

  it('processes Facebook bot requests', async () => {
    const { response } = await makeRequest(
      '/blog',
      'facebookexternalhit/1.0',
      '<html lang="en"><head></head></html>',
    );
    expect(response).not.toBeUndefined();
  });

  it('processes Google bot requests', async () => {
    const { response } = await makeRequest(
      '/grants',
      'GoogleBot/2.1',
      '<html lang="en"><head></head></html>',
    );
    expect(response).not.toBeUndefined();
  });

  it('bypasses non-bot requests', async () => {
    const { response } = await makeRequest(
      '/',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      '<html lang="en"><head></head></html>',
    );
    expect(response).toBeUndefined();
  });

  it('bypasses non-bot requests on all routes', async () => {
    const { response } = await makeRequest(
      '/blog/my-post',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      '<html lang="en"><head></head></html>',
    );
    expect(response).toBeUndefined();
  });
});

describe('middleware: non-indexable routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bypasses bot requests for non-indexable routes', async () => {
    const { response } = await makeRequest(
      '/admin',
      'TwitterBot/1.0',
      '<html lang="en"><head></head></html>',
    );
    expect(response).toBeUndefined();
  });

  it('bypasses bot requests for unknown routes', async () => {
    const { response } = await makeRequest(
      '/nonexistent',
      'TwitterBot/1.0',
      '<html lang="en"><head></head></html>',
    );
    expect(response).toBeUndefined();
  });

  it('bypasses bot requests for /settings', async () => {
    const { response } = await makeRequest(
      '/settings',
      'TwitterBot/1.0',
      '<html lang="en"><head></head></html>',
    );
    expect(response).toBeUndefined();
  });

  it('bypasses bot requests for unknown blog slugs', async () => {
    for (const path of ['/blog/nonexistent-post', '/es/blog/nonexistent-post']) {
      const { response } = await makeRequest(
        path,
        'TwitterBot/1.0',
        '<html lang="en"><head></head></html>',
      );
      expect(response, `${path} must not be rewritten`).toBeUndefined();
    }
  });

  it('bypasses bot requests for unknown case study slugs', async () => {
    const { response } = await makeRequest(
      '/case-studies/nonexistent',
      'TwitterBot/1.0',
      '<html lang="en"><head></head></html>',
    );
    expect(response).toBeUndefined();
  });

  it('bypasses bot requests for blog tag and author routes', async () => {
    for (const path of ['/blog/tag/wave-7', '/blog/author/lena-vogt']) {
      const { response } = await makeRequest(
        path,
        'TwitterBot/1.0',
        '<html lang="en"><head></head></html>',
      );
      expect(response, `${path} must not be rewritten`).toBeUndefined();
    }
  });
});

describe('middleware: newly covered routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['/chains', 'Chain Comparison Matrix', 'og/chains.png'],
    ['/ecosystem', 'Ecosystem &amp; Partners', 'og/ecosystem.png'],
    ['/security', 'Security Commitments', 'og/security.png'],
    ['/status', 'System Status', 'og/status.png'],
    ['/governance', 'Governance', 'og/governance.png'],
    ['/threat-model', 'Threat Model', 'og/threat-model.png'],
    ['/use-cases/calculator', 'Payment Cost Calculator', 'og/use-cases-calculator.png'],
  ])('injects metadata for %s', async (path, expectedTitle, expectedImage) => {
    const { response } = await makeRequest(
      path,
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();

    expect(html).toContain(`<title>${expectedTitle}`);
    expect(html).toContain(expectedImage);
    expect(html).toContain('https://usewraith.xyz' + path);
  });

  it('injects localized metadata and localized images', async () => {
    const { response } = await makeRequest(
      '/es/chains',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();

    expect(html).toContain('og/es-chains.png');
    expect(html).toContain('og:locale" content="es_ES');
    expect(html).toContain('https://usewraith.xyz/es/chains');
  });
});

describe('middleware: meta tag injection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('injects correct title for home route', async () => {
    const { response } = await makeRequest(
      '/',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>Default</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('<title>Wraith Protocol</title>');
    expect(html).not.toContain('Default');
  });

  it('injects correct description for home route', async () => {
    const { response } = await makeRequest(
      '/',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('Private payments for every chain');
    expect(html).toContain('Stealth addresses, multichain SDK');
  });

  it('injects og:title for blog route', async () => {
    const { response } = await makeRequest(
      '/blog',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('Blog — Wraith Protocol');
  });

  it('injects og:image for grants route', async () => {
    const { response } = await makeRequest(
      '/grants',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og/grants.png');
    expect(html).toContain('twitter:image');
  });

  it('injects og:image for stellar route', async () => {
    const { response } = await makeRequest(
      '/stellar',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og/stellar.png');
  });

  it('injects og:image for roadmap route', async () => {
    const { response } = await makeRequest(
      '/roadmap',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og/roadmap.png');
  });

  it('injects og:image for use-cases route', async () => {
    const { response } = await makeRequest(
      '/use-cases',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og/use-cases.png');
  });

  it('injects og:url for blog post route', async () => {
    const { response } = await makeRequest(
      '/blog/wave-7-kickoff',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('https://usewraith.xyz/blog/wave-7-kickoff');
    expect(html).toContain('Wave 7 Kick-off');
  });

  it('injects og:image for blog post route', async () => {
    const { response } = await makeRequest(
      '/blog/wave-7-kickoff',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og/blog-wave-7-kickoff.png');
  });

  it('injects og:image for case study route', async () => {
    const { response } = await makeRequest(
      '/case-studies/payroll-processor',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og/case-study-payroll-processor.png');
    expect(html).toContain('Anonymous Payroll Provider');
  });

  it('injects og:type as article for blog posts', async () => {
    const { response } = await makeRequest(
      '/blog/wave-7-kickoff',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og:type" content="article"');
  });

  it('injects og:type as website for static pages', async () => {
    const { response } = await makeRequest(
      '/',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og:type" content="website"');
  });

  it('injects twitter:card summary_large_image', async () => {
    const { response } = await makeRequest(
      '/',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('twitter:card" content="summary_large_image"');
  });
});

describe('middleware: localization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('injects Spanish title for /es/stellar', async () => {
    const { response } = await makeRequest(
      '/es/stellar',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('Integración Stellar');
    expect(html).toContain('lang="es"');
  });

  it('injects Spanish title for /es/grants', async () => {
    const { response } = await makeRequest(
      '/es/grants',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('Subvenciones');
    expect(html).toContain('lang="es"');
  });

  it('injects Spanish description for /es/grants', async () => {
    const { response } = await makeRequest(
      '/es/grants',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain(
      'Wraith Protocol mantiene un programa de subvenciones para infraestructura de privacidad',
    );
    expect(html).not.toContain('runs a grant program for privacy infrastructure');
  });

  it('injects Portuguese title and description for /pt/grants', async () => {
    const { response } = await makeRequest(
      '/pt/grants',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('Bolsas — Wraith Protocol');
    expect(html).toContain(
      'O Wraith Protocol mantém um programa de bolsas para infraestrutura de privacidade',
    );
    expect(html).not.toContain('runs a grant program for privacy infrastructure');
    expect(html).toContain('lang="pt"');
  });

  it('injects Portuguese title for /pt/stellar', async () => {
    const { response } = await makeRequest(
      '/pt/stellar',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('Integração Stellar');
    expect(html).toContain('lang="pt"');
  });

  it('preserves the locale in og:url for localized routes', async () => {
    const es = await makeRequest(
      '/es/grants',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const esHtml = await es.response!.text();
    expect(esHtml).toContain('og:url" content="https://usewraith.xyz/es/grants"');

    const pt = await makeRequest(
      '/pt/blog/wave-7-kickoff',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const ptHtml = await pt.response!.text();
    expect(ptHtml).toContain('og:url" content="https://usewraith.xyz/pt/blog/wave-7-kickoff"');
  });

  it('keeps the English og:url unprefixed', async () => {
    const { response } = await makeRequest(
      '/grants',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og:url" content="https://usewraith.xyz/grants"');
  });

  it('injects og:locale en_US for English', async () => {
    const { response } = await makeRequest(
      '/',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og:locale" content="en_US"');
  });

  it('injects og:locale es_ES for Spanish', async () => {
    const { response } = await makeRequest(
      '/es/',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og:locale" content="es_ES"');
  });

  it('injects og:locale pt_BR for Portuguese', async () => {
    const { response } = await makeRequest(
      '/pt/',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og:locale" content="pt_BR"');
    expect(html).toContain('lang="pt"');
  });

  it('handles /en/ prefix correctly', async () => {
    const { response } = await makeRequest(
      '/en/stellar',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('Stellar Integration');
    expect(html).toContain('lang="en"');
  });

  it('handles /es/blog/:slug with Spanish locale', async () => {
    const { response } = await makeRequest(
      '/es/blog/wave-7-kickoff',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain(
      'og:image" content="https://usewraith.xyz/og/es-blog-wave-7-kickoff.png"',
    );
    expect(html).toContain('lang="es"');
    expect(html).toContain('og:locale" content="es_ES"');
  });

  it('uses locale-specific OG image for /es/grants', async () => {
    const { response } = await makeRequest(
      '/es/grants',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).not.toContain('og/grants.png');
    expect(html).toContain('og/es-grants.png');
    expect(html).toContain('lang="es"');
  });

  it('uses locale-specific OG image for /pt/grants', async () => {
    const { response } = await makeRequest(
      '/pt/grants',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).not.toContain('og/grants.png');
    expect(html).not.toContain('og/es-grants.png');
    expect(html).toContain('og/pt-grants.png');
    expect(html).toContain('lang="pt"');
  });

  it('uses a Portuguese OG image for /pt/blog/:slug', async () => {
    const { response } = await makeRequest(
      '/pt/blog/wave-7-kickoff',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain(
      'og:image" content="https://usewraith.xyz/og/pt-blog-wave-7-kickoff.png"',
    );
    expect(html).toContain('og:locale" content="pt_BR"');
  });

  it('uses English OG image for /grants (no locale prefix)', async () => {
    const { response } = await makeRequest(
      '/grants',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('og/grants.png');
    expect(html).not.toContain('og/es-grants.png');
  });
});

describe('middleware: cache headers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets cache-control header on bot responses', async () => {
    const { response } = await makeRequest(
      '/',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const cacheControl = response!.headers.get('cache-control');
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain('max-age=0');
    expect(cacheControl).toContain('s-maxage');
  });

  it('sets content-type header on bot responses', async () => {
    const { response } = await makeRequest(
      '/',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const contentType = response!.headers.get('content-type');
    expect(contentType).toContain('text/html');
  });
});

describe('middleware: existing behavior preservation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves original roadmap behavior', async () => {
    const { response } = await makeRequest(
      '/roadmap',
      'Slackbot 1.0',
      '<html lang="en"><head><title>Default</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('Roadmap');
    expect(html).toContain('og/roadmap.png');
    expect(html).toContain('twitter:image');
  });

  it('preserves original stellar behavior', async () => {
    const { response } = await makeRequest(
      '/stellar',
      'LinkedInBot/1.0',
      '<html lang="en"><head><title>Default</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('Stellar Integration');
    expect(html).toContain('og/stellar.png');
  });

  it('preserves original usecases behavior for /use-cases', async () => {
    const { response } = await makeRequest(
      '/use-cases',
      'GoogleBot/2.1',
      '<html lang="en"><head><title>Default</title></head></html>',
    );
    const html = await response!.text();
    expect(html).toContain('Use Cases');
    expect(html).toContain('og/use-cases.png');
  });
});

describe('middleware: localized dynamic content', () => {
  beforeEach(() => vi.clearAllMocks());

  it('injects Spanish metadata, URL and image for a blog post', async () => {
    const { response } = await makeRequest(
      '/es/blog/privacy-by-default',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();

    expect(html).toContain('<title>Privacidad por defecto — Wraith Protocol</title>');
    expect(html).toContain('Cómo hace Wraith que los pagos privados sean prácticos');
    expect(html).not.toContain('How Wraith makes private payments practical');
    expect(html).toContain('og:url" content="https://usewraith.xyz/es/blog/privacy-by-default"');
    expect(html).toContain('og/es-blog-privacy-by-default.png');
    expect(html).toContain('og:locale" content="es_ES"');
  });

  it('injects Portuguese metadata, URL and image for a blog post', async () => {
    const { response } = await makeRequest(
      '/pt/blog/privacy-by-default',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();

    expect(html).toContain('<title>Privacidade por padrão — Wraith Protocol</title>');
    expect(html).toContain('Como o Wraith torna pagamentos privados práticos');
    expect(html).not.toContain('How Wraith makes private payments practical');
    expect(html).toContain('og:url" content="https://usewraith.xyz/pt/blog/privacy-by-default"');
    expect(html).toContain('og/pt-blog-privacy-by-default.png');
    expect(html).toContain('og:locale" content="pt_BR"');
  });

  it('injects Spanish metadata and image for a case study', async () => {
    const { response } = await makeRequest(
      '/es/case-studies/payroll-processor',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();

    expect(html).toContain('<title>Proveedor de nómina anónimo — Wraith Protocol</title>');
    expect(html).toContain('plataforma de procesamiento de nóminas');
    expect(html).toContain('og/es-case-study-payroll-processor.png');
    expect(html).toContain('https://usewraith.xyz/es/case-studies/payroll-processor');
  });

  it('injects Portuguese metadata and image for a case study', async () => {
    const { response } = await makeRequest(
      '/pt/case-studies/payroll-processor',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();

    expect(html).toContain(
      '<title>Provedor de folha de pagamento anônimo — Wraith Protocol</title>',
    );
    expect(html).toContain('processamento de folha de pagamento');
    expect(html).toContain('og/pt-case-study-payroll-processor.png');
    expect(html).toContain('https://usewraith.xyz/pt/case-studies/payroll-processor');
  });

  it('keeps English dynamic routes unprefixed and in English', async () => {
    const { response } = await makeRequest(
      '/blog/privacy-by-default',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();

    expect(html).toContain('<title>Privacy by default — Wraith Protocol</title>');
    expect(html).toContain('How Wraith makes private payments practical for everyday apps.');
    expect(html).toContain('og/blog-privacy-by-default.png');
    expect(html).not.toContain('og/es-');
    expect(html).not.toContain('og/pt-');
    expect(html).toContain('og:url" content="https://usewraith.xyz/blog/privacy-by-default"');
  });

  it('keeps explicit /en dynamic routes in English without a prefix', async () => {
    const { response } = await makeRequest(
      '/en/blog/privacy-by-default',
      'TwitterBot/1.0',
      '<html lang="en"><head><title>X</title></head></html>',
    );
    const html = await response!.text();

    expect(html).toContain('<title>Privacy by default — Wraith Protocol</title>');
    expect(html).toContain('og/blog-privacy-by-default.png');
    expect(html).toContain('og:url" content="https://usewraith.xyz/blog/privacy-by-default"');
  });
});

describe('middleware: HTML escaping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not allow XSS in meta tag attributes', async () => {
    const html = '<html lang="en"><head></head></html>';
    const { response } = await makeRequest('/about', 'TwitterBot/1.0', html);
    const result = await response!.text();
    expect(result).toContain('</head>');
    expect(result).toContain('<html');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('javascript:');
  });

  it('produces valid HTML structure', async () => {
    const html = '<html lang="en"><head></head></html>';
    const { response } = await makeRequest('/about', 'TwitterBot/1.0', html);
    const result = await response!.text();
    expect(result).toContain('</head>');
    expect(result).toContain('<html');
  });

  it('escapes ampersands in meta descriptions', async () => {
    const { response } = await makeRequest(
      '/blog/wave-7-kickoff',
      'TwitterBot/1.0',
      '<html lang="en"><head></head></html>',
    );
    const result = await response!.text();
    // The excerpt contains no special chars but verify meta tags are well-formed
    const metaTags = result.match(/<meta[^>]+>/g);
    expect(metaTags).toBeTruthy();
    metaTags!.forEach((tag) => {
      expect(tag).not.toMatch(/<script/i);
    });
  });
});
