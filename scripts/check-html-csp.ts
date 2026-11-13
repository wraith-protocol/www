/**
 * Post-Build HTML and CSP Compatibility Gate
 *
 * Inspects final built HTML and static assets under `dist/` after Vite, CSS
 * inlining, and Open Graph route patching complete.
 *
 * Enforces:
 * • Resource origin compatibility with PAGE_CSP_DIRECTIVES
 * • Strict rejection of `javascript:`, `vbscript:`, and executable `data:` URLs
 * • Strict rejection of inline `on*` event handler attributes and `srcdoc` frames
 * • Strict rejection of insecure `http://` mixed content across HTML and CSS
 * • Exact SHA-256 verification of approved inline `<script>` blocks and the
 *   narrow build-generated inline `<style>` policy emitted by `inline-css.js`
 * • Required document/security metadata, duplicate-tag detection, and SRI integrity
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import {
  APPROVED_INLINE_SCRIPT_HASHES,
  PAGE_CSP_DIRECTIVES,
} from '../src/utils/security-headers.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const defaultDistDir = join(rootDir, 'dist');
const defaultInlinePolicyPath = join(rootDir, 'node_modules', '.tmp', 'csp-inline-policy.json');
const siteOrigin = 'https://usewraith.xyz';

export type ViolationType =
  | 'unapproved-origin'
  | 'javascript-url'
  | 'mixed-content'
  | 'inline-event-handler'
  | 'unapproved-inline-script'
  | 'unapproved-inline-style'
  | 'missing-metadata'
  | 'duplicate-metadata'
  | 'disallowed-element'
  | 'integrity-violation'
  | 'malformed-html';

export interface ValidationViolation {
  readonly file: string;
  readonly type: ViolationType;
  readonly message: string;
}

export interface HtmlValidationResult {
  readonly file: string;
  readonly ok: boolean;
  readonly violations: ValidationViolation[];
  readonly inlineScriptHashes: string[];
  readonly inlineStyleHashes: string[];
}

export interface ParsedCspDirectives {
  readonly defaultSrc: Set<string>;
  readonly scriptSrc: Set<string>;
  readonly styleSrc: Set<string>;
  readonly fontSrc: Set<string>;
  readonly imgSrc: Set<string>;
  readonly connectSrc: Set<string>;
  readonly frameSrc: Set<string>;
  readonly objectSrc: Set<string>;
  readonly baseUri: Set<string>;
  readonly formAction: Set<string>;
}

export interface ValidationOptions {
  readonly approvedScriptHashes?: ReadonlySet<string>;
  readonly approvedStyleHashes?: ReadonlySet<string>;
  readonly cspDirectives?: readonly string[];
}

const SRI_HASH_PATTERN = /^sha(256|384|512)-[A-Za-z0-9+/]+={0,2}$/;

/**
 * Parses CSP directives into per-directive token sets.
 */
export function parseCspDirectives(directives: readonly string[]): ParsedCspDirectives {
  const result: ParsedCspDirectives = {
    defaultSrc: new Set<string>(),
    scriptSrc: new Set<string>(),
    styleSrc: new Set<string>(),
    fontSrc: new Set<string>(),
    imgSrc: new Set<string>(),
    connectSrc: new Set<string>(),
    frameSrc: new Set<string>(),
    objectSrc: new Set<string>(),
    baseUri: new Set<string>(),
    formAction: new Set<string>(),
  };

  for (const rawDirective of directives) {
    const tokens = rawDirective.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const name = tokens[0] ?? '';
    const sources = tokens.slice(1);

    switch (name) {
      case 'default-src':
        sources.forEach((s) => result.defaultSrc.add(s));
        break;
      case 'script-src':
        sources.forEach((s) => result.scriptSrc.add(s));
        break;
      case 'style-src':
        sources.forEach((s) => result.styleSrc.add(s));
        break;
      case 'font-src':
        sources.forEach((s) => result.fontSrc.add(s));
        break;
      case 'img-src':
        sources.forEach((s) => result.imgSrc.add(s));
        break;
      case 'connect-src':
        sources.forEach((s) => result.connectSrc.add(s));
        break;
      case 'frame-src':
        sources.forEach((s) => result.frameSrc.add(s));
        break;
      case 'object-src':
        sources.forEach((s) => result.objectSrc.add(s));
        break;
      case 'base-uri':
        sources.forEach((s) => result.baseUri.add(s));
        break;
      case 'form-action':
        sources.forEach((s) => result.formAction.add(s));
        break;
    }
  }

  return result;
}

