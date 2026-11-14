/**
 * i18n linter: validates locale structure, value types, interpolation
 * placeholders, plural forms, route metadata coverage, intentionally
 * untranslated brand/protocol terms, and hardcoded component JSX strings.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const defaultI18nDir = join(rootDir, 'src', 'i18n');
const defaultComponentsDir = join(rootDir, 'src', 'components');

/**
 * Explicit allowlist documenting brand names, protocol/standard identifiers,
 * technical literals, Open Graph schema enums, and language-specific cognates
 * that intentionally remain identical to English.
 *
 * When `locales` is omitted, the term may remain unchanged in all non-English
 * locales (`es`, `pt`). When `locales` is specified, the term is only allowed
 * to match English in those locales (e.g. `"Console"` is standard Portuguese,
 * whereas Spanish must localize it to `"Consola"`).
 */
export const UNTRANSLATED_TERM_ALLOWLIST = Object.freeze([
  // Brand & product wordmarks
  {
    term: 'WRAITH',
    category: 'brand',
    reason: 'Primary uppercase protocol wordmark.',
  },
  {
    term: 'Wraith Protocol',
    category: 'brand',
    reason: 'Canonical protocol brand name.',
  },
  {
    term: 'WRAITH PROTOCOL',
    category: 'brand',
    reason: 'Uppercase protocol brand wordmark.',
  },
  {
    term: 'Wraith (Stealth)',
    category: 'brand',
    reason: 'Protocol comparison tab identifier.',
  },
  {
    term: 'Blog — Wraith Protocol',
    category: 'brand',
    reason: 'Combines the invariant "Blog" cognate with the canonical brand name.',
  },
  {
    term: 'GitHub',
    category: 'brand',
    reason: 'Third-party platform proper noun.',
  },
  {
    term: 'GitHub ↗',
    category: 'brand',
    reason: 'Third-party platform proper noun with external link glyph.',
  },
  {
    term: 'npm',
    category: 'brand',
    reason: 'Node package registry proper noun (always lowercase).',
  },

  // Protocol & ecosystem proper nouns / standards
  {
    term: 'Stellar',
    category: 'protocol',
    reason: 'Blockchain network proper noun.',
  },
  {
    term: 'EVM · Stellar',
    category: 'protocol',
    reason: 'Chain badge identifier listing supported execution environments.',
  },
  {
    term: 'Stellar · EVM',
    category: 'protocol',
    reason: 'Chain badge identifier listing supported grant ecosystems.',
  },
  {
    term: 'ERC-5564 · ERC-6538',
    category: 'protocol',
    reason: 'Ethereum stealth-address EIP identifiers.',
  },
  {
    term: 'Tornado Cash (Mixers)',
    category: 'protocol',
    reason: 'External protocol comparison tab label.',
  },
  {
    term: 'Tornado Cash Style',
    category: 'protocol',
    reason: 'External protocol comparison row label.',
  },
  {
    term: 'Aztec (zk-Rollups)',
    category: 'protocol',
    reason: 'External protocol comparison tab label.',
  },
  {
    term: 'Aztec / ZK Rollups',
    category: 'protocol',
    reason: 'External protocol comparison row label.',
  },
  {
    term: 'Railgun',
    category: 'protocol',
    reason: 'External privacy protocol proper noun.',
  },

  // Product surface shorthands & technical literals
  {
    term: 'Docs',
    category: 'product',
    reason: 'Compact developer navigation label shared across locales.',
  },
  {
    term: 'SDK',
    category: 'technical',
    reason: 'Standard developer acronym for Software Development Kit.',
  },
  {
    term: 'Demo',
    category: 'product',
    reason: 'Universal product demo navigation label.',
  },
  {
    term: 'DEMO',
    category: 'product',
    reason: 'Uppercase developer card label.',
  },
  {
    term: 'TESTNET',
    category: 'technical',
    reason: 'Standard blockchain network stage badge.',
  },
  {
    term: 'BETA',
    category: 'technical',
    reason: 'Standard release stage badge.',
  },
  {
    term: 'TYPESCRIPT',
    category: 'technical',
    reason: 'Programming language proper noun.',
  },
  {
    term: 'EVM ESM ENTRYPOINT · GZIP -9',
    category: 'technical',
    reason: 'Technical bundle size benchmark specification.',
  },
  {
    term: 'npm i @wraith-protocol/sdk',
    category: 'technical',
    reason: 'Literal CLI installation command.',
  },
  {
    term: '@wraith-protocol/sdk',
    category: 'technical',
    reason: 'Literal scoped npm package name.',
  },
  {
    term: 'demo.usewraith.xyz',
    category: 'technical',
    reason: 'Literal application hostname.',
  },
  {
    term: 'console.usewraith.xyz',
    category: 'technical',
    reason: 'Literal application hostname.',
  },
  {
    term: 'Web Vitals',
    category: 'technical',
    reason: 'Core Web Vitals specification proper noun.',
  },
  {
    term: 'Security.txt',
    category: 'technical',
    reason: 'RFC 9116 well-known security policy filename.',
  },
  {
    term: '…',
    category: 'technical',
    reason: 'Compact single-glyph busy indicator.',
  },

  // Schema enums
  {
    term: 'website',
    category: 'schema',
    reason: 'Open Graph og:type protocol enum value.',
  },
  {
    term: 'article',
    category: 'schema',
    reason: 'Open Graph og:type protocol enum value.',
  },

  // Verified cross-language cognates
  {
    term: 'Blog',
    category: 'cognate',
    reason: 'Standard term in English, Spanish, and Portuguese.',
  },
  {
    term: 'Console',
    category: 'cognate',
    locales: ['pt'],
    reason: 'Standard Brazilian Portuguese computing term (Spanish uses "Consola").',
  },
  {
    term: 'CONSOLE',
    category: 'cognate',
    locales: ['pt'],
    reason: 'Uppercase Brazilian Portuguese computing term (Spanish uses "CONSOLA").',
  },
  {
    term: 'Status Quo',
    category: 'cognate',
    locales: ['pt'],
    reason: 'Standard Latinate expression in Portuguese (Spanish uses "Estado Actual").',
  },
]);

