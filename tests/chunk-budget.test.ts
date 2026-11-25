import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  analyzeDist,
  CHUNK_ALLOWLIST,
  CHUNK_BUDGET_KB,
  formatBudgetReport,
  ROUTE_FAMILY_BUDGETS,
  ROUTE_TRANSITIVE_KB,
  runCli,
  SHARED_SHELL_BUDGET_KB,
  type ChunkModuleMetadata,
  type TransferBudgetReport,
} from '../scripts/check-chunk-budget.mjs';

interface FixtureManifestEntry {
  key: string;
  file?: string;
  sizeBytes?: number;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
  content?: string;
}

interface FixtureOptions {
  entries: FixtureManifestEntry[];
  extraFiles?: Array<{ path: string; bytes?: number; content?: string }>;
  chunkModules?: Record<string, ChunkModuleMetadata>;
}

interface MutableManifestEntry {
  file?: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
}

const tempDirs: string[] = [];

function trackTempDir(dir: string): string {
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createSpaFixture(options: FixtureOptions): string {
  const tempDir = trackTempDir(mkdtempSync(join(tmpdir(), 'wraith-route-budget-')));
  const distDir = join(tempDir, 'dist');
  const viteDir = join(distDir, '.vite');
  mkdirSync(viteDir, { recursive: true });

  const manifest: Record<string, MutableManifestEntry> = {};

  for (const entry of options.entries) {
    if (entry.file) {
      const absFile = join(distDir, entry.file);
      mkdirSync(dirname(absFile), { recursive: true });
      if (entry.content !== undefined) {
        writeFileSync(absFile, entry.content, 'utf8');
      } else {
        writeFileSync(absFile, Buffer.alloc(entry.sizeBytes ?? 1024, 'a'));
      }
    }

    const record: MutableManifestEntry = {};
    if (entry.file !== undefined) record.file = entry.file;
    if (entry.isEntry !== undefined) record.isEntry = entry.isEntry;
    if (entry.isDynamicEntry !== undefined) record.isDynamicEntry = entry.isDynamicEntry;
    if (entry.imports !== undefined) record.imports = entry.imports;
    if (entry.dynamicImports !== undefined) record.dynamicImports = entry.dynamicImports;
    if (entry.css !== undefined) record.css = entry.css;
    if (entry.assets !== undefined) record.assets = entry.assets;
    manifest[entry.key] = record;
  }

  writeFileSync(join(viteDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  if (options.chunkModules) {
    writeFileSync(
      join(viteDir, 'chunk-modules.json'),
      JSON.stringify(options.chunkModules, null, 2),
    );
  }

  for (const extra of options.extraFiles ?? []) {
    const absPath = join(distDir, extra.path);
    mkdirSync(dirname(absPath), { recursive: true });
    if (extra.content !== undefined) {
      writeFileSync(absPath, extra.content, 'utf8');
    } else {
      writeFileSync(absPath, Buffer.alloc(extra.bytes ?? 1024, 'b'));
    }
  }

  return tempDir;
}

function buildBaselineSpaFixture(overrides?: Partial<FixtureOptions>): string {
  const shellJsBytes = 100 * 1024;
  const i18nJsBytes = 30 * 1024;
  const headerJsBytes = 5 * 1024;
  const shellCssBytes = 20 * 1024;
  const blogJsBytes = 40 * 1024;
  const stellarJsBytes = 12 * 1024;
  const caseStudiesJsBytes = 15 * 1024;
  const caseStudiesDataBytes = 2 * 1024;

  const fontA = 'fonts/space-grotesk-700-normal.woff2';
  const fontB = 'fonts/inter-400-normal.woff2';
  const shellCss = [
    `@font-face{font-family:'Space Grotesk';src:url('/${fontA}') format('woff2');}`,
    `@font-face{font-family:'Inter';src:url('/${fontB}') format('woff2');}`,
    'body{margin:0;}',
  ].join('');
  const paddedShellCss = shellCss.padEnd(shellCssBytes, ' ');

  const indexHtml = [
    '<!doctype html><html><head>',
    `<link rel="preload" href="/${fontA}" as="font" type="font/woff2" crossorigin />`,
    '<link rel="manifest" href="/site.webmanifest" />',
    `<style>${paddedShellCss}</style>`,
    '</head><body><img src="/logo.png" alt="Wraith" /></body></html>',
  ].join('');

  const defaultEntries: FixtureManifestEntry[] = [
    {
      key: '_i18n-abcd1234.js',
      file: 'assets/i18n-abcd1234.js',
      sizeBytes: i18nJsBytes,
    },
    {
      key: '_Header-abcd1234.js',
      file: 'assets/Header-abcd1234.js',
      sizeBytes: headerJsBytes,
      imports: ['_i18n-abcd1234.js'],
    },
    {
      key: '_case-studies-abcd1234.js',
      file: 'assets/case-studies-abcd1234.js',
      sizeBytes: caseStudiesDataBytes,
    },
    {
      key: 'index.html',
      file: 'assets/index-abcd1234.js',
      sizeBytes: shellJsBytes,
      isEntry: true,
      imports: ['_i18n-abcd1234.js', '_Header-abcd1234.js'],
      dynamicImports: ['src/pages/Blog.tsx', 'src/pages/Stellar.tsx', 'src/pages/CaseStudies.tsx'],
      css: ['assets/index-css12345.css'],
    },
    {
      key: 'src/pages/Blog.tsx',
      file: 'assets/Blog-abcd1234.js',
      sizeBytes: blogJsBytes,
      isDynamicEntry: true,
      imports: ['_i18n-abcd1234.js'],
    },
    {
      key: 'src/pages/Stellar.tsx',
      file: 'assets/Stellar-abcd1234.js',
      sizeBytes: stellarJsBytes,
      isDynamicEntry: true,
      imports: ['_i18n-abcd1234.js'],
    },
    {
      key: 'src/pages/CaseStudies.tsx',
      file: 'assets/CaseStudies-abcd1234.js',
      sizeBytes: caseStudiesJsBytes,
      isDynamicEntry: true,
      imports: ['_i18n-abcd1234.js', '_case-studies-abcd1234.js'],
    },
  ];

  const defaultChunkModules: Record<string, ChunkModuleMetadata> = {
    'assets/i18n-abcd1234.js': {
      bytes: i18nJsBytes,
      modules: [
        { id: 'src/i18n/en.json', renderedLength: 10000 },
        { id: 'src/i18n/es.json', renderedLength: 10000 },
        { id: 'src/i18n/index.ts', renderedLength: 10000 },
      ],
    },
    'assets/index-abcd1234.js': {
      bytes: shellJsBytes,
      modules: [
        { id: 'src/data/trust.json', renderedLength: 1000 },
        { id: 'src/App.tsx', renderedLength: 99000 },
      ],
    },
    'assets/Blog-abcd1234.js': {
      bytes: blogJsBytes,
      modules: [
        { id: 'src/content/blog/wave-7-kickoff.mdx', renderedLength: 10000 },
        { id: 'src/data/authors.json', renderedLength: 2000 },
        { id: 'src/pages/Blog.tsx', renderedLength: 28000 },
      ],
    },
    'assets/CaseStudies-abcd1234.js': {
      bytes: caseStudiesJsBytes,
      modules: [{ id: 'src/pages/CaseStudies.tsx', renderedLength: caseStudiesJsBytes }],
    },
    'assets/case-studies-abcd1234.js': {
      bytes: caseStudiesDataBytes,
      modules: [{ id: 'src/data/case-studies.json', renderedLength: caseStudiesDataBytes }],
    },
    'assets/Stellar-abcd1234.js': {
      bytes: stellarJsBytes,
      modules: [{ id: 'src/pages/Stellar.tsx', renderedLength: stellarJsBytes }],
    },
  };

  const defaultExtraFiles: Array<{ path: string; bytes?: number; content?: string }> = [
    { path: 'index.html', content: indexHtml },
    { path: 'blog/index.html', content: indexHtml },
    { path: 'stellar/index.html', content: indexHtml },
    { path: 'case-studies/index.html', content: indexHtml },
    { path: fontA, bytes: 18 * 1024 },
    { path: fontB, bytes: 32 * 1024 },
    { path: 'logo.png', bytes: 4 * 1024 },
    { path: 'site.webmanifest', bytes: 512 },
  ];

  return createSpaFixture({
    entries: overrides?.entries ?? defaultEntries,
    chunkModules: overrides?.chunkModules ?? defaultChunkModules,
    extraFiles: overrides?.extraFiles ?? defaultExtraFiles,
  });
}

function findRoute(report: TransferBudgetReport, routePath: string) {
  const found = report.routes.find((r) => r.route === routePath);
  if (!found) {
    throw new Error(`Expected route "${routePath}" in report`);
  }
  return found;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mutateJsonFile(filePath: string, mutator: (data: Record<string, unknown>) => void): void {
  const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!isPlainRecord(parsed)) {
    throw new Error(`Expected JSON object at ${filePath}`);
  }
  mutator(parsed);
  writeFileSync(filePath, JSON.stringify(parsed, null, 2));
}

describe('route transfer & chunk budgets', () => {
  it('preserves legacy chunk and transitive JS budget constants', () => {
    expect(CHUNK_BUDGET_KB).toBe(500);
    expect(ROUTE_TRANSITIVE_KB).toBe(1_500);
    expect(CHUNK_ALLOWLIST['vendor-stellar-sdk']?.maxKB).toBe(950);
  });

  it('produces a passing deterministic report on a synthetic multi-route dist fixture', () => {
    const tempDir = buildBaselineSpaFixture();

    const first = runCli(['--json'], tempDir);
    const second = runCli(['--json'], tempDir);
    const textFirst = formatBudgetReport(first.report);
    const textSecond = formatBudgetReport(second.report);

    expect(first.exitCode).toBe(0);
    expect(first.report.passed).toBe(true);
    expect(first.report.violations).toEqual([]);
    expect(first.stdout).toBe(second.stdout);
    expect(textFirst.stdout).toBe(textSecond.stdout);
    expect(textFirst.stderr).toBe('');
  });

  it('accurately separates shared shell cost from route-specific cost without double-counting', () => {
    const tempDir = createSpaFixture({
      entries: [
        {
          key: 'index.html',
          file: 'assets/index-shell123.js',
          sizeBytes: 100 * 1024,
          isEntry: true,
          css: ['assets/shell-12345678.css'],
          assets: ['assets/shell-font-12345678.woff2', 'assets/shell-logo-12345678.png'],
          dynamicImports: ['src/pages/Blog.tsx'],
        },
        {
          key: 'src/pages/Blog.tsx',
          file: 'assets/Blog-12345678.js',
          sizeBytes: 40 * 1024,
          isDynamicEntry: true,
          css: ['assets/blog-12345678.css'],
          assets: [
            'assets/blog-font-12345678.woff2',
            'assets/blog-hero-12345678.png',
            'assets/blog-data-12345678.json',
          ],
        },
      ],
      chunkModules: {
        'assets/index-shell123.js': {
          bytes: 100 * 1024,
          modules: [
            { id: 'src/i18n/en.json', renderedLength: 10, bytes: 10 * 1024 },
            { id: 'src/App.tsx', renderedLength: 90 },
          ],
        },
        'assets/Blog-12345678.js': {
          bytes: 40 * 1024,
          modules: [
            { id: 'src/content/blog/wave-7-kickoff.mdx', renderedLength: 10, bytes: 5 * 1024 },
            { id: 'src/pages/Blog.tsx', renderedLength: 30 },
          ],
        },
      },
      extraFiles: [
        {
          path: 'index.html',
          content:
            '<html><head>' +
            '<link rel="preload" href="/assets/shell-font-12345678.woff2" as="font" />' +
            '<link rel="manifest" href="/site.webmanifest" />' +
            '</head></html>',
        },
        { path: 'assets/shell-12345678.css', bytes: 20 * 1024 },
        { path: 'assets/blog-12345678.css', bytes: 8 * 1024 },
        { path: 'assets/shell-font-12345678.woff2', bytes: 30 * 1024 },
        { path: 'assets/blog-font-12345678.woff2', bytes: 6 * 1024 },
        { path: 'assets/shell-logo-12345678.png', bytes: 4 * 1024 },
        { path: 'assets/blog-hero-12345678.png', bytes: 12 * 1024 },
        { path: 'assets/blog-data-12345678.json', bytes: 7 * 1024 },
        { path: 'site.webmanifest', bytes: 1 * 1024 },
      ],
    });

    const report = analyzeDist(tempDir);
    expect(report.passed).toBe(true);
    expect(report.sharedShell).not.toBeNull();
    if (!report.sharedShell) return;

    const shell = report.sharedShell;
    expect(shell.jsBytes).toBe(100 * 1024);
    expect(shell.cssBytes).toBe(20 * 1024);
    expect(shell.bundledDataBytes).toBe(10 * 1024);
    expect(shell.externalDataBytes).toBe(1 * 1024);
    expect(shell.dataBytes).toBe(11 * 1024);
    expect(shell.fontBytes).toBe(30 * 1024);
    expect(shell.preloadedFontBytes).toBe(30 * 1024);
    expect(shell.imageBytes).toBe(4 * 1024);
    expect(shell.totalBytes).toBe((100 + 20 + 1 + 30 + 4) * 1024);

    const blog = findRoute(report, '/blog');
    expect(blog.routeSpecific.jsBytes).toBe(40 * 1024);
    expect(blog.routeSpecific.cssBytes).toBe(8 * 1024);
    expect(blog.routeSpecific.bundledDataBytes).toBe(5 * 1024);
    expect(blog.routeSpecific.externalDataBytes).toBe(7 * 1024);
    expect(blog.routeSpecific.dataBytes).toBe(12 * 1024);
    expect(blog.routeSpecific.fontBytes).toBe(6 * 1024);
    expect(blog.routeSpecific.imageBytes).toBe(12 * 1024);
    expect(blog.routeSpecific.totalBytes).toBe((40 + 8 + 7 + 6 + 12) * 1024);

    expect(blog.total.jsBytes).toBe(140 * 1024);
    expect(blog.total.cssBytes).toBe(28 * 1024);
    expect(blog.total.dataBytes).toBe(23 * 1024);
    expect(blog.total.fontBytes).toBe(36 * 1024);
    expect(blog.total.imageBytes).toBe(16 * 1024);
    expect(blog.total.totalBytes).toBe(shell.totalBytes + blog.routeSpecific.totalBytes);
  });

  it('does not double-count shared inlined CSS copied into prerendered route HTML', () => {
    const tempDir = buildBaselineSpaFixture();
    const report = analyzeDist(tempDir);
    const blog = findRoute(report, '/blog');

    expect(report.sharedShell?.cssBytes).toBe(20 * 1024);
    expect(blog.routeSpecific.cssBytes).toBe(0);
    expect(blog.total.cssBytes).toBe(20 * 1024);
  });

  it('fails when a non-SDK route eagerly imports an unused chain SDK', () => {
    const tempDir = buildBaselineSpaFixture();
    const manifestPath = join(tempDir, 'dist', '.vite', 'manifest.json');
    const chunkModulesPath = join(tempDir, 'dist', '.vite', 'chunk-modules.json');
    const blogChunk = 'assets/Blog-abcd1234.js';

    writeFileSync(
      join(tempDir, 'dist', 'assets', 'vendor-stellar-sdk-abcd1234.js'),
      Buffer.alloc(10 * 1024, 's'),
    );
    mutateJsonFile(manifestPath, (manifest) => {
      manifest['vendor-stellar-sdk'] = { file: 'assets/vendor-stellar-sdk-abcd1234.js' };
      const blogEntry = manifest['src/pages/Blog.tsx'];
      if (isPlainRecord(blogEntry) && Array.isArray(blogEntry.imports)) {
        blogEntry.imports.push('vendor-stellar-sdk');
      }
    });

    mutateJsonFile(chunkModulesPath, (chunkModules) => {
      const meta = chunkModules[blogChunk];
      if (isPlainRecord(meta) && Array.isArray(meta.modules)) {
        meta.modules.push({
          id: '@wraith-protocol/sdk/dist/chains/evm/index.js',
          renderedLength: 500,
        });
      }
    });

    const report = analyzeDist(tempDir);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.kind === 'unused-sdk' && v.scope === '/blog')).toBe(
      true,
    );
  });

  it('fails when /stellar eagerly or lazily pulls in @stellar/stellar-sdk', () => {
    const tempDir = createSpaFixture({
      entries: [
        {
          key: 'index.html',
          file: 'assets/index-12345678.js',
          sizeBytes: 50 * 1024,
          isEntry: true,
          dynamicImports: ['src/pages/Stellar.tsx'],
        },
        {
          key: 'vendor-stellar-sdk',
          file: 'assets/vendor-stellar-sdk-12345678.js',
          sizeBytes: 200 * 1024,
        },
        {
          key: 'src/components/StellarDeploymentTable.tsx',
          file: 'assets/StellarDeploymentTable-12345678.js',
          sizeBytes: 5 * 1024,
          isDynamicEntry: true,
          imports: ['vendor-stellar-sdk'],
        },
        {
          key: 'src/pages/Stellar.tsx',
          file: 'assets/Stellar-12345678.js',
          sizeBytes: 10 * 1024,
          isDynamicEntry: true,
          dynamicImports: ['src/components/StellarDeploymentTable.tsx'],
        },
      ],
      extraFiles: [{ path: 'index.html', content: '<html></html>' }],
    });

    const report = analyzeDist(tempDir);
    expect(report.passed).toBe(false);
    expect(
      report.violations.some(
        (v) => v.kind === 'unused-sdk' && v.scope === '/stellar' && v.sdk === 'stellar-sdk',
      ),
    ).toBe(true);
  });

  it('fails when a route eagerly imports an unused content collection', () => {
    const tempDir = buildBaselineSpaFixture();
    const chunkModulesPath = join(tempDir, 'dist', '.vite', 'chunk-modules.json');
    mutateJsonFile(chunkModulesPath, (chunkModules) => {
      const meta = chunkModules['assets/Blog-abcd1234.js'];
      if (isPlainRecord(meta) && Array.isArray(meta.modules)) {
        meta.modules.push({
          id: 'src/data/faq.json',
          renderedLength: 1000,
        });
      }
    });

    const report = analyzeDist(tempDir);
    expect(report.passed).toBe(false);
    expect(
      report.violations.some(
        (v) => v.kind === 'unused-collection' && v.scope === '/blog' && v.collection === 'faq',
      ),
    ).toBe(true);
  });

  it('fails when the shared shell eagerly imports a page-only content collection', () => {
    const tempDir = buildBaselineSpaFixture();
    const chunkModulesPath = join(tempDir, 'dist', '.vite', 'chunk-modules.json');
    mutateJsonFile(chunkModulesPath, (chunkModules) => {
      const meta = chunkModules['assets/index-abcd1234.js'];
      if (isPlainRecord(meta) && Array.isArray(meta.modules)) {
        meta.modules.push({
          id: 'src/data/threat-model.json',
          renderedLength: 1000,
        });
      }
    });

    const report = analyzeDist(tempDir);
    expect(report.passed).toBe(false);
    expect(
      report.violations.some(
        (v) =>
          v.kind === 'unused-collection' &&
          v.scope === 'shared-shell' &&
          v.collection === 'threat-model',
      ),
    ).toBe(true);
  });

  it('fails when route-specific or shell CSS exceeds budget', () => {
    const tempDir = buildBaselineSpaFixture();
    writeFileSync(
      join(tempDir, 'dist', 'blog', 'index.html'),
      `<html><head><style>${'a{color:red}'.repeat(2500)}</style></head></html>`,
      'utf8',
    );

    const report = analyzeDist(tempDir);
    expect(report.passed).toBe(false);
    expect(
      report.violations.some(
        (v) => v.kind === 'budget' && v.metric === 'cssKB' && v.scope.includes('/blog'),
      ),
    ).toBe(true);
  });

  it('fails when route data JSON exceeds budget', () => {
    const tempDir = buildBaselineSpaFixture();
    const manifestPath = join(tempDir, 'dist', '.vite', 'manifest.json');
    writeFileSync(
      join(tempDir, 'dist', 'assets', 'extra-data-12345678.json'),
      Buffer.alloc(70 * 1024, 'd'),
    );
    mutateJsonFile(manifestPath, (manifest) => {
      const blogEntry = manifest['src/pages/Blog.tsx'];
      if (isPlainRecord(blogEntry)) {
        blogEntry.assets = ['assets/extra-data-12345678.json'];
      }
    });

    const report = analyzeDist(tempDir);
    expect(report.passed).toBe(false);
    expect(
      report.violations.some(
        (v) => v.kind === 'budget' && v.metric === 'dataKB' && v.scope.includes('/blog'),
      ),
    ).toBe(true);
  });

  it('fails when route font, image, or external font CDN rules are violated', () => {
    const tempDir = buildBaselineSpaFixture();
    const manifestPath = join(tempDir, 'dist', '.vite', 'manifest.json');

    writeFileSync(
      join(tempDir, 'dist', 'assets', 'extra-font-12345678.woff2'),
      Buffer.alloc(20 * 1024, 'f'),
    );
    writeFileSync(
      join(tempDir, 'dist', 'assets', 'huge-banner-12345678.png'),
      Buffer.alloc(80 * 1024, 'p'),
    );
    mutateJsonFile(manifestPath, (manifest) => {
      const stellarEntry = manifest['src/pages/Stellar.tsx'];
      if (isPlainRecord(stellarEntry)) {
        stellarEntry.assets = [
          'assets/extra-font-12345678.woff2',
          'assets/huge-banner-12345678.png',
        ];
      }
    });

    writeFileSync(
      join(tempDir, 'dist', 'stellar', 'index.html'),
      '<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter" /></head></html>',
      'utf8',
    );

    const report = analyzeDist(tempDir);
    expect(report.passed).toBe(false);
    expect(
      report.violations.some(
        (v) => v.kind === 'budget' && v.metric === 'fontKB' && v.scope.includes('/stellar'),
      ),
    ).toBe(true);
    expect(
      report.violations.some(
        (v) => v.kind === 'budget' && v.metric === 'imageKB' && v.scope.includes('/stellar'),
      ),
    ).toBe(true);
    expect(
      report.violations.some((v) => v.kind === 'external-font-cdn' && v.scope === '/stellar'),
    ).toBe(true);
  });

  it('fails when combined total transfer bytes exceed budget even if individual categories fit', () => {
    const tempDir = buildBaselineSpaFixture();
    const report = analyzeDist(tempDir, {
      sharedShellBudgets: { ...SHARED_SHELL_BUDGET_KB, totalKB: 180 },
      routeFamilyBudgets: {
        ...ROUTE_FAMILY_BUDGETS,
        'blog-index': {
          routeSpecific: { ...ROUTE_FAMILY_BUDGETS['blog-index']!.routeSpecific, totalKB: 25 },
          total: { ...ROUTE_FAMILY_BUDGETS['blog-index']!.total, totalKB: 200 },
        },
      },
    });

    expect(report.passed).toBe(false);
    expect(
      report.violations.some(
        (v) => v.kind === 'budget' && v.metric === 'totalKB' && v.scope === 'shared-shell',
      ),
    ).toBe(true);
    expect(
      report.violations.some(
        (v) => v.kind === 'budget' && v.metric === 'totalKB' && v.scope.includes('/blog'),
      ),
    ).toBe(true);
  });

  it('passes cleanly and deterministically against the real built dist/ directory', () => {
    const repoRoot = process.cwd();
    const manifestExists = existsSync(join(repoRoot, 'dist', '.vite', 'manifest.json'));
    expect(manifestExists).toBe(true);

    const runA = runCli(['--json'], repoRoot);
    const runB = runCli(['--json'], repoRoot);

    expect(runA.exitCode).toBe(0);
    expect(runA.report.passed).toBe(true);
    expect(runA.report.violations).toEqual([]);
    expect(runA.stdout).toBe(runB.stdout);
    expect(runA.report.sharedShell).not.toBeNull();
    if (!runA.report.sharedShell) return;

    const shell = runA.report.sharedShell;
    expect(shell.jsBytes).toBeGreaterThan(0);
    expect(shell.cssBytes).toBeGreaterThan(0);
    expect(shell.dataBytes).toBeGreaterThan(0);
    expect(shell.fontBytes).toBeGreaterThan(0);
    expect(shell.imageBytes).toBeGreaterThan(0);
    expect(shell.sdks).toEqual([]);

    const home = findRoute(runA.report, '/');
    const esHome = findRoute(runA.report, '/es');
    const stellar = findRoute(runA.report, '/stellar');
    const blog = findRoute(runA.report, '/blog');
    const blogPost = findRoute(runA.report, '/blog/wave-7-kickoff');
    const caseStudies = findRoute(runA.report, '/case-studies');

    expect(home.routeSpecific.imageBytes).toBeGreaterThan(0);
    expect(home.deferred.sdks).toContain('stellar-sdk');
    expect(esHome.family).toBe('localized');

    expect(stellar.sdks).toEqual([]);
    expect(stellar.deferred.sdks).toEqual([]);
    expect(stellar.routeSpecific.jsBytes).toBeGreaterThan(0);

    expect(blog.collections).toContain('blog');
    expect(blog.routeSpecific.dataBytes).toBeGreaterThan(0);
    expect(blogPost.collections).toContain('blog');
    expect(caseStudies.collections).toContain('case-studies');
  });
});
