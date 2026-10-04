/**
 * Locale-aware SEO metadata utilities.
 *
 * Usage:
 *   const seo = usePageSeo('stellar');
 *   // then spread into <Helmet> title, description, canonical, and hreflang links.
 */

import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type Locale } from '../i18n';

export const SITE_ORIGIN = 'https://usewraith.xyz';

/** Pages that have dedicated i18n SEO metadata and locale-prefixed URL variants. */
export type SeoPageKey = 'home' | 'stellar' | 'grants' | 'blog' | 'caseStudies';

/** The canonical base path for each page (no locale prefix — English is the canonical). */
const PAGE_PATHS: Record<SeoPageKey, string> = {
  home: '/',
  stellar: '/stellar',
  grants: '/grants',
  blog: '/blog',
  caseStudies: '/case-studies',
};

/**
 * BCP-47 language tags used for `hreflang` attributes.
 * `en` maps to `x-default` as well as the English alternate.
 */
const LOCALE_LANG_TAG: Record<Locale, string> = {
  en: 'en',
  es: 'es',
  pt: 'pt-BR',
};

/**
 * URL path prefix for each non-English locale.
 * English has no prefix (it is the canonical).
 * These must match the locale-prefix routes registered in App.tsx and the
 * rewrite rules in vercel.json.
 */
const LOCALE_URL_PREFIX: Partial<Record<Locale, string>> = {
  es: '/es',
  pt: '/pt',
};

export interface HreflangAlternate {
  hrefLang: string;
  href: string;
}

export interface PageSeoMeta {
  /** Localised `<title>` text. */
  title: string;
  /** Localised `<meta name="description">` content. */
  description: string;
  /** Canonical URL (points to the current page's locale-specific URL). */
  canonical: string;
  /** Full set of hreflang alternates including `x-default`. */
  alternates: HreflangAlternate[];
}

/**
 * Returns the canonical URL for a page in the default (English) locale.
 * Used for `x-default` hreflang and for pages that don't have locale variants.
 */
export function canonicalUrl(page: SeoPageKey): string {
  const path = PAGE_PATHS[page];
  return path === '/' ? SITE_ORIGIN : `${SITE_ORIGIN}${path}`;
}

/**
 * Returns the locale-specific URL for a page.
 * English always resolves to the canonical URL (no prefix).
 * Non-English locales get a path prefix, e.g. /es/stellar or /pt/grants.
 */
export function localizedUrl(page: SeoPageKey, locale: Locale): string {
  if (locale === 'en') return canonicalUrl(page);
  const prefix = LOCALE_URL_PREFIX[locale] ?? '';
  const path = PAGE_PATHS[page];
  if (path === '/') {
    return `${SITE_ORIGIN}${prefix}`;
  }
  return `${SITE_ORIGIN}${prefix}${path}`;
}

/**
 * Returns the locale-specific URL for a dynamic page (e.g., blog post, case study).
 * English always resolves to the canonical URL (no prefix).
 * Non-English locales get a path prefix, e.g. /es/blog/my-post or /pt/case-studies/my-case.
 */
export function localizedDynamicUrl(page: SeoPageKey, locale: Locale, dynamicPath: string): string {
  if (locale === 'en') {
    const path = PAGE_PATHS[page];
    return `${SITE_ORIGIN}${path}${dynamicPath}`;
  }
  const prefix = LOCALE_URL_PREFIX[locale] ?? '';
  const path = PAGE_PATHS[page];
  return `${SITE_ORIGIN}${prefix}${path}${dynamicPath}`;
}

/**
 * Returns hreflang alternates for a dynamic page.
 */
export function hreflangAlternatesDynamic(
  page: SeoPageKey,
  dynamicPath: string,
): HreflangAlternate[] {
  const alternates: HreflangAlternate[] = SUPPORTED_LOCALES.map((locale) => ({
    hrefLang: LOCALE_LANG_TAG[locale],
    href: localizedDynamicUrl(page, locale, dynamicPath),
  }));

  // x-default always points to the canonical English URL
  alternates.push({ hrefLang: 'x-default', href: localizedDynamicUrl(page, 'en', dynamicPath) });

  return alternates;
}

/**
 * Returns the full list of hreflang `<link>` alternates for a page,
 * including `x-default` pointing at the canonical English URL.
 *
 * Each locale maps to its own distinct, crawlable URL so that search engines
 * can index the correct language variant. English (no prefix) is canonical;
 * non-English locales use a locale path prefix (e.g. /es/stellar, /pt/grants).
 */
export function hreflangAlternates(page: SeoPageKey): HreflangAlternate[] {
  const alternates: HreflangAlternate[] = SUPPORTED_LOCALES.map((locale) => ({
    hrefLang: LOCALE_LANG_TAG[locale],
    href: localizedUrl(page, locale),
  }));

  // x-default always points to the canonical English URL
  alternates.push({ hrefLang: 'x-default', href: canonicalUrl(page) });

  return alternates;
}

/**
 * React hook — reads the current i18n language and returns localised SEO
 * metadata for the given page key.
 * The canonical URL points to the current page's locale-specific URL.
 */
export function usePageSeo(page: SeoPageKey): PageSeoMeta {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.split('-')[0] ?? 'en') as Locale;

  return {
    title: t(`pageSeo.${page}.title`),
    description: t(`pageSeo.${page}.description`),
    canonical: localizedUrl(page, locale),
    alternates: hreflangAlternates(page),
  };
}
