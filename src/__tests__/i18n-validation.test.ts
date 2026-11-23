/**
 * Locale structure validation.
 *
 * The fixture tests prove each rule in scripts/i18n-validation.mjs fails on a
 * broken locale (so `pnpm lint:i18n` fails CI). The remaining tests run the
 * same rules against the shipped en/es/pt files and check route metadata
 * coverage against the routes the app actually serves.
 */

import { describe, expect, it } from 'vitest';
import {
  validateLocales,
  validatePluralForms,
  extractPlaceholders,
  isOnlyAllowlistedTerms,
} from '../../scripts/i18n-validation.mjs';
import allowlist from '../../scripts/i18n-allowlist.json';
import en from '../i18n/en.json';
import es from '../i18n/es.json';
import pt from '../i18n/pt.json';
import { SUPPORTED_LOCALES } from '../i18n';
import { listOgImageJobs } from '../utils/og-metadata';
import { LOCALIZED_BASE_PATHS } from '../utils/localizedRoutes';
import { PAGE_PATHS } from '../utils/seo';

type Tree = Record<string, unknown>;

const LOCALES: Record<string, Tree> = { en, es, pt };

const reference: Tree = {
  hero: { heading: 'Private payments for every chain.' },
  header: { locale: { switchTo: 'Switch to {{lang}}' } },
  results: { count_one: '{{count}} study', count_other: '{{count}} studies' },
  pageSeo: { home: { title: 'Home — Wraith Protocol', description: 'Private payments.' } },
  ogRoutes: { '/': { title: 'Wraith Protocol', ogType: 'website' } },
};

const valid: Tree = {
  hero: { heading: 'Pagos privados para cada cadena.' },
  header: { locale: { switchTo: 'Cambiar a {{lang}}' } },
  results: {
    count_one: '{{count}} estudio',
    count_many: '{{count}} de estudios',
    count_other: '{{count}} estudios',
  },
  pageSeo: { home: { title: 'Inicio — Wraith Protocol', description: 'Pagos privados.' } },
  ogRoutes: { '/': { title: 'Wraith Protocol', ogType: 'website' } },
};

function withPatch(patch: (tree: Tree) => void): Tree {
  const tree = structuredClone(valid);
  patch(tree);
  return tree;
}

function rulesFor(locale: Tree, code = 'es') {
  return validateLocales({ locales: { en: reference, [code]: locale }, allowlist }).map(
    (v) => `${v.rule} ${v.key}`,
  );
}

