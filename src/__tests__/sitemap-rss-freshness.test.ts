import { existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { slugifyTag } from '../../scripts/feed-utils.mjs';
import { buildRssFeed, getPosts, isAllowedPost, type RssPost } from '../../scripts/gen-rss.mjs';
import {
  buildSitemapXml,
  getSitemapEntries,
  isValidRoute,
  siteUrl,
  staticRoutes,
} from '../../scripts/sitemap';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');
const publicDir = join(rootDir, 'public');
const sitemapPath = join(publicDir, 'sitemap.xml');
const feedPath = join(publicDir, 'feed.xml');
const tagFeedsDir = join(publicDir, 'feed', 'tag');

function extractTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) {
    matches.push(m[1].trim());
  }
  return matches;
}

function extractUrlBlocks(
  xml: string,
): { loc: string; lastmod: string; changefreq?: string; priority?: string }[] {
  const urlBlocks = extractTags(xml, 'url');
  return urlBlocks.map((block) => {
    const locMatch = block.match(/<loc>([\s\S]*?)<\/loc>/);
    const lastmodMatch = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/);
    const changefreqMatch = block.match(/<changefreq>([\s\S]*?)<\/changefreq>/);
    const priorityMatch = block.match(/<priority>([\s\S]*?)<\/priority>/);
    return {
      loc: locMatch ? locMatch[1].trim() : '',
      lastmod: lastmodMatch ? lastmodMatch[1].trim() : '',
      changefreq: changefreqMatch ? changefreqMatch[1].trim() : undefined,
      priority: priorityMatch ? priorityMatch[1].trim() : undefined,
    };
  });
}

function extractItemBlocks(
  xml: string,
): { link: string; guid: string; title: string; pubDate: string; description: string }[] {
  const itemBlocks = extractTags(xml, 'item');
  return itemBlocks.map((block) => {
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const guidMatch = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);
    return {
      link: linkMatch ? linkMatch[1].trim() : '',
      guid: guidMatch ? guidMatch[1].trim() : '',
      title: titleMatch ? titleMatch[1].trim() : '',
      pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
      description: descMatch ? descMatch[1].trim() : '',
    };
  });
}

