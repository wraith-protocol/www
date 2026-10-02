import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The production route matrix (issue #152).
 *
 * Before this module the audited routes lived in two places that could drift: a
 * hard-coded `urls:` list of `/` in the Lighthouse step, and a separate `pages`
 * array inside the Playwright accessibility spec. Regressions on grants, blog,
 * case studies, Stellar, status and the localized routes could therefore ship
 * unnoticed, because nothing audited them at all.
 *
 * `route-matrix.json` is now the single source of truth. Both gates import it:
 * the Lighthouse job asks for the budgeted subset, the a11y suite walks the whole
 * matrix. Adding a route to the matrix puts it in front of both.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Path to the committed matrix, resolved from this script. */
export const MATRIX_PATH = resolve(__dirname, '..', 'route-matrix.json');

/** The matrix exactly as committed. */
export const matrix = JSON.parse(readFileSync(MATRIX_PATH, 'utf8'));

/** Origin the preview server serves from. */
export const origin = matrix.origin;

/** Every production route, in matrix order. */
export const allRoutes = matrix.routes;

/** The representative subset that gets mobile + desktop Lighthouse runs. */
export const lighthouseRoutes = allRoutes.filter((route) => route.lighthouse);

/** Absolute URLs for a set of matrix entries. */
export function toUrls(routes = allRoutes, base = origin) {
  return routes.map((route) => `${base}${route.path}`);
}

/**
 * Validates the matrix itself, so a typo fails the build with a readable message
 * instead of silently auditing a 404 or auditing the same page twice.
 */
export function validateMatrix(doc = matrix) {
  const problems = [];

  if (typeof doc.origin !== 'string' || !/^https?:\/\//.test(doc.origin)) {
    problems.push(`origin must be an absolute http(s) URL, got ${JSON.stringify(doc.origin)}`);
  }
  if (!Array.isArray(doc.routes) || doc.routes.length === 0) {
    problems.push('routes must be a non-empty array');
  }

  const seenPaths = new Map();
  const seenNames = new Map();

  (doc.routes ?? []).forEach((route, index) => {
    const where = `routes[${index}]`;
    if (typeof route.path !== 'string' || !route.path.startsWith('/')) {
      problems.push(`${where}.path must start with "/", got ${JSON.stringify(route.path)}`);
    }
    if (route.path.length > 1 && route.path.endsWith('/')) {
      problems.push(`${where}.path must not end with "/" (${route.path})`);
    }
    if (route.path !== '/' && !/^[A-Za-z0-9\-._~!$&'()*+,;=:@%/]*$/.test(route.path)) {
      problems.push(`${where}.path contains characters that need encoding (${route.path})`);
    }
    if (typeof route.name !== 'string' || !route.name.trim()) {
      problems.push(`${where}.name must be a non-empty string`);
    }
    if (typeof route.lighthouse !== 'boolean') {
      problems.push(`${where}.lighthouse must be a boolean`);
    }
    if (seenPaths.has(route.path)) {
      problems.push(`${where}.path duplicates routes[${seenPaths.get(route.path)}] (${route.path})`);
    } else {
      seenPaths.set(route.path, index);
    }
    if (seenNames.has(route.name)) {
      problems.push(`${where}.name duplicates routes[${seenNames.get(route.name)}] (${route.name})`);
    } else {
      seenNames.set(route.name, index);
    }
  });

  if (!(doc.routes ?? []).some((route) => route.lighthouse)) {
    problems.push('at least one route must set "lighthouse": true');
  }

  if (problems.length > 0) {
    throw new Error(`route-matrix.json is invalid:\n  - ${problems.join('\n  - ')}`);
  }

  return doc;
}

/** Name lookup so CI can label a manifest URL with its matrix entry. */
export function nameForPath(path) {
  const match = allRoutes.find((route) => route.path === path);
  return match ? match.name : path;
}

function main(argv) {
  const flags = new Set(argv);
  validateMatrix();

  if (flags.has('--check')) {
    console.log(
      `route-matrix.json OK: ${allRoutes.length} routes, ${lighthouseRoutes.length} in the Lighthouse budget.`,
    );
    return;
  }
  if (flags.has('--json')) {
    console.log(JSON.stringify(matrix, null, 2));
    return;
  }
  if (flags.has('--names')) {
    console.log(allRoutes.map((route) => `${route.path}\t${route.name}`).join('\n'));
    return;
  }

  const routes = flags.has('--lighthouse') ? lighthouseRoutes : allRoutes;
  console.log(toUrls(routes).join('\n'));
}

// Run only when invoked as a script (`node scripts/route-matrix.mjs`), not when
// imported by the Playwright spec. realpathSync so a symlinked checkout still matches.
const invokedPath = process.argv[1];
if (
  invokedPath &&
  realpathSync(invokedPath) === realpathSync(fileURLToPath(import.meta.url))
) {
  main(process.argv.slice(2));
}
