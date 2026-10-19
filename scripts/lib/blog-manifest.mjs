import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const contentDir = path.join(rootDir, 'src', 'content', 'blog');
const manifestPath = path.join(rootDir, 'src', 'data', 'blog-manifest.json');
const authorsPath = path.join(rootDir, 'src', 'data', 'authors.json');
const optOutPath = path.join(rootDir, 'src', 'data', 'authors-optout.json');

export const REQUIRED_FIELDS = ['title', 'date', 'author', 'excerpt', 'tags'];

export class BlogManifestError extends Error {
  constructor(file, field, message) {
    super(`${file}: ${field} — ${message}`);
    this.name = 'BlogManifestError';
    this.file = file;
    this.field = field;
  }
}

function loadJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

let authorsCache = null;
let optOutCache = null;

function loadAuthors() {
  if (authorsCache === null) {
    authorsCache = fs.existsSync(authorsPath) ? loadJsonFile(authorsPath) : {};
  }
  return authorsCache;
}

function loadOptOut() {
  if (optOutCache === null) {
    optOutCache = fs.existsSync(optOutPath) ? loadJsonFile(optOutPath) : [];
  }
  return optOutCache;
}

export function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

export function isStringArray(v) {
  return Array.isArray(v) && v.every((item) => typeof item === 'string');
}

export function isIsoDate(value) {
  if (!isNonEmptyString(value)) return false;
  const iso = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
  if (!iso.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function parseFrontmatter(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new BlogManifestError(file, 'frontmatter', 'missing frontmatter block (--- ... ---)');
  }

  const frontmatter = match[1];
  const body = source.slice(match[0].length);

  let data;
  try {
    const parsed = parse(frontmatter);
    if (parsed === null || parsed === undefined) {
      data = {};
    } else if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BlogManifestError(file, 'frontmatter', 'frontmatter must be a YAML mapping');
    } else {
      data = parsed;
    }
  } catch (error) {
    if (error instanceof BlogManifestError) throw error;
    throw new BlogManifestError(file, 'frontmatter', `malformed YAML: ${error.message}`);
  }

  return { data, body };
}

export function validateFrontmatter(data, file, slug) {
  const failures = [];

  for (const field of REQUIRED_FIELDS) {
    if (!(field in data)) {
      failures.push(`missing required field "${field}"`);
    }
  }
  if (failures.length > 0) {
    throw new BlogManifestError(file, 'frontmatter', failures.join('; '));
  }

  const title = data.title;
  const date = data.date;
  const author = data.author;
  const excerpt = data.excerpt;
  const tags = data.tags;

  if (!isNonEmptyString(title)) {
    throw new BlogManifestError(
      file,
      'title',
      `must be a non-empty string (got ${JSON.stringify(title)})`,
    );
  }
  if (!isIsoDate(date)) {
    throw new BlogManifestError(
      file,
      'date',
      `must be a valid ISO date string (got ${JSON.stringify(date)})`,
    );
  }
  if (!isNonEmptyString(author)) {
    throw new BlogManifestError(
      file,
      'author',
      `must be a non-empty string (got ${JSON.stringify(author)})`,
    );
  }
  if (!isNonEmptyString(excerpt)) {
    throw new BlogManifestError(
      file,
      'excerpt',
      `must be a non-empty string (got ${JSON.stringify(excerpt)})`,
    );
  }
  if (!isStringArray(tags)) {
    throw new BlogManifestError(
      file,
      'tags',
      `must be an array of strings (got ${JSON.stringify(tags)})`,
    );
  }

  return {
    slug,
    title: title.trim(),
    date: date.trim(),
    author: author.trim(),
    excerpt: excerpt.trim(),
    tags: tags.map((t) => t.trim()).filter(Boolean),
    url: `https://usewraith.xyz/blog/${slug}`,
  };
}

export function buildManifestEntries() {
  if (!fs.existsSync(contentDir)) {
    return [];
  }

  const files = fs
    .readdirSync(contentDir)
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
    .sort();

  const entries = files.map((filename) => {
    const filePath = path.join(contentDir, filename);
    const source = fs.readFileSync(filePath, 'utf8');
    const slug = filename.replace(/\.mdx?$/, '');
    const { data } = parseFrontmatter(source, filePath);
    return validateFrontmatter(data, filePath, slug);
  });

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return entries;
}

export function writeManifest(entries) {
  fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2) + '\n');
  console.log(`Generated blog-manifest.json with ${entries.length} posts`);
}

export function readManifest() {
  if (!fs.existsSync(manifestPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return [];
  }
}

export function resolveAuthorName(authorId) {
  if (!authorId) return 'Wraith Team';
  const optOut = loadOptOut();
  if (optOut.includes(authorId)) return 'Wraith Team';
  const authors = loadAuthors();
  const author = authors[authorId];
  if (author && typeof author === 'object' && author.optIn) {
    return author.name ?? authorId;
  }
  if (author && typeof author === 'object') {
    return 'Wraith Team';
  }
  return authorId;
}
