import { describe, expect, it } from 'vitest';
import { buildRssFeed, getPosts } from '../../scripts/gen-rss.mjs';

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

  it('lastBuildDate is derived from the most recent post, not the current time', () => {
    const posts = [
      {
        slug: 'older',
        title: 'Older Post',
        excerpt: '',
        publishedAt: '2026-05-01T00:00:00.000Z',
        content: '',
        author: 'Wraith Team',
        url: 'https://usewraith.xyz/blog/older',
      },
      {
        slug: 'newer',
        title: 'Newer Post',
        excerpt: '',
        publishedAt: '2026-09-15T00:00:00.000Z',
        content: '',
        author: 'Wraith Team',
        url: 'https://usewraith.xyz/blog/newer',
      },
    ];
    // Posts are expected to be sorted newest-first by the caller (as getPosts does)
    const sorted = [...posts].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    const xml = buildRssFeed(sorted, 'https://usewraith.xyz');

    // Must contain the date of the newest post, not today's date
    expect(xml).toContain('<lastBuildDate>Tue, 15 Sep 2026');
    // Must NOT contain the current year in a way that would change on rebuild
    const lastBuildMatch = xml.match(/<lastBuildDate>(.+?)<\/lastBuildDate>/);
    expect(lastBuildMatch).not.toBeNull();
    // The value must be stable: calling buildRssFeed again yields identical output
    const xml2 = buildRssFeed(sorted, 'https://usewraith.xyz');
    expect(xml).toBe(xml2);
  });

  it('produces byte-identical output when called twice with the same posts', () => {
    const posts = getPosts();
    const xml1 = buildRssFeed(posts, 'https://usewraith.xyz');
    const xml2 = buildRssFeed(posts, 'https://usewraith.xyz');
    expect(xml1).toBe(xml2);
  });
});
