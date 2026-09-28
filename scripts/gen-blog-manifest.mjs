import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const contentDir = path.join(rootDir, 'src', 'content', 'blog');
const blogPostsPath = path.join(rootDir, 'src', 'data', 'blog-posts.json');
const outputPath = path.join(rootDir, 'src', 'data', 'blog-manifest.json');

function parseFrontmatter(source) {
  const frontmatterMatch = source.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return { data: {}, content: source };
  }

  const frontmatterContent = frontmatterMatch[1];
  const content = source.slice(frontmatterMatch[0].length);

  const data = {};
  const lines = frontmatterContent.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else if (value.startsWith('[') && value.endsWith(']')) {
      const items = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''));
      value = items;
    }

    if (key) {
      data[key] = value;
    }
  }

  return { data, content };
}

function extractFirstParagraph(content) {
  const lines = content.split('\n');
  let inCode = false;
  let foundBreak = false;
  let paragraph = '';

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    const trimmed = line.trim();

    if (trimmed === '' && !foundBreak) {
      if (paragraph) {
        foundBreak = true;
      }
      continue;
    }

    if (!foundBreak && trimmed) {
      if (trimmed.startsWith('---')) {
        continue;
      }
      if (trimmed.startsWith('#') || trimmed.startsWith('>') || trimmed.startsWith('<')) {
        continue;
      }

      if (trimmed.match(/^\[[^\]]+\]\([^)]+\)$/)) {
        foundBreak = true;
        continue;
      }

      paragraph += (paragraph ? ' ' : '') + trimmed;
      foundBreak = true;
    }
  }

  return paragraph
    .slice(0, 160)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]/g, '');
}

function getSlug(filename) {
  return filename.replace(/\.mdx?$/, '');
}

function processMdxFile(filePath, filename) {
  const source = fs.readFileSync(filePath, 'utf8');
  const { data, content } = parseFrontmatter(source);
  const slug = getSlug(filename);

  return {
    slug,
    title: data.title || slug,
    excerpt: data.excerpt || extractFirstParagraph(content),
    date: data.date || data.publishedAt || '2026-01-01',
    author: data.author || 'Wraith Team',
    url: `https://usewraith.xyz/blog/${slug}`,
  };
}

function loadBlogPostsJson() {
  if (!fs.existsSync(blogPostsPath)) return [];
  try {
    const posts = JSON.parse(fs.readFileSync(blogPostsPath, 'utf8'));
    return posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      date: post.publishedAt || '2026-01-01',
      author: post.author || 'Wraith Team',
      url: `https://usewraith.xyz/blog/${post.slug}`,
    }));
  } catch {
    return [];
  }
}

function main() {
  if (!fs.existsSync(contentDir)) {
    console.log('No blog content directory found');
    fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
    return;
  }

  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

  const mdxEntries = files
    .map((filename) => {
      const filePath = path.join(contentDir, filename);
      try {
        return processMdxFile(filePath, filename);
      } catch (error) {
        console.warn(`Error processing ${filename}:`, error.message);
        return null;
      }
    })
    .filter(Boolean);

  const jsonEntries = loadBlogPostsJson();

  // Merge: prefer MDX entries, fill in missing slugs from JSON
  const allSlugs = new Set([...mdxEntries.map((e) => e.slug), ...jsonEntries.map((e) => e.slug)]);
  const entries = [];
  for (const slug of allSlugs) {
    const mdxEntry = mdxEntries.find((e) => e.slug === slug);
    const jsonEntry = jsonEntries.find((e) => e.slug === slug);
    if (mdxEntry) {
      entries.push(mdxEntry);
    } else if (jsonEntry) {
      entries.push(jsonEntry);
    }
  }

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2));
  console.log(`Generated blog-manifest.json with ${entries.length} posts`);
}

main();
