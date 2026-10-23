/**
 * Writes scripts/routes-snapshot.json from the typed inventory so that
 * plain-JS scripts (gen-sitemap.mjs) and CI YAML can consume it without
 * needing TypeScript.
 *
 * Called automatically as part of `pnpm build` (see package.json).
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  STATIC_ROUTES,
  DYNAMIC_ROUTE_FAMILIES,
  SPECIAL_ROUTES,
  smokeRoutes,
  a11yRoutes,
  lighthouseRoutes,
  allStaticPaths,
  localizedBasePaths,
} from '../src/routes/inventory.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const snapshot = {
  /** Static paths for the sitemap generator and OG pipeline. */
  staticPaths: allStaticPaths(),
  /** Paths that have /es/* and /pt/* variants. */
  localizedBasePaths: Array.from(localizedBasePaths()),
  /** Paths for the smoke test "still serves built site" assertion. */
  smokeRoutes: smokeRoutes(),
  /** Paths for axe / Playwright a11y checks. */
  a11yRoutes: a11yRoutes(),
  /** Paths for Lighthouse CI. */
  lighthouseRoutes: lighthouseRoutes(),
  /** Full inventory for tooling that needs policy detail. */
  staticRoutes: STATIC_ROUTES,
  dynamicRouteFamilies: DYNAMIC_ROUTE_FAMILIES,
  specialRoutes: SPECIAL_ROUTES,
};

const outPath = join(rootDir, 'scripts', 'routes-snapshot.json');
writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
console.log(`routes-snapshot.json written (${snapshot.staticPaths.length} static paths)`);
