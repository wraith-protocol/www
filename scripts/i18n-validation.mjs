/**
 * Structural validation for locale JSON files.
 *
 * Every locale is compared against a reference locale (English) and must
 * match it on:
 *   - keys            — no missing or extra keys at any nesting depth
 *   - value types     — an object stays an object, a string stays a string,
 *                       arrays keep their length
 *   - placeholders    — the same `{{variable}}` and `$t(nested.key)` set
 *   - plural forms    — i18next `_one`/`_other`/... suffixes valid for the
 *                       locale's CLDR plural rules, with every required form
 *   - route metadata  — SEO/OG strings must be translated, and enum fields
 *                       (`ogType`) must keep their English value
 *   - protected terms — brand/protocol names from the allowlist stay verbatim
 *
 * The functions here are pure so they can be exercised from unit tests;
 * scripts/lint-i18n.mjs is the CLI that loads the files and prints results.
 */

/** Top-level namespaces that hold page titles, descriptions and OG card copy. */
export const METADATA_NAMESPACES = ['og', 'pageSeo', 'ogRoutes', 'ogContent', 'ogArchives'];

/** Metadata leaf keys whose value is an enum, not prose. */
export const METADATA_ENUMS = { ogType: ['website', 'article'] };

const PLURAL_SUFFIX_RE = /^(.+?)_(?:(ordinal)_)?(zero|one|two|few|many|other)$/;
const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const NESTING_RE = /\$t\(\s*([^,)]+?)\s*(?:,[^)]*)?\)/g;

/**
 * @typedef {{ term: string, reason: string }} AllowlistEntry
 * @typedef {{ terms: AllowlistEntry[], localeTerms?: Record<string, AllowlistEntry[]> }} Allowlist
 * @typedef {{ locale: string, key: string, rule: string, message: string }} Violation
 */

/** @param {unknown} value */
function kindOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/** @param {string} path @param {string | number} key */
function join(path, key) {
  if (typeof key === 'number') return `${path}[${key}]`;
  return path ? `${path}.${key}` : key;
}

/**
 * Extracts the interpolation variables and nested `$t()` references from a
 * translation string. `{{count, number}}` yields `count`.
 * @param {string} value
 * @returns {{ names: Set<string>, malformed: boolean }}
 */
export function extractPlaceholders(value) {
  const names = new Set();
  for (const match of value.matchAll(PLACEHOLDER_RE)) {
    const name = match[1].split(',')[0].trim();
    names.add(`{{${name}}}`);
  }
  for (const match of value.matchAll(NESTING_RE)) {
    names.add(`$t(${match[1].trim()})`);
  }
  const opens = value.split('{{').length - 1;
  const closes = value.split('}}').length - 1;
  return { names, malformed: opens !== closes };
}

/**
 * Splits an object's keys into plain keys and plural groups.
 * `items_one` + `items_other` → plural group `items` with forms one/other.
 * @param {Record<string, unknown>} node
 */
function groupKeys(node) {
  /** @type {Set<string>} */
  const plain = new Set();
  /** @type {Map<string, Map<string, string>>} base → (form → original key) */
  const plurals = new Map();
  for (const key of Object.keys(node)) {
    const match = key.match(PLURAL_SUFFIX_RE);
    if (!match) {
      plain.add(key);
      continue;
    }
    const [, base, ordinal, category] = match;
    const groupKey = ordinal ? `${base}_ordinal` : base;
    if (!plurals.has(groupKey)) plurals.set(groupKey, new Map());
    plurals.get(groupKey).set(category, key);
  }
  return { plain, plurals };
}

/** @param {string} locale @param {boolean} ordinal */
export function pluralCategories(locale, ordinal = false) {
  return new Intl.PluralRules(locale, {
    type: ordinal ? 'ordinal' : 'cardinal',
  }).resolvedOptions().pluralCategories;
}

/** @param {Map<string, string>} forms @param {Record<string, unknown>} node */
function pluralPlaceholders(forms, node) {
  const names = new Set();
  for (const key of forms.values()) {
    const value = node[key];
    if (typeof value === 'string') {
      for (const name of extractPlaceholders(value).names) names.add(name);
    }
  }
  return names;
}

/** @param {Set<string>} a @param {Set<string>} b */
function diffSets(a, b) {
  return {
    missing: [...a].filter((x) => !b.has(x)).sort(),
    extra: [...b].filter((x) => !a.has(x)).sort(),
  };
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} term */
function termRegExp(term) {
  // Word-ish boundaries that also work for terms starting/ending in symbols.
  return new RegExp(`(?<![\\w-])${escapeRegExp(term)}(?![\\w-])`, 'g');
}