/** Valid CLDR plural suffix categories recognised by i18next v4. */
export const CLDR_PLURAL_CATEGORIES = Object.freeze(['zero', 'one', 'two', 'few', 'many', 'other']);

/** Allowed plural suffixes per supported locale (CLDR cardinal rules + i18next optional `zero`). */
export const ALLOWED_PLURAL_CATEGORIES_BY_LOCALE = Object.freeze({
  en: ['zero', 'one', 'other'],
  es: ['zero', 'one', 'many', 'other'],
  pt: ['zero', 'one', 'many', 'other'],
});

/** Minimum plural suffixes required whenever a pluralized key family is declared. */
export const REQUIRED_PLURAL_CATEGORIES = Object.freeze(['one', 'other']);

const PLACEHOLDER_TOKEN_RE = /\{\{([^{}]+)\}\}/g;

/**
 * Classifies the JSON value type at a node, distinguishing plain objects,
 * arrays, null, and primitive types.
 *
 * @param {unknown} value
 * @returns {'null' | 'array' | 'object' | 'string' | 'number' | 'boolean' | 'undefined'}
 */
export function getNodeType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Extracts sorted unique interpolation variable names (`{{var}}`) from a
 * translation string and detects malformed/unbalanced double-brace syntax.
 *
 * @param {string} text
 * @returns {{ placeholders: string[], malformed: boolean }}
 */
export function extractPlaceholders(text) {
  if (typeof text !== 'string') {
    return { placeholders: [], malformed: false };
  }

  const stripped = text.replace(PLACEHOLDER_TOKEN_RE, '');
  const malformed = stripped.includes('{{') || stripped.includes('}}');

  const vars = new Set();
  let match;
  const re = new RegExp(PLACEHOLDER_TOKEN_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    const rawExpr = match[1].trim();
    const varName = rawExpr.split(',')[0].trim();
    if (!varName || !/^[A-Za-z0-9_.$]+$/.test(varName)) {
      return { placeholders: [...vars].sort(), malformed: true };
    }
    vars.add(varName);
  }

  return { placeholders: [...vars].sort(), malformed };
}

/**
 * Checks whether an identical English value is explicitly permitted for `locale`.
 *
 * @param {string} value
 * @param {string} locale
 * @param {readonly { term: string, locales?: readonly string[] }[]} [allowlist]
 * @returns {boolean}
 */
export function isAllowlistedUntranslatedTerm(
  value,
  locale,
  allowlist = UNTRANSLATED_TERM_ALLOWLIST,
) {
  const trimmed = value.trim();
  for (const entry of allowlist) {
    if (entry.term === trimmed) {
      if (!entry.locales) return true;
      return entry.locales.includes(locale);
    }
  }
  return false;
}