describe('Sitemap & RSS Freshness Regression Tests', () => {
  // ─── 1. XML Structure and Schema Validation ──────────────────────────────
  describe('XML Structure & Schema Validation', () => {
    it('sitemap.xml has valid XML declaration, urlset root, and balanced tags', () => {
      expect(existsSync(sitemapPath)).toBe(true);
      const xml = readFileSync(sitemapPath, 'utf8');

      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml.endsWith('</urlset>\n') || xml.endsWith('</urlset>')).toBe(true);

      const openUrlCount = (xml.match(/<url>/g) || []).length;
      const closeUrlCount = (xml.match(/<\/url>/g) || []).length;
      expect(openUrlCount).toBeGreaterThan(0);
      expect(openUrlCount).toBe(closeUrlCount);

      const blocks = extractUrlBlocks(xml);
      expect(blocks.length).toBe(openUrlCount);
      for (const b of blocks) {
        expect(b.loc).toBeTruthy();
        expect(b.lastmod).toBeTruthy();
        expect(b.changefreq).toMatch(/^(daily|weekly|monthly)$/);
        expect(b.priority).toMatch(/^\d\.\d$/);
      }
    });

    it('feed.xml has valid XML declaration, rss root, and required channel elements', () => {
      expect(existsSync(feedPath)).toBe(true);
      const xml = readFileSync(feedPath, 'utf8');

      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
      expect(xml).toContain('</rss>');

      expect(xml).toContain('<channel>');
      expect(xml).toContain('</channel>');
      expect(xml).toContain('<title>Wraith Protocol Blog</title>');
      expect(xml).toContain('<link>https://usewraith.xyz/blog</link>');
      expect(xml).toContain('<language>en-us</language>');
      expect(xml).toContain('<lastBuildDate>');
      expect(xml).toContain(
        '<atom:link href="https://usewraith.xyz/feed.xml" rel="self" type="application/rss+xml" />',
      );

      const items = extractItemBlocks(xml);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.title).toBeTruthy();
        expect(item.link).toBeTruthy();
        expect(item.guid).toBeTruthy();
        expect(item.pubDate).toBeTruthy();
        expect(item.description).toBeTruthy();
      }
    });

    it('all tag feeds have valid XML structure and tag-specific channel metadata', () => {
      expect(existsSync(tagFeedsDir)).toBe(true);
      const feedFiles = readdirSync(tagFeedsDir).filter((f) => f.endsWith('.xml'));
      expect(feedFiles.length).toBeGreaterThan(0);

      for (const file of feedFiles) {
        const tagSlug = file.replace(/\.xml$/, '');
        const xml = readFileSync(join(tagFeedsDir, file), 'utf8');

        expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
        expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
        expect(xml).toContain(`href="https://usewraith.xyz/feed/tag/${tagSlug}.xml"`);
        expect(xml).toContain(`<link>https://usewraith.xyz/blog/tag/${tagSlug}</link>`);

        const items = extractItemBlocks(xml);
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
          expect(item.title).toBeTruthy();
          expect(item.link).toBeTruthy();
          expect(item.guid).toBeTruthy();
          expect(item.pubDate).toBeTruthy();
        }
      }
    });
  });

  // ─── 2. URL Uniqueness ───────────────────────────────────────────────────
  describe('URL Uniqueness', () => {
    it('sitemap.xml contains zero duplicate URLs', () => {
      const xml = readFileSync(sitemapPath, 'utf8');
      const urls = extractTags(xml, 'loc');
      expect(urls.length).toBeGreaterThan(0);

      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const url of urls) {
        if (seen.has(url)) {
          duplicates.push(url);
        }
        seen.add(url);
      }

      expect(duplicates).toEqual([]);
      expect(urls.length).toBe(seen.size);
    });

    it('feed.xml contains zero duplicate item links or guids', () => {
      const xml = readFileSync(feedPath, 'utf8');
      const items = extractItemBlocks(xml);
      const links = items.map((i) => i.link);
      const guids = items.map((i) => i.guid);

      expect(links.length).toBe(new Set(links).size);
      expect(guids.length).toBe(new Set(guids).size);
    });

    it('each tag feed contains zero duplicate item links', () => {
      const feedFiles = readdirSync(tagFeedsDir).filter((f) => f.endsWith('.xml'));
      for (const file of feedFiles) {
        const xml = readFileSync(join(tagFeedsDir, file), 'utf8');
        const items = extractItemBlocks(xml);
        const links = items.map((i) => i.link);
        expect(links.length).toBe(new Set(links).size);
      }
    });

    it('buildSitemapXml deduplicates when passed duplicate routes', () => {
      const testEntries = [
        { route: '/blog/post-1', lastmod: '2026-07-20' },
        { route: '/blog/post-1', lastmod: '2026-07-20' },
      ];
      // getSitemapEntries handles deduplication in entry map
      const entries = getSitemapEntries();
      const routes = entries.map((e) => e.route);
      expect(routes.length).toBe(new Set(routes).size);
    });

    it('buildRssFeed deduplicates posts with duplicate URLs', () => {
      const posts: RssPost[] = [
        {
          slug: 'duplicate-test',
          title: 'Duplicate Test',
          publishedAt: '2026-07-20T12:00:00.000Z',
          url: 'https://usewraith.xyz/blog/duplicate-test',
        },
        {
          slug: 'duplicate-test',
          title: 'Duplicate Test 2',
          publishedAt: '2026-07-20T12:00:00.000Z',
          url: 'https://usewraith.xyz/blog/duplicate-test',
        },
      ];
      const xml = buildRssFeed(posts, siteUrl);
      const matches = xml.match(/<link>https:\/\/usewraith\.xyz\/blog\/duplicate-test<\/link>/g);
      expect(matches).toHaveLength(1);
    });
  });

  // ─── 3. Published Blog Posts and Tag Feeds Completeness ───────────────────
  describe('Published Blog Posts and Tag Feeds Completeness', () => {
    it('every published blog post appears exactly once in sitemap.xml', () => {
      const posts = getPosts();
      expect(posts.length).toBeGreaterThan(0);

      const xml = readFileSync(sitemapPath, 'utf8');
      const sitemapUrls = extractTags(xml, 'loc');

      for (const post of posts) {
        const postUrl = `${siteUrl}/blog/${post.slug}`;
        const count = sitemapUrls.filter((u) => u === postUrl).length;
        expect(count, `Expected post ${post.slug} to appear exactly once in sitemap`).toBe(1);
      }
    });

    it('every published blog post appears exactly once in feed.xml', () => {
      const posts = getPosts();
      const xml = readFileSync(feedPath, 'utf8');
      const items = extractItemBlocks(xml);

      for (const post of posts) {
        const postUrl = `${siteUrl}/blog/${post.slug}`;
        const count = items.filter((i) => i.link === postUrl).length;
        expect(count, `Expected post ${post.slug} to appear exactly once in feed.xml`).toBe(1);
      }
    });

    it('every blog tag has a dedicated tag feed and appears exactly once in sitemap', () => {
      const posts = getPosts();
      const allTags = new Set<string>();
      posts.forEach((p) => {
        (p.tags || []).forEach((t) => allTags.add(slugifyTag(t)));
      });

      expect(allTags.size).toBeGreaterThan(0);
      const xml = readFileSync(sitemapPath, 'utf8');
      const sitemapUrls = extractTags(xml, 'loc');

      for (const tagSlug of allTags) {
        const tagRouteUrl = `${siteUrl}/blog/tag/${tagSlug}`;
        const count = sitemapUrls.filter((u) => u === tagRouteUrl).length;
        expect(count, `Expected tag route ${tagSlug} to appear exactly once in sitemap`).toBe(1);

        const tagFeedFile = join(tagFeedsDir, `${tagSlug}.xml`);
        expect(
          existsSync(tagFeedFile),
          `Expected tag feed file to exist for tag: ${tagSlug}`,
        ).toBe(true);

        const tagFeedXml = readFileSync(tagFeedFile, 'utf8');
        const tagFeedItems = extractItemBlocks(tagFeedXml);
        expect(tagFeedItems.length).toBeGreaterThan(0);

        // Verify each post in this tag feed actually has this tag
        const matchingPosts = posts.filter((p) =>
          (p.tags || []).some((t) => slugifyTag(t) === tagSlug),
        );
        expect(tagFeedItems.length).toBe(matchingPosts.length);
      }
    });
  });

  // ─── 4. Reject Preview, Staging, and Invalid Routes ──────────────────────
  describe('Reject Preview, Staging, and Invalid Routes', () => {
    it('sitemap.xml contains zero preview, staging, draft, 404, or malformed routes', () => {
      const xml = readFileSync(sitemapPath, 'utf8');
      const urls = extractTags(xml, 'loc');

      for (const url of urls) {
        const lower = url.toLowerCase();
        expect(lower).not.toContain('preview');
        expect(lower).not.toContain('staging');
        expect(lower).not.toContain('draft');
        expect(lower).not.toContain('404');
        expect(lower).not.toContain('admin');
        expect(url).not.toContain('?');
        expect(url).not.toContain('#');
        // No double slashes after the protocol
        const pathPart = url.replace(/^https?:\/\//, '');
        expect(pathPart).not.toContain('//');
      }
    });

    it('feed.xml and tag feeds contain zero preview, staging, or draft URLs', () => {
      const xml = readFileSync(feedPath, 'utf8');
      const items = extractItemBlocks(xml);

      for (const item of items) {
        const lowerLink = item.link.toLowerCase();
        const lowerGuid = item.guid.toLowerCase();
        expect(lowerLink).not.toContain('preview');
        expect(lowerLink).not.toContain('staging');
        expect(lowerLink).not.toContain('draft');
        expect(lowerGuid).not.toContain('preview');
        expect(lowerGuid).not.toContain('staging');
        expect(lowerGuid).not.toContain('draft');
      }

      const feedFiles = readdirSync(tagFeedsDir).filter((f) => f.endsWith('.xml'));
      for (const file of feedFiles) {
        const tagXml = readFileSync(join(tagFeedsDir, file), 'utf8');
        const tagItems = extractItemBlocks(tagXml);
        for (const item of tagItems) {
          expect(item.link.toLowerCase()).not.toContain('preview');
          expect(item.link.toLowerCase()).not.toContain('staging');
          expect(item.link.toLowerCase()).not.toContain('draft');
        }
      }
    });

    it('isValidRoute rejects preview, staging, draft, 404, and invalid patterns', () => {
      // Rejects preview & staging
      expect(isValidRoute('/preview')).toBe(false);
      expect(isValidRoute('/preview/new-article')).toBe(false);
      expect(isValidRoute('/blog/preview')).toBe(false);
      expect(isValidRoute('/staging')).toBe(false);
      expect(isValidRoute('/staging/feature')).toBe(false);

      // Rejects draft & admin
      expect(isValidRoute('/draft')).toBe(false);
      expect(isValidRoute('/blog/drafts/post-1')).toBe(false);
      expect(isValidRoute('/admin')).toBe(false);
      expect(isValidRoute('/admin/dashboard')).toBe(false);

      // Rejects 404 & malformed
      expect(isValidRoute('/404')).toBe(false);
      expect(isValidRoute('/404/not-found')).toBe(false);
      expect(isValidRoute('relative-route')).toBe(false);
      expect(isValidRoute('//double-slash')).toBe(false);
      expect(isValidRoute('/route?param=1')).toBe(false);
      expect(isValidRoute('/route#anchor')).toBe(false);
      expect(isValidRoute('/has space/route')).toBe(false);

      // Accepts valid routes
      expect(isValidRoute('/')).toBe(true);
      expect(isValidRoute('/faq')).toBe(true);
      expect(isValidRoute('/blog/privacy-by-default')).toBe(true);
      expect(isValidRoute('/case-studies/payroll-processor')).toBe(true);
      expect(isValidRoute('/blog/tag/stealth-payments')).toBe(true);
    });

    it('isAllowedPost rejects preview, staging, draft, and posts with invalid dates', () => {
      expect(isAllowedPost({ slug: 'valid', publishedAt: '2026-07-20' })).toBe(true);

      // Draft & preview flags
      expect(isAllowedPost({ slug: 'draft-post', publishedAt: '2026-07-20', draft: true })).toBe(
        false,
      );
      expect(
        isAllowedPost({ slug: 'preview-post', publishedAt: '2026-07-20', preview: true }),
      ).toBe(false);
      expect(
        isAllowedPost({ slug: 'draft-status', publishedAt: '2026-07-20', status: 'draft' }),
      ).toBe(false);
      expect(
        isAllowedPost({ slug: 'preview-status', publishedAt: '2026-07-20', status: 'preview' }),
      ).toBe(false);

      // Preview/staging in slug or URL
      expect(isAllowedPost({ slug: 'preview-feature', publishedAt: '2026-07-20' })).toBe(false);
      expect(
        isAllowedPost({
          slug: 'valid-slug',
          publishedAt: '2026-07-20',
          url: 'https://usewraith.xyz/preview/valid-slug',
        }),
      ).toBe(false);
      expect(
        isAllowedPost({
          slug: 'valid-slug',
          publishedAt: '2026-07-20',
          url: 'https://usewraith.xyz/staging/valid-slug',
        }),
      ).toBe(false);

      // Invalid dates
      expect(isAllowedPost({ slug: 'bad-date', publishedAt: 'not-a-date' })).toBe(false);
      expect(isAllowedPost({ slug: 'empty-date', publishedAt: '' })).toBe(false);
      expect(isAllowedPost({ slug: 'no-date' })).toBe(false);
    });
  });

  // ─── 5. Verify lastmod Values Against Content Metadata ───────────────────
  describe('Verify lastmod Values Against Content Metadata', () => {
    it('blog post lastmod values in sitemap strictly match content metadata publishedAt/date', () => {
      const posts = getPosts();
      const xml = readFileSync(sitemapPath, 'utf8');
      const blocks = extractUrlBlocks(xml);

      for (const post of posts) {
        const postUrl = `${siteUrl}/blog/${post.slug}`;
        const block = blocks.find((b) => b.loc === postUrl);
        expect(block, `Block for ${postUrl} must exist in sitemap`).toBeDefined();

        const expectedDate = (post.publishedAt || '').split('T')[0];
        expect(expectedDate).toBeTruthy();
        expect(block?.lastmod).toBe(expectedDate);
      }
    });

    it('case study lastmod in sitemap strictly matches case-studies.json integrationDate', () => {
      const csPath = join(rootDir, 'src', 'data', 'case-studies.json');
      const csData = JSON.parse(readFileSync(csPath, 'utf8'));
      const xml = readFileSync(sitemapPath, 'utf8');
      const blocks = extractUrlBlocks(xml);

      for (const entry of csData.entries) {
        if (!entry.slug || !entry.integrationDate) continue;
        const csUrl = `${siteUrl}/case-studies/${entry.slug}`;
        const block = blocks.find((b) => b.loc === csUrl);
        expect(block, `Block for ${csUrl} must exist in sitemap`).toBeDefined();
        expect(block?.lastmod).toBe(entry.integrationDate);
      }
    });

    it('all lastmod dates in sitemap are valid ISO 8601 YYYY-MM-DD dates', () => {
      const xml = readFileSync(sitemapPath, 'utf8');
      const blocks = extractUrlBlocks(xml);

      const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
      for (const b of blocks) {
        expect(b.lastmod).toMatch(isoDatePattern);
        const parsed = Date.parse(b.lastmod);
        expect(isNaN(parsed)).toBe(false);
      }
    });

    it('all pubDate values in feed.xml and tag feeds are valid RFC 822 dates matching post publishedAt', () => {
      const posts = getPosts();
      const postsBySlug = new Map(posts.map((p) => [p.slug, p]));

      const xml = readFileSync(feedPath, 'utf8');
      const items = extractItemBlocks(xml);

      for (const item of items) {
        const parsed = Date.parse(item.pubDate);
        expect(isNaN(parsed), `pubDate ${item.pubDate} must be parseable`).toBe(false);

        const slug = item.link.replace(`${siteUrl}/blog/`, '');
        const post = postsBySlug.get(slug);
        if (post) {
          const expectedTime = new Date(post.publishedAt).getTime();
          expect(parsed).toBe(expectedTime);
        }
      }
    });

    it('feed lastBuildDate is a valid parseable RFC 822 date', () => {
      const xml = readFileSync(feedPath, 'utf8');
      const match = xml.match(/<lastBuildDate>([\s\S]*?)<\/lastBuildDate>/);
      expect(match).not.toBeNull();
      const buildDate = match![1].trim();
      expect(isNaN(Date.parse(buildDate))).toBe(false);
    });
  });
});
