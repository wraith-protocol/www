import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { slugifyTag } from './feed-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const distDir = join(rootDir, 'dist');
const manifestPath = join(rootDir, 'src', 'data', 'blog-manifest.json');
const siteUrl = 'https://usewraith.xyz';

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(date) {
  return new Date(date).toUTCString();
}

/**
 * Read published posts from the generated blog manifest.
 *
 * The manifest is produced by scripts/gen-blog-manifest.mjs, which owns
 * frontmatter parsing and validation. Drafts are never published to feeds.
 */
export function getPosts() {
  if (!existsSync(manifestPath)) {
    throw new Error('src/data/blog-manifest.json is missing — run `pnpm gen:blog-manifest`');
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest)) {
    throw new Error('src/data/blog-manifest.json must contain an array of posts');
  }

  return manifest
    .filter((post) => post?.slug && post?.title && !post.draft)
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      publishedAt: post.date,
      author: post.authorName ?? post.author,
      tags: Array.isArray(post.tags) ? post.tags : [],
      url: post.url ?? `${siteUrl}/blog/${post.slug}`,
    }))
    .filter((post) => Boolean(post.publishedAt))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export function buildRssFeed(posts, baseUrl = siteUrl, options = {}) {
  const { tag } = options;
  const title = tag ? `Wraith Protocol Blog — ${tag}` : 'Wraith Protocol Blog';
  const selfPath = tag ? `/feed/tag/${slugifyTag(tag)}.xml` : '/feed.xml';
  const channelLink = tag ? `${baseUrl}/blog/tag/${slugifyTag(tag)}` : `${baseUrl}/blog`;

  const items = posts
    .filter((post) => Boolean(post.publishedAt))
    .map((post) => {
      const link = post.url ?? `${baseUrl}/blog/${post.slug}`;
      const description =
        post.excerpt || post.content || 'Read the latest update from Wraith Protocol.';
      return `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${escapeXml(link)}</link>
    <guid>${escapeXml(link)}</guid>
    <pubDate>${toRfc822(post.publishedAt)}</pubDate>
    <description>${escapeXml(description)}</description>
    <author>${escapeXml(post.author)}</author>
  </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${channelLink}</link>
    <description>Notes on stealth payments, private infrastructure, and the Wraith ecosystem.</description>
    <language>en-us</language>
    <lastBuildDate>${posts.length > 0 ? toRfc822(posts[0].publishedAt) : 'Thu, 01 Jan 1970 00:00:00 GMT'}</lastBuildDate>
    <atom:link href="${baseUrl}${selfPath}" rel="self" type="application/rss+xml" />
${items ? `\n${items}\n` : ''}  </channel>
</rss>`;
}

function writeFeedFile(targetDir) {
  const posts = getPosts();
  const feedXml = buildRssFeed(posts, siteUrl);
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, 'feed.xml'), feedXml, 'utf8');
}

function writeTagFeeds(targetDir) {
  const posts = getPosts();
  const tags = new Set();
  posts.forEach((post) => {
    (post.tags || []).forEach((tag) => tags.add(tag));
  });

  for (const tag of tags) {
    const tagPosts = posts.filter((post) => (post.tags || []).includes(tag));
    const feedXml = buildRssFeed(tagPosts, siteUrl, { tag });
    const tagDir = join(targetDir, 'feed', 'tag');
    mkdirSync(tagDir, { recursive: true });
    writeFileSync(join(tagDir, `${slugifyTag(tag)}.xml`), feedXml, 'utf8');
  }

  return tags.size;
}

function main() {
  const posts = getPosts();
  writeFeedFile(publicDir);
  const tagCount = writeTagFeeds(publicDir);
  if (existsSync(distDir)) {
    writeFeedFile(distDir);
    writeTagFeeds(distDir);
  }
  console.log(
    `feed.xml generated successfully with ${posts.length} posts across ${tagCount} tag feeds.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