/**
 * Parses a leaf key segment to detect plural suffix conventions (`<stem>_<suffix>`).
 *
 * @param {string} keyPath
 * @returns {{ isPluralCandidate: boolean, baseKey: string, suffix: string | null }}
 */
export function parsePluralKey(keyPath) {
  const segments = keyPath.split('.');
  const leaf = segments[segments.length - 1] ?? '';
  // Route keys like `/case-studies` or `/use-cases` use hyphens, not underscores.
  if (leaf.startsWith('/') || !leaf.includes('_')) {
    return { isPluralCandidate: false, baseKey: keyPath, suffix: null };
  }

  const idx = leaf.lastIndexOf('_');
  const stem = leaf.slice(0, idx);
  const suffix = leaf.slice(idx + 1);
  if (!stem) {
    return { isPluralCandidate: false, baseKey: keyPath, suffix: null };
  }

  const parentPrefix = segments.slice(0, -1).join('.');
  const baseKey = parentPrefix ? `${parentPrefix}.${stem}` : stem;
  return { isPluralCandidate: true, baseKey, suffix };
}

/**
 * Validates plural key suffixes and completeness within a single locale object.
 *
 * @param {string} locale
 * @param {Record<string, unknown>} data
 * @returns {{ type: string, locale: string, key: string, message: string }[]}
 */
export function validatePluralForms(locale, data) {
  const violations = [];
  const allowedCategories = ALLOWED_PLURAL_CATEGORIES_BY_LOCALE[locale] ?? CLDR_PLURAL_CATEGORIES;
  const groups = new Map();

  function walk(node, prefix = '') {
    if (getNodeType(node) !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      const fullPath = prefix ? `${prefix}.${k}` : k;
      const vType = getNodeType(v);
      if (vType === 'object') {
        walk(v, fullPath);
        continue;
      }

      const parsed = parsePluralKey(fullPath);
      if (!parsed.isPluralCandidate) continue;

      if (!CLDR_PLURAL_CATEGORIES.includes(parsed.suffix)) {
        violations.push({
          type: 'invalid-plural-form',
          locale,
          key: fullPath,
          message: `Invalid plural suffix "_${parsed.suffix}" on "${fullPath}" (expected CLDR category: ${allowedCategories.join(', ')})`,
        });
        continue;
      }

      if (!allowedCategories.includes(parsed.suffix)) {
        violations.push({
          type: 'invalid-plural-form',
          locale,
          key: fullPath,
          message: `Plural category "_${parsed.suffix}" on "${fullPath}" is not used by locale "${locale}" (allowed: ${allowedCategories.join(', ')})`,
        });
        continue;
      }

      if (vType !== 'string') {
        violations.push({
          type: 'type-mismatch',
          locale,
          key: fullPath,
          message: `Plural key "${fullPath}" must have a string value (got ${vType})`,
        });
      }

      if (!groups.has(parsed.baseKey)) {
        groups.set(parsed.baseKey, new Set());
      }
      groups.get(parsed.baseKey).add(parsed.suffix);
    }
  }

  walk(data);

  for (const [baseKey, suffixes] of groups.entries()) {
    for (const required of REQUIRED_PLURAL_CATEGORIES) {
      if (!suffixes.has(required)) {
        violations.push({
          type: 'invalid-plural-form',
          locale,
          key: baseKey,
          message: `Plural group "${baseKey}" in "${locale}" is missing required "_${required}" form (found: ${[...suffixes].map((s) => `_${s}`).join(', ')})`,
        });
      }
    }
  }

  return violations;
}

/**
 * Recursively compares a target locale tree against the reference (`en`) tree:
 * - missing and extra keys at every object level
 * - nested value type mismatches (object vs string, array vs object, array length, etc.)
 * - empty strings where reference has content
 * - interpolation placeholder (`{{var}}`) mismatches and malformed braces
 * - untranslated strings not covered by `UNTRANSLATED_TERM_ALLOWLIST`
 *
 * @param {string} referenceLocale
 * @param {Record<string, Record<string, unknown>>} localesMap
 * @param {{ allowlist?: readonly { term: string, locales?: readonly string[] }[] }} [options]
 * @returns {{ type: string, locale: string, key: string, message: string }[]}
 */
