import { describe, expect, it } from 'vitest';
import {
  resolveRouteMetadata,
  isIndexableRoute,
  ogImageSlugFor,
  generateOgImageUrl,
  stripLocalePrefix,
  localeStrings,
  listOgImageJobs,
  SITE_URL,
  CACHE_CONTROL,
  SUPPORTED_LOCALES,
  type Locale,
} from '../utils/og-metadata';

describe('og-metadata: static routes', () => {
  it('resolves home route with correct title and description', () => {
    const meta = resolveRouteMetadata('/');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Wraith Protocol');
    expect(meta!.description).toBe(
      'Private payments for every chain. Stealth addresses, multichain SDK, and AI-powered privacy agents.',
    );
    expect(meta!.ogType).toBe('website');
    expect(meta!.ogUrl).toBe('https://usewraith.xyz');
  });

  it('resolves /blog route', () => {
    const meta = resolveRouteMetadata('/blog');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Blog — Wraith Protocol');
    expect(meta!.ogImage.title).toBe('Blog');
    expect(meta!.ogType).toBe('website');
  });

  it('resolves /grants route', () => {
    const meta = resolveRouteMetadata('/grants');
    expect(meta).not.toBeNull();
    expect(meta!.title).toContain('Grants');
    expect(meta!.ogImage.chainBadge).toBe('Stellar · EVM');
  });

  it('resolves /case-studies route', () => {
    const meta = resolveRouteMetadata('/case-studies');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Case Studies — Wraith Protocol');
  });

  it('resolves /stellar route with chain badge', () => {
    const meta = resolveRouteMetadata('/stellar');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Stellar Integration — Wraith Protocol');
    expect(meta!.ogImage.chainBadge).toBe('Stellar');
  });

  it('resolves /roadmap route', () => {
    const meta = resolveRouteMetadata('/roadmap');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Roadmap — Wraith Protocol');
  });

  it('resolves /use-cases route', () => {
    const meta = resolveRouteMetadata('/use-cases');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Use Cases — Wraith Protocol');
  });

  it('resolves /faq route', () => {
    const meta = resolveRouteMetadata('/faq');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('FAQ — Wraith Protocol');
  });

  it('resolves /privacy route', () => {
    const meta = resolveRouteMetadata('/privacy');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Privacy Policy — Wraith Protocol');
  });

  it('resolves /careers route', () => {
    const meta = resolveRouteMetadata('/careers');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Careers — Wraith Protocol');
  });

  it('resolves /about route', () => {
    const meta = resolveRouteMetadata('/about');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('About — Wraith Protocol');
  });

  it('resolves /newsletter route', () => {
    const meta = resolveRouteMetadata('/newsletter');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Newsletter — Wraith Protocol');
  });

  it('resolves /contributors route', () => {
    const meta = resolveRouteMetadata('/contributors');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Contributors — Wraith Protocol');
  });

  it('resolves /vitals route', () => {
    const meta = resolveRouteMetadata('/vitals');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Web Vitals Dashboard — Wraith Protocol');
  });

  it('resolves the remaining indexable static routes', () => {
    const expected: Array<[string, string]> = [
      ['/chains', 'Chain Comparison Matrix — Wraith Protocol'],
      ['/ecosystem', 'Ecosystem & Partners — Wraith Protocol'],
      ['/security', 'Security Commitments — Wraith Protocol'],
      ['/status', 'System Status — Wraith Protocol'],
      ['/governance', 'Governance — Wraith Protocol'],
      ['/threat-model', 'Threat Model — Wraith Protocol'],
      ['/use-cases/calculator', 'Payment Cost Calculator — Wraith Protocol'],
    ];

    for (const [route, title] of expected) {
      const meta = resolveRouteMetadata(route);
      expect(meta, `${route} must resolve`).not.toBeNull();
      expect(meta!.title).toBe(title);
      expect(meta!.ogUrl).toBe(`https://usewraith.xyz${route}`);
    }
  });

  it('keeps /use-cases/calculator separate from its parent route', () => {
    expect(resolveRouteMetadata('/use-cases/calculator')!.title).not.toBe(
      resolveRouteMetadata('/use-cases')!.title,
    );
  });
});

