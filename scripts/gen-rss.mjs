import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { slugifyTag, parseTags } from './feed-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const distDir = join(rootDir, 'dist');
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

let authorsCache = null;
let optOutCache = null;

function resolveAuthorName(authorId) {
  if (!authorId) return 'Wraith Team';
  try {
    if (!authorsCache) {
      const aPath = join(rootDir, 'src', 'data', 'authors.json');
      authorsCache = existsSync(aPath) ? JSON.parse(readFileSync(aPath, 'utf8')) : {};
    }
    if (!optOutCache) {
      const oPath = join(rootDir, 'src', 'data', 'authors-optout.json');
      optOutCache = existsSync(oPath) ? JSON.parse(readFileSync(oPath, 'utf8')) : [];
    }
  } catch {
    return authorId;
  }
  if (optOutCache.includes(authorId)) return 'Wraith Team';
  const author = authorsCache[authorId];
  if (author && author.optIn) return author.name;
  if (author && !author.optIn) return 'Wraith Team';
  return authorId;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { metadata: {}, content };
  const yaml = match[1];
  const body = content.slice(match[0].length).trim();
  const metadata = {};

  yaml.split('\n').forEach((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      metadata[key] = value;
    }
  });

  return { metadata, content: body };
}

export function getPosts() {
  const postsMap = new Map();

  // 1. Read MDX posts from src/content/blog/
  const blogDir = join(rootDir, 'src', 'content', 'blog');
  if (existsSync(blogDir)) {
    const files = readdirSync(blogDir).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));
    for (const file of files) {
      const slug = file.replace(/\.mdx?$/, '');
      const rawContent = readFileSync(join(blogDir, file), 'utf8');
      const { metadata, content } = parseFrontmatter(rawContent);

      if (metadata.title) {
        postsMap.set(slug, {
          slug,
          title: metadata.title,
          excerpt: metadata.excerpt ?? '',
          content: content ?? '',
          publishedAt: metadata.publishedAt || metadata.date,
          author: resolveAuthorName(metadata.author),
          tags: parseTags(metadata.tags),
          url: metadata.url ?? `${siteUrl}/blog/${slug}`,
        });
      }
    }
  }

  // 2. Read JSON posts from src/data/blog-posts.json
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
              publishedAt: post.publishedAt || post.date,
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

  return Array.from(postsMap.values())
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