export function validateLocaleStructureAndParity(referenceLocale, localesMap, options = {}) {
  const allowlist = options.allowlist ?? UNTRANSLATED_TERM_ALLOWLIST;
  const violations = [];
  const refData = localesMap[referenceLocale];

  if (!refData || getNodeType(refData) !== 'object') {
    return [
      {
        type: 'type-mismatch',
        locale: referenceLocale,
        key: '<root>',
        message: `Reference locale "${referenceLocale}" must be a JSON object`,
      },
    ];
  }

  violations.push(...validatePluralForms(referenceLocale, refData));

  // Validate reference placeholders for malformed braces as well.
  function checkRefStrings(node, pathPrefix = '') {
    const nodeType = getNodeType(node);
    if (nodeType === 'string') {
      const { malformed } = extractPlaceholders(node);
      if (malformed) {
        violations.push({
          type: 'placeholder-mismatch',
          locale: referenceLocale,
          key: pathPrefix,
          message: `Malformed interpolation placeholder syntax in "${referenceLocale}" at "${pathPrefix}"`,
        });
      }
      return;
    }
    if (nodeType === 'array') {
      node.forEach((item, index) => checkRefStrings(item, `${pathPrefix}[${index}]`));
      return;
    }
    if (nodeType === 'object') {
      for (const [k, v] of Object.entries(node)) {
        checkRefStrings(v, pathPrefix ? `${pathPrefix}.${k}` : k);
      }
    }
  }
  checkRefStrings(refData);

  for (const [locale, localeData] of Object.entries(localesMap)) {
    if (locale === referenceLocale) continue;

    if (getNodeType(localeData) !== 'object') {
      violations.push({
        type: 'type-mismatch',
        locale,
        key: '<root>',
        message: `Locale "${locale}" root must be an object (got ${getNodeType(localeData)})`,
      });
      continue;
    }

    violations.push(...validatePluralForms(locale, localeData));

    function compareNodes(refNode, targetNode, currentPath) {
      const refType = getNodeType(refNode);
      const targetType = getNodeType(targetNode);

      if (refType !== targetType) {
        violations.push({
          type: 'type-mismatch',
          locale,
          key: currentPath,
          message: `Type mismatch at "${currentPath}" in "${locale}": expected ${refType}, got ${targetType}`,
        });
        return;
      }

      if (refType === 'object') {
        const refKeys = Object.keys(refNode);
        const targetKeys = Object.keys(targetNode);
        const refKeySet = new Set(refKeys);
        const targetKeySet = new Set(targetKeys);

        for (const k of refKeys) {
          const childPath = currentPath ? `${currentPath}.${k}` : k;
          if (!targetKeySet.has(k)) {
            violations.push({
              type: 'missing-key',
              locale,
              key: childPath,
              message: `Missing key "${childPath}" in "${locale}"`,
            });
          } else {
            compareNodes(refNode[k], targetNode[k], childPath);
          }
        }

        for (const k of targetKeys) {
          if (!refKeySet.has(k)) {
            const childPath = currentPath ? `${currentPath}.${k}` : k;
            violations.push({
              type: 'extra-key',
              locale,
              key: childPath,
              message: `Extra key "${childPath}" in "${locale}" (not present in "${referenceLocale}")`,
            });
          }
        }
        return;
      }

      if (refType === 'array') {
        if (refNode.length !== targetNode.length) {
          violations.push({
            type: 'type-mismatch',
            locale,
            key: currentPath,
            message: `Array length mismatch at "${currentPath}" in "${locale}": expected ${refNode.length}, got ${targetNode.length}`,
          });
        }
        const limit = Math.min(refNode.length, targetNode.length);
        for (let i = 0; i < limit; i++) {
          compareNodes(refNode[i], targetNode[i], `${currentPath}[${i}]`);
        }
        return;
      }

      if (refType === 'string') {
        if (refNode.trim().length > 0 && targetNode.trim().length === 0) {
          violations.push({
            type: 'empty-translation',
            locale,
            key: currentPath,
            message: `Empty translation at "${currentPath}" in "${locale}"`,
          });
          return;
        }

        const refPh = extractPlaceholders(refNode);
        const targetPh = extractPlaceholders(targetNode);

        if (targetPh.malformed) {
          violations.push({
            type: 'placeholder-mismatch',
            locale,
            key: currentPath,
            message: `Malformed interpolation placeholder syntax at "${currentPath}" in "${locale}": "${targetNode}"`,
          });
        } else if (refPh.placeholders.join(',') !== targetPh.placeholders.join(',')) {
          violations.push({
            type: 'placeholder-mismatch',
            locale,
            key: currentPath,
            message: `Placeholder mismatch at "${currentPath}" in "${locale}": expected [${refPh.placeholders.map((p) => `{{${p}}}`).join(', ')}], got [${targetPh.placeholders.map((p) => `{{${p}}}`).join(', ')}]`,
          });
        }

        // Route metadata branches are checked with richer diagnostics in validateRouteCoverage,
        // while general copy is checked here against the explicit brand/protocol allowlist.
        const isRouteMetadataKey =
          currentPath.startsWith('pageSeo.') ||
          currentPath.startsWith('og.') ||
          currentPath.startsWith('ogRoutes.') ||
          currentPath.startsWith('ogContent.');

        if (
          !isRouteMetadataKey &&
          refNode.trim().length > 0 &&
          targetNode === refNode &&
          !isAllowlistedUntranslatedTerm(targetNode, locale, allowlist)
        ) {
          violations.push({
            type: 'untranslated-value',
            locale,
            key: currentPath,
            message: `Untranslated string at "${currentPath}" in "${locale}" matches English ("${targetNode}") and is not in UNTRANSLATED_TERM_ALLOWLIST`,
          });
        }
      }
    }

    compareNodes(refData, localeData, '');
  }

  return violations;
}

