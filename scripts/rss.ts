import { writeFileSync, readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const publicDir = join(rootDir, 'public');
const blogDir = join(rootDir, 'src', 'content', 'blog');
const siteUrl = 'https://usewraith.xyz';

interface PostMetadata {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  slug: string;
}

function parseFrontmatter(content: string): Partial<PostMetadata> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const yaml = match[1];
  const metadata: Record<string, string> = {};

  yaml.split('\n').forEach((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      metadata[key] = value;
    }
  });

  return {
    title: metadata.title,
    date: metadata.date,
    author: metadata.author,
    excerpt: metadata.excerpt,
  };
}

try {
  const posts: PostMetadata[] = [];

  if (existsSync(blogDir)) {
    const files = readdirSync(blogDir).filter((f) => f.endsWith('.mdx'));
    for (const file of files) {
      const slug = file.replace(/\.mdx$/, '');
      const content = readFileSync(join(blogDir, file), 'utf8');
      const meta = parseFrontmatter(content);
      if (meta.title && meta.date) {
        posts.push({
          title: meta.title,
          date: meta.date,
          author: meta.author || 'Wraith Team',
          excerpt: meta.excerpt || '',
          slug,
        });
      }
    }
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Wraith Protocol Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Announcements, technical deep dives, and product updates from Wraith Protocol.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${posts
  .map(
    (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid>${siteUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description><![CDATA[${post.excerpt}]]></description>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>`;

  if (existsSync(distDir)) {
    writeFileSync(join(distDir, 'feed.xml'), rssFeed, 'utf8');
    writeFileSync(join(distDir, 'rss.xml'), rssFeed, 'utf8');
  }
  writeFileSync(join(publicDir, 'feed.xml'), rssFeed, 'utf8');
  writeFileSync(join(publicDir, 'rss.xml'), rssFeed, 'utf8');

  console.log(`RSS feed generated successfully with ${posts.length} posts.`);
} catch (error) {
  console.error('Failed to generate RSS feed:', error);
}