describe('og-metadata: dynamic routes', () => {
  it('resolves a known blog post by slug', () => {
    const meta = resolveRouteMetadata('/blog/wave-7-kickoff');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Wave 7 Kick-off + What We Shipped in Wave 6 — Wraith Protocol');
    expect(meta!.ogType).toBe('article');
    expect(meta!.ogUrl).toBe('https://usewraith.xyz/blog/wave-7-kickoff');
  });

  it('resolves a blog post from manifest', () => {
    const meta = resolveRouteMetadata('/blog/privacy-by-default');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Privacy by default — Wraith Protocol');
    expect(meta!.ogType).toBe('article');
  });

  it('returns no metadata for an unknown blog slug', () => {
    expect(resolveRouteMetadata('/blog/nonexistent-post')).toBeNull();
    expect(resolveRouteMetadata('/es/blog/nonexistent-post')).toBeNull();
  });

  it('resolves a known case study by slug', () => {
    const meta = resolveRouteMetadata('/case-studies/payroll-processor');
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Anonymous Payroll Provider — Wraith Protocol');
    expect(meta!.ogType).toBe('article');
    expect(meta!.ogUrl).toBe('https://usewraith.xyz/case-studies/payroll-processor');
  });

  it('returns no metadata for an unknown case study slug', () => {
    expect(resolveRouteMetadata('/case-studies/nonexistent')).toBeNull();
    expect(resolveRouteMetadata('/pt/case-studies/nonexistent')).toBeNull();
  });

  it('does not treat blog tag or author routes as posts', () => {
    expect(resolveRouteMetadata('/blog/tag/wave-7')).toBeNull();
    expect(resolveRouteMetadata('/blog/author/lena-vogt')).toBeNull();
  });
});

