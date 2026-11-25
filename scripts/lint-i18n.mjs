/**
 * i18n linter: validates locale structure and detects hardcoded strings.
 *
 * Part 1: Locale Structure Validation (see scripts/i18n-validation.mjs)
 * Compares every locale JSON file (es.json, pt.json, ...) against en.json:
 * missing/extra keys at any depth, value type mismatches, interpolation
 * placeholder drift, invalid or incomplete plural forms, untranslated route
 * metadata, and allowlisted brand/protocol terms that must stay verbatim.
 * The allowlist lives in scripts/i18n-allowlist.json.
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

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateLocales } from './i18n-validation.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const i18nDir = join(__dirname, '..', 'src', 'i18n');
const componentsDir = join(__dirname, '..', 'src', 'components');
const allowlistPath = join(__dirname, 'i18n-allowlist.json');
const REFERENCE_LOCALE = 'en';

let totalViolations = 0;

// ===== PART 1: LOCALE STRUCTURE VALIDATION =====

const localeFiles = readdirSync(i18nDir)
  .filter((f) => f.endsWith('.json') && f !== 'package.json')
  .sort();

if (localeFiles.length < 2) {
  console.warn('⚠️  Warning: Less than 2 locale files found. Skipping structure check.');
} else {
  console.log(`
🔍 Validating locale structure across ${localeFiles.length} files...
`);

  const locales = Object.fromEntries(
    localeFiles.map((file) => [
      file.replace('.json', ''),
      JSON.parse(readFileSync(join(i18nDir, file), 'utf8')),
    ]),
  );
  const allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8'));

  console.log(`📋 Using ${REFERENCE_LOCALE}.json as reference
`);

  const violations = validateLocales({ locales, referenceLocale: REFERENCE_LOCALE, allowlist });

  const byLocale = new Map();
  for (const v of violations) {
    if (!byLocale.has(v.locale)) byLocale.set(v.locale, []);
    byLocale.get(v.locale).push(v);
  }

  for (const locale of Object.keys(locales)) {
    if (!byLocale.has(locale)) console.log(`✅ ${locale}.json passes all structure checks`);
  }
  for (const [locale, list] of byLocale) {
    const label = locale === '*' ? 'i18n-allowlist.json' : `${locale}.json`;
    console.error(`\n❌ ${label} has ${list.length} issue(s):\n`);
    for (const v of list) console.error(`  [${v.rule}] ${v.key}: ${v.message}`);
  }

  if (violations.length > 0) {
    console.error('\n❌ Locale structure validation failed!\n');
    totalViolations += violations.length;
  } else {
    console.log('\n✅ All locales match the reference structure!\n');
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
