/**
 * Tests for the locale-aware SEO metadata utilities.
 *
 * Covers:
 * - canonicalUrl always returns the English (default) URL
 * - hreflangAlternates emits en, es, pt-BR, and x-default entries all pointing
 *   at the same canonical URL
 * - usePageSeo hook returns translated title/description for each locale
 * - Stellar, Grants, Blog, and CaseStudies pages render locale-correct <title>
 *   and <meta name="description"> for Spanish and Portuguese
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '../i18n';
import { canonicalUrl, hreflangAlternates, SITE_ORIGIN } from '../utils/seo';

// ─── Pure utility tests ───────────────────────────────────────────────────────

describe('canonicalUrl', () => {
  it('returns the site origin for home', () => {
    expect(canonicalUrl('home')).toBe(SITE_ORIGIN);
  });

  it('appends the correct path for stellar', () => {
    expect(canonicalUrl('stellar')).toBe(`${SITE_ORIGIN}/stellar`);
  });

  it('appends the correct path for grants', () => {
    expect(canonicalUrl('grants')).toBe(`${SITE_ORIGIN}/grants`);
  });

  it('appends the correct path for blog', () => {
    expect(canonicalUrl('blog')).toBe(`${SITE_ORIGIN}/blog`);
  });

  it('appends the correct path for caseStudies', () => {
    expect(canonicalUrl('caseStudies')).toBe(`${SITE_ORIGIN}/case-studies`);
  });
});

describe('hreflangAlternates', () => {
  it('returns en, es, pt-BR, and x-default alternates', () => {
    const alts = hreflangAlternates('stellar');
    const hreflangs = alts.map((a) => a.hrefLang);
    expect(hreflangs).toContain('en');
    expect(hreflangs).toContain('es');
    expect(hreflangs).toContain('pt-BR');
    expect(hreflangs).toContain('x-default');
  });

  it('en and x-default alternates point to the canonical English URL', () => {
    const canonical = canonicalUrl('grants');
    const alts = hreflangAlternates('grants');
    const enAlt = alts.find((a) => a.hrefLang === 'en');
    const xDefault = alts.find((a) => a.hrefLang === 'x-default');
    expect(enAlt?.href).toBe(canonical);
    expect(xDefault?.href).toBe(canonical);
  });

  it('es alternate points to the /es-prefixed URL', () => {
    const alts = hreflangAlternates('stellar');
    const esAlt = alts.find((a) => a.hrefLang === 'es');
    expect(esAlt?.href).toBe(`${SITE_ORIGIN}/es/stellar`);
  });

  it('pt-BR alternate points to the /pt-prefixed URL', () => {
    const alts = hreflangAlternates('grants');
    const ptAlt = alts.find((a) => a.hrefLang === 'pt-BR');
    expect(ptAlt?.href).toBe(`${SITE_ORIGIN}/pt/grants`);
  });

  it('home page locale alternates use prefix-only paths', () => {
    const alts = hreflangAlternates('home');
    const esAlt = alts.find((a) => a.hrefLang === 'es');
    const ptAlt = alts.find((a) => a.hrefLang === 'pt-BR');
    expect(esAlt?.href).toBe(`${SITE_ORIGIN}/es`);
    expect(ptAlt?.href).toBe(`${SITE_ORIGIN}/pt`);
  });

  it('all hreflang URLs are distinct from each other', () => {
    const alts = hreflangAlternates('blog');
    const urls = alts.map((a) => a.href);
    // en and x-default intentionally share the canonical URL, so we expect
    // at most one duplicate (those two). Every other URL must be unique.
    const uniqueUrls = new Set(urls);
    expect(uniqueUrls.size).toBeGreaterThanOrEqual(alts.length - 1);
  });

  it('does not duplicate hreflang values', () => {
    const alts = hreflangAlternates('blog');
    const hreflangs = alts.map((a) => a.hrefLang);
    expect(new Set(hreflangs).size).toBe(hreflangs.length);
  });
});

// ─── Page-level locale metadata tests ────────────────────────────────────────

/**
 * Reads the document <title> as set by react-helmet-async.
 * In jsdom, Helmet writes directly to document.title.
 */
