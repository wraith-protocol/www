/**
 * Helpers for locale-prefixed routes (/es/*, /pt/*).
 *
 * The canonical list of which routes have localized variants is owned by
 * src/routes/inventory.ts — specifically the `localized` flag on each entry.
 * This module re-exports a Set view of those paths for use in the router
 * helpers (useLocalePath.ts) and in scripts/og.ts.
 */
import { localizedBasePaths } from '../routes/inventory';

/**
 * Routes that exist under the locale prefixes (/es/*, /pt/*).
 *
 * Derived from the `localized: true` entries in src/routes/inventory.ts.
 * Keep that file in sync with the locale-prefixed <Route> entries in App.tsx.
 */
export const LOCALIZED_BASE_PATHS: Set<string> = localizedBasePaths();

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

  return LOCALIZED_BASE_PATHS.has(`/${segments[0]}`);
}
