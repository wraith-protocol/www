/**
 * Route-navigation unit tests.
 *
 * Covers:
 * - useLocalePath produces correct prefixes for en, es, and pt
 * - useLocalePath does not double-prefix already-prefixed paths
 * - useLocalePath passes through external URLs and hash-only links unchanged
 * - Header navigation links carry the locale prefix when the locale is es or pt
 * - Header navigation links are unprefixed when the locale is en
 * - LocaleSync resets the locale to English when navigating to an unprefixed route
 * - LocaleSync leaves the locale alone when navigating to a locale-prefixed route
 *   (locale is set by LocaleScope, not LocaleSync)
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import i18n from '../i18n';
import { useLocalePath, hasLocalizedRoute } from '../hooks/useLocalePath';
import { renderHook } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Renders a hook inside a MemoryRouter (required for any hook that calls useTranslation
 *  when i18next is initialised with react-i18next). */
function renderHookInRouter<T>(hook: () => T, initialEntries: string[] = ['/']) {
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    ),
  });
}

// ─── useLocalePath ────────────────────────────────────────────────────────────

describe('useLocalePath', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('returns paths unchanged when locale is en', async () => {
    await i18n.changeLanguage('en');
    const { result } = renderHookInRouter(() => useLocalePath());
    expect(result.current('/grants')).toBe('/grants');
    expect(result.current('/blog')).toBe('/blog');
    expect(result.current('/')).toBe('/');
  });

  it('prepends /es when locale is es', async () => {
    await i18n.changeLanguage('es');
    const { result } = renderHookInRouter(() => useLocalePath());
    expect(result.current('/grants')).toBe('/es/grants');
    expect(result.current('/blog')).toBe('/es/blog');
    expect(result.current('/stellar')).toBe('/es/stellar');
    expect(result.current('/')).toBe('/es/');
  });

  it('prepends /pt when locale is pt', async () => {
    await i18n.changeLanguage('pt');
    const { result } = renderHookInRouter(() => useLocalePath());
    expect(result.current('/grants')).toBe('/pt/grants');
    expect(result.current('/case-studies')).toBe('/pt/case-studies');
    expect(result.current('/case-studies/defi-privacy')).toBe('/pt/case-studies/defi-privacy');
  });

  it('does not double-prefix an already-prefixed /es path', async () => {
    await i18n.changeLanguage('es');
    const { result } = renderHookInRouter(() => useLocalePath());
    expect(result.current('/es/grants')).toBe('/es/grants');
  });

  it('does not double-prefix an already-prefixed /pt path', async () => {
    await i18n.changeLanguage('pt');
    const { result } = renderHookInRouter(() => useLocalePath());
    expect(result.current('/pt/blog')).toBe('/pt/blog');
  });

  it('passes through external URLs unchanged', async () => {
    await i18n.changeLanguage('es');
    const { result } = renderHookInRouter(() => useLocalePath());
    expect(result.current('https://docs.usewraith.xyz')).toBe('https://docs.usewraith.xyz');
  });

  it('passes through hash-only links unchanged', async () => {
    await i18n.changeLanguage('pt');
    const { result } = renderHookInRouter(() => useLocalePath());
    expect(result.current('#compare')).toBe('#compare');
  });
});

// ─── hasLocalizedRoute ───────────────────────────────────────────────────────────

describe('hasLocalizedRoute', () => {
  it('returns true for routes with localized versions', () => {
    expect(hasLocalizedRoute('/')).toBe(true);
    expect(hasLocalizedRoute('/blog')).toBe(true);
    expect(hasLocalizedRoute('/blog/some-post')).toBe(true);
    expect(hasLocalizedRoute('/blog/author/some-author')).toBe(true);
    expect(hasLocalizedRoute('/blog/tag/some-tag')).toBe(true);
    expect(hasLocalizedRoute('/stellar')).toBe(true);
    expect(hasLocalizedRoute('/grants')).toBe(true);
    expect(hasLocalizedRoute('/case-studies')).toBe(true);
    expect(hasLocalizedRoute('/case-studies/some-case')).toBe(true);
  });

  it('returns false for routes without localized versions', () => {
    expect(hasLocalizedRoute('/privacy')).toBe(false);
    expect(hasLocalizedRoute('/about')).toBe(false);
    expect(hasLocalizedRoute('/vitals')).toBe(false);
    expect(hasLocalizedRoute('/security')).toBe(false);
    expect(hasLocalizedRoute('/careers')).toBe(false);
    expect(hasLocalizedRoute('/governance')).toBe(false);
    expect(hasLocalizedRoute('/faq')).toBe(false);
    expect(hasLocalizedRoute('/newsletter')).toBe(false);
    expect(hasLocalizedRoute('/use-cases')).toBe(false);
    expect(hasLocalizedRoute('/roadmap')).toBe(false);
    expect(hasLocalizedRoute('/threat-model')).toBe(false);
    expect(hasLocalizedRoute('/status')).toBe(false);
    expect(hasLocalizedRoute('/contributors')).toBe(false);
    expect(hasLocalizedRoute('/chains')).toBe(false);
    expect(hasLocalizedRoute('/ecosystem')).toBe(false);
  });

  it('returns false for external URLs and hash links', () => {
    expect(hasLocalizedRoute('https://example.com')).toBe(false);
    expect(hasLocalizedRoute('#compare')).toBe(false);
    expect(hasLocalizedRoute('')).toBe(false);
  });
});

