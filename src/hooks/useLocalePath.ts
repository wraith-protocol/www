/**
 * useLocalePath
 *
 * Returns a helper that prefixes internal paths with the active locale
 * for non-English locales, and leaves them unprefixed for English.
 *
 * Usage:
 *   const lp = useLocalePath();
 *   <Link to={lp('/grants')}>Grants</Link>
 *   // → '/es/grants'  when locale is 'es'
 *   // → '/pt/grants'  when locale is 'pt'
 *   // → '/grants'     when locale is 'en'
 */

import { useTranslation } from 'react-i18next';
import { type Locale } from '../i18n';

const LOCALE_PREFIX: Partial<Record<Locale, string>> = {
  es: '/es',
  pt: '/pt',
};

// Routes that have localized versions (exist under /es/* and /pt/*)
// Base paths that support localization
const LOCALIZED_BASE_PATHS = new Set<string>([
  '/',
  '/stellar',
  '/grants',
  '/blog',
  '/case-studies',
]);

/**
 * Checks if a given path has a localized version.
 * Only routes defined in the locale-prefixed routes in App.tsx should return true.
 * This includes base paths and their sub-routes (e.g., /blog, /blog/:slug, /blog/author/:id).
 */
export function hasLocalizedRoute(path: string): boolean {
  if (!path.startsWith('/')) return false;
  if (path === '/') return true;

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return false;

  const basePath = `/${segments[0]}`;

  // Check if the base path is in the localized routes
  if (LOCALIZED_BASE_PATHS.has(basePath)) {
    return true;
  }

  return false;
}

export function useLocalePath(): (path: string) => string {
  const { i18n } = useTranslation();
  const locale = ((i18n.language ?? 'en').split('-')[0] ?? 'en') as Locale;
  const prefix = LOCALE_PREFIX[locale] ?? '';

  return (path: string) => {
    // External URLs, hash-only links, or already-prefixed paths pass through.
    if (!path.startsWith('/') || path.startsWith(`/es`) || path.startsWith(`/pt`)) {
      return path;
    }
    return `${prefix}${path}`;
  };
}

/**
 * useLocalizedPath
 *
 * Like useLocalePath, but only prefixes routes that have localized versions.
 * Routes without localized versions (e.g., /privacy, /about, /vitals) are
 * returned unprefixed even for non-English locales.
 */
export function useLocalizedPath(): (path: string) => string {
  const { i18n } = useTranslation();
  const locale = ((i18n.language ?? 'en').split('-')[0] ?? 'en') as Locale;
  const prefix = LOCALE_PREFIX[locale] ?? '';

  return (path: string) => {
    if (!path.startsWith('/') || path.startsWith(`/es`) || path.startsWith(`/pt`)) {
      return path;
    }
    if (!hasLocalizedRoute(path)) {
      return path;
    }
    return `${prefix}${path}`;
  };
}
