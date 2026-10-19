import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { slugifyTag, parseTags } from './feed-utils.mjs';
import { readManifest, resolveAuthorName } from './lib/blog-manifest.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const distDir = join(rootDir, 'dist');
const siteUrl = 'https://usewraith.xyz';
const blogDir = join(rootDir, 'src', 'content', 'blog');

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

function readPostBody(slug) {
  for (const ext of ['.mdx', '.md']) {
    const file = join(blogDir, `${slug}${ext}`);
    if (existsSync(file)) {
      const source = readFileSync(file, 'utf8');
      const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (match) {
        return source.slice(match[0].length);
      }
      return source;
    }
  }
  return '';
}

function toRssPost(entry) {
  return {
    slug: entry.slug,
    title: entry.title,
    excerpt: entry.excerpt,
    content: readPostBody(entry.slug),
    publishedAt: entry.date,
    author: resolveAuthorName(entry.author),
    tags: entry.tags,
    url: entry.url,
  };
}

let postsCache = null;

/**
 * Returns all blog posts for RSS feeds, sorted newest first.
 * Metadata comes from the shared blog manifest; post bodies are read from MDX.
 * @returns {RssPost[]}
 */
export function getPosts() {
  if (postsCache) return postsCache;

  const manifest = readManifest();
  const postsMap = new Map();

  for (const entry of manifest) {
    postsMap.set(entry.slug, toRssPost(entry));
  }

  const manifestPath = join(rootDir, 'src', 'data', 'blog-posts.json');
  if (existsSync(manifestPath)) {
    try {
      const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (Array.isArray(parsed)) {
        for (const post of parsed) {
          if (post?.slug && post?.title && !postsMap.has(post.slug)) {
            postsMap.set(post.slug, {
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt ?? '',
              content: post.content ?? '',
              publishedAt: post.publishedAt || post.date || '',
              author: resolveAuthorName(post.author),
              tags: parseTags(post.tags),
              url: post.url ?? `${siteUrl}/blog/${post.slug}`,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  postsCache = Array.from(postsMap.values())
    .filter((post) => Boolean(post.publishedAt))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));

  return postsCache;
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
    <lastBuildDate>${toRfc822(new Date().toISOString())}</lastBuildDate>
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
