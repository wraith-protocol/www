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
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
