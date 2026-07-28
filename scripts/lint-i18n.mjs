/**
 * i18n Linter:
 * 1. Checks key parity between src/i18n/en.json and src/i18n/es.json.
 * 2. Scans src/components/*.tsx and src/pages/*.tsx for hardcoded JSX text.
 * Exits 1 if missing keys or hardcoded strings are found.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const i18nDir = join(__dirname, '..', 'src', 'i18n');
const srcDir = join(__dirname, '..', 'src');

let violations = 0;

// ─── 1. KEY PARITY CHECK ───────────────────────────────────────────────────

function getNestedKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys = keys.concat(getNestedKeys(obj[key], fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

const enPath = join(i18nDir, 'en.json');
const esPath = join(i18nDir, 'es.json');

let enJson = {};
let esJson = {};

try {
  enJson = JSON.parse(readFileSync(enPath, 'utf8'));
  esJson = JSON.parse(readFileSync(esPath, 'utf8'));
} catch (err) {
  console.error(`Failed to read/parse locale JSON files: ${err.message}`);
  process.exit(1);
}

const enKeys = new Set(getNestedKeys(enJson));
const esKeys = new Set(getNestedKeys(esJson));

const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));
const missingInEn = [...esKeys].filter((k) => !enKeys.has(k));

if (missingInEs.length > 0) {
  console.error(`\n❌ ${missingInEs.length} key(s) in en.json missing from es.json:`);
  missingInEs.forEach((k) => console.error(`  - ${k}`));
  violations += missingInEs.length;
}

if (missingInEn.length > 0) {
  console.error(`\n❌ ${missingInEn.length} key(s) in es.json missing from en.json:`);
  missingInEn.forEach((k) => console.error(`  - ${k}`));
  violations += missingInEn.length;
}

// ─── 2. HARDCODED JSX TEXT SCANNER ────────────────────────────────────────

const JSX_TEXT_RE = />([^<>{}\n]+)</g;
const MULTI_WORD_RE = /[A-Za-z]{2,}[\sÀ-ɏ]+[A-Za-z]{2,}/;

function getTsxFiles(dir) {
  let results = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getTsxFiles(filePath));
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const targetDirs = [join(srcDir, 'components'), join(srcDir, 'pages')];
const files = targetDirs.flatMap((d) => getTsxFiles(d));

let hardcodedCount = 0;

for (const filePath of files) {
  const relativeName = filePath.replace(join(__dirname, '..') + '/', '');
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, idx) => {
    // Skip lines that already call t(…) — they're intentionally translated
    if (line.includes('t(') || line.includes('{t(')) return;
    // Skip import lines, comments, className strings, aria- attributes, svg paths, etc.
    if (/^\s*(import|\/\/|\/\*|\*|className=|aria-|title=|d=|<path|<svg|<circle)/.test(line))
      return;

    let match;
    const re = new RegExp(JSX_TEXT_RE.source, 'g');
    while ((match = re.exec(line)) !== null) {
      const text = match[1].trim();
      if (MULTI_WORD_RE.test(text)) {
        console.error(`${relativeName}:${idx + 1}: hardcoded JSX string: "${text}"`);
        hardcodedCount++;
      }
    }
  });
}

if (hardcodedCount > 0) {
  console.error(`\n❌ ${hardcodedCount} hardcoded string(s) found in TSX files. Wrap them in t().`);
  violations += hardcodedCount;
}

if (violations > 0) {
  console.error(`\nlint:i18n failed with ${violations} violation(s).`);
  process.exit(1);
} else {
  console.log(
    `lint:i18n — Key parity green, no missing keys, no hardcoded JSX strings found in ${files.length} file(s).`,
  );
}
