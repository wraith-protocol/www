import enStrings from '../i18n/en.json';
import esStrings from '../i18n/es.json';
import ptStrings from '../i18n/pt.json';
import blogManifest from '../data/blog-manifest.json';
import caseStudiesData from '../data/case-studies.json';
import { getAuthorById, listPublicAuthors, resolveAuthor, slugifyTag } from './blog-taxonomy';

export type Locale = 'en' | 'es' | 'pt';
export const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'pt'];

export const SITE_URL = 'https://usewraith.xyz';
export const CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=60';

export const OG_LOCALE_TAGS: Record<Locale, string> = {
  en: 'en_US',
  es: 'es_ES',
  pt: 'pt_BR',
};

export interface OgImageConfig {
  title: string;
  subtitle?: string;
  chainBadge?: string;
}

interface StaticRouteContent {
  title: string;
  description: string;
  ogImage: OgImageConfig;
  ogType: 'website' | 'article';
}

type StaticRouteTable = Record<string, StaticRouteContent>;

interface DynamicRouteContent {
  title: string;
  description: string;
  ogImage: OgImageConfig;
}

type DynamicRouteTable = Record<string, DynamicRouteContent>;

export interface RouteMetadata {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: OgImageConfig;
  ogUrl: string;
  ogType: 'website' | 'article';
  locale: Locale;
  robots: string;
}

/**
 * Layout family of an OG card. Each family has its own required metadata
 * (posts carry author + tags, archives carry their tag or author), which the
 * OG image validator enforces.
 */
export type OgImageKind = 'page' | 'post' | 'case-study' | 'tag' | 'author';

export interface OgImageJob {
  kind: OgImageKind;
  slug: string;
  routePath: string;
  locale: Locale;
  file: string;
  title: string;
  subtitle: string;
  description: string;
  chainBadge?: string;
  /** Small label above the title (archives only). */
  label?: string;
  /** Localized byline, e.g. "By Lena Vogt" (posts only). */
  byline?: string;
  /** Resolved author display name (posts and author archives). */
  author?: string;
  /** Post tags (posts) — rendered as `#tag`. */
  tags?: string[];
  /** Raw tag name (tag archives). */
  tag?: string;
}

interface ArchiveStrings {
  tagLabel: string;
  authorLabel: string;
  byline: string;
  tagTitle: string;
  tagPageTitle: string;
  tagSubtitle: string;
  tagDescription: string;
  authorPageTitle: string;
  authorSubtitle: string;
  authorDescription: string;
}

const ROUTE_CONTENT: Record<Locale, StaticRouteTable> = {
  en: enStrings.ogRoutes as unknown as StaticRouteTable,
  es: esStrings.ogRoutes as unknown as StaticRouteTable,
  pt: ptStrings.ogRoutes as unknown as StaticRouteTable,
};

// Localized copy for dynamic routes (blog posts, case studies), keyed by the
// locale-independent route path. Static routes live in `ogRoutes`; this table
// is the equivalent for content that ships as Markdown/JSON.
const DYNAMIC_ROUTE_CONTENT: Record<Locale, DynamicRouteTable> = {
  en: enStrings.ogContent as unknown as DynamicRouteTable,
  es: esStrings.ogContent as unknown as DynamicRouteTable,
  pt: ptStrings.ogContent as unknown as DynamicRouteTable,
};

const ROUTE_SLUGS: Record<string, string> = {
  '/': 'home',
  '/blog': 'blog',
  '/case-studies': 'case-studies',
  '/careers': 'careers',
  '/chains': 'chains',
  '/contributors': 'contributors',
  '/ecosystem': 'ecosystem',
  '/faq': 'faq',
  '/governance': 'governance',
  '/grants': 'grants',
  '/about': 'about',
  '/newsletter': 'newsletter',
  '/privacy': 'privacy',
  '/roadmap': 'roadmap',
  '/security': 'security',
  '/status': 'status',
  '/stellar': 'stellar',
  '/threat-model': 'threat-model',
  '/use-cases': 'use-cases',
  '/use-cases/calculator': 'use-cases-calculator',
  '/vitals': 'vitals',
};

const LOCALE_OG_STRINGS: Record<
  Locale,
  { siteTitle: string; ogTitle: string; ogDescription: string }
> = {
  en: enStrings.og,
  es: esStrings.og,
  pt: ptStrings.og,
};

