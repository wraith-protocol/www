/**
 * External link policy: which hosts the site may link to, and how a link to
 * one of them is checked.
 */

import { retry, type RetryPolicy } from './pool.ts';
import { safeRequest, UnsafeDestinationError, type SafeRequestOptions } from './safe-request.ts';

export interface ApprovedHost {
  /** Exact hostname, or `*.example.com` for subdomains of example.com. */
  host: string;
  /** Statuses that still count as reachable, e.g. a bot challenge. */
  acceptStatus?: number[];
  /**
   * Error codes that mean the host refused the request instead of answering it,
   * such as a TLS handshake abort from an egress network it blocks. Links that
   * fail this way are reported as unverifiable, not as broken.
   */
  acceptError?: string[];
  /**
   * Approve links to the host without requesting them, for sites whose answer
   * to an automated client says nothing about the link (login walls, bot blocks).
   */
  skipRequest?: boolean;
  /** Why acceptStatus or skipRequest is needed. Required with either. */
  reason?: string;
}

export interface ExternalLinkResult {
  url: string;
  ok: boolean;
  status?: number;
  finalUrl?: string;
  attempts: number;
  error?: string;
  errorCode?: string;
  /** True when the host refused to answer and an accepted error covered it. */
  unverified?: boolean;
}

const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export function validateApprovedHosts(entries: unknown): ApprovedHost[] {
  if (!Array.isArray(entries)) throw new Error('approvedHosts must be an array');
  return entries.map((entry, index) => {
    const value = entry as ApprovedHost;
    if (typeof value?.host !== 'string' || !/^(\*\.)?[a-z0-9.-]+$/.test(value.host)) {
      throw new Error(`approvedHosts[${index}].host must be a lowercase hostname`);
    }
    if (value.acceptError !== undefined) {
      if (
        !Array.isArray(value.acceptError) ||
        value.acceptError.length === 0 ||
        value.acceptError.some((code) => typeof code !== 'string' || code === '')
      ) {
        throw new Error(
          `approvedHosts[${index}].acceptError must be a non-empty array of error codes`,
        );
      }
    }
    if (
      (value.acceptStatus !== undefined || value.acceptError !== undefined || value.skipRequest) &&
      !value.reason
    ) {
      throw new Error(
        `approvedHosts[${index}] (${value.host}) sets acceptStatus, acceptError or skipRequest without a reason`,
      );
    }
    return value;
  });
}

export function findApprovedHost(
  hostname: string,
  approved: readonly ApprovedHost[],
): ApprovedHost | undefined {
  const host = hostname.toLowerCase();
  return approved.find((entry) =>
    entry.host.startsWith('*.') ? host.endsWith(entry.host.slice(1)) : host === entry.host,
  );
}

function retryAfterMs(value: string | string[] | undefined): number | undefined {
  const header = Array.isArray(value) ? value[0] : value;
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function isTransientError(error: unknown): boolean {
  if (error instanceof UnsafeDestinationError) return false;
  const code = (error as NodeJS.ErrnoException).code;
  const message = (error as Error).message ?? '';
  return (
    ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'EPIPE', 'ENETUNREACH'].includes(
      code ?? '',
    ) || /timed out|socket hang up|EAI_AGAIN/.test(message)
  );
}

/**
 * Checks one approved external link: HEAD first, then GET when HEAD is refused
 * or fails, retrying network errors and transient statuses.
 */
export async function checkExternalLink(
  url: string,
  approved: ApprovedHost,
  policy: RetryPolicy,
  requestOptions: SafeRequestOptions = {},
  request: typeof safeRequest = safeRequest,
): Promise<ExternalLinkResult> {
  const accepted = new Set(approved.acceptStatus ?? []);
  const acceptedErrors = new Set(approved.acceptError ?? []);
  const isOk = (status: number) => (status >= 200 && status < 300) || accepted.has(status);

  const { value, attempts } = await retry<ExternalLinkResult>(async () => {
    try {
      let response = await request(url, { ...requestOptions, method: 'HEAD' });
      if (!isOk(response.status)) {
        // Plenty of servers answer HEAD with 403, 404 or 405 but serve GET fine.
        response = await request(url, { ...requestOptions, method: 'GET' });
      }
      const result: ExternalLinkResult = {
        url,
        ok: isOk(response.status),
        status: response.status,
        finalUrl: response.url,
        attempts: 0,
      };
      if (!result.ok && TRANSIENT_STATUSES.has(response.status)) {
        return {
          done: false,
          value: result,
          delayMs: retryAfterMs(response.headers['retry-after']),
        };
      }
      return { done: true, value: result };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const result: ExternalLinkResult = {
        url,
        ok: false,
        attempts: 0,
        error: (error as Error).message,
        errorCode: code,
      };
      if (code !== undefined && acceptedErrors.has(code)) {
        return { done: true, value: { ...result, ok: true, unverified: true } };
      }
      return isTransientError(error)
        ? { done: false, value: result }
        : { done: true, value: result };
    }
  }, policy);

  return { ...value, attempts };
}
