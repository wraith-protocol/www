import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

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

function getPosts() {
  const manifestPath = join(rootDir, 'src', 'data', 'blog-posts.json');
  if (!existsSync(manifestPath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error('Expected src/data/blog-posts.json to contain an array of posts.');
  }

  return parsed
    .filter((post) => Boolean(post?.slug) && Boolean(post?.title))
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      publishedAt: post.publishedAt,
      author: post.author ?? 'Wraith Protocol',
      url: post.url ?? `${siteUrl}/blog/${post.slug}`,
    }))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export function buildRssFeed(posts, baseUrl = siteUrl) {
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
    <title>Wraith Protocol Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Notes on stealth payments, private infrastructure, and the Wraith ecosystem.</description>
    <language>en-us</language>
    <lastBuildDate>${toRfc822(new Date().toISOString())}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items ? `\n${items}\n` : ''}  </channel>
</rss>`;
}

function writeFeedFile(targetDir) {
  const posts = getPosts();
  const feedXml = buildRssFeed(posts, siteUrl);
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, 'feed.xml'), feedXml, 'utf8');
}

function main() {
  writeFeedFile(publicDir);
  if (existsSync(distDir)) {
    writeFeedFile(distDir);
  }
  console.log(`feed.xml generated successfully with ${getPosts().length} posts.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
