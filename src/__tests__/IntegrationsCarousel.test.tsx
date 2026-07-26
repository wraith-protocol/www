import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import IntegrationsCarousel from '../components/IntegrationsCarousel';
import Home from '../pages/Home';
import Ecosystem from '../pages/Ecosystem';
import { featured } from '../data/integrations.json';

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  mockReducedMotion(false);
});

describe('IntegrationsCarousel', () => {
  it('renders featured integration cards that link to /ecosystem/<slug>', () => {
    mockReducedMotion(true);
    render(
      <MemoryRouter>
        <IntegrationsCarousel />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /featured integrations/i })).toBeInTheDocument();

    for (const item of featured) {
      const link = screen.getByRole('link', {
        name: (_name, element) => element.querySelector('h3')?.textContent === item.name,
      });
      expect(link).toHaveAttribute('href', `/ecosystem/${item.slug}`);
    }
  });

  it('shows a static row when prefers-reduced-motion is set', () => {
    mockReducedMotion(true);
    render(
      <MemoryRouter>
        <IntegrationsCarousel />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('integrations-static-row')).toBeInTheDocument();
    expect(screen.queryByTestId('integrations-carousel')).not.toBeInTheDocument();
  });

  it('shows the rotating carousel when motion is allowed', () => {
    mockReducedMotion(false);
    render(
      <MemoryRouter>
        <IntegrationsCarousel />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('integrations-carousel')).toBeInTheDocument();
    expect(screen.queryByTestId('integrations-static-row')).not.toBeInTheDocument();
  });

  it('reserves a fixed min-height to avoid CLS', () => {
    mockReducedMotion(false);
    render(
      <MemoryRouter>
        <IntegrationsCarousel />
      </MemoryRouter>,
    );

    const track = screen.getByTestId('integrations-carousel');
    expect(track.style.minHeight).toBe('188px');
  });

  it('pauses auto-rotation while hovered', () => {
    mockReducedMotion(false);
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <IntegrationsCarousel />
      </MemoryRouter>,
    );

    const track = screen.getByTestId('integrations-carousel');
    const freighterTab = screen.getByRole('tab', { name: /show freighter/i });
    const lobstrTab = screen.getByRole('tab', { name: /show lobstr/i });

    expect(freighterTab).toHaveAttribute('aria-selected', 'true');

    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(lobstrTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.mouseEnter(track);
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(lobstrTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Home integrations strip', () => {
  it('renders the integrations carousel on Home', async () => {
    mockReducedMotion(true);
    render(
      <MemoryRouter>
        <Suspense fallback={null}>
          <Home />
        </Suspense>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: /featured integrations/i }, { timeout: 8000 }),
    ).toBeInTheDocument();
  });
});

describe('Ecosystem partner routes', () => {
  it('resolves each featured partner slug', () => {
    const partner = featured[0]!;
    render(
      <MemoryRouter initialEntries={[`/ecosystem/${partner.slug}`]}>
        <Routes>
          <Route path="/ecosystem/:slug" element={<Ecosystem />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: partner.name })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /visit website/i })).toHaveAttribute(
      'href',
      partner.website,
    );
  });
});
