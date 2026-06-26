import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly scrollMargin = '0px';
  readonly thresholds = [0];

  constructor(private readonly callback: IntersectionObserverCallback) {}

  disconnect() {}
  observe(target: Element) {
    this.callback(
      [
        {
          isIntersecting: true,
          target,
          intersectionRatio: 1,
          time: Date.now(),
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
        } as IntersectionObserverEntry,
      ],
      this,
    );
  }
  takeRecords() {
    return [];
  }
  unobserve() {}
}

afterEach(() => cleanup());

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
  callback(performance.now());
  return 0;
});

HTMLCanvasElement.prototype.getContext = vi.fn();

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});
