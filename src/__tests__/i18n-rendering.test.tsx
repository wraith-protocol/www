/**
 * Renders every locale-prefixed page in every locale and fails if a raw
 * translation key (e.g. `hero.heading`) reaches the DOM or document head, or
 * if i18next reports a key it could not resolve. Spanish carries the longest
 * strings, so the locales are exercised longest-first.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import App from '../App';
import i18n, { SUPPORTED_LOCALES, type Locale } from '../i18n';
import en from '../i18n/en.json';
import es from '../i18n/es.json';
import pt from '../i18n/pt.json';

const TREES: Record<Locale, object> = { en, es, pt };

// Keys are identical across locales, so serialized size ranks translation length.
const LOCALES_LONGEST_FIRST = [...SUPPORTED_LOCALES].sort(
  (a, b) => JSON.stringify(TREES[b]).length - JSON.stringify(TREES[a]).length,
);

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/stellar', name: 'Stellar' },
  { path: '/grants', name: 'grants' },
  { path: '/blog', name: 'blog' },
  { path: '/case-studies', name: 'case studies' },
  { path: '/case-studies/payroll-processor', name: 'case study detail' },
];

const NAMESPACES = Object.keys(en).map((ns) => ns.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
// A namespace followed by at least one `.segment`, not part of a longer token
// (so `demo.usewraith.xyz` or `og.png` paths are not mistaken for keys).
const RAW_KEY_RE = new RegExp(`(?<![\\w./@-])(?:${NAMESPACES.join('|')})(?:\\.[\\w/-]+)+`, 'g');

function localizedPath(locale: Locale, path: string): string {
  if (locale === 'en') return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

function renderedStrings(): string[] {
  // Text nodes are read one by one: body.textContent glues adjacent nodes
  // together ("partnerhero.heading"), which would hide a key behind a letter.
  const strings = [document.title];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent) strings.push(node.textContent);
  }
  const attrs = ['aria-label', 'title', 'placeholder', 'alt', 'content', 'aria-description'];
  for (const el of document.querySelectorAll('*')) {
    for (const attr of attrs) {
      const value = el.getAttribute(attr);
      if (value) strings.push(value);
    }
  }
  return strings;
}

function findRawKeys(): string[] {
  const hits = new Set<string>();
  for (const text of renderedStrings()) {
    for (const match of text.matchAll(RAW_KEY_RE)) {
      hits.add(match[0].replace(/[./-]+$/, ''));
    }
  }
  return [...hits].sort();
}

const missingKeys: string[] = [];
const onMissing = (lngs: readonly string[], _ns: string, key: string) => {
  missingKeys.push(`${lngs.join(',')}:${key}`);
};

beforeAll(() => {
  i18n.options.saveMissing = true;
  i18n.on('missingKey', onMissing);
});

afterAll(async () => {
  i18n.off('missingKey', onMissing);
  i18n.options.saveMissing = false;
  await i18n.changeLanguage('en');
});

afterEach(() => {
  missingKeys.length = 0;
});

describe('raw translation keys', () => {
  it('detects a raw key when one is rendered', () => {
    document.body.innerHTML = '<p>hero.heading</p><button aria-label="footer.unknownKey"></button>';
    expect(findRawKeys()).toEqual(['footer.unknownKey', 'hero.heading']);
    document.body.innerHTML = '<a href="#">demo.usewraith.xyz</a><p>@wraith-protocol/sdk</p>';
    expect(findRawKeys()).toEqual([]);
    document.body.innerHTML = '';
  });

  for (const locale of LOCALES_LONGEST_FIRST) {
    describe(`${locale}`, () => {
      for (const { path, name } of PAGES) {
        it(`renders the ${name} page without raw keys`, { timeout: 30_000 }, async () => {
          window.history.replaceState({}, '', localizedPath(locale, path));
          render(<App />);

          // Pages are lazy-loaded; allow for a busy worker in the full suite.
          const wait = { timeout: 10_000 };
          await waitFor(() => expect(i18n.language).toBe(locale), wait);
          await screen.findByRole('main', {}, wait);
          await screen.findByRole('contentinfo', {}, wait);
          await screen.findByRole('heading', { level: 1 }, wait);

          expect(findRawKeys()).toEqual([]);
          expect(missingKeys).toEqual([]);
        });
      }
    });
  }
});