/**
 * Computes a CSP-formatted SHA-256 digest (`sha256-<base64>`).
 */
export function computeSha256(content: string): string {
  const hash = createHash('sha256').update(content, 'utf8').digest('base64');
  return `sha256-${hash}`;
}

/**
 * Loads the narrow build-generated inline CSS hash policy emitted by
 * `scripts/inline-css.js`.
 */
export function loadGeneratedInlineStyleHashes(
  policyPath: string = defaultInlinePolicyPath,
): Set<string> {
  if (!existsSync(policyPath)) {
    return new Set<string>();
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(policyPath, 'utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'inlineStyleHashes' in parsed &&
      Array.isArray((parsed as { inlineStyleHashes: unknown }).inlineStyleHashes)
    ) {
      const hashes = (parsed as { inlineStyleHashes: unknown[] }).inlineStyleHashes.filter(
        (item): item is string => typeof item === 'string' && SRI_HASH_PATTERN.test(item),
      );
      return new Set<string>(hashes);
    }
  } catch {
    return new Set<string>();
  }
  return new Set<string>();
}

function stripControlWhitespace(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code > 0x20) {
      out += value[i];
    }
  }
  return out;
}

function isDangerousExecutableScheme(rawUrl: string): boolean {
  const compact = stripControlWhitespace(rawUrl).toLowerCase();
  return (
    compact.startsWith('javascript:') ||
    compact.startsWith('vbscript:') ||
    compact.startsWith('data:text/html') ||
    compact.startsWith('data:application/javascript') ||
    compact.startsWith('data:text/javascript')
  );
}

/**
 * Checks if a resource URL is allowed under a CSP directive's source set,
 * falling back to `default-src` when `sources` is empty per the CSP spec.
 */
export function isUrlAllowedUnderDirective(
  url: string,
  sources: Set<string>,
  fallbackSources: Set<string>,
): { allowed: boolean; reason?: string } {
  const trimmed = url.trim();
  const effectiveSources = sources.size > 0 ? sources : fallbackSources;

  if (isDangerousExecutableScheme(trimmed)) {
    return { allowed: false, reason: 'Disallowed executable URL scheme' };
  }

  const lower = trimmed.toLowerCase();

  if (lower.startsWith('http://') || lower.startsWith('//')) {
    return {
      allowed: false,
      reason: 'Insecure http:// or protocol-relative URL not allowed',
    };
  }

  if (effectiveSources.has("'none'")) {
    return { allowed: false, reason: "Directive explicitly sets 'none'" };
  }

  if (lower.startsWith('#')) {
    return { allowed: true };
  }

  if (lower.startsWith('data:')) {
    if (effectiveSources.has('data:') || effectiveSources.has("'data:'")) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'data: URI not allowed by directive' };
  }

  if (lower.startsWith('blob:')) {
    if (effectiveSources.has('blob:') || effectiveSources.has("'blob:'")) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'blob: URI not allowed by directive' };
  }

  if (!lower.startsWith('https://') && !lower.includes('://')) {
    if (effectiveSources.has("'self'")) {
      return { allowed: true };
    }
    return { allowed: false, reason: "'self' not permitted by directive" };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return { allowed: false, reason: `Disallowed protocol ${parsed.protocol}` };
    }

    const origin = parsed.origin;
    if (origin === siteOrigin) {
      if (effectiveSources.has("'self'") || effectiveSources.has(siteOrigin)) {
        return { allowed: true };
      }
    }

    if (effectiveSources.has(origin)) {
      return { allowed: true };
    }

    for (const src of effectiveSources) {
      if (src.startsWith('https://*.')) {
        const domainSuffix = src.slice('https://*.'.length);
        if (parsed.hostname.endsWith(`.${domainSuffix}`)) {
          return { allowed: true };
        }
      }
    }

    return { allowed: false, reason: `Origin ${origin} is not in directive allowlist` };
  } catch {
    return { allowed: false, reason: 'Malformed URL' };
  }
}

/**
 * Inspects CSS content (from `<style>`, `style=""` attributes, or `.css` assets)
 * for dangerous legacy expressions, `@import` rules, mixed content, and
 * unapproved `url(...)` origins.
 */
