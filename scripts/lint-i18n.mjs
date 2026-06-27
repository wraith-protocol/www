/**
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(__dirname, '..', 'src', 'components');

// Matches bare JSX text between tags:  >Some readable text<
// Must contain at least two letter-words separated by a space.
// We skip lines that are inside attribute strings (attr="…") or t('…') calls.
const JSX_TEXT_RE = />([^<>{}\n]+)</g;
// A "human-readable" fragment has at least two alphabetic words
const MULTI_WORD_RE = /[A-Za-z]{2,}[\sÀ-ɏ]+[A-Za-z]{2,}/;

const files = readdirSync(componentsDir).filter((f) => f.endsWith('.tsx'));

let violations = 0;

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
        console.error(
          `${file}:${idx + 1}: hardcoded JSX string: "${text}"`,
        );
        violations++;
      }
    }
  });
}

if (violations > 0) {
  console.error(`\n${violations} hardcoded string(s) found. Wrap them in t().`);
  process.exit(1);
} else {
  console.log(`lint:i18n — no hardcoded JSX strings found in ${files.length} component(s).`);
}