// ─── Footer locale-aware navigation links ────────────────────────────────────────

describe('Footer locale-aware navigation links', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('blog link has no prefix when locale is en', async () => {
    window.history.replaceState({}, '', '/');
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const blogLinks = screen.getAllByRole('link', { name: /blog/i });
    expect(blogLinks.length).toBeGreaterThan(0);
    for (const link of blogLinks) {
      expect(link).toHaveAttribute('href', '/blog');
    }
  });

  it('case-studies link has no prefix when locale is en', async () => {
    window.history.replaceState({}, '', '/');
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const caseStudiesLinks = screen.getAllByRole('link', { name: /case studies/i });
    expect(caseStudiesLinks.length).toBeGreaterThan(0);
    for (const link of caseStudiesLinks) {
      expect(link).toHaveAttribute('href', '/case-studies');
    }
  });

  it('stellar link has no prefix when locale is en', async () => {
    window.history.replaceState({}, '', '/');
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const stellarLinks = screen.getAllByRole('link', { name: /stellar integration/i });
    expect(stellarLinks.length).toBeGreaterThan(0);
    for (const link of stellarLinks) {
      expect(link).toHaveAttribute('href', '/stellar');
    }
  });

  it('careers link has no prefix when locale is en', async () => {
    window.history.replaceState({}, '', '/');
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const careersLinks = screen.getAllByRole('link', { name: /careers/i });
    expect(careersLinks.length).toBeGreaterThan(0);
    for (const link of careersLinks) {
      expect(link).toHaveAttribute('href', '/careers');
    }
  });

  it('about link has no prefix when locale is en', async () => {
    window.history.replaceState({}, '', '/');
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const aboutLinks = screen.getAllByRole('link', { name: /^about$/i });
    expect(aboutLinks.length).toBeGreaterThan(0);
    for (const link of aboutLinks) {
      expect(link).toHaveAttribute('href', '/about');
    }
  });

  it('governance link has no prefix when locale is en', async () => {
    window.history.replaceState({}, '', '/');
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const governanceLinks = screen.getAllByRole('link', { name: /governance/i });
    expect(governanceLinks.length).toBeGreaterThan(0);
    for (const link of governanceLinks) {
      expect(link).toHaveAttribute('href', '/governance');
    }
  });

  it('blog link has /es prefix when locale is es', async () => {
    await act(async () => {
      await i18n.changeLanguage('es');
    });
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/es']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const blogLinks = screen.getAllByRole('link', { name: /blog/i });
    expect(blogLinks.length).toBeGreaterThan(0);
    for (const link of blogLinks) {
      expect(link).toHaveAttribute('href', '/es/blog');
    }
  });

  it('case-studies link has /es prefix when locale is es', async () => {
    await act(async () => {
      await i18n.changeLanguage('es');
    });
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/es']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const caseStudiesLinks = screen.getAllByRole('link', { name: /casos de estudio/i });
    expect(caseStudiesLinks.length).toBeGreaterThan(0);
    for (const link of caseStudiesLinks) {
      expect(link).toHaveAttribute('href', '/es/case-studies');
    }
  });

  it('stellar link has /es prefix when locale is es', async () => {
    await act(async () => {
      await i18n.changeLanguage('es');
    });
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/es']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const stellarLinks = screen.getAllByRole('link', { name: /integraci/i });
    expect(stellarLinks.length).toBeGreaterThan(0);
    for (const link of stellarLinks) {
      expect(link).toHaveAttribute('href', '/es/stellar');
    }
  });

  it('blog link has /pt prefix when locale is pt', async () => {
    await act(async () => {
      await i18n.changeLanguage('pt');
    });
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/pt']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const blogLinks = screen.getAllByRole('link', { name: /blog/i });
    expect(blogLinks.length).toBeGreaterThan(0);
    for (const link of blogLinks) {
      expect(link).toHaveAttribute('href', '/pt/blog');
    }
  });

  it('case-studies link has /pt prefix when locale is pt', async () => {
    await act(async () => {
      await i18n.changeLanguage('pt');
    });
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/pt']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const caseStudiesLinks = screen.getAllByRole('link', { name: /estudos de caso/i });
    expect(caseStudiesLinks.length).toBeGreaterThan(0);
    for (const link of caseStudiesLinks) {
      expect(link).toHaveAttribute('href', '/pt/case-studies');
    }
  });

  it('privacy link has NO prefix when locale is es (no localized version)', async () => {
    await act(async () => {
      await i18n.changeLanguage('es');
    });
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/es']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const privacyLinks = screen.getAllByRole('link', { name: /privacidad/i });
    expect(privacyLinks.length).toBeGreaterThan(0);
    for (const link of privacyLinks) {
      expect(link).toHaveAttribute('href', '/privacy');
    }
  });

  it('about link has NO prefix when locale is pt (no localized version)', async () => {
    await act(async () => {
      await i18n.changeLanguage('pt');
    });
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/pt']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const aboutLinks = screen.getAllByRole('link', { name: /sobre/i });
    expect(aboutLinks.length).toBeGreaterThan(0);
    for (const link of aboutLinks) {
      expect(link).toHaveAttribute('href', '/about');
    }
  });

  it('vitals link has NO prefix when locale is es (no localized version)', async () => {
    await act(async () => {
      await i18n.changeLanguage('es');
    });
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/es']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const vitalsLinks = screen.getAllByRole('link', { name: /web vitals/i });
    expect(vitalsLinks.length).toBeGreaterThan(0);
    for (const link of vitalsLinks) {
      expect(link).toHaveAttribute('href', '/vitals');
    }
  });

  it('security link has NO prefix when locale is pt (no localized version)', async () => {
    await act(async () => {
      await i18n.changeLanguage('pt');
    });
    const { default: Footer } = await import('../components/Footer');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/pt']}>
          <Footer />
        </MemoryRouter>
      </ThemeProvider>,
    );
    // Find the "Segurança" link in the trust column (href="/security"), not the resources column (external URL)
    const securityLinks = screen.getAllByRole('link', { name: /^segurança$/i });
    expect(securityLinks.length).toBeGreaterThan(0);
    for (const link of securityLinks) {
      const href = link.getAttribute('href');
      // Only test the internal /security link, not the external docs link
      if (href === '/security') {
        expect(link).toHaveAttribute('href', '/security');
        return;
      }
    }
    throw new Error('Internal /security link not found in trust column');
  });
});