/**
 * True when `value` contains nothing translatable once allowlisted terms,
 * placeholders, digits, punctuation, and separators are removed.
 * @param {string} value @param {string[]} terms
 */
export function isOnlyAllowlistedTerms(value, terms) {
  let rest = value.replace(PLACEHOLDER_RE, ' ').replace(NESTING_RE, ' ');
  // Longest first so "Wraith Protocol" is consumed before "Wraith".
  for (const term of [...terms].sort((a, b) => b.length - a.length)) {
    rest = rest.replace(termRegExp(term), ' ');
  }
  return !/\p{L}/u.test(rest);
}

/**
 * Validates the plural groups of a single locale tree against that locale's
 * CLDR plural categories. i18next resolves `key_<category>` at runtime, so a
 * missing category renders the raw key and an unknown one is dead copy.
 * @param {string} locale @param {unknown} tree
 * @returns {Violation[]}
 */
export function validatePluralForms(locale, tree) {
  /** @type {Violation[]} */
  const violations = [];
  const walk = (node, path) => {
    if (kindOf(node) !== 'object') return;
    const { plain, plurals } = groupKeys(node);
    for (const [group, forms] of plurals) {
      const ordinal = group.endsWith('_ordinal');
      const base = ordinal ? group.slice(0, -'_ordinal'.length) : group;
      const required = pluralCategories(locale, ordinal);
      // `_zero` is an i18next extension honoured in every language.
      const allowed = new Set([...required, ...(ordinal ? [] : ['zero'])]);
      const key = join(path, ordinal ? `${base}_ordinal_*` : `${base}_*`);
      for (const category of forms.keys()) {
        if (!allowed.has(category)) {
          violations.push({
            locale,
            key: join(path, forms.get(category)),
            rule: 'invalid-plural',
            message: `"${category}" is not a plural category in ${locale} (allowed: ${[...allowed].join(', ')})`,
          });
        }
      }
      const missing = required.filter((category) => !forms.has(category));
      if (missing.length > 0) {
        violations.push({
          locale,
          key,
          rule: 'invalid-plural',
          message: `missing plural form(s) required by ${locale}: ${missing.join(', ')}`,
        });
      }
      if (plain.has(base)) {
        violations.push({
          locale,
          key: join(path, base),
          rule: 'invalid-plural',
          message: `"${base}" is defined both as a plain key and as a plural group`,
        });
      }
      for (const [category, original] of forms) {
        if (typeof node[original] !== 'string') {
          violations.push({
            locale,
            key: join(path, original),
            rule: 'type-mismatch',
            message: `plural form "${category}" must be a string, found ${kindOf(node[original])}`,
          });
        }
      }
    }
    for (const key of plain) walk(node[key], join(path, key));
  };
  walk(tree, '');
  return violations;
}

/**
 * Compares one locale tree against the reference tree.
 * @param {object} options
 * @param {string} options.locale
 * @param {unknown} options.tree
 * @param {unknown} options.reference
 * @param {Allowlist} options.allowlist
 * @returns {Violation[]}
 */