export function inspectCssContent(
  css: string,
  filePath: string,
  csp: ParsedCspDirectives,
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  if (/expression\s*\(|-moz-binding\s*:/i.test(css)) {
    violations.push({
      file: filePath,
      type: 'unapproved-inline-style',
      message: 'Unsafe CSS expression() or -moz-binding detected',
    });
  }

  const importRegex = /@import\s+(?:url\(\s*)?(['"]?)([^'")\s;]+)\1\s*\)?/gi;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(css)) !== null) {
    const target = (match[2] ?? '').trim();
    if (!target) continue;
    if (isDangerousExecutableScheme(target)) {
      violations.push({
        file: filePath,
        type: 'javascript-url',
        message: `Dangerous URL in CSS @import: "${target}"`,
      });
    } else if (target.toLowerCase().startsWith('http://')) {
      violations.push({
        file: filePath,
        type: 'mixed-content',
        message: `Mixed content http:// URL in CSS @import: "${target}"`,
      });
    } else {
      const check = isUrlAllowedUnderDirective(target, csp.styleSrc, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `CSS @import "${target}" violates style-src: ${check.reason}`,
        });
      }
    }
  }

  const urlRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  while ((match = urlRegex.exec(css)) !== null) {
    const rawTarget = (match[2] ?? '').trim();
    if (!rawTarget || rawTarget.startsWith('#')) continue;

    if (isDangerousExecutableScheme(rawTarget)) {
      violations.push({
        file: filePath,
        type: 'javascript-url',
        message: `Dangerous URL in CSS url(): "${rawTarget}"`,
      });
      continue;
    }

    if (rawTarget.toLowerCase().startsWith('http://')) {
      violations.push({
        file: filePath,
        type: 'mixed-content',
        message: `Mixed content http:// URL in CSS url(): "${rawTarget}"`,
      });
      continue;
    }

    const allowedAsImg = isUrlAllowedUnderDirective(rawTarget, csp.imgSrc, csp.defaultSrc);
    const allowedAsFont = isUrlAllowedUnderDirective(rawTarget, csp.fontSrc, csp.defaultSrc);
    if (!allowedAsImg.allowed && !allowedAsFont.allowed) {
      violations.push({
        file: filePath,
        type: 'unapproved-origin',
        message: `CSS url("${rawTarget}") is not permitted by img-src or font-src`,
      });
    }
  }

  return violations;
}

function parseSrcsetUrls(srcset: string): string[] {
  return srcset
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean);
}

function validateSriIntegrity(
  el: Element,
  tagLabel: string,
  filePath: string,
): ValidationViolation[] {
  const integrity = el.getAttribute('integrity');
  if (integrity === null) return [];

  const violations: ValidationViolation[] = [];
  const tokens = integrity.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || !tokens.every((t) => SRI_HASH_PATTERN.test(t))) {
    violations.push({
      file: filePath,
      type: 'integrity-violation',
      message: `Malformed Subresource Integrity hash on ${tagLabel}: "${integrity}"`,
    });
  }

  const refUrl = el.getAttribute('src') ?? el.getAttribute('href') ?? '';
  if (refUrl.startsWith('https://') && !refUrl.startsWith(siteOrigin)) {
    if (!el.hasAttribute('crossorigin')) {
      violations.push({
        file: filePath,
        type: 'integrity-violation',
        message: `External ${tagLabel} with integrity attribute is missing required crossorigin attribute`,
      });
    }
  }

  return violations;
}

/**
 * Validates a final HTML document against CSP and post-build security invariants.
 */
