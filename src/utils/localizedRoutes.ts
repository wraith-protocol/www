/**
 * Routes that exist under the locale prefixes (/es/*, /pt/*).
 *
 * Derived from the typed route inventory. Shared by the router helpers in
 * src/hooks/useLocalePath.ts and by scripts/og.ts, which must only emit
 * hreflang alternates for these routes.
 */

import { getLocalizedRoutes } from '../routes/inventory';

export const LOCALIZED_BASE_PATHS = new Set<string>(
  getLocalizedRoutes()
    .filter((route) => route.kind === 'static')
    .map((route) => route.path),
);

/**
 * Checks if a given path has a localized version.
 * Only routes marked `localized` in the inventory qualify, including their
 * sub-routes (e.g. /blog, /blog/:slug, /blog/author/:id).
 */
export function hasLocalizedRoute(path: string): boolean {
  if (!path.startsWith('/')) return false;
  if (path === '/') return true;

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return false;

  return LOCALIZED_BASE_PATHS.has(`/${segments[0]}`);
}