describe('i18n validation rules', () => {
  it('accepts a structurally identical translation', () => {
    expect(rulesFor(valid)).toEqual([]);
  });

  it('fails on missing keys at any depth', () => {
    const tree = withPatch((t) => delete (t.header as Tree).locale);
    expect(rulesFor(tree)).toContain('missing-key header.locale');
  });

  it('fails on extra keys', () => {
    const tree = withPatch((t) => ((t.hero as Tree).subheading = 'Extra'));
    expect(rulesFor(tree)).toContain('extra-key hero.subheading');
  });

  it('fails when a nested object becomes a string', () => {
    const tree = withPatch((t) => (t.header = 'Encabezado'));
    expect(rulesFor(tree)).toContain('type-mismatch header');
  });

  it('fails when a string becomes a number or an array changes length', () => {
    const tree = withPatch((t) => ((t.hero as Tree).heading = 42));
    expect(rulesFor(tree)).toContain('type-mismatch hero.heading');

    const ref = { list: ['a', 'b'] };
    const violations = validateLocales({
      locales: { en: ref, es: { list: ['a'] } },
      allowlist,
    });
    expect(violations.map((v) => v.rule)).toContain('type-mismatch');
  });

  it('fails on renamed, dropped, or added placeholders', () => {
    const renamed = withPatch(
      (t) => (((t.header as Tree).locale as Tree).switchTo = 'Cambiar a {{idioma}}'),
    );
    expect(rulesFor(renamed)).toContain('placeholder-mismatch header.locale.switchTo');

    const dropped = withPatch(
      (t) => (((t.header as Tree).locale as Tree).switchTo = 'Cambiar idioma'),
    );
    expect(rulesFor(dropped)).toContain('placeholder-mismatch header.locale.switchTo');

    const added = withPatch((t) => ((t.hero as Tree).heading = 'Pagos {{chain}}'));
    expect(rulesFor(added)).toContain('placeholder-mismatch hero.heading');
  });

  it('fails on unbalanced interpolation braces', () => {
    const tree = withPatch(
      (t) => (((t.header as Tree).locale as Tree).switchTo = 'Cambiar a {{lang}'),
    );
    expect(rulesFor(tree)).toContain('placeholder-mismatch header.locale.switchTo');
  });

  it('treats plural groups as one key and compares their placeholders', () => {
    const tree = withPatch((t) => {
      t.results = { count_one: 'un estudio', count_many: 'muchos', count_other: 'varios' };
    });
    expect(rulesFor(tree)).toContain('placeholder-mismatch results.count_*');
  });

  it('fails on plural forms the locale does not use', () => {
    const tree = withPatch((t) => ((t.results as Tree).count_few = '{{count}} estudios'));
    expect(rulesFor(tree)).toContain('invalid-plural results.count_few');
  });

  it('fails when a plural form required by the locale is missing', () => {
    const tree = withPatch((t) => delete (t.results as Tree).count_many);
    expect(rulesFor(tree)).toContain('invalid-plural results.count_*');
  });

  it('fails when a plural group is replaced by a plain key', () => {
    const tree = withPatch((t) => (t.results = { count: '{{count}} estudios' }));
    const rules = rulesFor(tree);
    expect(rules).toContain('missing-key results.count_*');
    expect(rules).toContain('extra-key results.count');
  });

  it('validates the reference locale plural forms too', () => {
    const violations = validatePluralForms('en', { items_few: 'x', items_other: 'y' });
    expect(violations.map((v) => `${v.rule} ${v.key}`)).toEqual([
      'invalid-plural items_few',
      'invalid-plural items_*',
    ]);
  });

  it('fails on route metadata left in English', () => {
    const tree = withPatch(
      (t) => (((t.pageSeo as Tree).home as Tree).description = 'Private payments.'),
    );
    expect(rulesFor(tree)).toContain('untranslated-metadata pageSeo.home.description');
  });

  it('allows metadata made only of allowlisted terms and locale loanwords', () => {
    expect(isOnlyAllowlistedTerms('Wraith Protocol', ['Wraith Protocol'])).toBe(true);
    expect(isOnlyAllowlistedTerms('Blog — Wraith Protocol', ['Wraith Protocol', 'Blog'])).toBe(
      true,
    );
    expect(isOnlyAllowlistedTerms('#{{tag}}', [])).toBe(true);
    expect(isOnlyAllowlistedTerms('Home — Wraith Protocol', ['Wraith Protocol'])).toBe(false);

    const ref = { ogRoutes: { '/blog': { title: 'Blog — Wraith Protocol' } } };
    const sameInEs = validateLocales({ locales: { en: ref, es: ref }, allowlist });
    expect(sameInEs).toEqual([]);
    const sameInFr = validateLocales({ locales: { en: ref, fr: ref }, allowlist });
    expect(sameInFr.map((v) => v.rule)).toEqual(['untranslated-metadata']);
  });

  it('fails when a metadata enum is translated', () => {
    const tree = withPatch((t) => (((t.ogRoutes as Tree)['/'] as Tree).ogType = 'sitio web'));
    expect(rulesFor(tree)).toContain('invalid-enum ogRoutes./.ogType');
  });

  it('fails when an allowlisted brand or protocol term is translated', () => {
    const tree = withPatch(
      (t) => (((t.pageSeo as Tree).home as Tree).title = 'Inicio — Protocolo Espectro'),
    );
    expect(rulesFor(tree)).toContain('protected-term pageSeo.home.title');
  });

  it('extracts interpolation variables and nested keys', () => {
    expect([
      ...extractPlaceholders('{{ count, number }} of {{total}} $t(units.item)').names,
    ]).toEqual(['{{count}}', '{{total}}', '$t(units.item)']);
  });
});

describe('shipped locales', () => {
  it('pass every structure rule', () => {
    expect(validateLocales({ locales: LOCALES, allowlist })).toEqual([]);
  });

  it('are all registered with i18next', () => {
    expect(Object.keys(LOCALES).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });
});

describe('route metadata coverage', () => {
  const pageJobs = listOgImageJobs().filter((job) => job.kind === 'page');
  const ogRoutePaths = [...new Set(pageJobs.map((job) => job.routePath))].sort();

  it('has localized OG metadata for every route that gets an OG card, and no orphans', () => {
    for (const [code, tree] of Object.entries(LOCALES)) {
      expect(Object.keys(tree.ogRoutes as Tree).sort(), code).toEqual(ogRoutePaths);
    }
  });

  it('has localized page SEO for every locale-prefixed route', () => {
    const seoPaths = Object.values(PAGE_PATHS).sort();
    expect(seoPaths).toEqual([...LOCALIZED_BASE_PATHS].sort());
    for (const [code, tree] of Object.entries(LOCALES)) {
      expect(Object.keys(tree.pageSeo as Tree).sort(), code).toEqual(
        Object.keys(PAGE_PATHS).sort(),
      );
    }
  });

  it('serves translated OG card copy for every page in every locale', () => {
    const allowedTerms = (code: string) => [
      ...allowlist.terms.map((entry) => entry.term),
      ...((allowlist.localeTerms as Record<string, { term: string }[]>)[code] ?? []).map(
        (entry) => entry.term,
      ),
    ];
    for (const job of pageJobs) {
      if (job.locale === 'en') continue;
      const english = pageJobs.find((j) => j.routePath === job.routePath && j.locale === 'en')!;
      for (const field of ['title', 'subtitle', 'description'] as const) {
        const value = job[field];
        if (value === english[field]) {
          expect(
            isOnlyAllowlistedTerms(value, allowedTerms(job.locale)),
            `${job.locale} ${job.routePath} ${field}: "${value}"`,
          ).toBe(true);
        }
      }
    }
  });
});