const ARCHIVE_STRINGS: Record<Locale, ArchiveStrings> = {
  en: enStrings.ogArchives,
  es: esStrings.ogArchives,
  pt: ptStrings.ogArchives,
};

const blogManifestData =
  (blogManifest as Array<{
    slug: string;
    title: string;
    excerpt: string;
    author?: string;
    tags?: string[];
  }>) || [];

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

function archiveStrings(locale: Locale): ArchiveStrings {
  return ARCHIVE_STRINGS[locale] ?? ARCHIVE_STRINGS.en;
}

/**
 * Every tag used by a blog post, sorted, paired with its archive slug.
 * Tags whose slug is empty have no reachable archive and are skipped.
 */
export function listBlogTags(): Array<{ tag: string; slug: string }> {
  const tags = new Set<string>();
  for (const post of blogManifestData) {
    for (const tag of post.tags ?? []) tags.add(tag);
  }
  return [...tags]
    .sort()
    .map((tag) => ({ tag, slug: slugifyTag(tag) }))
    .filter((entry) => entry.slug !== '');
}

function tagFromSlug(slug: string): string | undefined {
  return listBlogTags().find((entry) => entry.slug === slug)?.tag;
}

function tagSlugFrom(pathname: string): string | null {
  return pathname.match(/^\/blog\/tag\/([^/]+)$/)?.[1] ?? null;
}

function authorIdFrom(pathname: string): string | null {
  return pathname.match(/^\/blog\/author\/([^/]+)$/)?.[1] ?? null;
}

function tagArchiveContent(tag: string, locale: Locale) {
  const s = archiveStrings(locale);
  return {
    title: interpolate(s.tagPageTitle, { tag }),
    description: interpolate(s.tagDescription, { tag }),
    ogImage: {
      title: interpolate(s.tagTitle, { tag }),
      subtitle: interpolate(s.tagSubtitle, { tag }),
    },
    label: s.tagLabel,
  };
}

function authorArchiveContent(name: string, locale: Locale) {
  const s = archiveStrings(locale);
  return {
    title: interpolate(s.authorPageTitle, { name }),
    description: interpolate(s.authorDescription, { name }),
    ogImage: { title: name, subtitle: interpolate(s.authorSubtitle, { name }) },
    label: s.authorLabel,
  };
}

const caseStudyEntries = ((caseStudiesData as { entries?: unknown[] }).entries || []) as Array<{
  slug: string;
  org: string;
  summary: string;
}>;

function hasStaticRouteConfig(routePath: string): boolean {
  return Object.prototype.hasOwnProperty.call(ROUTE_CONTENT.en, routePath);
}

function getDynamicRouteContent(routePath: string, locale: Locale): DynamicRouteContent | null {
  return (
    DYNAMIC_ROUTE_CONTENT[locale]?.[routePath] ?? DYNAMIC_ROUTE_CONTENT.en?.[routePath] ?? null
  );
}

function getStaticRouteConfig(routePath: string, locale: Locale): StaticRouteContent | null {
  const localized = ROUTE_CONTENT[locale]?.[routePath];
  if (localized) return localized;
  return ROUTE_CONTENT.en[routePath] ?? null;
}

export function stripLocalePrefix(pathname: string): { pathname: string; locale: Locale } {
  for (const locale of SUPPORTED_LOCALES) {
    const prefix = `/${locale}`;
    if (pathname === prefix) {
      return { pathname: '/', locale };
    }
    if (pathname.startsWith(`${prefix}/`)) {
      return { pathname: pathname.slice(prefix.length), locale };
    }
  }
  return { pathname, locale: 'en' };
}

function localizedPath(locale: Locale, cleanPath: string): string {
  if (locale === 'en') return cleanPath;
  return cleanPath === '/' ? `/${locale}` : `/${locale}${cleanPath}`;
}

function canonicalUrlFor(locale: Locale, cleanPath: string): string {
  if (cleanPath === '/') {
    return locale === 'en' ? SITE_URL : `${SITE_URL}/${locale}`;
  }
  return `${SITE_URL}${localizedPath(locale, cleanPath)}`;
}

function localePrefixedSlug(locale: Locale, slug: string): string {
  return locale === 'en' ? slug : `${locale}-${slug}`;
}

function isKnownBlogSlug(slug: string): boolean {
  return blogManifestData.some((post) => post.slug === slug);
}

