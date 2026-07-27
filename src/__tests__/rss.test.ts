import { describe, expect, it } from 'vitest';
import { buildRssFeed } from '../../scripts/gen-rss.mjs';

describe('buildRssFeed', () => {
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
});
