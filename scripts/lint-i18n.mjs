/**
 * i18n linter: validates translation parity and detects hardcoded strings.
 *
 * Part 1: Locale Parity Validation
 * Ensures all locale JSON files (en.json, es.json, pt.json, etc.) have
 * identical key structures with no missing or extraneous keys.
 *
 * Part 2: Hardcoded String Detection
 * Scans src/components/*.tsx for JSX text nodes that look like human-readable
 * multi-word strings not wrapped in a t() call. Exits 1 if any are found.
 *
 * Heuristic: a JSX text node that:
 *   - Contains two or more words (letters only, no < > { } characters)
 *   - Is not purely whitespace, punctuation, or a single token like "↗"
 * is flagged as a potential hardcoded string.
 *
 * False-positives in code blocks / aria strings passed directly are expected
 * to be suppressed by keeping them inside t() calls.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const i18nDir = join(__dirname, '..', 'src', 'i18n');
const componentsDir = join(__dirname, '..', 'src', 'components');

let totalViolations = 0;

// ===== PART 1: LOCALE PARITY VALIDATION =====

/**
 * Recursively extracts all keys from a nested object
 * @param {object} obj - The object to extract keys from
 * @param {string} prefix - Current key path prefix
 * @returns {string[]} - Array of dot-notation keys
 */
function extractKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...extractKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

/**
 * Compares two arrays and returns differences
 * @param {string[]} arr1
 * @param {string[]} arr2
 * @returns {{missing: string[], extra: string[]}}
 */
function compareKeys(arr1, arr2) {
  const missing = arr2.filter((key) => !arr1.includes(key));
  const extra = arr1.filter((key) => !arr2.includes(key));
  return { missing, extra };
}

// Get all locale files
const localeFiles = readdirSync(i18nDir)
  .filter((f) => f.endsWith('.json') && f !== 'package.json')
  .map((f) => ({ name: f, path: join(i18nDir, f) }));

if (localeFiles.length < 2) {
  console.warn('⚠️  Warning: Less than 2 locale files found. Skipping parity check.');
} else {
  console.log(`\n🔍 Validating locale parity across ${localeFiles.length} files...\n`);

  // Load all locale JSON files
  const locales = localeFiles.map((file) => ({
    name: file.name.replace('.json', ''),
    keys: extractKeys(JSON.parse(readFileSync(file.path, 'utf8'))),
    path: file.name,
  }));

  // Use the first locale (en.json) as the reference
  const reference = locales[0];
  console.log(`📋 Using ${reference.path} as reference (${reference.keys.length} keys)\n`);

  let parityIssues = false;

  // Compare each locale against the reference
  for (let i = 1; i < locales.length; i++) {
    const current = locales[i];
    const { missing, extra } = compareKeys(current.keys, reference.keys);

    if (missing.length > 0 || extra.length > 0) {
      parityIssues = true;
      console.error(`❌ ${current.path} has parity issues:\n`);

      if (missing.length > 0) {
        console.error(`  Missing keys (${missing.length}):`);
        missing.forEach((key) => console.error(`    - ${key}`));
        console.error('');
        totalViolations += missing.length;
      }

      if (extra.length > 0) {
        console.error(`  Extra keys (${extra.length}):`);
        extra.forEach((key) => console.error(`    + ${key}`));
        console.error('');
        totalViolations += extra.length;
      }
    } else {
      console.log(`✅ ${current.path} matches reference (${current.keys.length} keys)`);
    }
  }

  if (parityIssues) {
    console.error('\n❌ Locale parity validation failed!\n');
  } else {
    console.log('\n✅ All locales have matching key structures!\n');
  }
}

// ===== PART 2: HARDCODED STRING DETECTION =====

console.log('🔍 Scanning components for hardcoded strings...\n');

// Matches bare JSX text between tags:  >Some readable text<
// Must contain at least two letter-words separated by a space.
// We skip lines that are inside attribute strings (attr="…") or t('…') calls.
const JSX_TEXT_RE = />([^<>{}\n]+)</g;
// A "human-readable" fragment has at least two alphabetic words
const MULTI_WORD_RE = /[A-Za-z]{2,}[\sÀ-ɏ]+[A-Za-z]{2,}/;

const files = readdirSync(componentsDir).filter((f) => f.endsWith('.tsx'));

let hardcodedViolations = 0;

for (const file of files) {
  const filePath = join(componentsDir, file);
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, idx) => {
    // Skip lines that already call t(…) — they're intentionally translated
    if (line.includes('t(') || line.includes('{t(')) return;
    // Skip import lines, comments, className strings, aria- attributes
    if (/^\s*(import|\/\/|\/\*|\*|className=|aria-|title=)/.test(line)) return;

    let match;
    const re = new RegExp(JSX_TEXT_RE.source, 'g');
    while ((match = re.exec(line)) !== null) {
      const text = match[1].trim();
      if (MULTI_WORD_RE.test(text)) {
        console.error(`${file}:${idx + 1}: hardcoded JSX string: "${text}"`);
        hardcodedViolations++;
      }
    }
  });
}

if (hardcodedViolations > 0) {
  console.error(`\n❌ ${hardcodedViolations} hardcoded string(s) found. Wrap them in t().\n`);
  totalViolations += hardcodedViolations;
} else {
  console.log(`✅ No hardcoded JSX strings found in ${files.length} component(s).\n`);
}

// ===== FINAL RESULT =====

if (totalViolations > 0) {
  console.error(`\n🚨 Total violations: ${totalViolations}\n`);
  process.exit(1);
} else {
  console.log('✅ All i18n checks passed!\n');
}
