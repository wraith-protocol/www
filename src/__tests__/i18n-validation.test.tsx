/**
 * Comprehensive i18n structure, interpolation, pluralization, allowlist,
 * route-metadata coverage, and representative longest-translation page tests.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractPlaceholders,
  isAllowlistedUntranslatedTerm,
  loadProjectRouteInventory,
  runI18nValidation,
  UNTRANSLATED_TERM_ALLOWLIST,
  validateLocaleStructureAndParity,
  validatePluralForms,
  validateRouteCoverage,
} from '../../scripts/lint-i18n.mjs';
import Architecture from '../components/Architecture';
import CaseStudiesStrip from '../components/CaseStudiesStrip';
import Chains from '../components/Chains';
import Compare from '../components/Compare';
import CtaStrip from '../components/CtaStrip';
import Features from '../components/Features';
import Footer from '../components/Footer';
import ForDevelopers from '../components/ForDevelopers';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Showcase from '../components/Showcase';
import StealthAnimation from '../components/StealthAnimation';
import { ThemeProvider } from '../context/ThemeContext';
import i18n, { SUPPORTED_LOCALES } from '../i18n';
import enJson from '../i18n/en.json';
import esJson from '../i18n/es.json';
import ptJson from '../i18n/pt.json';
import Blog from '../pages/Blog';
import CaseStudies from '../pages/CaseStudies';
import Grants from '../pages/Grants';
import Newsletter from '../pages/Newsletter';
import Stellar from '../pages/Stellar';

// ─── Raw-key & uninterpolated-placeholder detector ────────────────────────────

const TOP_LEVEL_NAMESPACES = Object.keys(enJson);
const RAW_TRANSLATION_KEY_RE = new RegExp(
  `\\b(?:${TOP_LEVEL_NAMESPACES.join('|')})\\.[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)*\\b`,
  'g',
);
const UNRESOLVED_PLACEHOLDER_RE = /\{\{[^{}]+\}\}/g;

function collectLeafKeyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...collectLeafKeyPaths(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const KNOWN_LEAF_KEYS = new Set(collectLeafKeyPaths(enJson as Record<string, unknown>));

/**
 * Scans a rendered container plus document `<title>` and `<meta name="description">`
 * for leaked raw translation keys or unresolved `{{placeholder}}` tokens.
 */
function findRawTranslationKeyLeaks(container: HTMLElement): string[] {
  const leaks = new Set<string>();
  const surfaces: string[] = [document.title];

  const metaDesc = document.head.querySelector('meta[name="description"]')?.getAttribute('content');
  if (metaDesc) surfaces.push(metaDesc);

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    if (textNode.nodeValue && textNode.nodeValue.trim().length > 0) {
      surfaces.push(textNode.nodeValue);
    }
    textNode = walker.nextNode();
  }

  for (const el of Array.from(container.querySelectorAll('*'))) {
    for (const attr of ['aria-label', 'placeholder', 'title', 'alt']) {
      const val = el.getAttribute(attr);
      if (val) surfaces.push(val);
    }
  }

  for (const surface of surfaces) {
    const trimmed = surface.trim();
    if (KNOWN_LEAF_KEYS.has(trimmed)) {
      leaks.add(trimmed);
    }
    for (const match of surface.matchAll(RAW_TRANSLATION_KEY_RE)) {
      leaks.add(match[0]);
    }
    for (const match of surface.matchAll(UNRESOLVED_PLACEHOLDER_RE)) {
      leaks.add(match[0]);
    }
  }

  return [...leaks];
}

function assertNoRawTranslationKeys(container: HTMLElement): void {
  const leaks = findRawTranslationKeyLeaks(container);
  expect(
    leaks,
    `Rendered output leaked raw translation keys or placeholders: ${leaks.join(', ')}`,
  ).toEqual([]);
}

/**
 * Builds a synthetic longest-translation resource bundle by picking the longest
 * translation across `en`, `es`, and `pt` for every leaf string and amplifying
 * multi-word copy while preserving `{{placeholder}}` variables.
 */
