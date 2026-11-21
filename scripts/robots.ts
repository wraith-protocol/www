/**
 * robots.txt generator.
 *
 * The disallow list is derived from the route inventory: private infrastructure
 * paths are always excluded, and every non-indexable application route is
 * excluded by its path prefix. Redirect-only paths are never treated as pages
 * and are therefore never disallowed here.
 *
 * Usage:
 *   pnpm generate:robots
 *   pnpm check:robots     # exit 1 when public/robots.txt is stale
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getRedirectRoutes, getRobotsDisallowPaths } from '../src/routes/inventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const siteUrl = 'https://usewraith.xyz';

/** Infrastructure paths that are never part of the production page inventory. */
const INFRASTRUCTURE_DISALLOW = ['/api/', '/staging', '/_staging', '/preview', '/admin', '/404'];

export function buildRobotsTxt(): string {
  const redirectPaths = new Set(getRedirectRoutes().map((route) => route.path));
  const nonIndexable = getRobotsDisallowPaths().filter((path) => !redirectPaths.has(path));
  const disallow = Array.from(new Set([...INFRASTRUCTURE_DISALLOW, ...nonIndexable]));

  return `User-agent: *
Allow: /

# Generated from src/routes/inventory.ts — do not edit by hand.
# Private infrastructure and non-indexable application routes:
${disallow.map((path) => `Disallow: ${path}`).join('\n')}

Sitemap: ${siteUrl}/sitemap.xml
`;
}

export function main(): void {
  const checkMode = process.argv.includes('--check');
  const robots = buildRobotsTxt();
  const target = join(publicDir, 'robots.txt');

  if (checkMode) {
    let current: string;
    try {
      current = readFileSync(target, 'utf8');
    } catch {
      console.error('check: public/robots.txt does not exist — run pnpm generate:robots');
      process.exit(1);
    }
    if (current !== robots) {
      console.error('check: public/robots.txt is stale — run pnpm generate:robots');
      process.exit(1);
    }
    console.log('robots.txt is up-to-date.');
    return;
  }

  writeFileSync(target, robots, 'utf8');
  console.log('robots.txt generated successfully.');
}

const isMain =
  Boolean(process.argv[1]) &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
    fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (isMain) {
  main();
}
