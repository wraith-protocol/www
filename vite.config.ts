/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import rehypeSlug from 'rehype-slug';

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
