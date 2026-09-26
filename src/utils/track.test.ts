import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { track, trackOutbound } from './track';
import * as analytics from '../analytics';

describe('track (typed analytics helper)', () => {
  const originalNavigator = window.navigator;

  beforeEach(() => {
    vi.spyOn(analytics, 'trackEvent').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  function setDNT(value: string | null) {
    Object.defineProperty(window, 'navigator', {
      value: { ...originalNavigator, doNotTrack: value },
      configurable: true,
    });
  }

  it('forwards a named event with flat props to the analytics endpoint', () => {
    setDNT('0');
    track('cta_click', { source: 'hero-docs' });

    expect(analytics.trackEvent).toHaveBeenCalledWith('cta_click', {
      props: { source: 'hero-docs' },
    });
  });

  it('drops explicitly undefined optional fields from the payload', () => {
    setDNT('0');
    track('blog_post_read', { slug: 'wave-7-kickoff' });

    expect(analytics.trackEvent).toHaveBeenCalledWith('blog_post_read', {
      props: { slug: 'wave-7-kickoff' },
    });
  });

  it('preserves union-typed payload fields such as sort direction', () => {
    setDNT('0');
    track('chain_matrix_sort', { column: 'latency', direction: 'desc' });

    expect(analytics.trackEvent).toHaveBeenCalledWith('chain_matrix_sort', {
      props: { column: 'latency', direction: 'desc' },
    });
  });

  it('suppresses all events when Do-Not-Track is enabled', () => {
    setDNT('1');
    track('cta_click', { source: 'hero-docs' });
    track('newsletter_submit', { source: 'newsletter-page' });

    expect(analytics.trackEvent).not.toHaveBeenCalled();
  });

  it('dispatches events when Do-Not-Track is disabled', () => {
    setDNT('0');
    track('newsletter_confirm', { source: 'newsletter-page' });

    expect(analytics.trackEvent).toHaveBeenCalledOnce();
  });

  it('trackOutbound emits exactly one outbound_click with the category', () => {
    setDNT('0');
    const handler = trackOutbound('github');
    handler();

    expect(analytics.trackEvent).toHaveBeenCalledWith('outbound_click', {
      props: { category: 'github' },
    });
  });

  it('trackOutbound is suppressed when Do-Not-Track is enabled', () => {
    setDNT('1');
    const handler = trackOutbound('docs');
    handler();

    expect(analytics.trackEvent).not.toHaveBeenCalled();
  });
});