// ─── Header locale-aware links ────────────────────────────────────────────────

describe('Header locale-aware navigation links', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('grants link has no prefix when locale is en', async () => {
    window.history.replaceState({}, '', '/');
    const { default: Header } = await import('../components/Header');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const grantsLinks = screen.getAllByRole('link', { name: /grants/i });
    // Desktop link (there may be only one visible in jsdom since md: is not applied)
    expect(grantsLinks.length).toBeGreaterThan(0);
    for (const link of grantsLinks) {
      expect(link).toHaveAttribute('href', '/grants');
    }
  });

  it('blog link has no prefix when locale is en', async () => {
    window.history.replaceState({}, '', '/');
    const { default: Header } = await import('../components/Header');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const blogLinks = screen.getAllByRole('link', { name: /^blog$/i });
    expect(blogLinks.length).toBeGreaterThan(0);
    for (const link of blogLinks) {
      expect(link).toHaveAttribute('href', '/blog');
    }
  });

  it('grants link has /es prefix when locale is es', async () => {
    await act(async () => {
      await i18n.changeLanguage('es');
    });
    const { default: Header } = await import('../components/Header');
    const { container } = render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/es']}>
          <Header />
        </MemoryRouter>
      </ThemeProvider>,
    );
    // Query by href since the label is translated to "Subvenciones" in Spanish
    const grantsLinks = container.querySelectorAll('a[href="/es/grants"]');
    expect(grantsLinks.length).toBeGreaterThan(0);
  });

  it('blog link has /es prefix when locale is es', async () => {
    await act(async () => {
      await i18n.changeLanguage('es');
    });
    const { default: Header } = await import('../components/Header');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/es']}>
          <Header />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const blogLinks = screen.getAllByRole('link', { name: /^blog$/i });
    expect(blogLinks.length).toBeGreaterThan(0);
    for (const link of blogLinks) {
      expect(link).toHaveAttribute('href', '/es/blog');
    }
  });

  it('stellar link has /pt prefix when locale is pt', async () => {
    await act(async () => {
      await i18n.changeLanguage('pt');
    });
    const { default: Header } = await import('../components/Header');
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/pt']}>
          <Header />
        </MemoryRouter>
      </ThemeProvider>,
    );
    const stellarLinks = screen.getAllByRole('link', { name: /^stellar$/i });
    expect(stellarLinks.length).toBeGreaterThan(0);
    for (const link of stellarLinks) {
      expect(link).toHaveAttribute('href', '/pt/stellar');
    }
  });
});