export function compareLocale({ locale, tree, reference, allowlist }) {
  /** @type {Violation[]} */
  const violations = [];
  const push = (key, rule, message) => violations.push({ locale, key, rule, message });

  const globalTerms = allowlist.terms.map((entry) => entry.term);
  const metadataTerms = [
    ...globalTerms,
    ...(allowlist.localeTerms?.[locale] ?? []).map((entry) => entry.term),
  ];
  const isMetadata = (path) => METADATA_NAMESPACES.includes(path.split(/[.[]/)[0]);

  const comparePlaceholders = (path, refNames, locNames) => {
    const { missing, extra } = diffSets(refNames, locNames);
    if (missing.length > 0 || extra.length > 0) {
      const parts = [];
      if (missing.length > 0) parts.push(`missing ${missing.join(', ')}`);
      if (extra.length > 0) parts.push(`unexpected ${extra.join(', ')}`);
      push(path, 'placeholder-mismatch', parts.join('; '));
    }
  };

  const compareString = (path, refValue, locValue, leafKey) => {
    const refPh = extractPlaceholders(refValue);
    const locPh = extractPlaceholders(locValue);
    if (locPh.malformed && !refPh.malformed) {
      push(path, 'placeholder-mismatch', 'unbalanced "{{" / "}}" braces');
    }
    comparePlaceholders(path, refPh.names, locPh.names);

    for (const term of globalTerms) {
      const re = termRegExp(term);
      const expected = (refValue.match(re) ?? []).length;
      if (expected > 0 && (locValue.match(re) ?? []).length < expected) {
        push(path, 'protected-term', `allowlisted term "${term}" must remain unchanged`);
      }
    }

    if (!isMetadata(path)) return;

    const allowedEnum = METADATA_ENUMS[leafKey];
    if (allowedEnum) {
      if (!allowedEnum.includes(locValue) || locValue !== refValue) {
        push(
          path,
          'invalid-enum',
          `"${leafKey}" must be one of ${allowedEnum.join(', ')} and match the reference ("${refValue}")`,
        );
      }
      return;
    }
    if (locValue === refValue && !isOnlyAllowlistedTerms(locValue, metadataTerms)) {
      push(
        path,
        'untranslated-metadata',
        `route metadata is identical to the reference: "${refValue}". Translate it or add the term to scripts/i18n-allowlist.json`,
      );
    }
  };

  const walk = (refNode, locNode, path, leafKey) => {
    const refKind = kindOf(refNode);
    const locKind = kindOf(locNode);
    if (refKind !== locKind) {
      push(path, 'type-mismatch', `expected ${refKind}, found ${locKind}`);
      return;
    }
    if (refKind === 'string') {
      compareString(path, refNode, locNode, leafKey);
      return;
    }
    if (refKind === 'array') {
      if (refNode.length !== locNode.length) {
        push(path, 'type-mismatch', `expected ${refNode.length} items, found ${locNode.length}`);
      }
      const n = Math.min(refNode.length, locNode.length);
      for (let i = 0; i < n; i++) walk(refNode[i], locNode[i], join(path, i), leafKey);
      return;
    }
    if (refKind !== 'object') {
      if (refNode !== locNode && isMetadata(path)) {
        push(path, 'type-mismatch', `non-string metadata must match the reference`);
      }
      return;
    }

    const ref = groupKeys(refNode);
    const loc = groupKeys(locNode);

    for (const key of [...ref.plain].sort()) {
      if (!loc.plain.has(key)) {
        push(join(path, key), 'missing-key', 'key is missing');
        continue;
      }
      walk(refNode[key], locNode[key], join(path, key), key);
    }
    for (const key of [...loc.plain].sort()) {
      if (!ref.plain.has(key)) push(join(path, key), 'extra-key', 'key is not in the reference');
    }

    for (const [group, refForms] of ref.plurals) {
      const locForms = loc.plurals.get(group);
      const key = join(path, `${group}_*`);
      if (!locForms) {
        push(key, 'missing-key', 'plural group is missing');
        continue;
      }
      comparePlaceholders(
        key,
        pluralPlaceholders(refForms, refNode),
        pluralPlaceholders(locForms, locNode),
      );
    }
    for (const group of loc.plurals.keys()) {
      if (!ref.plurals.has(group)) {
        push(join(path, `${group}_*`), 'extra-key', 'plural group is not in the reference');
      }
    }
  };

  walk(reference, tree, '', '');
  return violations;
}

/**
 * Validates every locale. The reference locale is checked for plural forms
 * only; all other locales are compared against it as well.
 * @param {object} options
 * @param {Record<string, unknown>} options.locales  locale code → parsed JSON
 * @param {string} [options.referenceLocale]
 * @param {Allowlist} options.allowlist
 * @returns {Violation[]}
 */
export function validateLocales({ locales, referenceLocale = 'en', allowlist }) {
  const reference = locales[referenceLocale];
  if (reference === undefined) {
    throw new Error(`Reference locale "${referenceLocale}" was not provided`);
  }
  /** @type {Violation[]} */
  const violations = [];
  for (const [locale, tree] of Object.entries(locales)) {
    violations.push(...validatePluralForms(locale, tree));
    if (locale !== referenceLocale) {
      violations.push(...compareLocale({ locale, tree, reference, allowlist }));
    }
  }
  return violations;
}

/**
 * Flattens a locale tree to dot-notation leaf paths (used by tests to detect
 * raw keys leaking into rendered output).
 * @param {unknown} tree
 * @returns {string[]}
 */
export function flattenKeys(tree, path = '') {
  if (kindOf(tree) !== 'object') return [path];
  return Object.entries(tree).flatMap(([key, value]) => flattenKeys(value, join(path, key)));
}