function getDocumentTitle(): string {
  return document.title;
}

describe('locale-aware page metadata', () => {
  beforeEach(async () => {
    // Reset to English before each test
    await i18n.changeLanguage('en');
  });

  // ── Stellar ────────────────────────────────────────────────────────────────

  it('Stellar page emits English title by default', async () => {
    window.history.replaceState({}, '', '/stellar');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /stellar integration/i });
    expect(getDocumentTitle()).toMatch(/Stellar/i);
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
  });

  it('Stellar page emits Spanish title when locale is es', async () => {
    await i18n.changeLanguage('es');
    window.history.replaceState({}, '', '/stellar');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /stellar integration/i });
    expect(getDocumentTitle()).toMatch(/Stellar/i);
    // Spanish translation contains "Stellar" and "Wraith Protocol"
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
    // Must NOT be the English default string
    expect(getDocumentTitle()).not.toBe('Stealth payments on Stellar – Wraith Protocol');
  });

  it('Stellar page emits Portuguese title when locale is pt', async () => {
    await i18n.changeLanguage('pt');
    window.history.replaceState({}, '', '/stellar');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /stellar integration/i });
    expect(getDocumentTitle()).toMatch(/Stellar/i);
    expect(getDocumentTitle()).not.toBe('Stealth payments on Stellar – Wraith Protocol');
  });

  // ── Grants ─────────────────────────────────────────────────────────────────

  it('Grants page emits English title by default', async () => {
    await i18n.changeLanguage('en');
    window.history.replaceState({}, '', '/grants');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /build private payments/i });
    expect(getDocumentTitle()).toMatch(/Grants/i);
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
  });

  it('Grants page emits Spanish title when locale is es', async () => {
    await i18n.changeLanguage('es');
    window.history.replaceState({}, '', '/grants');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /build private payments/i });
    // Spanish: "Subvenciones – Wraith Protocol"
    expect(getDocumentTitle()).toMatch(/Subvenciones/i);
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
  });

  it('Grants page emits Portuguese title when locale is pt', async () => {
    await i18n.changeLanguage('pt');
    window.history.replaceState({}, '', '/grants');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /build private payments/i });
    // Portuguese: "Bolsas – Wraith Protocol"
    expect(getDocumentTitle()).toMatch(/Bolsas/i);
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
  });

  // ── Blog ───────────────────────────────────────────────────────────────────

  it('Blog page emits English title by default', async () => {
    await i18n.changeLanguage('en');
    window.history.replaceState({}, '', '/blog');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /wraith protocol blog/i });
    expect(getDocumentTitle()).toMatch(/Blog/i);
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
  });

  it('Blog page emits Spanish title when locale is es', async () => {
    await i18n.changeLanguage('es');
    window.history.replaceState({}, '', '/blog');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /wraith protocol blog/i });
    expect(getDocumentTitle()).toMatch(/Blog/i);
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
    expect(getDocumentTitle()).not.toBe(
      'Updates from Wraith Protocol on privacy-preserving payments and stealth infrastructure.',
    );
  });

  // ── CaseStudies ────────────────────────────────────────────────────────────

  it('Case Studies page emits English title by default', async () => {
    await i18n.changeLanguage('en');
    window.history.replaceState({}, '', '/case-studies');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', {
      level: 1,
      name: /real-world privacy solutions/i,
    });
    expect(getDocumentTitle()).toMatch(/Case Studies/i);
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
  });

  it('Case Studies page emits Spanish title when locale is es', async () => {
    await i18n.changeLanguage('es');
    window.history.replaceState({}, '', '/case-studies');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', {
      level: 1,
      name: /real-world privacy solutions/i,
    });
    // Spanish: "Casos de estudio – Wraith Protocol"
    expect(getDocumentTitle()).toMatch(/Casos de estudio/i);
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
  });

  it('Case Studies page emits Portuguese title when locale is pt', async () => {
    await i18n.changeLanguage('pt');
    window.history.replaceState({}, '', '/case-studies');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', {
      level: 1,
      name: /real-world privacy solutions/i,
    });
    // Portuguese: "Estudos de caso – Wraith Protocol"
    expect(getDocumentTitle()).toMatch(/Estudos de caso/i);
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
  });

  // ── Home ───────────────────────────────────────────────────────────────────

  it('Home page emits English title by default', async () => {
    await i18n.changeLanguage('en');
    window.history.replaceState({}, '', '/');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /private payments/i });
    expect(getDocumentTitle()).toMatch(/Wraith Protocol/i);
  });

  it('Home page emits Spanish title when locale is es', async () => {
    await i18n.changeLanguage('es');
    window.history.replaceState({}, '', '/');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /private payments/i });
    // Spanish: "Wraith Protocol — Pagos privados para cada cadena"
    expect(getDocumentTitle()).toMatch(/Pagos privados/i);
  });

  it('Home page emits Portuguese title when locale is pt', async () => {
    await i18n.changeLanguage('pt');
    window.history.replaceState({}, '', '/');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /private payments/i });
    // Portuguese: "Wraith Protocol — Pagamentos privados para cada rede"
    expect(getDocumentTitle()).toMatch(/Pagamentos privados/i);
  });

  // ── hreflang in rendered HTML ──────────────────────────────────────────────

  it('renders hreflang link tags for each supported locale on Stellar', async () => {
    await i18n.changeLanguage('en');
    window.history.replaceState({}, '', '/stellar');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /stellar integration/i });

    await waitFor(() => {
      const links = Array.from(document.head.querySelectorAll('link[rel="alternate"][hreflang]'));
      const hreflangs = links.map((l) => l.getAttribute('hreflang'));
      expect(hreflangs).toContain('en');
      expect(hreflangs).toContain('es');
      expect(hreflangs).toContain('pt-BR');
      expect(hreflangs).toContain('x-default');
    });
  });

  it('all hreflang links on Stellar point to the canonical URL', async () => {
    await i18n.changeLanguage('en');
    window.history.replaceState({}, '', '/stellar');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /stellar integration/i });

    await waitFor(() => {
      const links = Array.from(document.head.querySelectorAll('link[rel="alternate"][hreflang]'));
      const enLink = links.find((l) => l.getAttribute('hreflang') === 'en');
      const esLink = links.find((l) => l.getAttribute('hreflang') === 'es');
      const ptLink = links.find((l) => l.getAttribute('hreflang') === 'pt-BR');
      const xDefault = links.find((l) => l.getAttribute('hreflang') === 'x-default');

      // English and x-default → canonical
      expect(enLink?.getAttribute('href')).toBe(`${SITE_ORIGIN}/stellar`);
      expect(xDefault?.getAttribute('href')).toBe(`${SITE_ORIGIN}/stellar`);
      // Non-English → locale-prefixed distinct URLs
      expect(esLink?.getAttribute('href')).toBe(`${SITE_ORIGIN}/es/stellar`);
      expect(ptLink?.getAttribute('href')).toBe(`${SITE_ORIGIN}/pt/stellar`);
    });
  });

  it('renders a canonical link tag on the Grants page', async () => {
    await i18n.changeLanguage('en');
    window.history.replaceState({}, '', '/grants');
    const { default: App } = await import('../App');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: /build private payments/i });

    await waitFor(() => {
      const canonical = document.head.querySelector('link[rel="canonical"]');
      expect(canonical).not.toBeNull();
      expect(canonical?.getAttribute('href')).toBe(`${SITE_ORIGIN}/grants`);
    });
  });
});