describe('og-metadata: localization', () => {
  it('resolves Spanish locale from /es prefix', () => {
    const meta = resolveRouteMetadata('/es/blog/wave-7-kickoff');
    expect(meta).not.toBeNull();
    expect(meta!.locale).toBe('es');
  });

  it('resolves Spanish locale for /es/stellar', () => {
    const meta = resolveRouteMetadata('/es/stellar');
    expect(meta).not.toBeNull();
    expect(meta!.locale).toBe('es');
    expect(meta!.title).toBe('Integración Stellar — Wraith Protocol');
  });

  it('resolves Spanish locale for /es/grants', () => {
    const meta = resolveRouteMetadata('/es/grants');
    expect(meta).not.toBeNull();
    expect(meta!.locale).toBe('es');
    expect(meta!.title).toBe('Subvenciones — Wraith Protocol');
  });

  it('resolves Portuguese locale from /pt prefix', () => {
    const meta = resolveRouteMetadata('/pt/blog/wave-7-kickoff');
    expect(meta).not.toBeNull();
    expect(meta!.locale).toBe('pt');
  });

  it('resolves Portuguese locale for /pt/stellar', () => {
    const meta = resolveRouteMetadata('/pt/stellar');
    expect(meta).not.toBeNull();
    expect(meta!.locale).toBe('pt');
    expect(meta!.title).toBe('Integração Stellar — Wraith Protocol');
  });

  it('resolves Portuguese locale for /pt/grants', () => {
    const meta = resolveRouteMetadata('/pt/grants');
    expect(meta).not.toBeNull();
    expect(meta!.locale).toBe('pt');
    expect(meta!.title).toBe('Bolsas — Wraith Protocol');
  });

  it('resolves Portuguese home route', () => {
    const meta = resolveRouteMetadata('/pt');
    expect(meta).not.toBeNull();
    expect(meta!.locale).toBe('pt');
    expect(meta!.ogUrl).toBe('https://usewraith.xyz/pt');
  });

  it('returns a Spanish description for Spanish routes', () => {
    const meta = resolveRouteMetadata('/es/grants');
    expect(meta).not.toBeNull();
    expect(meta!.description).toBe(
      'Wraith Protocol mantiene un programa de subvenciones para infraestructura de privacidad. Construye pagos privados y obtén financiación.',
    );
    expect(meta!.ogDescription).toBe(meta!.description);
  });

  it('returns a Spanish home description that differs from English', () => {
    const es = resolveRouteMetadata('/es');
    const en = resolveRouteMetadata('/');
    expect(es).not.toBeNull();
    expect(en).not.toBeNull();
    expect(es!.description).not.toBe(en!.description);
    expect(es!.description).toBe(
      'Pagos privados para cada cadena. Direcciones ocultas, SDK multicadena y agentes de privacidad con IA.',
    );
  });

  it('returns a Portuguese home description that differs from English', () => {
    const pt = resolveRouteMetadata('/pt');
    const en = resolveRouteMetadata('/');
    expect(pt).not.toBeNull();
    expect(en).not.toBeNull();
    expect(pt!.description).not.toBe(en!.description);
    expect(pt!.description).toBe(
      'Pagamentos privados para cada rede. Endereços ocultos, SDK multi-rede e agentes de privacidade com IA.',
    );
  });

  it('localizes the OG image copy, not only the title', () => {
    const es = resolveRouteMetadata('/es/stellar');
    const pt = resolveRouteMetadata('/pt/stellar');
    const en = resolveRouteMetadata('/stellar');
    expect(es!.ogImage.title).toBe('Integración Stellar');
    expect(es!.ogImage.subtitle).not.toBe(en!.ogImage.subtitle);
    expect(pt!.ogImage.title).toBe('Integração Stellar');
    expect(pt!.ogImage.subtitle).not.toBe(en!.ogImage.subtitle);
    expect(pt!.ogImage.chainBadge).toBe('Stellar');
  });

  it('preserves the locale in ogUrl', () => {
    expect(resolveRouteMetadata('/es/grants')!.ogUrl).toBe('https://usewraith.xyz/es/grants');
    expect(resolveRouteMetadata('/pt/grants')!.ogUrl).toBe('https://usewraith.xyz/pt/grants');
    expect(resolveRouteMetadata('/es/blog/wave-7-kickoff')!.ogUrl).toBe(
      'https://usewraith.xyz/es/blog/wave-7-kickoff',
    );
    expect(resolveRouteMetadata('/pt/blog/wave-7-kickoff')!.ogUrl).toBe(
      'https://usewraith.xyz/pt/blog/wave-7-kickoff',
    );
    expect(resolveRouteMetadata('/es/case-studies/payroll-processor')!.ogUrl).toBe(
      'https://usewraith.xyz/es/case-studies/payroll-processor',
    );
  });

  it('keeps English ogUrl unprefixed', () => {
    expect(resolveRouteMetadata('/')!.ogUrl).toBe('https://usewraith.xyz');
    expect(resolveRouteMetadata('/grants')!.ogUrl).toBe('https://usewraith.xyz/grants');
    expect(resolveRouteMetadata('/en/grants')!.ogUrl).toBe('https://usewraith.xyz/grants');
  });

  it('resolves English locale for /en/ prefix', () => {
    const meta = resolveRouteMetadata('/en/blog/wave-7-kickoff');
    expect(meta).not.toBeNull();
    expect(meta!.locale).toBe('en');
  });

  it('defaults to English for no locale prefix', () => {
    const meta = resolveRouteMetadata('/blog/wave-7-kickoff');
    expect(meta).not.toBeNull();
    expect(meta!.locale).toBe('en');
  });

  it('strips locale prefixes correctly', () => {
    expect(stripLocalePrefix('/es/blog/test')).toEqual({
      pathname: '/blog/test',
      locale: 'es',
    });
    expect(stripLocalePrefix('/en/stellar')).toEqual({
      pathname: '/stellar',
      locale: 'en',
    });
    expect(stripLocalePrefix('/es')).toEqual({
      pathname: '/',
      locale: 'es',
    });
    expect(stripLocalePrefix('/pt/grants')).toEqual({
      pathname: '/grants',
      locale: 'pt',
    });
    expect(stripLocalePrefix('/pt')).toEqual({
      pathname: '/',
      locale: 'pt',
    });
    expect(stripLocalePrefix('/blog/test')).toEqual({
      pathname: '/blog/test',
      locale: 'en',
    });
  });

  it('returns Spanish locale strings', () => {
    const strings = localeStrings('es');
    expect(strings.ogTitle).toBe('Wraith Protocol');
    expect(strings.siteTitle).toBe('Wraith Protocol — Pagos privados para cada cadena');
  });

  it('returns English locale strings', () => {
    const strings = localeStrings('en');
    expect(strings.ogTitle).toBe('Wraith Protocol');
    expect(strings.siteTitle).toBe('Wraith Protocol — Private payments for every chain');
  });

  it('returns Portuguese locale strings', () => {
    const strings = localeStrings('pt');
    expect(strings.ogTitle).toBe('Wraith Protocol');
    expect(strings.siteTitle).toBe('Wraith Protocol — Pagamentos privados para cada rede');
  });

  it('supports en, es and pt locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'es', 'pt']);
  });
});