function buildLongestTranslationBundle(): Record<string, unknown> {
  function pickLongest(
    enNode: unknown,
    esNode: unknown,
    ptNode: unknown,
    keyPath: string,
  ): unknown {
    if (
      typeof enNode === 'object' &&
      enNode !== null &&
      !Array.isArray(enNode) &&
      typeof esNode === 'object' &&
      esNode !== null &&
      typeof ptNode === 'object' &&
      ptNode !== null
    ) {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(enNode as Record<string, unknown>)) {
        const nextPath = keyPath ? `${keyPath}.${key}` : key;
        result[key] = pickLongest(
          (enNode as Record<string, unknown>)[key],
          (esNode as Record<string, unknown>)[key],
          (ptNode as Record<string, unknown>)[key],
          nextPath,
        );
      }
      return result;
    }

    if (typeof enNode === 'string') {
      const candidates = [enNode, String(esNode ?? ''), String(ptNode ?? '')];
      const longest = candidates.reduce((a, b) => (b.length > a.length ? b : a), enNode);
      if (keyPath.endsWith('.ogType') || longest.length <= 4) {
        return longest;
      }
      // Stress layout expansion with compound phrasing while keeping exact placeholders intact.
      return `${longest} — verificação estendida de localização`;
    }

    return enNode;
  }

  return pickLongest(enJson, esJson, ptJson, '') as Record<string, unknown>;
}

// ─── 1. Repository-wide validation & allowlist invariants ─────────────────────

describe('i18n repository validation gate', () => {
  it('passes structure, placeholder, plural, allowlist, route, and hardcoded checks across en, es, and pt', () => {
    const result = runI18nValidation();
    expect(result.locales).toEqual(['en', 'es', 'pt']);
    expect(result.structureViolations).toEqual([]);
    expect(result.routeViolations).toEqual([]);
    expect(result.hardcodedFindings).toEqual([]);
    expect(result.totalViolations).toBe(0);
  });

  it('documents every allowlist entry with a non-empty term, valid category, and explicit reason', () => {
    expect(UNTRANSLATED_TERM_ALLOWLIST.length).toBeGreaterThan(0);
    const seen = new Set<string>();

    for (const entry of UNTRANSLATED_TERM_ALLOWLIST) {
      expect(entry.term.trim().length).toBeGreaterThan(0);
      expect(['brand', 'protocol', 'product', 'technical', 'schema', 'cognate']).toContain(
        entry.category,
      );
      expect(entry.reason.trim().length).toBeGreaterThan(10);
      expect(seen.has(entry.term), `Duplicate allowlist term: ${entry.term}`).toBe(false);
      seen.add(entry.term);
    }

    // Locale-scoped cognates are allowed in Portuguese but must still be translated in Spanish.
    expect(isAllowlistedUntranslatedTerm('Console', 'pt')).toBe(true);
    expect(isAllowlistedUntranslatedTerm('Console', 'es')).toBe(false);
    expect(isAllowlistedUntranslatedTerm('Status Quo', 'pt')).toBe(true);
    expect(isAllowlistedUntranslatedTerm('Status Quo', 'es')).toBe(false);
  });
});

// ─── 2. Validator failure-mode coverage (acceptance criteria) ─────────────────

