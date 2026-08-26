import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SUPPORTED_LOCALES } from '../i18n';

export const SITE_URL = 'https://usewraith.xyz';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og/home.png`;

export interface HreflangEntry {
  hreflang: string;
  href: string;
}

/**
 * Strips a locale prefix from a pathname to get the base path.
 * e.g., `/es/faq` → `/faq`, `/es` → `/`, `/faq` → `/faq`
 */
function stripLocalePrefix(path: string): string {
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === 'en') continue;
    const prefix = `/${locale}`;
    if (path === prefix) return '/';
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length);
  }
  return path;
}

/**
 * Builds canonical URL, hreflang alternates, and OG URL for the current path.
 * Canonical is self-referencing (points to the current URL including locale).
 * hreflang alternates cover every shipped locale + x-default.
 */
function buildSeoMeta(currentPath: string) {
  const basePath = stripLocalePrefix(currentPath);
  const canonicalUrl = `${SITE_URL}${currentPath}`;

  const hreflangEntries: HreflangEntry[] = SUPPORTED_LOCALES.map((locale) => ({
    hreflang: locale,
    href:
      locale === 'en'
        ? `${SITE_URL}${basePath}`
        : `${SITE_URL}/${locale}${basePath === '/' ? '' : basePath}`,
  }));

  hreflangEntries.push({ hreflang: 'x-default', href: `${SITE_URL}${basePath}` });

  return { canonicalUrl, hreflangEntries, ogUrl: canonicalUrl };
}

interface SeoProps {
  title: string;
  description: string;
  ogImage?: string;
  type?: string;
  children?: React.ReactNode;
}

/**
 * Central SEO component. Renders a <Helmet> block with:
 * - title, description
 * - canonical URL (absolute, self-referencing)
 * - hreflang alternates for every shipped locale + x-default
 * - Open Graph tags (og:title, og:description, og:url, og:type, og:image)
 * - Twitter Card tags
 *
 * Drop into any page: <Seo title="FAQ – Wraith Protocol" description="..." />
 */
export function Seo({ title, description, ogImage, type, children }: SeoProps) {
  const { pathname } = useLocation();
  const seo = buildSeoMeta(pathname);
  const image = ogImage ?? DEFAULT_OG_IMAGE;
  const pageType = type ?? 'website';

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={seo.canonicalUrl} />
      {seo.hreflangEntries.map((entry) => (
        <link key={entry.hreflang} rel="alternate" hrefLang={entry.hreflang} href={entry.href} />
      ))}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={seo.ogUrl} />
      <meta property="og:type" content={pageType} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {children}
    </Helmet>
  );
}