describe('og-metadata: OG image URLs', () => {
  it('generates deterministic image slug for home', () => {
    expect(ogImageSlugFor('/', 'en')).toBe('home');
  });

  it('generates deterministic image slug for blog', () => {
    expect(ogImageSlugFor('/blog', 'en')).toBe('blog');
  });

  it('generates deterministic image slug for blog post', () => {
    expect(ogImageSlugFor('/blog/wave-7-kickoff', 'en')).toBe('blog-wave-7-kickoff');
  });

  it('generates deterministic image slug for case study', () => {
    expect(ogImageSlugFor('/case-studies/payroll-processor', 'en')).toBe(
      'case-study-payroll-processor',
    );
  });

  it('generates deterministic image slug for grants', () => {
    expect(ogImageSlugFor('/grants', 'en')).toBe('grants');
  });

  it('generates deterministic image slug for stellar', () => {
    expect(ogImageSlugFor('/stellar', 'en')).toBe('stellar');
  });

  it('generates deterministic image slug for roadmap', () => {
    expect(ogImageSlugFor('/roadmap', 'en')).toBe('roadmap');
  });

  it('generates deterministic image slug for use-cases', () => {
    expect(ogImageSlugFor('/use-cases', 'en')).toBe('use-cases');
  });

  it('returns null for non-indexable routes', () => {
    expect(ogImageSlugFor('/nonexistent', 'en')).toBeNull();
  });

  it('returns null for non-indexable Spanish routes', () => {
    expect(ogImageSlugFor('/es/nonexistent', 'es')).toBeNull();
    expect(ogImageSlugFor('/es/admin', 'es')).toBeNull();
  });

  it('prefixes slug with locale for Spanish static routes', () => {
    expect(ogImageSlugFor('/es', 'es')).toBe('es-home');
    expect(ogImageSlugFor('/es/grants', 'es')).toBe('es-grants');
    expect(ogImageSlugFor('/es/stellar', 'es')).toBe('es-stellar');
    expect(ogImageSlugFor('/es/blog', 'es')).toBe('es-blog');
  });

  it('prefixes slug with locale for Spanish dynamic routes', () => {
    expect(ogImageSlugFor('/es/blog/wave-7-kickoff', 'es')).toBe('es-blog-wave-7-kickoff');
    expect(ogImageSlugFor('/es/case-studies/payroll-processor', 'es')).toBe(
      'es-case-study-payroll-processor',
    );
  });

  it('does not share a slug between locales (no English fallback)', () => {
    expect(ogImageSlugFor('/grants', 'en')).not.toBe(ogImageSlugFor('/es/grants', 'es'));
    expect(ogImageSlugFor('/blog/wave-7-kickoff', 'en')).not.toBe(
      ogImageSlugFor('/es/blog/wave-7-kickoff', 'es'),
    );
    expect(ogImageSlugFor('/grants', 'en')).not.toBe(ogImageSlugFor('/pt/grants', 'pt'));
  });

  it('prefixes slug with locale for Portuguese routes', () => {
    expect(ogImageSlugFor('/pt', 'pt')).toBe('pt-home');
    expect(ogImageSlugFor('/pt/grants', 'pt')).toBe('pt-grants');
    expect(ogImageSlugFor('/pt/stellar', 'pt')).toBe('pt-stellar');
    expect(ogImageSlugFor('/pt/blog', 'pt')).toBe('pt-blog');
    expect(ogImageSlugFor('/pt/blog/wave-7-kickoff', 'pt')).toBe('pt-blog-wave-7-kickoff');
    expect(ogImageSlugFor('/pt/case-studies/payroll-processor', 'pt')).toBe(
      'pt-case-study-payroll-processor',
    );
  });

  it('returns null for non-indexable Portuguese routes', () => {
    expect(ogImageSlugFor('/pt/nonexistent', 'pt')).toBeNull();
    expect(ogImageSlugFor('/pt/admin', 'pt')).toBeNull();
  });

  it('generates one localized image per route and locale', () => {
    const jobs = listOgImageJobs();
    const files = jobs.map((job) => job.file);
    expect(new Set(files).size).toBe(files.length);

    for (const locale of SUPPORTED_LOCALES) {
      expect(files).toContain(locale === 'en' ? 'grants.png' : `${locale}-grants.png`);
      expect(files).toContain(locale === 'en' ? 'home.png' : `${locale}-home.png`);
    }
  });

  it('renders localized copy into the generated image jobs', () => {
    const jobs = listOgImageJobs();
    const grants = (locale: 'en' | 'es' | 'pt') =>
      jobs.find((job) => job.routePath === '/grants' && job.locale === locale)!;

    expect(grants('en').title).toBe('Grants');
    expect(grants('es').title).toBe('Subvenciones');
    expect(grants('pt').title).toBe('Bolsas');
    expect(grants('es').subtitle).not.toBe(grants('en').subtitle);
    expect(grants('pt').subtitle).not.toBe(grants('en').subtitle);
    expect(grants('pt').description).not.toBe(grants('en').description);
  });

  it('keeps one file per locale for every route', () => {
    const jobs = listOgImageJobs();
    const routePaths = new Set(jobs.map((job) => job.routePath));
    for (const routePath of routePaths) {
      const locales = new Set(
        jobs.filter((job) => job.routePath === routePath).map((j) => j.locale),
      );
      expect([...locales].sort()).toEqual([...SUPPORTED_LOCALES].sort());
    }
  });

  it('generates OG image URL with proper encoding', () => {
    const meta = resolveRouteMetadata('/blog/wave-7-kickoff');
    expect(meta).not.toBeNull();
    const url = generateOgImageUrl(meta!.ogImage, 'en');
    expect(url).toContain('title=');
    expect(url).toContain('subtitle=');
    expect(url).toContain(SITE_URL);
    expect(() => new URL(url)).not.toThrow();
  });

  it('handles special characters in titles safely', () => {
    const url = generateOgImageUrl(
      { title: 'Test "quoted" <unsafe>', subtitle: 'desc with & special' },
      'en',
    );
    expect(() => new URL(url)).not.toThrow();
  });

  it('does not allow open redirects in OG image URLs', () => {
    const url = generateOgImageUrl({ title: 'Test', subtitle: 'desc' }, 'en');
    expect(url).toMatch(/^https:\/\/usewraith\.xyz\/api\/og\?/);
  });

  it('appends lang parameter for Spanish locale', () => {
    const url = generateOgImageUrl({ title: 'Test', subtitle: 'desc' }, 'es');
    expect(url).toContain('lang=es');
  });

  it('appends lang parameter for Portuguese locale', () => {
    const url = generateOgImageUrl({ title: 'Teste', subtitle: 'descrição' }, 'pt');
    expect(url).toContain('lang=pt');
    expect(decodeURIComponent(url)).toContain('descrição');
  });

  it('omits lang parameter for English locale', () => {
    const url = generateOgImageUrl({ title: 'Test', subtitle: 'desc' }, 'en');
    expect(url).not.toContain('lang=');
  });

  it('appends badge parameter when chainBadge is present', () => {
    const url = generateOgImageUrl(
      { title: 'Test', subtitle: 'desc', chainBadge: 'Stellar' },
      'en',
    );
    expect(url).toContain('badge=');
  });
});

