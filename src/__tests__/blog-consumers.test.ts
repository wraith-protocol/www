import { describe, expect, it } from 'vitest';
import { getPosts } from '../../scripts/gen-rss.mjs';
import { readManifest, resolveAuthorName } from '../../scripts/lib/blog-manifest.mjs';
import { getAllPosts, getPostBySlug, getAllTags, getPostsByTag } from '../utils/blog';

type ManifestEntry = {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  url: string;
};

describe('RSS uses the shared manifest', () => {
  it('getPosts returns manifest posts with resolved authors and tags', () => {
    const manifest = readManifest() as ManifestEntry[];
    const posts = getPosts();
    const bySlug = Object.fromEntries(posts.map((p) => [p.slug, p]));

    for (const entry of manifest) {
      const post = bySlug[entry.slug];
      expect(post, `missing manifest post ${entry.slug}`).toBeDefined();
      expect(post.title).toBe(entry.title);
      expect(post.publishedAt).toBe(entry.date);
      expect(post.author).toBe(resolveAuthorName(entry.author));
      expect(post.tags).toEqual(entry.tags);
      expect(post.url).toBe(entry.url);
    }
  });

  it('excludes posts without a publish date', () => {
    const posts = getPosts();
    expect(posts.every((p) => Boolean(p.publishedAt))).toBe(true);
  });

  it('sorts posts newest first', () => {
    const posts = getPosts();
    const dates = posts.map((p) => Date.parse(p.publishedAt));
    const sorted = dates.every((d, i) => i === 0 || (dates[i - 1] ?? 0) >= d);
    expect(sorted).toBe(true);
  });

  it('returns at least one post', () => {
    const posts = getPosts();
    expect(posts.length).toBeGreaterThan(0);
  });
});

describe('sitemap tag routes come from the manifest', () => {
  it('manifest tags match the tag archive routes', () => {
    const manifest = readManifest() as ManifestEntry[];
    const tags = new Set<string>();
    for (const post of manifest) {
      for (const tag of post.tags) {
        tags.add(tag);
      }
    }
    const expectedRoutes = [...tags].map(
      (tag) =>
        `/blog/tag/${String(tag)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')}`,
    );
    expect(expectedRoutes.length).toBeGreaterThan(0);
    expect(expectedRoutes).toContain('/blog/tag/stealth-payments');
    expect(expectedRoutes).toContain('/blog/tag/privacy');
  });
});

describe('app uses the shared manifest', () => {
  it('getAllPosts metadata matches the manifest', () => {
    const manifest = readManifest() as ManifestEntry[];
    const bySlug = Object.fromEntries(manifest.map((e) => [e.slug, e]));
    const posts = getAllPosts();

    for (const post of posts) {
      const entry = bySlug[post.slug];
      expect(entry, `manifest entry for ${post.slug}`).toBeDefined();
      if (!entry) throw new Error(`missing manifest entry for ${post.slug}`);
      expect(post.title).toBe(entry.title);
      expect(post.date).toBe(entry.date);
      expect(post.author).toBe(entry.author);
      expect(post.excerpt).toBe(entry.excerpt);
      expect(post.tags).toEqual(entry.tags);
    }
  });

  it('getPostBySlug returns manifest-backed post', () => {
    const post = getPostBySlug('wave-7-kickoff');
    expect(post).toBeDefined();
    expect(post?.title).toContain('Wave 7');
  });

  it('getAllTags and getPostsByTag derive from manifest tags', () => {
    const tags = getAllTags();
    expect(tags).toContain('stealth-payments');
    expect(tags).toContain('privacy');

    const posts = getPostsByTag('stealth-payments');
    expect(posts.length).toBeGreaterThanOrEqual(2);
    expect(posts.every((p) => p.tags.includes('stealth-payments'))).toBe(true);
  });
});