/**
 * Loads the canonical route & content inventory from the repository source files.
 *
 * @param {string} [projectRoot]
 */
export function loadProjectRouteInventory(projectRoot = rootDir) {
  const localizedRoutesSrc = readFileSync(
    join(projectRoot, 'src', 'utils', 'localizedRoutes.ts'),
    'utf8',
  );
  const seoSrc = readFileSync(join(projectRoot, 'src', 'utils', 'seo.ts'), 'utf8');
  const ogMetadataSrc = readFileSync(join(projectRoot, 'src', 'utils', 'og-metadata.ts'), 'utf8');
  const blogManifest = JSON.parse(
    readFileSync(join(projectRoot, 'src', 'data', 'blog-manifest.json'), 'utf8'),
  );
  const caseStudies = JSON.parse(
    readFileSync(join(projectRoot, 'src', 'data', 'case-studies.json'), 'utf8'),
  );

  // Extract LOCALIZED_BASE_PATHS set entries
  const localizedSetBlock =
    localizedRoutesSrc.match(/LOCALIZED_BASE_PATHS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)?.[1] ??
    '';
  const localizedBasePaths = [...localizedSetBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]);

  // Extract PAGE_PATHS Record<SeoPageKey, string>
  const pagePathsBlock =
    seoSrc.match(/PAGE_PATHS:\s*Record<SeoPageKey,\s*string>\s*=\s*\{([\s\S]*?)\};/)?.[1] ?? '';
  /** @type {Record<string, string>} */
  const seoPagePaths = {};
  for (const match of pagePathsBlock.matchAll(/([A-Za-z0-9_]+)\s*:\s*'([^']+)'/g)) {
    seoPagePaths[match[1]] = match[2];
  }

  // Extract ROUTE_SLUGS keys
  const routeSlugsBlock =
    ogMetadataSrc.match(/ROUTE_SLUGS:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\};/)?.[1] ?? '';
  const staticOgRoutes = [...routeSlugsBlock.matchAll(/'([^']+)'\s*:\s*'[^']+'/g)].map((m) => m[1]);

  const dynamicOgRoutes = [
    ...blogManifest.map((post) => `/blog/${post.slug}`),
    ...(caseStudies.entries ?? []).map((entry) => `/case-studies/${entry.slug}`),
  ];

  return {
    localizedBasePaths,
    seoPagePaths,
    staticOgRoutes,
    dynamicOgRoutes,
  };
}

/**
 * Enforces route metadata completeness and translation across `pageSeo`, `og`,
 * `ogRoutes`, and `ogContent` for all supported locales.
 *
 * @param {string} referenceLocale
 * @param {Record<string, Record<string, any>>} localesMap
 * @param {{
 *   localizedBasePaths: string[],
 *   seoPagePaths: Record<string, string>,
 *   staticOgRoutes: string[],
 *   dynamicOgRoutes: string[],
 * }} inventory
 * @param {{ allowlist?: readonly { term: string, locales?: readonly string[] }[] }} [options]
 */
