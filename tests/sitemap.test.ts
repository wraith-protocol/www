/**
 * Security regression tests for scripts/sitemap.ts
 *
 * Verifies that repository-controlled paths (such as filenames from
 * src/content/blog passed to gitLastModified via getBlogRoutes) cannot
 * execute arbitrary shell commands when containing quotes or shell metacharacters.
 */

import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gitLastModified } from '../scripts/sitemap';

describe('sitemap command injection prevention (regression test)', () => {
  it('does not execute shell commands when repository-controlled paths contain quotes and metacharacters', () => {
    const canary = join(
      tmpdir(),
      `sitemap-canary-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`,
    );

    if (existsSync(canary)) {
      unlinkSync(canary);
    }

    try {
      // Craft paths similar to filenames that could be submitted via PR into src/content/blog
      const injectionPayloads = [
        `src/content/blog/"; touch "${canary}"; #.md`,
        `src/content/blog/test'; touch "${canary}"; '.md`,
        `src/content/blog/$(touch "${canary}").md`,
        `src/content/blog/\`touch "${canary}"\`.md`,
        `src/content/blog/post.md; touch "${canary}"`,
        `src/content/blog/post.md && touch "${canary}"`,
        `src/content/blog/post.md | touch "${canary}"`,
        `src/content/blog/post.md > "${canary}"`,
      ];

      for (const payload of injectionPayloads) {
        const result = gitLastModified(payload);
        expect(result).toBeUndefined();
        expect(existsSync(canary)).toBe(false);
      }
    } finally {
      if (existsSync(canary)) {
        unlinkSync(canary);
      }
    }
  });

  it('handles multiple paths where one contains shell metacharacters without command execution', () => {
    const canary = join(
      tmpdir(),
      `sitemap-multi-canary-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`,
    );

    if (existsSync(canary)) {
      unlinkSync(canary);
    }

    try {
      const maliciousPath = `src/content/blog/"; touch "${canary}"; #.md`;
      const result = gitLastModified('package.json', maliciousPath);
      expect(existsSync(canary)).toBe(false);
      if (result) {
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    } finally {
      if (existsSync(canary)) {
        unlinkSync(canary);
      }
    }
  });
});
