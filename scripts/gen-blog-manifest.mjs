/**
 * Generate src/data/blog-manifest.json from the MDX blog posts.
 *
 * Frontmatter is parsed and validated exactly once, here. Every downstream
 * consumer (app, RSS, sitemap, related posts, OG images) reads the manifest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BlogManifestError,
  buildBlogManifest,
  serializeBlogManifest,
} from './blog-manifest-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const contentDir = path.join(rootDir, 'src', 'content', 'blog');
const outputPath = path.join(rootDir, 'src', 'data', 'blog-manifest.json');
const authorsPath = path.join(rootDir, 'src', 'data', 'authors.json');
const optOutPath = path.join(rootDir, 'src', 'data', 'authors-optout.json');

function parseFrontmatter(source) {
  const frontmatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return { data: {}, content: source };
  }

  const frontmatterContent = frontmatterMatch[1];
  const content = source.slice(frontmatterMatch[0].length);

  const data = {};
  const lines = frontmatterContent.split(/\r?\n/);
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
  const lines = content.split(/\r?\n/);
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

function normalizeTags(value) {
  const list = Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
  return list.map((tag) => String(tag).trim()).filter(Boolean);
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
    tags: normalizeTags(data.tags),
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
      tags: normalizeTags(post.tags),
      url: `https://usewraith.xyz/blog/${post.slug}`,
    }));
}

function main() {
  const sources = readSources();

  let entries;
  try {
    entries = buildBlogManifest(sources, {
      authors: readJson(authorsPath, {}),
      optOut: readJson(optOutPath, []),
    });
  } catch (error) {
    if (error instanceof BlogManifestError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  fs.writeFileSync(outputPath, formatManifest(entries));
  console.log(`Generated blog-manifest.json with ${entries.length} posts`);
}

/**
 * JSON.stringify with short string arrays kept on one line, the way Prettier
 * prints them, so a build never leaves a formatting diff in the manifest.
 */
function formatManifest(entries) {
  const json = JSON.stringify(entries, null, 2);
  return (
    json.replace(
      /^( *)("[^"\n]+": )\[\n((?: *"(?:[^"\\\n]|\\.)*",?\n)+) *\]/gm,
      (match, indent, key, body) => {
        const items = body
          .trim()
          .split('\n')
          .map((line) => line.trim().replace(/,$/, ''));
        const inline = `${indent}${key}[${items.join(', ')}]`;
        return inline.length + 1 <= 100 ? inline : match;
      },
    ) + '\n'
  );
}

main();
