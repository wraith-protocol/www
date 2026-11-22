import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const checkerPath = join(root, 'scripts/check-sdk-size.mjs');
const budgetCheckerPath = join(root, 'scripts/check-chunk-budget.mjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a minimal Vite manifest + asset files in a temp directory so the
 * budget checker can be exercised without a real build.
 *
 * @param entries  Array of { key, file, sizeKB, isEntry, imports?, dynamicImports? }
 * @returns        { tempDir, assetsDir }
 */
function createFakeManifest(
  entries: Array<{
    key: string;
    file: string;
    sizeKB: number;
    isEntry?: boolean;
    imports?: string[];
    dynamicImports?: string[];
  }>,
): { tempDir: string; assetsDir: string } {
  const tempDir = mkdtempSync(join(tmpdir(), 'wraith-chunk-budget-'));
  const assetsDir = join(tempDir, 'dist', 'assets');
  const viteDir = join(tempDir, 'dist', '.vite');
  mkdirSync(assetsDir, { recursive: true });
  mkdirSync(viteDir, { recursive: true });

  const manifest: Record<string, unknown> = {};
  for (const e of entries) {
    const absFile = join(tempDir, 'dist', e.file);
    mkdirSync(absFile.replace(/\/[^/]+$/, ''), { recursive: true });
    writeFileSync(absFile, Buffer.alloc(Math.round(e.sizeKB * 1024), 'x'));
    manifest[e.key] = {
      file: e.file,
      ...(e.isEntry !== undefined && { isEntry: e.isEntry }),
      ...(e.imports && { imports: e.imports }),
      ...(e.dynamicImports && { dynamicImports: e.dynamicImports }),
    };
  }

  writeFileSync(join(viteDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { tempDir, assetsDir };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('build validation gates', () => {
  it('runs content validation and SDK-size validation from one build script', () => {
    const packageSource = readFileSync(join(root, 'package.json'), 'utf8');
    const packageJson = JSON.parse(packageSource) as { scripts: { build: string } };

    expect(packageSource.match(/"build"\s*:/g)).toHaveLength(1);
    // The manifest must be generated first, because content validation checks the artifact.
    expect(packageJson.scripts.build).toMatch(
      /^node scripts\/gen-blog-manifest\.mjs && tsx scripts\/validate-content\.ts && node scripts\/check-sdk-size\.mjs &&/,
    );
  });

  it('includes check-chunk-budget in the build pipeline after vite build', () => {
    const packageSource = readFileSync(join(root, 'package.json'), 'utf8');
    const packageJson = JSON.parse(packageSource) as { scripts: { build: string } };

    // Budget check must come after `vite build` so dist/.vite/manifest.json exists.
    const buildScript = packageJson.scripts.build;
    const viteBuildIdx = buildScript.indexOf('vite build');
    const budgetIdx = buildScript.indexOf('node scripts/check-chunk-budget.mjs');

    expect(viteBuildIdx).toBeGreaterThan(-1);
    expect(budgetIdx).toBeGreaterThan(viteBuildIdx);
  });

  it('rejects a stale generated SDK size', () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), 'wraith-sdk-size-'));
    const generatedFile = join(tempDirectory, 'sdk-size.ts');

    try {
      execFileSync(process.execPath, [checkerPath, '--write', '--generated-file', generatedFile]);

      writeFileSync(generatedFile, 'export const EVM_SDK_ESM_ENTRYPOINT_GZIP_KB = 9999.9;\n');

      const result = spawnSync(process.execPath, [checkerPath, '--generated-file', generatedFile], {
        encoding: 'utf8',
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('SDK size copy is out of date');
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  // ── Chunk budget checker: per-chunk gate ─────────────────────────────────

  it('chunk budget checker passes when all chunks are within the 500 kB limit', () => {
    const { tempDir } = createFakeManifest([
      {
        key: 'src/pages/Stellar.tsx',
        file: 'assets/Stellar-abc123.js',
        sizeKB: 100,
        isEntry: true,
      },
    ]);

    try {
      const result = spawnSync(process.execPath, [budgetCheckerPath], {
        encoding: 'utf8',
        cwd: tempDir,
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('ok');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('chunk budget checker fails when a route chunk exceeds 500 kB', () => {
    const { tempDir } = createFakeManifest([
      {
        key: 'src/pages/Stellar.tsx',
        file: 'assets/Stellar-abc123.js',
        sizeKB: 510,
        isEntry: true,
      },
    ]);

    try {
      const result = spawnSync(process.execPath, [budgetCheckerPath], {
        encoding: 'utf8',
        cwd: tempDir,
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('FAIL');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('chunk budget checker uses a named allowlist for vendor-stellar-sdk, not a categorical prefix exemption', () => {
    // vendor-stellar-sdk is explicitly allowlisted up to 950 kB because
    // @stellar/stellar-sdk ships a large pre-built bundle outside our control.
    // A chunk at 910 kB (real-world size) should pass with "allow", not "skip".
    const { tempDir } = createFakeManifest([
      {
        key: 'vendor-stellar-sdk',
        file: 'assets/vendor-stellar-sdk-Bene0NPw.js', // 8-char hash like real Vite output
        sizeKB: 910,
        isEntry: false,
      },
      {
        key: 'src/pages/Stellar.tsx',
        file: 'assets/Stellar-C98AN6ab.js',
        sizeKB: 50,
        isEntry: true,
        // Stellar route does NOT statically import vendor-stellar-sdk after
        // the import-boundary fix; listed here only to exercise chunk checking.
      },
    ]);

    try {
      const result = spawnSync(process.execPath, [budgetCheckerPath], {
        encoding: 'utf8',
        cwd: tempDir,
      });

      // Should pass: 910 kB is within the named allowlist ceiling (950 kB).
      expect(result.status).toBe(0);
      // Must say "allow" not "skip".
      expect(result.stdout).toContain('allow');
      expect(result.stdout).not.toContain('skip');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('chunk budget checker fails when vendor-stellar-sdk exceeds its named allowlist ceiling', () => {
    // If a future SDK upgrade pushes the chunk above 950 kB the gate must catch it.
    const { tempDir } = createFakeManifest([
      {
        key: 'vendor-stellar-sdk',
        file: 'assets/vendor-stellar-sdk-Bene0NPw.js',
        sizeKB: 960, // above the 950 kB allowlist ceiling
        isEntry: false,
      },
    ]);

    try {
      const result = spawnSync(process.execPath, [budgetCheckerPath], {
        encoding: 'utf8',
        cwd: tempDir,
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('FAIL');
      expect(result.stderr).toContain('vendor-stellar-sdk');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ── Chunk budget checker: per-route transitive gate (static imports only) ─

  it('chunk budget checker fails when a route static-import closure exceeds 1 500 kB', () => {
    // Route entry statically imports two large shared chunks whose combined
    // size pushes the static transitive total over ROUTE_TRANSITIVE_KB.
    // Use non-allowlisted names so only the transitive gate is relevant.
    const { tempDir } = createFakeManifest([
      {
        key: 'shared-a',
        file: 'assets/shared-a-abc.js',
        sizeKB: 800,
        isEntry: false,
      },
      {
        key: 'shared-b',
        file: 'assets/shared-b-abc.js',
        sizeKB: 800,
        isEntry: false,
      },
      {
        key: 'src/pages/Stellar.tsx',
        file: 'assets/Stellar-def.js',
        sizeKB: 50,
        isEntry: true,
        imports: ['shared-a', 'shared-b'],
      },
    ]);

    try {
      const result = spawnSync(process.execPath, [budgetCheckerPath], {
        encoding: 'utf8',
        cwd: tempDir,
      });

      // Total static: 50 + 800 + 800 = 1 650 kB > 1 500 kB → must fail.
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('FAIL');
      expect(result.stderr).toMatch(/transitive/i);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('chunk budget checker does NOT charge dynamic imports against a route transitive budget', () => {
    // Dynamic imports are the code-split boundary. The SPA entry can
    // dynamically import every page without that inflating its measured load.
    const { tempDir } = createFakeManifest([
      {
        key: 'shared-heavy',
        file: 'assets/shared-heavy-abc.js',
        sizeKB: 400,
        isEntry: false,
      },
      {
        key: 'src/pages/Lazy.tsx',
        file: 'assets/Lazy-abc.js',
        sizeKB: 400,
        isEntry: false,
      },
      {
        key: 'src/main.tsx',
        file: 'assets/index-abc.js',
        sizeKB: 200,
        isEntry: true,
        // static import of shared-heavy, dynamic import of Lazy page
        imports: ['shared-heavy'],
        dynamicImports: ['src/pages/Lazy.tsx'],
      },
    ]);

    try {
      const result = spawnSync(process.execPath, [budgetCheckerPath], {
        encoding: 'utf8',
        cwd: tempDir,
      });

      // Static transitive for entry: 200 + 400 = 600 kB — within 1 500 kB.
      // Lazy page (400 kB) must NOT be counted.
      expect(result.status).toBe(0);
      expect(result.stdout).not.toContain('FAIL');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('chunk budget checker passes when the Stellar route does NOT statically import vendor-stellar-sdk', () => {
    // After the import-boundary fix, StellarDeploymentTable no longer drags
    // vendor-stellar-sdk into the /stellar route's static import graph.
    // vendor-stellar-sdk is only loaded via StellarMetrics on the home page.
    const { tempDir } = createFakeManifest([
      {
        key: 'vendor-stellar-sdk',
        file: 'assets/vendor-stellar-sdk-abc.js',
        sizeKB: 200, // kept small so per-chunk gate doesn't interfere
        isEntry: false,
      },
      {
        key: 'vendor-wraith-sdk',
        file: 'assets/vendor-wraith-sdk-abc.js',
        sizeKB: 200,
        isEntry: false,
      },
      {
        key: 'src/pages/Stellar.tsx',
        file: 'assets/Stellar-def.js',
        sizeKB: 80,
        isEntry: true,
        imports: ['vendor-wraith-sdk'], // no vendor-stellar-sdk in static chain
      },
    ]);

    try {
      const result = spawnSync(process.execPath, [budgetCheckerPath], {
        encoding: 'utf8',
        cwd: tempDir,
      });

      // Stellar static transitive: 80 + 200 = 280 kB — well within 1 500 kB.
      expect(result.status).toBe(0);
      expect(result.stdout).not.toContain('FAIL');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('StellarDeploymentTable does not import from @wraith-protocol/sdk or @stellar/stellar-sdk', () => {
    // Regression assertion: the component must only reference static data from
    // src/data/stellarDeployment.ts, not the SDK directly.
    const source = readFileSync(join(root, 'src/components/StellarDeploymentTable.tsx'), 'utf8');

    // Match `from '...'` clauses (handles multi-line imports); ignore comment prose.
    const fromClauses = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

    expect(fromClauses.some((m) => m.includes('@wraith-protocol/sdk'))).toBe(false);
    expect(fromClauses.some((m) => m.includes('@stellar/stellar-sdk'))).toBe(false);
    expect(fromClauses.some((m) => m.includes('stellarDeployment'))).toBe(true);
  });

  it('stellarDeployment data file has no import statements at all', () => {
    // The static data file must be entirely import-free so it carries zero
    // transitive bundle weight from the Stellar or Wraith SDKs.
    const source = readFileSync(join(root, 'src/data/stellarDeployment.ts'), 'utf8');

    const importLines = source.split('\n').filter((l) => /^\s*import\s/.test(l));

    expect(importLines).toHaveLength(0);
  });
});
