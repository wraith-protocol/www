import { describe, expect, it } from 'vitest';
import { buildRssFeed, getPosts, isAllowedPost } from '../../scripts/gen-rss.mjs';

describe('gen-rss script', () => {
  it('getPosts retrieves posts including MDX posts', () => {
    const posts = getPosts();
    expect(posts.length).toBeGreaterThan(0);

    const mdxPost = posts.find((p) => p.slug === 'wave-7-kickoff');
    expect(mdxPost).toBeDefined();
    expect(mdxPost?.title).toContain('Wave 7 Kick-off');
    expect(mdxPost?.author).toBe('Wraith Team');
    expect(mdxPost?.publishedAt).toBe('2026-07-27');
  });

  it('builds an RSS feed for published posts', () => {
    const xml = buildRssFeed(
      [
        {
          slug: 'first-post',
          title: 'First Post',
          excerpt: 'A first step into private payments.',
          publishedAt: '2026-07-20T12:00:00.000Z',
          content: '<p>Body one</p>',
          author: 'Wraith Team',
          url: 'https://usewraith.xyz/blog/first-post',
        },
        {
          slug: 'second-post',
          title: 'Second Post',
          excerpt: 'A second step into private payments.',
          publishedAt: '2026-07-21T12:00:00.000Z',
          content: '<p>Body two</p>',
          author: 'Wraith Team',
          url: 'https://usewraith.xyz/blog/second-post',
        },
      ],
      'https://usewraith.xyz',
    );

    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<title>Wraith Protocol Blog</title>');
    expect(xml).toContain('<item>');
    expect(xml).toContain('<title>First Post</title>');
    expect(xml).toContain('<link>https://usewraith.xyz/blog/first-post</link>');
    expect(xml).toContain('<description>A first step into private payments.</description>');
  });

  it('builds a per-tag RSS feed with tag-specific title and self link', () => {
    const xml = buildRssFeed(
      [
        {
          slug: 'first-post',
          title: 'First Post',
          excerpt: 'A first step into private payments.',
          publishedAt: '2026-07-20T12:00:00.000Z',
          content: '<p>Body one</p>',
          author: 'Wraith Team',
          tags: ['stealth-payments'],
          url: 'https://usewraith.xyz/blog/first-post',
        },
      ],
      'https://usewraith.xyz',
      { tag: 'stealth-payments' },
    );

    expect(xml).toContain('<title>Wraith Protocol Blog — stealth-payments</title>');
    expect(xml).toContain('<link>https://usewraith.xyz/blog/tag/stealth-payments</link>');
    expect(xml).toContain(
      '<atom:link href="https://usewraith.xyz/feed/tag/stealth-payments.xml" rel="self" type="application/rss+xml" />',
    );
  });

  it('getPosts exposes tags for each post', () => {
    const posts = getPosts();
    const mdxPost = posts.find((p) => p.slug === 'wave-7-kickoff');
    expect(Array.isArray(mdxPost?.tags)).toBe(true);
    expect(mdxPost?.tags).toContain('stealth-payments');
  });

  it('rejects posts marked as draft or preview', () => {
    expect(isAllowedPost({ slug: 'test', publishedAt: '2026-01-01', draft: true })).toBe(false);
    expect(isAllowedPost({ slug: 'test', publishedAt: '2026-01-01', preview: true })).toBe(false);
    expect(isAllowedPost({ slug: 'test', publishedAt: '2026-01-01', status: 'draft' })).toBe(false);
    expect(isAllowedPost({ slug: 'preview-feature', publishedAt: '2026-01-01' })).toBe(false);
    expect(
      isAllowedPost({
        slug: 'test',
        publishedAt: '2026-01-01',
        url: 'https://usewraith.xyz/preview/test',
      }),
    ).toBe(false);
    expect(
      isAllowedPost({
        slug: 'test',
        publishedAt: '2026-01-01',
        url: 'https://usewraith.xyz/staging/test',
      }),
    ).toBe(false);
  });

  it('rejects posts with invalid or missing dates', () => {
    expect(isAllowedPost({ slug: 'test', publishedAt: 'invalid-date' })).toBe(false);
    expect(isAllowedPost({ slug: 'test', publishedAt: '' })).toBe(false);
    expect(isAllowedPost({ slug: 'test' })).toBe(false);
  });

  it('deduplicates posts with duplicate URLs in buildRssFeed', () => {
    const xml = buildRssFeed(
      [
        {
          slug: 'duplicate-post',
          title: 'Duplicate Post',
          publishedAt: '2026-07-20T12:00:00.000Z',
          url: 'https://usewraith.xyz/blog/duplicate-post',
        },
        {
          slug: 'duplicate-post',
          title: 'Duplicate Post Second Time',
          publishedAt: '2026-07-20T12:00:00.000Z',
          url: 'https://usewraith.xyz/blog/duplicate-post',
        },
      ],
      'https://usewraith.xyz',
    );

    const matches = xml.match(/<link>https:\/\/usewraith\.xyz\/blog\/duplicate-post<\/link>/g);
    expect(matches).toHaveLength(1);
  });
});