export function validateHtml(
  html: string,
  filePath = 'index.html',
  options?: ValidationOptions,
): HtmlValidationResult {
  const violations: ValidationViolation[] = [];
  const inlineScriptHashes: string[] = [];
  const inlineStyleHashes: string[] = [];

  const approvedScripts =
    options?.approvedScriptHashes ?? new Set<string>(APPROVED_INLINE_SCRIPT_HASHES);
  const approvedStyles = options?.approvedStyleHashes;
  const csp = parseCspDirectives(options?.cspDirectives ?? PAGE_CSP_DIRECTIVES);

  if (!/^\s*<!doctype\s+html\s*>/i.test(html)) {
    violations.push({
      file: filePath,
      type: 'malformed-html',
      message: 'Missing required <!doctype html> declaration',
    });
  }

  const openScripts = (html.match(/<script\b/gi) ?? []).length;
  const closeScripts = (html.match(/<\/script\s*>/gi) ?? []).length;
  if (openScripts !== closeScripts) {
    violations.push({
      file: filePath,
      type: 'malformed-html',
      message: `Unbalanced <script> tags (${openScripts} opening vs ${closeScripts} closing)`,
    });
  }

  const openStyles = (html.match(/<style\b/gi) ?? []).length;
  const closeStyles = (html.match(/<\/style\s*>/gi) ?? []).length;
  if (openStyles !== closeStyles) {
    violations.push({
      file: filePath,
      type: 'malformed-html',
      message: `Unbalanced <style> tags (${openStyles} opening vs ${closeStyles} closing)`,
    });
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const htmlEl = doc.documentElement;
  if (!htmlEl || !htmlEl.getAttribute('lang')?.trim()) {
    violations.push({
      file: filePath,
      type: 'missing-metadata',
      message: 'Missing required lang attribute on <html> element',
    });
  }

  const charsetMeta = doc.querySelectorAll('meta[charset]');
  const httpEquivCharset = doc.querySelectorAll('meta[http-equiv="Content-Type" i]');
  if (charsetMeta.length === 0 && httpEquivCharset.length === 0) {
    violations.push({
      file: filePath,
      type: 'missing-metadata',
      message: 'Missing required security metadata: <meta charset="UTF-8">',
    });
  } else if (charsetMeta.length > 1) {
    violations.push({
      file: filePath,
      type: 'duplicate-metadata',
      message: `Duplicate charset metadata found (${charsetMeta.length} occurrences)`,
    });
  } else if (charsetMeta.length === 1) {
    const val = charsetMeta[0]?.getAttribute('charset')?.toUpperCase();
    if (val !== 'UTF-8') {
      violations.push({
        file: filePath,
        type: 'missing-metadata',
        message: `Charset must be UTF-8 (found ${val})`,
      });
    }
  }

  const viewports = doc.querySelectorAll('meta[name="viewport" i]');
  if (viewports.length === 0) {
    violations.push({
      file: filePath,
      type: 'missing-metadata',
      message: 'Missing required security metadata: <meta name="viewport">',
    });
  } else if (viewports.length > 1) {
    violations.push({
      file: filePath,
      type: 'duplicate-metadata',
      message: `Duplicate viewport meta tag found (${viewports.length} occurrences)`,
    });
  }

  const titles = doc.querySelectorAll('title');
  if (titles.length === 0 || !titles[0]?.textContent?.trim()) {
    violations.push({
      file: filePath,
      type: 'missing-metadata',
      message: 'Missing non-empty <title> tag',
    });
  } else if (titles.length > 1) {
    violations.push({
      file: filePath,
      type: 'duplicate-metadata',
      message: `Duplicate <title> tag found (${titles.length} occurrences)`,
    });
  }

  const descriptions = doc.querySelectorAll('meta[name="description" i]');
  if (descriptions.length > 1) {
    violations.push({
      file: filePath,
      type: 'duplicate-metadata',
      message: `Duplicate <meta name="description"> tag found (${descriptions.length} occurrences)`,
    });
  }

  const canonicals = doc.querySelectorAll('link[rel="canonical" i]');
  if (canonicals.length > 1) {
    violations.push({
      file: filePath,
      type: 'duplicate-metadata',
      message: `Duplicate canonical link found (${canonicals.length} occurrences)`,
    });
  }

  const ogUrls = doc.querySelectorAll('meta[property="og:url" i]');
  if (ogUrls.length > 1) {
    violations.push({
      file: filePath,
      type: 'duplicate-metadata',
      message: `Duplicate <meta property="og:url"> tag found (${ogUrls.length} occurrences)`,
    });
  }

  const metaRefresh = doc.querySelectorAll('meta[http-equiv="refresh" i]');
  if (metaRefresh.length > 0) {
    violations.push({
      file: filePath,
      type: 'disallowed-element',
      message: 'Disallowed <meta http-equiv="refresh"> client redirect tag found',
    });
  }

  const metaCsp = doc.querySelectorAll('meta[http-equiv="Content-Security-Policy" i]');
  if (metaCsp.length > 0) {
    violations.push({
      file: filePath,
      type: 'integrity-violation',
      message:
        'Unexpected <meta http-equiv="Content-Security-Policy"> found; CSP is governed by HTTP headers',
    });
  }

  const objects = doc.querySelectorAll('object, embed, applet');
  if (objects.length > 0) {
    violations.push({
      file: filePath,
      type: 'disallowed-element',
      message: `Found disallowed plugin element violating object-src 'none' (${objects.length} occurrences)`,
    });
  }

  const allElements = doc.querySelectorAll('*');
  for (const el of allElements) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value;

      if (name.startsWith('on')) {
        violations.push({
          file: filePath,
          type: 'inline-event-handler',
          message: `Inline event handler detected on <${el.tagName.toLowerCase()} ${name}="${val}">`,
        });
      }

      if (name === 'srcdoc') {
        violations.push({
          file: filePath,
          type: 'unapproved-inline-script',
          message: `Disallowed inline iframe srcdoc attribute on <${el.tagName.toLowerCase()}>`,
        });
      }

      if (name === 'style') {
        violations.push(...inspectCssContent(val, filePath, csp));
      }

      if (name !== 'xmlns' && !name.startsWith('xmlns:') && isDangerousExecutableScheme(val)) {
        violations.push({
          file: filePath,
          type: 'javascript-url',
          message: `Dangerous executable URL found in <${el.tagName.toLowerCase()} ${name}="${val}">`,
        });
      }

      if (
        (name === 'src' ||
          name === 'href' ||
          name === 'xlink:href' ||
          name === 'action' ||
          name === 'formaction' ||
          name === 'poster' ||
          name === 'data') &&
        val.trim().toLowerCase().startsWith('http://')
      ) {
        violations.push({
          file: filePath,
          type: 'mixed-content',
          message: `Insecure mixed content http:// URL found in <${el.tagName.toLowerCase()} ${name}="${val}">`,
        });
      }
    }
  }

  const scripts = doc.querySelectorAll('script');
  for (const script of scripts) {
    violations.push(...validateSriIntegrity(script, '<script>', filePath));

    const src = script.getAttribute('src');
    if (src !== null) {
      const check = isUrlAllowedUnderDirective(src, csp.scriptSrc, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `Script src "${src}" violates script-src directive: ${check.reason}`,
        });
      }
      if ((script.textContent ?? '').trim().length > 0) {
        violations.push({
          file: filePath,
          type: 'integrity-violation',
          message: `External <script src="${src}"> must not also contain inline script content`,
        });
      }
    } else {
      const type = script.getAttribute('type')?.toLowerCase();
      if (type === 'application/ld+json') {
        const rawJson = script.textContent ?? '';
        try {
          JSON.parse(rawJson);
        } catch (err) {
          violations.push({
            file: filePath,
            type: 'unapproved-inline-script',
            message: `Malformed JSON-LD content in script: ${(err as Error).message}`,
          });
        }
      } else {
        const content = script.textContent ?? '';
        const hash = computeSha256(content);
        inlineScriptHashes.push(hash);

        if (!approvedScripts.has(hash)) {
          violations.push({
            file: filePath,
            type: 'unapproved-inline-script',
            message: `Unapproved inline script (${hash}) not in APPROVED_INLINE_SCRIPT_HASHES`,
          });
        }
      }
    }
  }

  const styles = doc.querySelectorAll('style');
  for (const style of styles) {
    const content = style.textContent ?? '';
    const hash = computeSha256(content);
    inlineStyleHashes.push(hash);

    violations.push(...inspectCssContent(content, filePath, csp));

    if (approvedStyles !== undefined) {
      if (!approvedStyles.has(hash)) {
        violations.push({
          file: filePath,
          type: 'unapproved-inline-style',
          message: `Inline style (${hash}) does not match narrow generated build policy`,
        });
      }
    } else {
      const isTailwindBuildBundle =
        content.includes('tailwindcss') &&
        (content.includes('--color-surface') || content.includes('@layer'));
      if (!isTailwindBuildBundle) {
        violations.push({
          file: filePath,
          type: 'unapproved-inline-style',
          message: `Unapproved inline style detected (${hash})`,
        });
      }
    }
  }

  const links = doc.querySelectorAll('link');
  for (const link of links) {
    violations.push(...validateSriIntegrity(link, '<link>', filePath));

    const href = link.getAttribute('href');
    if (!href) continue;

    const rel = link.getAttribute('rel')?.toLowerCase() ?? '';
    const as = link.getAttribute('as')?.toLowerCase() ?? '';

    if (rel === 'stylesheet' || (rel === 'preload' && as === 'style')) {
      const check = isUrlAllowedUnderDirective(href, csp.styleSrc, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `Stylesheet link href "${href}" violates style-src directive: ${check.reason}`,
        });
      }
    } else if (rel === 'preload' && as === 'font') {
      const check = isUrlAllowedUnderDirective(href, csp.fontSrc, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `Font preload href "${href}" violates font-src directive: ${check.reason}`,
        });
      }
    } else if (rel === 'modulepreload' || (rel === 'preload' && as === 'script')) {
      const check = isUrlAllowedUnderDirective(href, csp.scriptSrc, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `Script modulepreload href "${href}" violates script-src directive: ${check.reason}`,
        });
      }
    } else if (rel.includes('icon') || (rel === 'preload' && as === 'image')) {
      const check = isUrlAllowedUnderDirective(href, csp.imgSrc, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `Image/icon link href "${href}" violates img-src directive: ${check.reason}`,
        });
      }
    } else if (rel === 'manifest') {
      const check = isUrlAllowedUnderDirective(href, csp.defaultSrc, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `Manifest link href "${href}" violates default-src directive: ${check.reason}`,
        });
      }
    }
  }

  const mediaElements = doc.querySelectorAll('img, source');
  for (const media of mediaElements) {
    const src = media.getAttribute('src');
    if (src) {
      const check = isUrlAllowedUnderDirective(src, csp.imgSrc, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `<${media.tagName.toLowerCase()}> src "${src}" violates img-src directive: ${check.reason}`,
        });
      }
    }

    const srcset = media.getAttribute('srcset');
    if (srcset) {
      for (const candidateUrl of parseSrcsetUrls(srcset)) {
        if (isDangerousExecutableScheme(candidateUrl)) {
          violations.push({
            file: filePath,
            type: 'javascript-url',
            message: `Dangerous URL "${candidateUrl}" in srcset attribute`,
          });
        } else if (candidateUrl.toLowerCase().startsWith('http://')) {
          violations.push({
            file: filePath,
            type: 'mixed-content',
            message: `Mixed content http:// URL "${candidateUrl}" in srcset attribute`,
          });
        } else {
          const check = isUrlAllowedUnderDirective(candidateUrl, csp.imgSrc, csp.defaultSrc);
          if (!check.allowed) {
            violations.push({
              file: filePath,
              type: 'unapproved-origin',
              message: `srcset URL "${candidateUrl}" violates img-src directive: ${check.reason}`,
            });
          }
        }
      }
    }
  }

  const iframes = doc.querySelectorAll('iframe, frame');
  for (const frame of iframes) {
    const src = frame.getAttribute('src');
    if (src) {
      const check = isUrlAllowedUnderDirective(src, csp.frameSrc, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `Frame src "${src}" violates frame-src/default-src directive: ${check.reason}`,
        });
      }
    }
  }

  const forms = doc.querySelectorAll('form');
  for (const form of forms) {
    const action = form.getAttribute('action');
    if (action) {
      const check = isUrlAllowedUnderDirective(action, csp.formAction, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `Form action "${action}" violates form-action directive: ${check.reason}`,
        });
      }
    }
  }

  const base = doc.querySelector('base');
  if (base) {
    const href = base.getAttribute('href');
    if (href) {
      const check = isUrlAllowedUnderDirective(href, csp.baseUri, csp.defaultSrc);
      if (!check.allowed) {
        violations.push({
          file: filePath,
          type: 'unapproved-origin',
          message: `Base href "${href}" violates base-uri directive: ${check.reason}`,
        });
      }
    }
  }

  return {
    file: filePath,
    ok: violations.length === 0,
    violations,
    inlineScriptHashes,
    inlineStyleHashes,
  };
}