function isKnownCaseStudySlug(slug: string): boolean {
  return caseStudyEntries.some((entry) => entry.slug === slug);
}

function blogSlugFrom(pathname: string): string | null {
  return pathname.match(/^\/blog\/(.+)$/)?.[1] ?? null;
}

function caseStudySlugFrom(pathname: string): string | null {
  return pathname.match(/^\/case-studies\/(.+)$/)?.[1] ?? null;
}

export function resolveRouteMetadata(pathname: string): RouteMetadata | null {
  const { pathname: cleanPath, locale } = stripLocalePrefix(pathname);

  // Tag and author archives are matched before `/blog/:slug`, which would
  // otherwise read `tag/<slug>` as a post slug. Only archives that render in
  // the app (a tag used by a post, an author with a public profile) resolve.
  const tagSlug = tagSlugFrom(cleanPath);
  const authorId = authorIdFrom(cleanPath);
  if (tagSlug || authorId) {
    const tag = tagSlug ? tagFromSlug(tagSlug) : undefined;
    const author = authorId ? getAuthorById(authorId) : undefined;
    if (!tag && !author) return null;
    const content = tag
      ? tagArchiveContent(tag, locale)
      : authorArchiveContent(author!.name, locale);
    return {
      title: content.title,
      description: content.description,
      ogTitle: content.title,
      ogDescription: content.description,
      ogImage: content.ogImage,
      ogUrl: canonicalUrlFor(locale, cleanPath),
      ogType: 'website',
      locale,
    };
  }

  const blogSlug = blogSlugFrom(cleanPath);
  const caseStudySlug = caseStudySlugFrom(cleanPath);
  // Exact match first, then the two-segment base (`/use-cases/calculator` is a
  // route of its own and must not fall back to the `/use-cases` card).
  const staticRoutePath = hasStaticRouteConfig(cleanPath)
    ? cleanPath
    : cleanPath.split('/').slice(0, 2).join('/') || '/';

  // Archive routes are resolved from a single policy before the generic blog
  // post branch, which would otherwise treat "tag/x" as a post slug.
  const archive = parseArchivePath(cleanPath);
  if (archive) {
    if (archive.kind === 'tag') {
      const tag = findTagForSlug(archive.slug, knownTags);
      if (!tag) return null;
      const description = archiveDescription('tag', tag, locale);
      return {
        title: archiveTitle('tag', tag, locale),
        description,
        ogTitle: archiveTitle('tag', tag, locale),
        ogDescription: description,
        ogImage: archiveOgImage('tag', tag, locale),
        ogUrl: canonicalUrlFor(locale, archive.routePath),
        ogType: 'website',
        locale,
        robots: ARCHIVE_ROBOTS_INDEX,
      };
    }

    if (!isIndexableAuthorId(archive.slug, authors, authorOptOut)) return null;
    const author = authors[archive.slug];
    if (!author) return null;
    const description = archiveDescription('author', author.name, locale);
    return {
      title: archiveTitle('author', author.name, locale),
      description,
      ogTitle: archiveTitle('author', author.name, locale),
      ogDescription: description,
      ogImage: archiveOgImage('author', author.name, locale),
      ogUrl: canonicalUrlFor(locale, archive.routePath),
      ogType: 'website',
      locale,
      robots: ARCHIVE_ROBOTS_INDEX,
    };
  }

  let title: string;
  let description: string;
  let ogImage: OgImageConfig;
  let ogType: 'website' | 'article';
  let ogUrl: string;

  if (cleanPath === '/' || cleanPath === '') {
    const config = getStaticRouteConfig('/', locale);
    if (!config) return null;
    title = config.title;
    description = config.description;
    ogImage = config.ogImage;
    ogType = config.ogType;
    ogUrl = canonicalUrlFor(locale, '/');
  } else if (blogSlug) {
    // Unknown slugs 404 in the app, so they must not be served metadata.
    const post = blogManifestData.find((p) => p.slug === blogSlug);
    if (!post) return null;
    const content = getDynamicRouteContent(`/blog/${blogSlug}`, locale);
    title = `${content?.title ?? post.title} — Wraith Protocol`;
    description = content?.description ?? post.excerpt;
    ogImage = content?.ogImage ?? { title: post.title, subtitle: post.excerpt };
    ogType = 'article';
    ogUrl = canonicalUrlFor(locale, `/blog/${blogSlug}`);
  } else if (caseStudySlug) {
    const study = caseStudyEntries.find((e) => e.slug === caseStudySlug);
    if (!study) return null;
    const content = getDynamicRouteContent(`/case-studies/${caseStudySlug}`, locale);
    title = `${content?.title ?? study.org} — Wraith Protocol`;
    description = content?.description ?? study.summary ?? 'Built with Wraith stealth addresses.';
    ogImage = content?.ogImage ?? {
      title: study.org,
      subtitle: study.summary ?? 'Case study',
    };
    ogType = 'article';
    ogUrl = canonicalUrlFor(locale, `/case-studies/${caseStudySlug}`);
  } else {
    const config = getStaticRouteConfig(staticRoutePath, locale);
    if (!config) return null;
    title = config.title;
    description = config.description;
    ogImage = config.ogImage;
    ogType = config.ogType;
    ogUrl = canonicalUrlFor(locale, staticRoutePath === '' ? '/' : staticRoutePath);
  }

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogUrl,
    ogType,
    locale,
    robots: ARCHIVE_ROBOTS_INDEX,
  };
}

