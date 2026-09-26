import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackEvent } from './analytics';

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.plausible;
});

describe('trackEvent', () => {
  it('forwards events when the analytics script is loaded', () => {
    window.plausible = vi.fn();

    trackEvent('cta_click', { props: { source: 'test' } });

    expect(window.plausible).toHaveBeenCalledWith('cta_click', { props: { source: 'test' } });
  });

  it('does not throw before the analytics script loads', () => {
    expect(() => trackEvent('cta_click')).not.toThrow();
  });

  it('does not throw during server-side rendering', () => {
    vi.stubGlobal('window', undefined);

    expect(() => trackEvent('cta_click')).not.toThrow();
  });
});
