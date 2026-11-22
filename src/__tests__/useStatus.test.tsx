import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStatus, validateStatusResponse } from '../hooks/useStatus';
import { clearSafeClientCache, SafeClientError } from '../utils/safeClient';

const STATUS_URL = 'https://status.example.test/api';

const stellarComponent = {
  id: 'stellar',
  name: 'Stellar Network',
  status: 'operational',
  uptime90Days: [1, 1, 0.5],
  latencyMs: 120,
};

const gatewayComponent = {
  id: 'gateway',
  name: 'API Gateway',
  status: 'degraded',
  uptime90Days: [1, 1, 1],
  latencyMs: 240,
};

function statusResponse() {
  return { components: [stellarComponent, gatewayComponent] };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

function Probe() {
  const { data, loading, error, stale, lastUpdated } = useStatus();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="stale">{String(stale)}</span>
      <span data-testid="components">{data ? String(data.components.length) : 'none'}</span>
      <span data-testid="overall">{data?.overall ?? 'none'}</span>
      <span data-testid="updated">{lastUpdated ?? 'none'}</span>
    </div>
  );
}

beforeEach(() => {
  clearSafeClientCache();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('validateStatusResponse', () => {
  it('accepts a valid status payload with a Stellar component', () => {
    expect(validateStatusResponse(statusResponse())).toHaveLength(2);
  });

  it('rejects a payload with no components array', () => {
    expect(() => validateStatusResponse({})).toThrow(SafeClientError);
    expect(() => validateStatusResponse({ components: 'nope' })).toThrow(SafeClientError);
  });

  it('rejects a payload with no Stellar component', () => {
    expect(() => validateStatusResponse({ components: [gatewayComponent] })).toThrow(
      SafeClientError,
    );
  });

  it('rejects a component with an invalid status or bad fields', () => {
    expect(() =>
      validateStatusResponse({
        components: [{ ...stellarComponent, status: 'unknown' }],
      }),
    ).toThrow(SafeClientError);
    expect(() =>
      validateStatusResponse({
        components: [{ ...stellarComponent, latencyMs: 'fast' }],
      }),
    ).toThrow(SafeClientError);
    expect(() =>
      validateStatusResponse({
        components: [{ ...stellarComponent, uptime90Days: [1, 'up'] }],
      }),
    ).toThrow(SafeClientError);
  });
});

describe('useStatus', () => {
  it('reports the endpoint as unavailable when no status API is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<Probe />);

    await waitFor(() =>
      expect(screen.getByTestId('error')).toHaveTextContent('Status endpoint unavailable'),
    );
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads and validates status through the shared client', async () => {
    vi.stubEnv('VITE_STATUS_API_URL', STATUS_URL);
    const fetchMock = vi.fn(async () => jsonResponse(statusResponse()));
    vi.stubGlobal('fetch', fetchMock);

    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('components')).toHaveTextContent('2'));
    expect(screen.getByTestId('overall')).toHaveTextContent('degraded');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
    expect(screen.getByTestId('stale')).toHaveTextContent('false');
    expect(screen.getByTestId('updated')).not.toHaveTextContent('none');
    expect(fetchMock).toHaveBeenCalledWith(
      STATUS_URL,
      expect.objectContaining({ credentials: 'omit' }),
    );
  });

  it('keeps last known data marked stale when a later poll fails', async () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_STATUS_API_URL', STATUS_URL);

    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      if (calls === 1) return jsonResponse(statusResponse());
      return jsonResponse({ error: 'boom' }, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Probe />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId('components')).toHaveTextContent('2');
    expect(screen.getByTestId('stale')).toHaveTextContent('false');

    // The 60s poll fails; the stale cache is served instead of blanking the page.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(70_000);
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    expect(screen.getByTestId('components')).toHaveTextContent('2');
    expect(screen.getByTestId('stale')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });
});
