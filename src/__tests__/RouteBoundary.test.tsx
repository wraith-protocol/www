import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout';
import RouteBoundary from '../components/RouteBoundary';
import { ThemeProvider } from '../context/ThemeContext';
import i18n from '../i18n';
import {
  attemptBoundedChunkReload,
  lazyWithRecovery,
  type LazyRecoveryOptions,
} from '../utils/lazyWithRecovery';

function setNavigatorOnline(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  });
}

function mockReducedMotion(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  let currentMatches = matches;

  const mock = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return query === '(prefers-reduced-motion: reduce)' ? currentMatches : false;
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mock,
  });

  return {
    setMatches(next: boolean) {
      currentMatches = next;
      const event = {
        matches: next,
        media: '(prefers-reduced-motion: reduce)',
      } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderWithProviders(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}

describe('RouteBoundary and lazy route recovery', () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    setNavigatorOnline(true);
    mockReducedMotion(false);
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    window.sessionStorage.clear();
    setNavigatorOnline(true);
    mockReducedMotion(false);
    await i18n.changeLanguage('en');
    vi.restoreAllMocks();
  });

  describe('slow dynamic imports and shell stability', () => {
    it('shows a non-shifting loading shell with preserved navigation and zero axe violations', async () => {
      const deferred = createDeferred<{ default: React.ComponentType }>();
      const SlowPage = lazyWithRecovery(() => deferred.promise, { maxRetries: 0 });

      const { container } = renderWithProviders(
        <RouteBoundary variant="page">
          <SlowPage />
        </RouteBoundary>,
        ['/slow'],
      );

      const status = screen.getByRole('status');
      expect(status).toHaveTextContent(/loading page/i);

      const loadingRegion = container.querySelector('[data-route-loading="page"]');
      expect(loadingRegion).toHaveAttribute('aria-busy', 'true');
      expect(loadingRegion?.className).toContain('min-h-[60vh]');
      expect(loadingRegion).toHaveAttribute('data-reduced-motion', 'false');

      // Shell landmarks and navigation stay present while loading
      expect(container.querySelectorAll('header')).toHaveLength(1);
      expect(container.querySelectorAll('main')).toHaveLength(1);
      expect(container.querySelectorAll('footer')).toHaveLength(1);
      expect(screen.getAllByRole('link').length).toBeGreaterThan(0);

      const loadingAxe = await axe(container);
      expect(loadingAxe.violations).toEqual([]);

      await act(async () => {
        deferred.resolve({
          default: () => (
            <div>
              <header>
                <a href="/">Wraith</a>
              </header>
              <main>
                <h1>Loaded Route</h1>
              </main>
              <footer>Footer</footer>
            </div>
          ),
        });
      });

      expect(await screen.findByRole('heading', { level: 1, name: /loaded route/i })).toBeVisible();
      expect(container.querySelector('[data-route-loading]')).toBeNull();
    });

    it('avoids duplicate landmarks when nested inside Layout during slow imports', async () => {
      const deferred = createDeferred<{ default: React.ComponentType }>();
      const SlowLayoutPage = lazyWithRecovery(() => deferred.promise, { maxRetries: 0 });

      const { container } = renderWithProviders(
        <Layout>
          <SlowLayoutPage />
        </Layout>,
        ['/stellar'],
      );

      expect(screen.getByRole('status')).toHaveTextContent(/loading page/i);
      expect(container.querySelectorAll('header')).toHaveLength(1);
      expect(container.querySelectorAll('main')).toHaveLength(1);
      expect(container.querySelectorAll('footer')).toHaveLength(1);

      const results = await axe(container);
      expect(results.violations).toEqual([]);

      await act(async () => {
        deferred.resolve({
          default: () => (
            <section>
              <h1>Stellar Ready</h1>
            </section>
          ),
        });
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /stellar ready/i }),
      ).toBeVisible();
    });

    it('renders accessible section and footer loading boundaries with reserved height', async () => {
      const slowSection = createDeferred<{ default: React.ComponentType }>();
      const slowFooter = createDeferred<{ default: React.ComponentType }>();
      const LazySection = lazyWithRecovery(() => slowSection.promise, { maxRetries: 0 });
      const LazyFooter = lazyWithRecovery(() => slowFooter.promise, { maxRetries: 0 });

      const { container } = renderWithProviders(
        <div>
          <header>
            <a href="/">Wraith</a>
          </header>
          <main>
            <h1>Home</h1>
            <RouteBoundary variant="section" minHeightClass="min-h-[480px]">
              <LazySection />
            </RouteBoundary>
          </main>
          <RouteBoundary variant="footer">
            <LazyFooter />
          </RouteBoundary>
        </div>,
        ['/'],
      );

      const sectionLoader = container.querySelector('[data-route-loading="section"]');
      const footerLoader = container.querySelector('[data-route-loading="footer"]');
      expect(sectionLoader?.className).toContain('min-h-[480px]');
      expect(footerLoader?.className).toContain('min-h-[320px]');
      expect(container.querySelectorAll('footer')).toHaveLength(1);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it('respects prefers-reduced-motion initially and on media query changes', async () => {
      const media = mockReducedMotion(true);
      const deferred = createDeferred<{ default: React.ComponentType }>();
      const SlowPage = lazyWithRecovery(() => deferred.promise, { maxRetries: 0 });

      const { container } = renderWithProviders(
        <RouteBoundary variant="section">
          <SlowPage />
        </RouteBoundary>,
        ['/'],
      );

      const sectionLoader = container.querySelector('[data-route-loading="section"]');
      expect(sectionLoader).toHaveAttribute('data-reduced-motion', 'true');
      expect(sectionLoader?.innerHTML).not.toContain('animate-pulse');

      const results = await axe(container);
      expect(results.violations).toEqual([]);

      act(() => {
        media.setMatches(false);
      });

      expect(container.querySelector('[data-route-loading="section"]')).toHaveAttribute(
        'data-reduced-motion',
        'false',
      );
      expect(container.querySelector('[data-route-loading="section"]')?.innerHTML).toContain(
        'animate-pulse',
      );
    });
  });

  describe('failed dynamic imports and bounded recovery without loops', () => {
    it('shows clear chunk recovery UI and enforces bounded manual retries without looping', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      const importer = vi.fn(async () => {
        throw new TypeError('Failed to fetch dynamically imported module: /assets/Broken-123.js');
      });
      const BrokenPage = lazyWithRecovery(importer, { maxRetries: 0 });

      const { container } = renderWithProviders(
        <RouteBoundary variant="page" maxManualRetries={2}>
          <BrokenPage />
        </RouteBoundary>,
        ['/broken'],
      );

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /unable to load the latest page version/i,
        }),
      ).toBeVisible();
      expect(screen.getByRole('alert')).toBeVisible();
      expect(importer).toHaveBeenCalledTimes(1);

      // Header navigation and return home link stay usable
      expect(container.querySelectorAll('header')).toHaveLength(1);
      expect(screen.getByRole('link', { name: /return home/i })).toHaveAttribute('href', '/');

      const a11y = await axe(container);
      expect(a11y.violations).toEqual([]);

      // First manual retry
      await user.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => expect(importer).toHaveBeenCalledTimes(2));

      // Second manual retry reaches the limit and disables Retry to prevent loops
      await user.click(await screen.findByRole('button', { name: /try again/i }));
      await waitFor(() => expect(importer).toHaveBeenCalledTimes(3));

      const retryButton = await screen.findByRole('button', { name: /try again/i });
      expect(retryButton).toBeDisabled();
      expect(screen.getByText(/retry limit reached/i)).toBeVisible();
    });

    it('guards manual page reloads via sessionStorage so stale versions never reload in a loop', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      const onReload = vi.fn();
      const BrokenPage = lazyWithRecovery(
        async () => {
          throw new TypeError('Failed to fetch dynamically imported module');
        },
        { maxRetries: 0 },
      );

      renderWithProviders(
        <RouteBoundary variant="page" maxReloads={1} onReload={onReload}>
          <BrokenPage />
        </RouteBoundary>,
        ['/stale-version'],
      );

      const reloadButton = await screen.findByRole('button', { name: /reload page/i });
      await user.click(reloadButton);
      expect(onReload).toHaveBeenCalledTimes(1);

      // Second click hits the sessionStorage reload guard instead of triggering a loop
      await user.click(reloadButton);
      expect(onReload).toHaveBeenCalledTimes(1);
      expect(reloadButton).toBeDisabled();
      expect(screen.getByText(/recent reload did not resolve/i)).toBeVisible();
    });

    it('immediately surfaces reload-limit notice when a post-reload chunk still fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const previousReload = vi.fn();
      attemptBoundedChunkReload({
        path: '/post-deploy',
        reload: previousReload,
        maxReloads: 1,
      });

      const BrokenPage = lazyWithRecovery(
        async () => {
          throw new TypeError('Failed to fetch dynamically imported module');
        },
        { maxRetries: 0 },
      );

      renderWithProviders(
        <RouteBoundary variant="content" maxReloads={1}>
          <BrokenPage />
        </RouteBoundary>,
        ['/post-deploy'],
      );

      expect(await screen.findByText(/recent reload did not resolve/i)).toBeVisible();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeDisabled();
    });
  });

  describe('recovered dynamic imports', () => {
    it('recovers cleanly when a failing import succeeds on manual retry', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      let attempts = 0;

      const FlakyPage = lazyWithRecovery(
        async () => {
          attempts += 1;
          if (attempts === 1) {
            throw new TypeError('Failed to fetch dynamically imported module');
          }
          return {
            default: () => (
              <section>
                <h1>Recovered Successfully</h1>
              </section>
            ),
          };
        },
        { maxRetries: 0 },
      );

      renderWithProviders(
        <Layout>
          <FlakyPage />
        </Layout>,
        ['/flaky'],
      );

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /unable to load the latest page version/i,
        }),
      ).toBeVisible();

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(
        await screen.findByRole('heading', { level: 1, name: /recovered successfully/i }),
      ).toBeVisible();
      expect(attempts).toBe(2);
    });
  });

  describe('navigation between routes and versions', () => {
    it('resets the error boundary when navigating to another route and retries fresh on return', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      let shouldFail = true;

      const SometimesBrokenPage = lazyWithRecovery(
        async () => {
          if (shouldFail) {
            throw new TypeError('Failed to fetch dynamically imported module');
          }
          return {
            default: () => (
              <section>
                <h1>Target Route Restored</h1>
              </section>
            ),
          };
        },
        { maxRetries: 0 },
      );

      function HealthyHome() {
        return (
          <section>
            <h1>Home Ready</h1>
            <Link to="/target">Go to target</Link>
          </section>
        );
      }

      renderWithProviders(
        <Layout>
          <Routes>
            <Route path="/" element={<HealthyHome />} />
            <Route path="/target" element={<SometimesBrokenPage />} />
          </Routes>
        </Layout>,
        ['/target'],
      );

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /unable to load the latest page version/i,
        }),
      ).toBeVisible();

      // Navigate back home using the recovery Return home link
      await user.click(screen.getByRole('link', { name: /return home/i }));
      expect(await screen.findByRole('heading', { level: 1, name: /home ready/i })).toBeVisible();

      // Simulate new deployment serving the valid chunk, then navigate back
      shouldFail = false;
      await user.click(screen.getByRole('link', { name: /go to target/i }));
      expect(
        await screen.findByRole('heading', { level: 1, name: /target route restored/i }),
      ).toBeVisible();
    });

    it('resets the error boundary when the URL search version changes', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      let shouldFail = true;

      const VersionedPage = lazyWithRecovery(
        async () => {
          if (shouldFail) {
            throw new TypeError('Failed to fetch dynamically imported module');
          }
          return {
            default: () => (
              <section>
                <h1>Version 2 Ready</h1>
              </section>
            ),
          };
        },
        { maxRetries: 0 },
      );

      renderWithProviders(
        <div>
          <nav aria-label="Version switcher">
            <Link to="/docs?v=2">Switch to v2</Link>
          </nav>
          <RouteBoundary variant="content">
            <Routes>
              <Route path="/docs" element={<VersionedPage />} />
            </Routes>
          </RouteBoundary>
        </div>,
        ['/docs?v=1'],
      );

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /unable to load the latest page version/i,
        }),
      ).toBeVisible();

      shouldFail = false;
      await user.click(screen.getByRole('link', { name: /switch to v2/i }));
      expect(
        await screen.findByRole('heading', { level: 1, name: /version 2 ready/i }),
      ).toBeVisible();
    });

    it('renders localized recovery strings and home link for Spanish routes', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await act(async () => {
        await i18n.changeLanguage('es');
      });

      const BrokenPage = lazyWithRecovery(
        async () => {
          throw new TypeError('Failed to fetch dynamically imported module');
        },
        { maxRetries: 0 },
      );

      renderWithProviders(
        <RouteBoundary variant="content">
          <BrokenPage />
        </RouteBoundary>,
        ['/es/stellar'],
      );

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /no se pudo cargar la versión más reciente/i,
        }),
      ).toBeVisible();
      expect(screen.getByRole('link', { name: /volver al inicio/i })).toHaveAttribute(
        'href',
        '/es/',
      );
    });
  });

  describe('offline mode and live connectivity updates', () => {
    it('shows offline messaging, disables reload while offline, and recovers when back online', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      setNavigatorOnline(false);

      let allowLoad = false;
      const OfflineSensitivePage = lazyWithRecovery(
        async () => {
          if (!allowLoad) {
            throw new TypeError('Failed to fetch dynamically imported module');
          }
          return {
            default: () => (
              <section>
                <h1>Back Online Content</h1>
              </section>
            ),
          };
        },
        { maxRetries: 1, retryDelayMs: 0 } satisfies LazyRecoveryOptions,
      );

      const { container } = renderWithProviders(
        <RouteBoundary variant="page">
          <OfflineSensitivePage />
        </RouteBoundary>,
        ['/offline-test'],
      );

      expect(
        await screen.findByRole('heading', { level: 1, name: /you appear to be offline/i }),
      ).toBeVisible();
      expect(container.querySelector('[data-offline="true"]')).not.toBeNull();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeDisabled();

      const offlineAxe = await axe(container);
      expect(offlineAxe.violations).toEqual([]);

      // Simulate connectivity returning
      allowLoad = true;
      setNavigatorOnline(true);
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(await screen.findByText(/connection restored/i)).toBeVisible();
      expect(screen.getByRole('button', { name: /reload page/i })).not.toBeDisabled();

      await user.click(screen.getByRole('button', { name: /try again/i }));
      expect(
        await screen.findByRole('heading', { level: 1, name: /back online content/i }),
      ).toBeVisible();
    });

    it('reacts to an offline event after an online chunk error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const BrokenPage = lazyWithRecovery(
        async () => {
          throw new TypeError('Failed to fetch dynamically imported module');
        },
        { maxRetries: 0 },
      );

      renderWithProviders(
        <RouteBoundary variant="content">
          <BrokenPage />
        </RouteBoundary>,
        ['/online-then-offline'],
      );

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: /unable to load the latest page version/i,
        }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: /reload page/i })).not.toBeDisabled();

      setNavigatorOnline(false);
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(
        await screen.findByRole('heading', { level: 1, name: /you appear to be offline/i }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeDisabled();
    });
  });

  describe('keyboard operation and accessibility semantics', () => {
    it('focuses recovery heading and supports full keyboard retry activation', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      let attempts = 0;

      const RecoverablePage = lazyWithRecovery(
        async () => {
          attempts += 1;
          if (attempts === 1) {
            throw new TypeError('Failed to fetch dynamically imported module');
          }
          return {
            default: () => (
              <section>
                <h1>Keyboard Recovered Page</h1>
              </section>
            ),
          };
        },
        { maxRetries: 0 },
      );

      const { container } = renderWithProviders(
        <Layout>
          <RecoverablePage />
        </Layout>,
        ['/keyboard-recovery'],
      );

      const heading = await screen.findByRole('heading', {
        level: 1,
        name: /unable to load the latest page version/i,
      });
      expect(heading).toHaveFocus();

      const results = await axe(container);
      expect(results.violations).toEqual([]);

      await user.tab();
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /reload page/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: /return home/i })).toHaveFocus();

      await user.tab({ shift: true });
      await user.tab({ shift: true });
      expect(retryButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(
        await screen.findByRole('heading', { level: 1, name: /keyboard recovered page/i }),
      ).toBeVisible();
    });

    it('renders accessible section error fallback with h2 heading and zero axe violations', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const BrokenSection = lazyWithRecovery(
        async () => {
          throw new Error('Section render crashed');
        },
        { maxRetries: 0 },
      );

      const { container } = renderWithProviders(
        <div>
          <header>
            <a href="/">Wraith</a>
          </header>
          <main>
            <h1>Stellar Integration</h1>
            <RouteBoundary variant="section">
              <BrokenSection />
            </RouteBoundary>
          </main>
        </div>,
        ['/stellar'],
      );

      expect(
        await screen.findByRole('heading', {
          level: 2,
          name: /this section could not be loaded/i,
        }),
      ).toBeVisible();

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });
});
