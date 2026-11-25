import { LOCALIZED_BASE_PATHS } from './localizedRoutes';

export const CANONICAL_SITE_ORIGIN = 'https://usewraith.xyz';

export type ChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export type RoutePriority = '1.0' | '0.8' | '0.7' | '0.6' | '0.5';

export interface StaticRouteManifestEntry {
  readonly route: string;
  readonly sources: readonly string[];
  readonly changefreq: ChangeFrequency;
  readonly priority: RoutePriority;
  readonly redirectTo?: string;
  readonly draft?: boolean;
}

export interface CaseStudyManifestEntry {
  readonly id?: string;
  readonly slug: string;
  readonly org?: string;
  readonly summary?: string;
  readonly integrationDate?: string;
  readonly status?: string;
  readonly draft?: boolean;
  readonly redirectTo?: string;
}

export interface AuthorManifestEntry {
  readonly id: string;
  readonly name?: string;
  readonly bio?: string;
  readonly optIn: boolean;
  readonly redirectTo?: string;
}

export interface BlogManifestEntry {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly date?: string;
  readonly author?: string;
  readonly url?: string;
  readonly draft?: boolean;
  readonly redirectTo?: string;
}

export interface BlogPostJsonEntry {
  readonly slug: string;
  readonly title?: string;
  readonly excerpt?: string;
  readonly publishedAt?: string;
  readonly date?: string;
  readonly author?: string;
  readonly draft?: boolean;
  readonly redirectTo?: string;
  readonly tags: readonly string[];
}

export const SUPPORTED_NON_DEFAULT_LOCALE_PREFIXES: readonly string[] = ['/es', '/pt'];

export const STATIC_ROUTE_MANIFEST: readonly StaticRouteManifestEntry[] = [
  {
    route: '/',
    sources: ['src/pages', 'src/components/Hero.tsx'],
    changefreq: 'daily',
    priority: '1.0',
  },
  {
    route: '/faq',
    sources: ['src/data/faq.json', 'src/pages/Faq.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/privacy',
    sources: ['src/pages/Privacy.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/use-cases',
    sources: ['src/pages/UseCases.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/use-cases/calculator',
    sources: ['src/pages/CostCalculatorPage.tsx', 'src/components/CostCalculator.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/roadmap',
    sources: ['src/data/roadmap.json', 'src/pages/Roadmap.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/case-studies',
    sources: ['src/data/case-studies.json', 'src/pages/CaseStudies.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/stellar',
    sources: ['src/pages/Stellar.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/careers',
    sources: ['src/pages/Careers.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/press',
    sources: ['src/pages/Press.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/terms',
    sources: ['src/pages/Terms.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/about',
    sources: ['src/pages/About.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/blog',
    sources: ['src/pages/Blog.tsx', 'src/content/blog'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/chains',
    sources: ['src/data/chains.json', 'src/pages/Chains.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/contributors',
    sources: ['src/pages/Contributors.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/ecosystem',
    sources: ['src/data/ecosystem.json', 'src/pages/Ecosystem.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/governance',
    sources: ['src/pages/Governance.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/grants',
    sources: ['src/pages/Grants.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/newsletter',
    sources: ['src/pages/Newsletter.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/security',
    sources: ['src/data/security.json', 'src/pages/Security.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/status',
    sources: ['src/pages/Status.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/threat-model',
    sources: ['src/data/threat-model.json', 'src/pages/ThreatModel.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    route: '/vitals',
    sources: ['src/pages/Vitals.tsx'],
    changefreq: 'weekly',
    priority: '0.8',
  },
];

export const LOCALE_PREFIXED_STATIC_PAGES: readonly string[] = Array.from(LOCALIZED_BASE_PATHS);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalString(obj: Record<string, unknown>, key: string): string | undefined {
  const val = obj[key];
  return typeof val === 'string' && val.length > 0 ? val : undefined;
}

function readOptionalBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
  const val = obj[key];
  return typeof val === 'boolean' ? val : undefined;
}

export function parseCaseStudyManifest(raw: unknown): CaseStudyManifestEntry[] {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) {
    return [];
  }

  const parsed: CaseStudyManifestEntry[] = [];
  for (const item of raw.entries) {
    if (!isRecord(item)) continue;
    const slug = readOptionalString(item, 'slug');
    if (!slug) continue;

    parsed.push({
      id: readOptionalString(item, 'id'),
      slug,
      org: readOptionalString(item, 'org'),
      summary: readOptionalString(item, 'summary'),
      integrationDate: readOptionalString(item, 'integrationDate'),
      status: readOptionalString(item, 'status'),
      draft: readOptionalBoolean(item, 'draft'),
      redirectTo: readOptionalString(item, 'redirectTo'),
    });
  }
  return parsed;
}

export function parseAuthorsManifest(raw: unknown): AuthorManifestEntry[] {
  if (!isRecord(raw)) {
    return [];
  }

  const parsed: AuthorManifestEntry[] = [];
  for (const [id, entry] of Object.entries(raw)) {
    if (!id || !isRecord(entry)) continue;
    parsed.push({
      id,
      name: readOptionalString(entry, 'name'),
      bio: readOptionalString(entry, 'bio'),
      optIn: entry.optIn === true,
      redirectTo: readOptionalString(entry, 'redirectTo'),
    });
  }
  return parsed;
}

export function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export function parseBlogManifest(raw: unknown): BlogManifestEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed: BlogManifestEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const slug = readOptionalString(item, 'slug');
    if (!slug) continue;

    parsed.push({
      slug,
      title: readOptionalString(item, 'title') ?? slug,
      excerpt: readOptionalString(item, 'excerpt') ?? '',
      date: readOptionalString(item, 'date'),
      author: readOptionalString(item, 'author'),
      url: readOptionalString(item, 'url'),
      draft: readOptionalBoolean(item, 'draft'),
      redirectTo: readOptionalString(item, 'redirectTo'),
    });
  }
  return parsed;
}

export function parseBlogPostsJson(raw: unknown): BlogPostJsonEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed: BlogPostJsonEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const slug = readOptionalString(item, 'slug');
    if (!slug) continue;

    parsed.push({
      slug,
      title: readOptionalString(item, 'title'),
      excerpt: readOptionalString(item, 'excerpt'),
      publishedAt: readOptionalString(item, 'publishedAt'),
      date: readOptionalString(item, 'date'),
      author: readOptionalString(item, 'author'),
      draft: readOptionalBoolean(item, 'draft'),
      redirectTo: readOptionalString(item, 'redirectTo'),
      tags: parseStringList(item.tags),
    });
  }
  return parsed;
}