describe('i18n validator failure modes', () => {
  const baseEn = {
    header: {
      brand: 'WRAITH',
      locale: { switchTo: 'Switch to {{lang}}' },
    },
    caseStudies: {
      studyCount_one: '{{count}} study',
      studyCount_other: '{{count}} studies',
    },
    tags: ['privacy', 'stealth'],
  };

  const baseEs = {
    header: {
      brand: 'WRAITH',
      locale: { switchTo: 'Cambiar a {{lang}}' },
    },
    caseStudies: {
      studyCount_one: '{{count}} estudio',
      studyCount_other: '{{count}} estudios',
    },
    tags: ['privacidad', 'sigilo'],
  };

  it('fails on missing and extra nested keys', () => {
    const brokenEs = {
      header: {
        brand: 'WRAITH',
        // missing header.locale
        extraNested: 'Valor inesperado',
      },
      caseStudies: {
        studyCount_one: '{{count}} estudio',
        studyCount_other: '{{count}} estudios',
      },
      tags: ['privacidad', 'sigilo'],
    };

    const violations = validateLocaleStructureAndParity('en', { en: baseEn, es: brokenEs });
    expect(violations.some((v) => v.type === 'missing-key' && v.key === 'header.locale')).toBe(
      true,
    );
    expect(violations.some((v) => v.type === 'extra-key' && v.key === 'header.extraNested')).toBe(
      true,
    );
  });

  it('fails on nested value type mismatches and array length divergence', () => {
    const brokenPt = {
      header: {
        brand: { nested: 'WRAITH' }, // expected string, got object
        locale: 'Mudar idioma', // expected object, got string
      },
      caseStudies: {
        studyCount_one: '{{count}} estudo',
        studyCount_other: '{{count}} estudos',
      },
      tags: ['privacidade'], // expected length 2, got 1
    };

    const violations = validateLocaleStructureAndParity('en', {
      en: baseEn,
      pt: brokenPt as unknown as Record<string, unknown>,
    });

    expect(violations.some((v) => v.type === 'type-mismatch' && v.key === 'header.brand')).toBe(
      true,
    );
    expect(violations.some((v) => v.type === 'type-mismatch' && v.key === 'header.locale')).toBe(
      true,
    );
    expect(violations.some((v) => v.type === 'type-mismatch' && v.key === 'tags')).toBe(true);
  });

  it('fails on interpolation placeholder mismatches and malformed braces', () => {
    expect(extractPlaceholders('Copy {{tab}} example')).toEqual({
      placeholders: ['tab'],
      malformed: false,
    });
    expect(extractPlaceholders('Broken {{tab example')).toEqual({
      placeholders: [],
      malformed: true,
    });

    const wrongVarEs = structuredClone(baseEs);
    wrongVarEs.header.locale.switchTo = 'Cambiar a {{idioma}}';

    const malformedPt = structuredClone(baseEs);
    malformedPt.header.locale.switchTo = 'Mudar para {{lang';

    const violations = validateLocaleStructureAndParity('en', {
      en: baseEn,
      es: wrongVarEs,
      pt: malformedPt,
    });

    expect(
      violations.some(
        (v) =>
          v.type === 'placeholder-mismatch' &&
          v.locale === 'es' &&
          v.key === 'header.locale.switchTo',
      ),
    ).toBe(true);
    expect(
      violations.some(
        (v) =>
          v.type === 'placeholder-mismatch' &&
          v.locale === 'pt' &&
          v.key === 'header.locale.switchTo',
      ),
    ).toBe(true);
  });

  it('fails on invalid plural suffixes, unsupported locale plural categories, and incomplete plural groups', () => {
    const invalidSuffixViolations = validatePluralForms('es', {
      items_plural: '{{count}} elementos',
    });
    expect(invalidSuffixViolations.some((v) => v.type === 'invalid-plural-form')).toBe(true);

    const unsupportedCategoryViolations = validatePluralForms('en', {
      items_one: '{{count}} item',
      items_few: '{{count}} items',
      items_other: '{{count}} items',
    });
    expect(
      unsupportedCategoryViolations.some(
        (v) => v.type === 'invalid-plural-form' && v.key === 'items_few',
      ),
    ).toBe(true);

    const incompleteGroupViolations = validatePluralForms('pt', {
      items_one: '{{count}} item',
    });
    expect(
      incompleteGroupViolations.some((v) => v.type === 'invalid-plural-form' && v.key === 'items'),
    ).toBe(true);
  });

  it('fails on unallowlisted untranslated copy while permitting documented brand/protocol terms', () => {
    const untranslatedEs = structuredClone(baseEs);
    untranslatedEs.tags = ['privacy', 'sigilo']; // "privacy" is not in UNTRANSLATED_TERM_ALLOWLIST

    const violations = validateLocaleStructureAndParity('en', {
      en: baseEn,
      es: untranslatedEs,
    });

    expect(violations.some((v) => v.type === 'untranslated-value' && v.key === 'tags[0]')).toBe(
      true,
    );
    // "WRAITH" IS in UNTRANSLATED_TERM_ALLOWLIST, so header.brand produces zero violations.
    expect(violations.some((v) => v.key === 'header.brand')).toBe(false);
  });

  it('fails on untranslated or missing route metadata across pageSeo, ogRoutes, and ogContent', () => {
    const inventory = loadProjectRouteInventory();
    const mutatedEs = structuredClone(esJson) as Record<string, unknown>;
    const mutatedPt = structuredClone(ptJson) as Record<string, unknown>;

    // 1. Untranslated static route title/description in Spanish
    (mutatedEs.ogRoutes as Record<string, Record<string, unknown>>)['/grants'].description = (
      enJson.ogRoutes as Record<string, Record<string, unknown>>
    )['/grants'].description;

    // 2. Untranslated dynamic blog metadata in Portuguese
    (mutatedPt.ogContent as Record<string, Record<string, unknown>>)[
      '/blog/privacy-by-default'
    ].title = (enJson.ogContent as Record<string, Record<string, unknown>>)[
      '/blog/privacy-by-default'
    ].title;

    // 3. Missing localized pageSeo entry in Spanish
    delete (mutatedEs.pageSeo as Record<string, unknown>).grants;

    const violations = validateRouteCoverage(
      'en',
      {
        en: enJson as unknown as Record<string, unknown>,
        es: mutatedEs,
        pt: mutatedPt,
      },
      inventory,
    );

    expect(
      violations.some(
        (v) =>
          v.type === 'untranslated-route-metadata' &&
          v.locale === 'es' &&
          v.key === 'ogRoutes./grants.description',
      ),
    ).toBe(true);
    expect(
      violations.some(
        (v) =>
          v.type === 'untranslated-route-metadata' &&
          v.locale === 'pt' &&
          v.key === 'ogContent./blog/privacy-by-default.title',
      ),
    ).toBe(true);
    expect(
      violations.some(
        (v) =>
          v.type === 'missing-route-coverage' && v.locale === 'es' && v.key === 'pageSeo.grants',
      ),
    ).toBe(true);
  });

  it('detects raw translation keys rendered in DOM text or attributes', () => {
    function BrokenTranslatedView() {
      const { t } = useTranslation();
      return (
        <div>
          <h1>{t('hero.nonExistentRawKey')}</h1>
          <button type="button" aria-label="footer.columns.trust">
            Action
          </button>
        </div>
      );
    }

    const { container } = render(<BrokenTranslatedView />);
    const leaks = findRawTranslationKeyLeaks(container);
    expect(leaks).toContain('hero.nonExistentRawKey');
    expect(leaks).toContain('footer.columns.trust');
  });
});

