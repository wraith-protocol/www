import type { ComponentType } from 'react';
import GithubSlugger from 'github-slugger';
import authorsData from '../data/authors.json';
import authorsOptOutData from '../data/authors-optout.json';
import blogManifestData from '../data/blog-manifest.json';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface AuthorLinks {
  website?: string;
  github?: string;
  twitter?: string;
  email?: string;
}

export interface Author {
  name: string;
  bio: string;
  avatar?: string;
  links?: AuthorLinks;
  optIn: boolean;
}

export type AuthorProfile = Author & { id: string };

export interface BlogManifestEntry {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  authorName: string;
  authorId: string | null;
  tags: string[];
  locale: string;
  draft: boolean;
  url: string;
  sourceFile: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  authorName: string;
  authorId: string | null;
  excerpt: string;
  tags: string[];
  locale: string;
  readingTimeMin: number;
  wordCount: number;
  toc: TocItem[];
  Component: ComponentType;
}

const COLLAPSED_NAME = 'Wraith Team';

const authors = (authorsData ?? {}) as Record<string, Author>;
const optOutList = (authorsOptOutData ?? []) as string[];
const manifest = (blogManifestData ?? []) as BlogManifestEntry[];

/**
 * Returns the public author profile for an id, or undefined if the author
 * opted out (or is unknown). Opted-out and unknown ids never get a page.
 */
export function getAuthorById(id: string): AuthorProfile | undefined {
  const author = authors[id];
  if (!author) return undefined;
  if (optOutList.includes(id) || !author.optIn) return undefined;
  return { ...author, id };
}

/**
 * Resolves a raw frontmatter author id into a display name and an optional
 * page link id. Opted-out authors collapse to "Wraith Team" with no link;
 * unknown ids fall back to the raw string with no link (graceful, no crash).
 */
export function resolveAuthor(authorId: string): { name: string; linkId: string | null } {
  if (optOutList.includes(authorId)) {
    return { name: COLLAPSED_NAME, linkId: null };
  }

  const author = authors[authorId];
  if (author && author.optIn) {
    return { name: author.name, linkId: authorId };
  }
  if (author && !author.optIn) {
    return { name: COLLAPSED_NAME, linkId: null };
  }

  return { name: authorId, linkId: null };
}

interface MDXModule {
  default: ComponentType;
}

// Only the MDX component is loaded at runtime. All post metadata (title, date,
// author, tags, excerpt, locale, draft state) comes from the generated manifest
// so the app, RSS, sitemap and OG generators read the same structured source.
const modules = import.meta.glob<MDXModule>('/src/content/blog/*.mdx', { eager: true });

const componentsBySlug = new Map<string, ComponentType>();
for (const [filepath, mod] of Object.entries(modules)) {
  const filename = filepath.split('/').pop() || '';
  componentsBySlug.set(filename.replace(/\.mdx$/, ''), mod.default);
}

function buildToc(body: string): TocItem[] {
  const slugger = new GithubSlugger();
  const toc: TocItem[] = [];
  const headingRegex = /^(##|###)\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(body)) !== null) {
    if (!match[1] || !match[2]) continue;
    const level = match[1].length;
    const text = match[2].trim();
    const cleanText = text.replace(/[*_`]/g, '');
    toc.push({ id: slugger.slug(cleanText), text: cleanText, level });
  }
  return toc;
}

// Cache posts to avoid re-parsing on every call
let cachedPosts: BlogPost[] | null = null;

export function getAllPosts(): BlogPost[] {
  if (cachedPosts) return cachedPosts;

  cachedPosts = manifest
    .filter((entry) => !entry.draft)
    .map((entry): BlogPost | null => {
      const Component = componentsBySlug.get(entry.slug);
      if (!Component) return null;

      const body = entry.content;
      const words = body.split(/\s+/).filter(Boolean).length;

      return {
        slug: entry.slug,
        title: entry.title,
        date: entry.date,
        author: entry.author,
        authorName: entry.authorName,
        authorId: entry.authorId,
        excerpt: entry.excerpt,
        tags: entry.tags,
        locale: entry.locale,
        readingTimeMin: Math.max(1, Math.ceil(words / 200)),
        wordCount: words,
        toc: buildToc(body),
        Component,
      };
    })
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return cachedPosts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const posts = getAllPosts();
  return posts.find((p) => p.slug === slug);
}

export function getPostsByAuthor(id: string): BlogPost[] {
  return getAllPosts().filter((p) => p.author === id && p.authorId === id);
}

export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tagSet = new Set<string>();
  posts.forEach((post) => {
    post.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

export function slugifyTag(tag: string): string {
  return String(tag)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getTagFromSlug(slug: string): string | undefined {
  return getAllTags().find((tag) => slugifyTag(tag) === slug);
}

export function getPostsByTag(tag: string): BlogPost[] {
  return getAllPosts().filter((post) => post.tags.includes(tag));
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const all = getAllPosts();
  const current = all.find((post) => post.slug === slug);
  if (!current) return [];

  const currentTags = new Set(current.tags);

  return all
    .filter((post) => post.slug !== slug)
    .map((post) => ({
      post,
      overlap: post.tags.filter((tag) => currentTags.has(tag)).length,
    }))
    .filter((entry) => entry.overlap > 0)
    .sort(
      (a, b) =>
        b.overlap - a.overlap || new Date(b.post.date).getTime() - new Date(a.post.date).getTime(),
    )
    .slice(0, limit)
    .map((entry) => entry.post);
}