/**
 * Recursively finds files matching a predicate under `dir`.
 */
export function findFilesByExtension(dir: string, extension: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  const entries = readdirSync(dir).sort();
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...findFilesByExtension(full, extension));
    } else if (entry.endsWith(extension)) {
      results.push(full);
    }
  }
  return results;
}

export function findHtmlFiles(dir: string): string[] {
  return findFilesByExtension(dir, '.html');
}

/**
 * Validates built static CSS and SVG assets in `dist/` for unsafe inline
 * execution, mixed content, and unapproved external origins.
 */
export function validateBuiltAssets(
  targetDistDir: string = defaultDistDir,
  directives: readonly string[] = PAGE_CSP_DIRECTIVES,
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const csp = parseCspDirectives(directives);

  for (const cssFile of findFilesByExtension(targetDistDir, '.css')) {
    const relative = cssFile.replace(`${rootDir}/`, '');
    const css = readFileSync(cssFile, 'utf8');
    violations.push(...inspectCssContent(css, relative, csp));
  }

  for (const svgFile of findFilesByExtension(targetDistDir, '.svg')) {
    const relative = svgFile.replace(`${rootDir}/`, '');
    const rawSvg = readFileSync(svgFile, 'utf8');
    const dom = new JSDOM(rawSvg, { contentType: 'image/svg+xml' });
    const doc = dom.window.document;

    if (doc.querySelectorAll('script, foreignObject').length > 0) {
      violations.push({
        file: relative,
        type: 'unapproved-inline-script',
        message: 'Built SVG asset contains disallowed <script> or <foreignObject> element',
      });
    }

    for (const el of doc.querySelectorAll('*')) {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) {
          violations.push({
            file: relative,
            type: 'inline-event-handler',
            message: `Inline event handler "${name}" found inside SVG asset`,
          });
        }
        if (
          name !== 'xmlns' &&
          !name.startsWith('xmlns:') &&
          isDangerousExecutableScheme(attr.value)
        ) {
          violations.push({
            file: relative,
            type: 'javascript-url',
            message: `Executable URL found inside SVG asset attribute ${name}="${attr.value}"`,
          });
        }
      }
    }
  }

  return violations;
}