// ─── 3. Representative pages & longest-translation rendering coverage ─────────

describe('representative pages across locales and longest translations', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'UP', label: 'All systems normal', tone: 'green' }),
      }),
    );
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  afterEach(async () => {
    if (i18n.hasResourceBundle('pt-stress', 'translation')) {
      i18n.removeResourceBundle('pt-stress', 'translation');
    }
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    vi.restoreAllMocks();
  });

  it.each(SUPPORTED_LOCALES)(
    'renders homepage sections (including dense Compare & StealthAnimation copy) without raw keys in "%s"',
    async (locale) => {
      await act(async () => {
        await i18n.changeLanguage(locale);
      });

      const initialPath = locale === 'en' ? '/' : `/${locale}`;
      const { container } = render(
        <HelmetProvider>
          <ThemeProvider>
            <MemoryRouter initialEntries={[initialPath]}>
              <Header />
              <Hero />
              <Features />
              <StealthAnimation />
              <Architecture />
              <ForDevelopers />
              <Chains />
              <Compare />
              <Showcase />
              <CaseStudiesStrip />
              <CtaStrip />
              <Footer />
            </MemoryRouter>
          </ThemeProvider>
        </HelmetProvider>,
      );

      assertNoRawTranslationKeys(container);

      // Verify translated trust column header renders cleanly in each locale
      const expectedTrustHeading =
        locale === 'es' ? 'CONFIANZA' : locale === 'pt' ? 'CONFIANÇA' : 'TRUST';
      expect(screen.getByText(expectedTrustHeading)).toBeInTheDocument();
    },
  );

  it.each(SUPPORTED_LOCALES)(
    'renders CaseStudies list (with pluralized studyCount), detail route, and Newsletter without raw keys in "%s"',
    async (locale) => {
      await act(async () => {
        await i18n.changeLanguage(locale);
      });

      const listRender = render(
        <HelmetProvider>
          <ThemeProvider>
            <MemoryRouter initialEntries={['/case-studies']}>
              <Routes>
                <Route path="/case-studies" element={<CaseStudies />} />
              </Routes>
            </MemoryRouter>
          </ThemeProvider>
        </HelmetProvider>,
      );

      const expectedCountCopy =
        locale === 'es' ? '1 estudio' : locale === 'pt' ? '1 estudo' : '1 study';
      expect(listRender.getByText(expectedCountCopy)).toBeInTheDocument();
      assertNoRawTranslationKeys(listRender.container);
      listRender.unmount();

      const detailRender = render(
        <HelmetProvider>
          <ThemeProvider>
            <MemoryRouter initialEntries={['/case-studies/payroll-processor']}>
              <Routes>
                <Route path="/case-studies/:slug" element={<CaseStudies />} />
              </Routes>
            </MemoryRouter>
          </ThemeProvider>
        </HelmetProvider>,
      );
      assertNoRawTranslationKeys(detailRender.container);
      detailRender.unmount();

      const newsletterRender = render(
        <HelmetProvider>
          <ThemeProvider>
            <MemoryRouter initialEntries={['/newsletter']}>
              <Newsletter />
            </MemoryRouter>
          </ThemeProvider>
        </HelmetProvider>,
      );
      assertNoRawTranslationKeys(newsletterRender.container);
      newsletterRender.unmount();
    },
  );

  it.each(SUPPORTED_LOCALES)(
    'renders localized SEO metadata on Stellar, Grants, and Blog without raw keys in "%s"',
    async (locale) => {
      await act(async () => {
        await i18n.changeLanguage(locale);
      });

      for (const [path, PageComponent] of [
        ['/stellar', Stellar],
        ['/grants', Grants],
        ['/blog', Blog],
      ] as const) {
        const view = render(
          <HelmetProvider>
            <ThemeProvider>
              <MemoryRouter initialEntries={[path]}>
                <PageComponent />
              </MemoryRouter>
            </ThemeProvider>
          </HelmetProvider>,
        );

        await waitFor(() => {
          expect(document.title.length).toBeGreaterThan(0);
        });
        assertNoRawTranslationKeys(view.container);
        view.unmount();
      }
    },
  );

  it('exercises representative pages under a synthetic longest-translation stress bundle', async () => {
    const longestBundle = buildLongestTranslationBundle();
    i18n.addResourceBundle('pt-stress', 'translation', longestBundle, true, true);

    await act(async () => {
      await i18n.changeLanguage('pt-stress');
    });

    const { container } = render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/pt/case-studies']}>
            <Header />
            <Hero />
            <Compare />
            <Routes>
              <Route path="/pt/case-studies" element={<CaseStudies />} />
            </Routes>
            <Footer />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );

    expect(container.textContent).toContain('verificação estendida de localização');
    assertNoRawTranslationKeys(container);
  });
});
