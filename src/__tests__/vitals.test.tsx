import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { axe } from 'vitest-axe';
import App from '../App';
import { isDNTEnabled, useVitals } from '../hooks/useVitals';
import * as analytics from '../analytics';
import { renderHook, act } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';

describe('DNT Helper & Web Vitals Hook', () => {
  const originalNavigator = window.navigator;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects Do-Not-Track when navigator.doNotTrack is "1"', () => {
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, doNotTrack: '1' },
      configurable: true,
    });
    expect(isDNTEnabled()).toBe(true);
  });

  it('detects Do-Not-Track when navigator.doNotTrack is "0"', () => {
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, doNotTrack: '0' },
      configurable: true,
    });
    expect(isDNTEnabled()).toBe(false);
  });

  it('suppresses tracking telemetry when DNT is enabled', () => {
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, doNotTrack: '1' },
      configurable: true,
    });
    const trackSpy = vi.spyOn(analytics, 'trackEvent');

    const { result } = renderHook(() => useVitals());
    act(() => {
      result.current.recordVital('LCP', 1.2, '/');
    });

    expect(trackSpy).not.toHaveBeenCalled();
    expect(result.current.recordedVitals.length).toBe(1);
    expect(result.current.recordedVitals[0]!.metric).toBe('LCP');
  });

  it('dispatches tracking telemetry event when DNT is disabled', () => {
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, doNotTrack: '0' },
      configurable: true,
    });
    const trackSpy = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => {});

    const { result } = renderHook(() => useVitals());
    act(() => {
      result.current.recordVital('INP', 45, '/');
    });

    expect(trackSpy).toHaveBeenCalledWith('Web Vital', {
      props: {
        metric: 'INP',
        value: 45,
        rating: 'good',
        page: '/',
      },
    });
  });
});

describe('Web Vitals Dashboard Page (/vitals)', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/vitals');
  });

  it('renders the Web Vitals dashboard title and DNT badge', async () => {
    render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: /web vitals dashboard/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/dnt respected/i)).toBeInTheDocument();
  });

  it('displays summary cards for LCP, INP, and CLS', async () => {
    render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );

    await screen.findByRole('heading', { name: /web vitals dashboard/i, level: 1 });

    expect(screen.getAllByText('Largest Contentful Paint').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Interaction to Next Paint').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cumulative Layout Shift').length).toBeGreaterThanOrEqual(1);
  });

  it('allows metric tab switching and page selection filter', async () => {
    const user = userEvent.setup();
    render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );

    await screen.findByRole('heading', { name: /web vitals dashboard/i, level: 1 });

    // Switch metric tab to INP
    const inpTab = screen.getByRole('tab', { name: 'INP' });
    await user.click(inpTab);
    expect(inpTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('heading', { name: /rolling 30-day interaction to next paint/i }),
    ).toBeInTheDocument();

    // Select page filter
    const select = screen.getByLabelText(/page:/i);
    await user.selectOptions(select, '/faq');
    expect((select as HTMLSelectElement).value).toBe('/faq');
  });

  it('documents what each Core Web Vital metric means', async () => {
    render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );

    await screen.findByRole('heading', { name: /web vitals dashboard/i, level: 1 });
    expect(screen.getByText(/understanding core web vitals/i)).toBeInTheDocument();
    expect(screen.getByText(/measures perceived loading speed/i)).toBeInTheDocument();
    expect(screen.getByText(/measures overall page responsiveness/i)).toBeInTheDocument();
    expect(screen.getByText(/measures visual stability/i)).toBeInTheDocument();
  });

  it('passes accessibility checks with no violations', async () => {
    const { container } = render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );

    await screen.findByRole('heading', { name: /web vitals dashboard/i, level: 1 });
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