export function main(): void {
  console.log('Running Post-Build HTML & CSP Compatibility Gate...');

  if (!existsSync(defaultDistDir)) {
    console.error('dist/ directory does not exist! Run `pnpm build` first.');
    process.exit(1);
  }

  const htmlFiles = findHtmlFiles(defaultDistDir);
  if (htmlFiles.length === 0) {
    console.error('No HTML files found in dist/! Run `pnpm build` first.');
    process.exit(1);
  }

  const generatedStyleHashes = loadGeneratedInlineStyleHashes();
  const options: ValidationOptions = {
    approvedScriptHashes: new Set<string>(APPROVED_INLINE_SCRIPT_HASHES),
    approvedStyleHashes: generatedStyleHashes.size > 0 ? generatedStyleHashes : undefined,
  };

  let totalViolations = 0;
  const uniqueScriptHashes = new Set<string>();
  const uniqueStyleHashes = new Set<string>();

  for (const filePath of htmlFiles) {
    const relative = filePath.replace(`${rootDir}/`, '');
    const html = readFileSync(filePath, 'utf8');
    const result = validateHtml(html, relative, options);

    result.inlineScriptHashes.forEach((h) => uniqueScriptHashes.add(h));
    result.inlineStyleHashes.forEach((h) => uniqueStyleHashes.add(h));

    if (!result.ok) {
      totalViolations += result.violations.length;
      console.error(`\nViolations found in ${relative}:`);
      for (const v of result.violations) {
        console.error(`  - [${v.type}] ${v.message}`);
      }
    } else {
      console.log(`  ok  ${relative}`);
    }
  }

  const assetViolations = validateBuiltAssets(defaultDistDir);
  if (assetViolations.length > 0) {
    totalViolations += assetViolations.length;
    console.error('\nViolations found in built static assets:');
    for (const v of assetViolations) {
      console.error(`  - ${v.file}: [${v.type}] ${v.message}`);
    }
  }

  if (totalViolations > 0) {
    console.error(`\nCSP & HTML gate failed with ${totalViolations} violation(s).`);
    process.exit(1);
  }

  console.log('\nCSP & HTML compatibility gate passed:');
  console.log(`  - HTML files verified: ${htmlFiles.length}`);
  console.log(`  - Inline script SHA-256 digests: ${Array.from(uniqueScriptHashes).join(', ')}`);
  console.log(`  - Inline style SHA-256 digests: ${Array.from(uniqueStyleHashes).join(', ')}`);
}

const argv1 = process.argv[1];
const isMain =
  typeof argv1 === 'string' &&
  (import.meta.url === pathToFileURL(argv1).href ||
    fileURLToPath(import.meta.url) === resolve(argv1));

if (isMain) {
  main();
}