// ─── LocaleSync — resets locale on English (unprefixed) routes ────────────────

describe('LocaleSync', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
    vi.restoreAllMocks();
  });

  it('resets locale to English when navigating to an unprefixed route', async () => {
    // Start with Spanish active
    await act(async () => {
      await i18n.changeLanguage('es');
    });
    expect(i18n.language).toBe('es');

    // Navigate to an unprefixed English route via App
    window.history.replaceState({}, '', '/grants');
    const { default: App } = await import('../App');
    render(<App />);

    // Wait for the page to settle — LocaleSync fires on mount
    await screen.findByRole('heading', { name: /build private payments/i });

    await waitFor(() => {
      expect(i18n.language).toBe('en');
    });
  });

  it('resets locale to English when navigating from a locale-prefixed route to an English route', async () => {
    // Simulate starting on a Spanish page
    await act(async () => {
      await i18n.changeLanguage('es');
    });

    // Now render directly at an English route — LocaleSync should reset
    window.history.replaceState({}, '', '/blog');
    const { default: App } = await import('../App');
    render(<App />);

    await screen.findByRole('heading', { name: /wraith protocol blog/i });

    await waitFor(() => {
      expect(i18n.language).toBe('en');
    });
  });

  it('does NOT reset locale when the URL carries a /es prefix', async () => {
    // The /es routes activate LocaleScope which sets 'es'; LocaleSync must not
    // override that by resetting to 'en'.
    window.history.replaceState({}, '', '/es/grants');
    const { default: App } = await import('../App');
    render(<App />);

    await screen.findByRole('heading', { name: /build private payments/i });

    // LocaleScope sets 'es'; i18n language should remain 'es'
    await waitFor(() => {
      expect(i18n.language).toBe('es');
    });
  });

  it('does NOT reset locale when the URL carries a /pt prefix', async () => {
    window.history.replaceState({}, '', '/pt/blog');
    const { default: App } = await import('../App');
    render(<App />);

    await screen.findByRole('heading', { name: /wraith protocol blog/i });

    await waitFor(() => {
      expect(i18n.language).toBe('pt');
    });
  });
});

// ─── Locale-prefixed blog author/tag routes ────────────────────────────────────

describe('Locale-prefixed blog author/tag routes', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
    vi.restoreAllMocks();
  });

  it('renders Blog author page at /es/blog/author/author-id with Spanish locale', async () => {
    window.history.replaceState({}, '', '/es/blog/author/lena-vogt');
    const { default: App } = await import('../App');
    render(<App />);

    // LocaleScope sets 'es'; i18n language should remain 'es'
    await waitFor(() => {
      expect(i18n.language).toBe('es');
    });
  });

  it('renders Blog author page at /pt/blog/author/author-id with Portuguese locale', async () => {
    window.history.replaceState({}, '', '/pt/blog/author/wraith-team');
    const { default: App } = await import('../App');
    render(<App />);

    // LocaleScope sets 'pt'; i18n language should remain 'pt'
    await waitFor(() => {
      expect(i18n.language).toBe('pt');
    });
  });

  it('renders Blog tag page at /es/blog/tag/stealth with Spanish locale', async () => {
    window.history.replaceState({}, '', '/es/blog/tag/stealth');
    const { default: App } = await import('../App');
    render(<App />);

    // LocaleScope sets 'es'; i18n language should remain 'es'
    await waitFor(() => {
      expect(i18n.language).toBe('es');
    });
  });

  it('renders Blog tag page at /pt/blog/tag/privacy with Portuguese locale', async () => {
    window.history.replaceState({}, '', '/pt/blog/tag/privacy');
    const { default: App } = await import('../App');
    render(<App />);

    // LocaleScope sets 'pt'; i18n language should remain 'pt'
    await waitFor(() => {
      expect(i18n.language).toBe('pt');
    });
  });

  it('renders CaseStudies detail page at /es/case-studies/payroll-processor with Spanish locale', async () => {
    window.history.replaceState({}, '', '/es/case-studies/payroll-processor');
    const { default: App } = await import('../App');
    render(<App />);

    // LocaleScope sets 'es'; i18n language should remain 'es'
    await waitFor(() => {
      expect(i18n.language).toBe('es');
    });
  });

  it('renders CaseStudies detail page at /pt/case-studies/payroll-processor with Portuguese locale', async () => {
    window.history.replaceState({}, '', '/pt/case-studies/payroll-processor');
    const { default: App } = await import('../App');
    render(<App />);

    // LocaleScope sets 'pt'; i18n language should remain 'pt'
    await waitFor(() => {
      expect(i18n.language).toBe('pt');
    });
  });
});