export function validateRouteCoverage(referenceLocale, localesMap, inventory, options = {}) {
  const allowlist = options.allowlist ?? UNTRANSLATED_TERM_ALLOWLIST;
  const violations = [];
  const ref = localesMap[referenceLocale];
  if (!ref || getNodeType(ref) !== 'object') return violations;

  const seoPathsSet = new Set(Object.values(inventory.seoPagePaths));

  // Every localized base path (/es/*, /pt/*) must have a SeoPageKey and an ogRoutes entry.
  for (const routePath of inventory.localizedBasePaths) {
    if (!seoPathsSet.has(routePath)) {
      violations.push({
        type: 'missing-route-coverage',
        locale: referenceLocale,
        key: `pageSeo[${routePath}]`,
        message: `Localized route "${routePath}" in LOCALIZED_BASE_PATHS has no matching SeoPageKey in src/utils/seo.ts`,
      });
    }
    if (!inventory.staticOgRoutes.includes(routePath)) {
      violations.push({
        type: 'missing-route-coverage',
        locale: referenceLocale,
        key: `ogRoutes.${routePath}`,
        message: `Localized route "${routePath}" in LOCALIZED_BASE_PATHS is missing from ROUTE_SLUGS`,
      });
    }
  }

  for (const [locale, data] of Object.entries(localesMap)) {
    if (!data || getNodeType(data) !== 'object') continue;
    const isTranslatedLocale = locale !== referenceLocale;

    // 1. Global OG strings (`og`)
    for (const field of ['siteTitle', 'metaDescription', 'ogTitle', 'ogDescription']) {
      const val = data.og?.[field];
      const refVal = ref.og?.[field];
      const keyPath = `og.${field}`;
      if (typeof val !== 'string' || val.trim().length === 0) {
        violations.push({
          type: 'untranslated-route-metadata',
          locale,
          key: keyPath,
          message: `Missing or empty global OG metadata "${keyPath}" in "${locale}"`,
        });
      } else if (
        isTranslatedLocale &&
        typeof refVal === 'string' &&
        val === refVal &&
        !isAllowlistedUntranslatedTerm(val, locale, allowlist)
      ) {
        violations.push({
          type: 'untranslated-route-metadata',
          locale,
          key: keyPath,
          message: `Untranslated global OG metadata "${keyPath}" in "${locale}" ("${val}")`,
        });
      }
    }

    // 2. Localized SEO pages (`pageSeo.<pageKey>`)
    for (const [pageKey, routePath] of Object.entries(inventory.seoPagePaths)) {
      const entry = data.pageSeo?.[pageKey];
      const refEntry = ref.pageSeo?.[pageKey];
      const baseKey = `pageSeo.${pageKey}`;

      if (getNodeType(entry) !== 'object') {
        violations.push({
          type: 'missing-route-coverage',
          locale,
          key: baseKey,
          message: `Missing pageSeo metadata for "${pageKey}" (${routePath}) in "${locale}"`,
        });
        continue;
      }

      for (const field of ['title', 'description']) {
        const val = entry[field];
        const refVal = refEntry?.[field];
        const fieldKey = `${baseKey}.${field}`;
        if (typeof val !== 'string' || val.trim().length === 0) {
          violations.push({
            type: 'untranslated-route-metadata',
            locale,
            key: fieldKey,
            message: `Missing or empty "${fieldKey}" for route "${routePath}" in "${locale}"`,
          });
        } else if (
          isTranslatedLocale &&
          typeof refVal === 'string' &&
          val === refVal &&
          !isAllowlistedUntranslatedTerm(val, locale, allowlist)
        ) {
          violations.push({
            type: 'untranslated-route-metadata',
            locale,
            key: fieldKey,
            message: `Untranslated route SEO ${field} at "${fieldKey}" (${routePath}) in "${locale}" ("${val}")`,
          });
        }
      }
    }

    // 3. Indexable static routes (`ogRoutes.<routePath>`)
    for (const routePath of inventory.staticOgRoutes) {
      const entry = data.ogRoutes?.[routePath];
      const refEntry = ref.ogRoutes?.[routePath];
      const baseKey = `ogRoutes.${routePath}`;

      if (getNodeType(entry) !== 'object') {
        violations.push({
          type: 'missing-route-coverage',
          locale,
          key: baseKey,
          message: `Missing ogRoutes entry for static route "${routePath}" in "${locale}"`,
        });
        continue;
      }

      if (entry.ogType !== 'website' && entry.ogType !== 'article') {
        violations.push({
          type: 'type-mismatch',
          locale,
          key: `${baseKey}.ogType`,
          message: `Invalid ogType at "${baseKey}.ogType" in "${locale}": expected "website" or "article", got ${JSON.stringify(entry.ogType)}`,
        });
      }

      const routeFields = [
        ['title', entry.title, refEntry?.title],
        ['description', entry.description, refEntry?.description],
        ['ogImage.title', entry.ogImage?.title, refEntry?.ogImage?.title],
        ['ogImage.subtitle', entry.ogImage?.subtitle, refEntry?.ogImage?.subtitle],
      ];

      for (const [subKey, val, refVal] of routeFields) {
        const fullKey = `${baseKey}.${subKey}`;
        if (typeof val !== 'string' || val.trim().length === 0) {
          violations.push({
            type: 'untranslated-route-metadata',
            locale,
            key: fullKey,
            message: `Missing or empty route metadata "${fullKey}" in "${locale}"`,
          });
        } else if (
          isTranslatedLocale &&
          typeof refVal === 'string' &&
          val === refVal &&
          !isAllowlistedUntranslatedTerm(val, locale, allowlist)
        ) {
          violations.push({
            type: 'untranslated-route-metadata',
            locale,
            key: fullKey,
            message: `Untranslated route metadata at "${fullKey}" in "${locale}" ("${val}")`,
          });
        }
      }

      if (
        entry.ogImage?.chainBadge !== undefined &&
        isTranslatedLocale &&
        typeof entry.ogImage.chainBadge === 'string' &&
        entry.ogImage.chainBadge === refEntry?.ogImage?.chainBadge &&
        !isAllowlistedUntranslatedTerm(entry.ogImage.chainBadge, locale, allowlist)
      ) {
        violations.push({
          type: 'untranslated-route-metadata',
          locale,
          key: `${baseKey}.ogImage.chainBadge`,
          message: `Unallowlisted identical chainBadge at "${baseKey}.ogImage.chainBadge" in "${locale}"`,
        });
      }
    }

    // 4. Dynamic content routes (`ogContent.<routePath>` for blog & case studies)
    for (const routePath of inventory.dynamicOgRoutes) {
      const entry = data.ogContent?.[routePath];
      const refEntry = ref.ogContent?.[routePath];
      const baseKey = `ogContent.${routePath}`;

      if (getNodeType(entry) !== 'object') {
        violations.push({
          type: 'missing-route-coverage',
          locale,
          key: baseKey,
          message: `Missing ogContent metadata for dynamic route "${routePath}" in "${locale}"`,
        });
        continue;
      }

      const contentFields = [
        ['title', entry.title, refEntry?.title],
        ['description', entry.description, refEntry?.description],
        ['ogImage.title', entry.ogImage?.title, refEntry?.ogImage?.title],
        ['ogImage.subtitle', entry.ogImage?.subtitle, refEntry?.ogImage?.subtitle],
      ];

      for (const [subKey, val, refVal] of contentFields) {
        const fullKey = `${baseKey}.${subKey}`;
        if (typeof val !== 'string' || val.trim().length === 0) {
          violations.push({
            type: 'untranslated-route-metadata',
            locale,
            key: fullKey,
            message: `Missing or empty dynamic route metadata "${fullKey}" in "${locale}"`,
          });
        } else if (
          isTranslatedLocale &&
          typeof refVal === 'string' &&
          val === refVal &&
          !isAllowlistedUntranslatedTerm(val, locale, allowlist)
        ) {
          violations.push({
            type: 'untranslated-route-metadata',
            locale,
            key: fullKey,
            message: `Untranslated dynamic route metadata at "${fullKey}" in "${locale}" ("${val}")`,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Scans `src/components/*.tsx` for bare multi-word JSX text not wrapped in `t()`.
 *
 * @param {string} [componentsDir]
 * @returns {{ file: string, line: number, text: string }[]}
 */
export function scanHardcodedComponentStrings(componentsDir = defaultComponentsDir) {
  const JSX_TEXT_RE = />([^<>{}\n]+)</g;
  const MULTI_WORD_RE = /[A-Za-z]{2,}[\sÀ-ɏ]+[A-Za-z]{2,}/;
  const files = readdirSync(componentsDir)
    .filter((f) => f.endsWith('.tsx'))
    .sort();

  const findings = [];

  for (const file of files) {
    const filePath = join(componentsDir, file);
    const src = readFileSync(filePath, 'utf8');
    const lines = src.split('\n');

    lines.forEach((line, idx) => {
      if (line.includes('t(') || line.includes('{t(')) return;
      if (/^\s*(import|\/\/|\/\*|\*|className=|aria-|title=)/.test(line)) return;

      let match;
      const re = new RegExp(JSX_TEXT_RE.source, 'g');
      while ((match = re.exec(line)) !== null) {
        const text = match[1].trim();
        if (MULTI_WORD_RE.test(text)) {
          findings.push({ file, line: idx + 1, text });
        }
      }
    });
  }

  return findings;
}

/**
 * Runs the complete repository i18n validation suite.
 *
 * @param {{ i18nDir?: string, componentsDir?: string, projectRoot?: string }} [options]
 */
export function runI18nValidation(options = {}) {
  const i18nDir = options.i18nDir ?? defaultI18nDir;
  const componentsDir = options.componentsDir ?? defaultComponentsDir;
  const projectRoot = options.projectRoot ?? rootDir;

  const localeFiles = readdirSync(i18nDir)
    .filter((f) => f.endsWith('.json') && f !== 'package.json')
    .sort()
    .map((f) => ({ name: f.replace('.json', ''), file: f, path: join(i18nDir, f) }));

  /** @type {Record<string, Record<string, unknown>>} */
  const localesMap = {};
  for (const lf of localeFiles) {
    localesMap[lf.name] = JSON.parse(readFileSync(lf.path, 'utf8'));
  }

  const referenceLocale = 'en';
  const structureViolations = validateLocaleStructureAndParity(referenceLocale, localesMap);
  const inventory = loadProjectRouteInventory(projectRoot);
  const routeViolations = validateRouteCoverage(referenceLocale, localesMap, inventory);
  const hardcodedFindings = scanHardcodedComponentStrings(componentsDir);

  return {
    locales: localeFiles.map((l) => l.name),
    inventory,
    structureViolations,
    routeViolations,
    hardcodedFindings,
    totalViolations: structureViolations.length + routeViolations.length + hardcodedFindings.length,
  };
}

// ===== CLI ENTRYPOINT =====

const isDirectExecution =
  process.argv[1] != null && resolve(process.argv[1]) === resolve(__filename);

if (isDirectExecution) {
  console.log('\n🔍 Validating locale structure, interpolation, plurals, and route coverage...\n');

  const result = runI18nValidation();

  if (result.structureViolations.length === 0) {
    console.log(
      `✅ Locale structure, value types, placeholders, plurals, and allowlist verified across [${result.locales.join(', ')}].`,
    );
  } else {
    console.error(`❌ Locale structure/parity violations (${result.structureViolations.length}):`);
    for (const v of result.structureViolations) {
      console.error(`  [${v.type}] (${v.locale}) ${v.message}`);
    }
  }

  if (result.routeViolations.length === 0) {
    console.log(
      `✅ Route metadata coverage verified (${result.inventory.staticOgRoutes.length} static routes, ${result.inventory.dynamicOgRoutes.length} dynamic routes, ${Object.keys(result.inventory.seoPagePaths).length} localized SEO pages).`,
    );
  } else {
    console.error(`\n❌ Route metadata coverage violations (${result.routeViolations.length}):`);
    for (const v of result.routeViolations) {
      console.error(`  [${v.type}] (${v.locale}) ${v.message}`);
    }
  }

  console.log('\n🔍 Scanning components for hardcoded strings...\n');

  if (result.hardcodedFindings.length === 0) {
    console.log('✅ No hardcoded JSX strings found in components.\n');
  } else {
    for (const finding of result.hardcodedFindings) {
      console.error(`${finding.file}:${finding.line}: hardcoded JSX string: "${finding.text}"`);
    }
    console.error(
      `\n❌ ${result.hardcodedFindings.length} hardcoded string(s) found. Wrap them in t().\n`,
    );
  }

  if (result.totalViolations > 0) {
    console.error(`\n🚨 Total i18n violations: ${result.totalViolations}\n`);
    process.exit(1);
  } else {
    console.log('✅ All i18n checks passed!\n');
  }
}