export function isIndexableRoute(pathname: string): boolean {
  const { pathname: cleanPath } = stripLocalePrefix(pathname);

  if (Object.prototype.hasOwnProperty.call(ROUTE_CONTENT.en, cleanPath)) {
    return true;
  }

  // Archives are indexable only when the app renders them — the same set the
  // sitemap lists. Unknown tags and opted-out authors stay non-indexable.
  const tagSlug = tagSlugFrom(cleanPath);
  if (tagSlug) {
    return tagFromSlug(tagSlug) !== undefined;
  }

  const authorId = authorIdFrom(cleanPath);
  if (authorId) {
    return getAuthorById(authorId) !== undefined;
  }

  // Dynamic slugs are only indexable when the post or case study exists —
  // everything else 404s in the app (this also rejects nested paths such as
  // `/blog/tag/<unknown>`, which are not posts).
  const blogSlug = blogSlugFrom(cleanPath);
  if (blogSlug) {
    return isKnownBlogSlug(blogSlug);
  }

  const caseStudySlug = caseStudySlugFrom(cleanPath);
  if (caseStudySlug) {
    return isKnownCaseStudySlug(caseStudySlug);
  }

  return false;
}

export function ogImageSlugFor(pathname: string, locale: Locale): string | null {
  const { pathname: cleanPath } = stripLocalePrefix(pathname);

  if (!isIndexableRoute(pathname)) {
    return null;
  }

  const tagSlug = tagSlugFrom(cleanPath);
  if (tagSlug) {
    return localePrefixedSlug(locale, `blog-tag-${tagSlug}`);
  }

  const authorId = authorIdFrom(cleanPath);
  if (authorId) {
    return localePrefixedSlug(locale, `blog-author-${authorId}`);
  }

  const blogSlug = blogSlugFrom(cleanPath);
  if (blogSlug) {
    return localePrefixedSlug(locale, `blog-${blogSlug}`);
  }

  const caseStudySlug = caseStudySlugFrom(cleanPath);
  if (caseStudySlug) {
    return localePrefixedSlug(locale, `case-study-${caseStudySlug}`);
  }

  const slug = ROUTE_SLUGS[cleanPath];
  return slug ? localePrefixedSlug(locale, slug) : null;
}

export function generateOgImageUrl(ogImage: OgImageConfig, locale: Locale): string {
  const params = new URLSearchParams();
  params.set('title', ogImage.title);
  if (ogImage.subtitle) {
    params.set('subtitle', ogImage.subtitle);
  }
  if (ogImage.chainBadge) {
    params.set('badge', ogImage.chainBadge);
  }
  if (locale !== 'en') {
    params.set('lang', locale);
  }

  return `${SITE_URL}/api/og?${params.toString()}`;
}

export function localeStrings(locale: Locale): {
  siteTitle: string;
  ogTitle: string;
  ogDescription: string;
} {
  const strings = LOCALE_OG_STRINGS[locale] ?? LOCALE_OG_STRINGS.en;
  return {
    siteTitle: strings.siteTitle,
    ogTitle: strings.ogTitle,
    ogDescription: strings.ogDescription,
  };
}