describe('og-metadata: route indexability', () => {
  const INDEXABLE_STATIC_ROUTES = [
    '/',
    '/blog',
    '/case-studies',
    '/careers',
    '/chains',
    '/contributors',
    '/ecosystem',
    '/faq',
    '/governance',
    '/grants',
    '/about',
    '/newsletter',
    '/privacy',
    '/roadmap',
    '/security',
    '/status',
    '/stellar',
    '/threat-model',
    '/use-cases',
    '/use-cases/calculator',
    '/vitals',
  ];

  it('treats every static route in the router as indexable', () => {
    for (const route of INDEXABLE_STATIC_ROUTES) {
      expect(isIndexableRoute(route), `${route} must be indexable`).toBe(true);
    }
  });

  it('identifies indexable dynamic routes', () => {
    expect(isIndexableRoute('/blog/wave-7-kickoff')).toBe(true);
    expect(isIndexableRoute('/case-studies/payroll-processor')).toBe(true);
  });

  it('rejects unknown blog and case study slugs', () => {
    expect(isIndexableRoute('/blog/nonexistent-post')).toBe(false);
    expect(isIndexableRoute('/case-studies/nonexistent')).toBe(false);
    expect(isIndexableRoute('/es/blog/nonexistent-post')).toBe(false);
    expect(isIndexableRoute('/pt/case-studies/nonexistent')).toBe(false);
  });

  it('rejects blog tag and author routes', () => {
    expect(isIndexableRoute('/blog/tag/wave-7')).toBe(false);
    expect(isIndexableRoute('/blog/author/lena-vogt')).toBe(false);
  });

  it('identifies non-indexable routes', () => {
    expect(isIndexableRoute('/nonexistent')).toBe(false);
    expect(isIndexableRoute('/settings')).toBe(false);
    expect(isIndexableRoute('/admin')).toBe(false);
  });

  it('identifies localized indexable routes', () => {
    expect(isIndexableRoute('/es/blog')).toBe(true);
    expect(isIndexableRoute('/es/stellar')).toBe(true);
    expect(isIndexableRoute('/en/case-studies/payroll-processor')).toBe(true);
    expect(isIndexableRoute('/es/use-cases/calculator')).toBe(true);
    expect(isIndexableRoute('/pt/threat-model')).toBe(true);
  });

  it('identifies localized non-indexable routes', () => {
    expect(isIndexableRoute('/es/nonexistent')).toBe(false);
    expect(isIndexableRoute('/en/admin')).toBe(false);
  });

  it('maps every indexable static route to an OG image slug', () => {
    for (const route of INDEXABLE_STATIC_ROUTES) {
      const slug = ogImageSlugFor(route, 'en');
      expect(slug, `${route} needs a static OG image`).toBeTruthy();
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe('og-metadata: cache control', () => {
  it('provides appropriate cache control header', () => {
    expect(CACHE_CONTROL).toBeTruthy();
    expect(CACHE_CONTROL).toContain('max-age=0');
    expect(CACHE_CONTROL).toContain('s-maxage');
  });
});

describe('og-metadata: localized dynamic content', () => {
  const BLOG_SLUG = 'privacy-by-default';
  const CASE_STUDY_SLUG = 'payroll-processor';

  function localized(path: string, locale: Locale) {
    return resolveRouteMetadata(locale === 'en' ? path : `/${locale}${path}`)!;
  }

  it('keeps English dynamic metadata identical to the source content', () => {
    const enBlog = localized(`/blog/${BLOG_SLUG}`, 'en');
    expect(enBlog.title).toBe('Privacy by default — Wraith Protocol');
    expect(enBlog.description).toBe(
      'How Wraith makes private payments practical for everyday apps.',
    );
    expect(enBlog.ogUrl).toBe(`https://usewraith.xyz/blog/${BLOG_SLUG}`);
    expect(ogImageSlugFor(`/blog/${BLOG_SLUG}`, 'en')).toBe(`blog-${BLOG_SLUG}`);

    const enCaseStudy = localized(`/case-studies/${CASE_STUDY_SLUG}`, 'en');
    expect(enCaseStudy.title).toBe('Anonymous Payroll Provider — Wraith Protocol');
    expect(enCaseStudy.description).toBe(
      'A payroll processing platform using Wraith to enable private contractor payments, protecting recipient financial privacy across international jurisdictions.',
    );
    expect(enCaseStudy.ogUrl).toBe(`https://usewraith.xyz/case-studies/${CASE_STUDY_SLUG}`);
    expect(ogImageSlugFor(`/case-studies/${CASE_STUDY_SLUG}`, 'en')).toBe(
      `case-study-${CASE_STUDY_SLUG}`,
    );
  });

  it('returns Spanish titles, descriptions and URLs for dynamic routes', () => {
    const esBlog = localized(`/blog/${BLOG_SLUG}`, 'es');
    expect(esBlog.locale).toBe('es');
    expect(esBlog.title).toBe('Privacidad por defecto — Wraith Protocol');
    expect(esBlog.description).toBe(
      'Cómo hace Wraith que los pagos privados sean prácticos en el día a día de las aplicaciones.',
    );
    expect(esBlog.description).not.toBe(localized(`/blog/${BLOG_SLUG}`, 'en').description);
    expect(esBlog.ogUrl).toBe(`https://usewraith.xyz/es/blog/${BLOG_SLUG}`);

    const esCaseStudy = localized(`/case-studies/${CASE_STUDY_SLUG}`, 'es');
    expect(esCaseStudy.title).toBe('Proveedor de nómina anónimo — Wraith Protocol');
    expect(esCaseStudy.description).toContain('plataforma de procesamiento de nóminas');
    expect(esCaseStudy.ogUrl).toBe(`https://usewraith.xyz/es/case-studies/${CASE_STUDY_SLUG}`);
  });

  it('returns Portuguese titles, descriptions and URLs for dynamic routes', () => {
    const ptBlog = localized(`/blog/${BLOG_SLUG}`, 'pt');
    expect(ptBlog.locale).toBe('pt');
    expect(ptBlog.title).toBe('Privacidade por padrão — Wraith Protocol');
    expect(ptBlog.description).toBe(
      'Como o Wraith torna pagamentos privados práticos para aplicativos do dia a dia.',
    );
    expect(ptBlog.description).not.toBe(localized(`/blog/${BLOG_SLUG}`, 'en').description);
    expect(ptBlog.ogUrl).toBe(`https://usewraith.xyz/pt/blog/${BLOG_SLUG}`);

    const ptCaseStudy = localized(`/case-studies/${CASE_STUDY_SLUG}`, 'pt');
    expect(ptCaseStudy.title).toBe('Provedor de folha de pagamento anônimo — Wraith Protocol');
    expect(ptCaseStudy.description).toContain('processamento de folha de pagamento');
    expect(ptCaseStudy.ogUrl).toBe(`https://usewraith.xyz/pt/case-studies/${CASE_STUDY_SLUG}`);
  });

  it('uses locale-prefixed image slugs and localized image URLs', () => {
    for (const path of [`/blog/${BLOG_SLUG}`, `/case-studies/${CASE_STUDY_SLUG}`]) {
      expect(ogImageSlugFor(path, 'es')).toBe(`es-${ogImageSlugFor(path, 'en')}`);
      expect(ogImageSlugFor(path, 'pt')).toBe(`pt-${ogImageSlugFor(path, 'en')}`);

      const en = generateOgImageUrl({ title: 'x' }, 'en');
      const es = generateOgImageUrl({ title: 'x' }, 'es');
      expect(es).not.toBe(en);
    }

    expect(generateOgImageUrl({ title: 'Privacidad por defecto' }, 'es')).toContain('lang=es');
    expect(generateOgImageUrl({ title: 'Privacidade por padrão' }, 'pt')).toContain('lang=pt');
  });

  it('renders localized image content for every locale, not just prefixed filenames', () => {
    const jobs = listOgImageJobs();
    const blogJobs = jobs.filter((job) => job.routePath === `/blog/${BLOG_SLUG}`);
    expect(blogJobs).toHaveLength(3);

    const byLocale = new Map(blogJobs.map((job) => [job.locale, job]));
    const enJob = byLocale.get('en')!;
    const esJob = byLocale.get('es')!;
    const ptJob = byLocale.get('pt')!;

    expect(enJob.title).toBe('Privacy by default');
    expect(enJob.subtitle).toBe('How Wraith makes private payments practical for everyday apps.');
    expect(esJob.title).toBe('Privacidad por defecto');
    expect(esJob.subtitle).toBe('Pagos privados en el día a día');
    expect(ptJob.title).toBe('Privacidade por padrão');
    expect(ptJob.subtitle).toBe('Pagamentos privados no dia a dia');

    const caseStudies = new Map(
      jobs
        .filter((job) => job.routePath === `/case-studies/${CASE_STUDY_SLUG}`)
        .map((job) => [job.locale, job]),
    );
    expect(caseStudies.get('en')!.title).toBe('Anonymous Payroll Provider');
    expect(caseStudies.get('es')!.title).toBe('Proveedor de nómina anónimo');
    expect(caseStudies.get('pt')!.title).toBe('Provedor de folha anônimo');

    // The image file name alone must not be what makes a job "localized".
    expect(esJob.title).not.toBe(enJob.title);
    expect(ptJob.title).not.toBe(enJob.title);
    expect(esJob.description).not.toBe(enJob.description);
    expect(ptJob.description).not.toBe(enJob.description);
  });

  it('never falls back to English for a route that has a localized configuration', () => {
    const localizedPaths = listOgImageJobs()
      .filter((job) => job.locale === 'en')
      .map((job) => job.routePath);
    expect(localizedPaths.length).toBeGreaterThan(0);

    for (const path of localizedPaths) {
      const en = localized(path, 'en');
      for (const locale of ['es', 'pt'] as const) {
        const translated = localized(path, locale);
        expect(
          translated.description,
          `${path} (${locale}) reuses the English description`,
        ).not.toBe(en.description);
        expect(
          translated.title !== en.title ||
            translated.ogImage.title !== en.ogImage.title ||
            translated.description !== en.description,
          `${path} (${locale}) reuses the English title, image title and description`,
        ).toBe(true);
        expect(translated.ogUrl).toContain(`/${locale}`);
      }
    }
  });

  it('generates one image per route and locale', () => {
    const jobs = listOgImageJobs();
    const routePaths = new Set(jobs.map((job) => job.routePath));

    for (const routePath of routePaths) {
      for (const locale of SUPPORTED_LOCALES) {
        const job = jobs.find(
          (candidate) => candidate.routePath === routePath && candidate.locale === locale,
        );
        expect(job, `${routePath} (${locale}) has no OG image job`).toBeDefined();
        expect(job!.file).toMatch(
          locale === 'en' ? /^[a-z0-9-]+\.png$/ : new RegExp(`^${locale}-`),
        );
      }
    }
  });
});
