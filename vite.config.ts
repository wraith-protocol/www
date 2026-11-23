/// <reference types="vitest/config" />

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import rehypeSlug from 'rehype-slug';

function normalizeModuleId(rawId: string, rootPrefix: string): string {
  const normalized = rawId.replace(/\\/g, '/');
  const nodeModulesMarker = 'node_modules/';
  const nodeModulesIndex = normalized.lastIndexOf(nodeModulesMarker);
  if (nodeModulesIndex !== -1) {
    return normalized.slice(nodeModulesIndex + nodeModulesMarker.length);
  }
  if (normalized.startsWith(rootPrefix)) {
    return normalized.slice(rootPrefix.length);
  }
  return normalized;
}

function chunkModulesPlugin(): Plugin {
  let rootPrefix = `${process.cwd().replace(/\\/g, '/')}/`;
  let manifestEnabled = false;

  return {
    name: 'wraith-chunk-modules-metadata',
    configResolved(config) {
      const normalizedRoot = config.root.replace(/\\/g, '/').replace(/\/+$/, '');
      rootPrefix = `${normalizedRoot}/`;
      manifestEnabled = Boolean(config.build.manifest);
    },
    generateBundle(_options, bundle) {
      if (!manifestEnabled) return;

      const chunks: Record<
        string,
        { bytes: number; modules: Array<{ id: string; renderedLength: number }> }
      > = {};

      for (const fileName of Object.keys(bundle).sort()) {
        const item = bundle[fileName];
        if (!item || item.type !== 'chunk') continue;

        const modules: Array<{ id: string; renderedLength: number }> = [];
        for (const [rawId, info] of Object.entries(item.modules)) {
          if (rawId.startsWith('\0')) continue;
          modules.push({
            id: normalizeModuleId(rawId, rootPrefix),
            renderedLength: info.renderedLength,
          });
        }
        modules.sort((a, b) => a.id.localeCompare(b.id));

        chunks[fileName] = {
          bytes: Buffer.byteLength(item.code, 'utf8'),
          modules,
        };
      }

      this.emitFile({
        type: 'asset',
        fileName: '.vite/chunk-modules.json',
        source: `${JSON.stringify(chunks, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
        rehypePlugins: [rehypeSlug],
      }),
    },
    react(),
    tailwindcss(),
    chunkModulesPlugin(),
  ],
  build: {
    // Emit dist/.vite/manifest.json so scripts/check-chunk-budget.mjs can
    // walk the real import graph and enforce per-chunk and per-route budgets.
    manifest: true,
    // Raise the warning threshold to 600 kB so only genuinely over-budget
    // chunks (above the limit set in scripts/check-chunk-budget.mjs) surface
    // as warnings during the build. The CI budget check enforces the real
    // limit independently.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Group the Wraith SDK into its own vendor chunk so it is shared
          // across all consumers without being duplicated.
          if (id.includes('@wraith-protocol/sdk')) {
            return 'vendor-wraith-sdk';
          }
          // Group the Stellar network SDK separately; it is only pulled in
          // by stellarMetrics.ts (used by StellarMetrics on the home page).
          // StellarDeploymentTable uses src/data/stellarDeployment.ts (plain
          // static constants) and does NOT import this chunk.
          if (id.includes('@stellar/stellar-sdk')) {
            return 'vendor-stellar-sdk';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/e2e/**', '**/tests/a11y/**', '**/tests/visual/**'],
  },
});