export function listOgImageJobs(): OgImageJob[] {
  const jobs: OgImageJob[] = [];

  for (const [routePath, slug] of Object.entries(ROUTE_SLUGS)) {
    for (const locale of SUPPORTED_LOCALES) {
      const config = getStaticRouteConfig(routePath, locale);
      if (!config) continue;
      jobs.push({
        kind: 'page',
        slug,
        routePath,
        locale,
        file: `${localePrefixedSlug(locale, slug)}.png`,
        title: config.ogImage.title,
        subtitle: config.ogImage.subtitle || config.description,
        description: config.description,
        chainBadge: config.ogImage.chainBadge,
      });
    }
  }

  const seenTagSlugs = new Set<string>();
  for (const tag of knownTags) {
    const tagSlug = slugifyTag(tag);
    if (!tagSlug || seenTagSlugs.has(tagSlug)) continue;
    seenTagSlugs.add(tagSlug);

    const key = archiveImageKey('tag', tagSlug);
    for (const locale of SUPPORTED_LOCALES) {
      jobs.push({
        slug: key,
        routePath: `/blog/tag/${tagSlug}`,
        locale,
        file: `${localePrefixedSlug(locale, key)}.png`,
        title: `#${tag}`,
        subtitle: archiveDescription('tag', tag, locale),
        description: archiveDescription('tag', tag, locale),
      });
    }
  }

  for (const [id, author] of Object.entries(authors)) {
    if (!isIndexableAuthorId(id, authors, authorOptOut)) continue;

    const key = archiveImageKey('author', id);
    for (const locale of SUPPORTED_LOCALES) {
      jobs.push({
        slug: key,
        routePath: `/blog/author/${id}`,
        locale,
        file: `${localePrefixedSlug(locale, key)}.png`,
        title: author.name,
        subtitle: archiveDescription('author', author.name, locale),
        description: archiveDescription('author', author.name, locale),
      });
    }
  }

  for (const post of blogManifestData) {
    const author = resolveAuthor(post.author ?? '').name;
    const tags = post.tags ?? [];
    for (const locale of SUPPORTED_LOCALES) {
      const slug = `blog-${post.slug}`;
      const content = getDynamicRouteContent(`/blog/${post.slug}`, locale);
      jobs.push({
        kind: 'post',
        slug,
        routePath: `/blog/${post.slug}`,
        locale,
        file: `${localePrefixedSlug(locale, slug)}.png`,
        title: content?.ogImage.title ?? post.title,
        subtitle: content?.ogImage.subtitle ?? post.excerpt,
        description: content?.description ?? post.excerpt,
        byline: author ? interpolate(archiveStrings(locale).byline, { name: author }) : undefined,
        author,
        tags: [...tags],
      });
    }
  }

  for (const { tag, slug: tagSlug } of listBlogTags()) {
    for (const locale of SUPPORTED_LOCALES) {
      const slug = `blog-tag-${tagSlug}`;
      const content = tagArchiveContent(tag, locale);
      jobs.push({
        kind: 'tag',
        slug,
        routePath: `/blog/tag/${tagSlug}`,
        locale,
        file: `${localePrefixedSlug(locale, slug)}.png`,
        title: content.ogImage.title,
        subtitle: content.ogImage.subtitle,
        description: content.description,
        label: content.label,
        tag,
      });
    }
  }

  for (const author of listPublicAuthors()) {
    for (const locale of SUPPORTED_LOCALES) {
      const slug = `blog-author-${author.id}`;
      const content = authorArchiveContent(author.name, locale);
      jobs.push({
        kind: 'author',
        slug,
        routePath: `/blog/author/${author.id}`,
        locale,
        file: `${localePrefixedSlug(locale, slug)}.png`,
        title: content.ogImage.title,
        subtitle: content.ogImage.subtitle,
        description: content.description,
        label: content.label,
        author: author.name,
      });
    }
  }

  for (const study of caseStudyEntries) {
    for (const locale of SUPPORTED_LOCALES) {
      const slug = `case-study-${study.slug}`;
      const content = getDynamicRouteContent(`/case-studies/${study.slug}`, locale);
      jobs.push({
        kind: 'case-study',
        slug,
        routePath: `/case-studies/${study.slug}`,
        locale,
        file: `${localePrefixedSlug(locale, slug)}.png`,
        title: content?.ogImage.title ?? study.org,
        subtitle: content?.ogImage.subtitle ?? study.summary ?? 'Case study',
        description:
          content?.description ?? study.summary ?? 'Built with Wraith stealth addresses.',
      });
    }
  }

  return jobs;
}
