import type { ComponentType } from 'react';
import GithubSlugger from 'github-slugger';
import blogManifestData from '../data/blog-manifest.json';
import {
  getAuthorById,
  resolveAuthor,
  slugifyTag,
  type Author,
  type AuthorLinks,
  type AuthorProfile,
} from './blog-taxonomy';

export { getAuthorById, resolveAuthor, slugifyTag };
export type { Author, AuthorLinks, AuthorProfile };

export interface BlogPostFrontmatter {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
}

interface BlogManifestEntry {
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

export interface TocItem {
  id: string;
  text: string;
  level: number;
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

interface MDXModule {
  default: ComponentType;
  frontmatter: BlogPostFrontmatter;
}

const modules = import.meta.glob<MDXModule>('/src/content/blog/*.mdx', { eager: true });

const componentsBySlug = new Map<string, ComponentType>();
for (const [filepath, mod] of Object.entries(modules)) {
  const filename = filepath.split('/').pop() || '';
  componentsBySlug.set(filename.replace(/\.mdx$/, ''), mod.default);
}

const manifest = (blogManifestData ?? []) as BlogManifestEntry[];

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
