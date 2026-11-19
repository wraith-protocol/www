import { describe, expect, it, vi } from 'vitest';
import {
  checkExternalLink,
  findApprovedHost,
  validateApprovedHosts,
} from '../../scripts/link-check/external';
import { UnsafeDestinationError, type SafeResponse } from '../../scripts/link-check/safe-request';

const policy = {
  retries: 2,
  baseDelayMs: 10,
  maxDelayMs: 1_000,
  sleep: vi.fn(async () => undefined),
};

function response(status: number, headers: Record<string, string> = {}): SafeResponse {
  return { url: 'https://example.com/', status, headers, redirects: [], address: '93.184.216.34' };
}

describe('checkExternalLink', () => {
  it('falls back to GET when HEAD is refused', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(405))
      .mockResolvedValueOnce(response(200));
    const result = await checkExternalLink(
      'https://example.com/',
      { host: 'example.com' },
      policy,
      {},
      request,
    );
    expect(result).toMatchObject({ ok: true, status: 200, attempts: 1 });
    expect(request.mock.calls.map(([, options]) => options.method)).toEqual(['HEAD', 'GET']);
  });

  it('retries transient statuses and honours Retry-After', async () => {
    const sleep = vi.fn(async () => undefined);
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(503, { 'retry-after': '0.5' }))
      .mockResolvedValueOnce(response(503, { 'retry-after': '0.5' }))
      .mockResolvedValueOnce(response(200));
    const result = await checkExternalLink(
      'https://example.com/',
      { host: 'example.com' },
      { ...policy, sleep },
      {},
      request,
    );
    expect(result).toMatchObject({ ok: true, attempts: 2 });
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it('does not retry a 404', async () => {
    const request = vi.fn().mockResolvedValue(response(404));
    const result = await checkExternalLink(
      'https://example.com/',
      { host: 'example.com' },
      policy,
      {},
      request,
    );
    expect(result).toMatchObject({ ok: false, status: 404, attempts: 1 });
  });

  it('never retries an unsafe destination', async () => {
    const request = vi
      .fn()
      .mockRejectedValue(new UnsafeDestinationError('https://x.test/', 'loopback'));
    const result = await checkExternalLink(
      'https://x.test/',
      { host: 'x.test' },
      policy,
      {},
      request,
    );
    expect(result).toMatchObject({ ok: false, attempts: 1 });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('retries network errors', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('reset'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce(response(200));
    const result = await checkExternalLink(
      'https://example.com/',
      { host: 'example.com' },
      policy,
      {},
      request,
    );
    expect(result).toMatchObject({ ok: true, attempts: 2 });
  });

  it('reports an accepted error as unverifiable instead of broken', async () => {
    const request = vi.fn().mockRejectedValue(
      Object.assign(new Error('write EPROTO tlsv1 alert internal error'), {
        code: 'EPROTO',
      }),
    );
    const approved = {
      host: 'xbull.app',
      acceptError: ['EPROTO'],
      reason: 'TLS abort from CI egress',
    };
    const result = await checkExternalLink('https://xbull.app/', approved, policy, {}, request);
    expect(result).toMatchObject({
      ok: true,
      unverified: true,
      errorCode: 'EPROTO',
      attempts: 1,
    });
  });

  it('accepts documented statuses for a host', async () => {
    const request = vi.fn().mockResolvedValue(response(403));
    const approved = { host: 'www.npmjs.com', acceptStatus: [403], reason: 'bot challenge' };
    const result = await checkExternalLink(
      'https://www.npmjs.com/x',
      approved,
      policy,
      {},
      request,
    );
    expect(result).toMatchObject({ ok: true, status: 403 });
  });
});

describe('approved hosts', () => {
  const hosts = validateApprovedHosts([{ host: 'github.com' }, { host: '*.example.org' }]);

  it('matches exact hosts and wildcard subdomains only', () => {
    expect(findApprovedHost('github.com', hosts)?.host).toBe('github.com');
    expect(findApprovedHost('GitHub.com', hosts)?.host).toBe('github.com');
    expect(findApprovedHost('gist.github.com', hosts)).toBeUndefined();
    expect(findApprovedHost('docs.example.org', hosts)?.host).toBe('*.example.org');
    expect(findApprovedHost('example.org', hosts)).toBeUndefined();
    expect(findApprovedHost('evilexample.org', hosts)).toBeUndefined();
  });

  it('requires a reason for acceptStatus, acceptError and skipRequest', () => {
    expect(() => validateApprovedHosts([{ host: 'a.com', acceptStatus: [403] }])).toThrow(
      /without a reason/,
    );
    expect(() => validateApprovedHosts([{ host: 'a.com', skipRequest: true }])).toThrow(
      /without a reason/,
    );
    expect(() => validateApprovedHosts([{ host: 'a.com', acceptError: ['EPROTO'] }])).toThrow(
      /without a reason/,
    );
    expect(() => validateApprovedHosts([{ host: 'a.com', acceptError: [], reason: 'x' }])).toThrow(
      /non-empty array of error codes/,
    );
    expect(() => validateApprovedHosts([{ host: 'A.com' }])).toThrow(/lowercase hostname/);
  });
});
