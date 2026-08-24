import type { ComponentType } from 'react';
import GithubSlugger from 'github-slugger';

export interface BlogPostFrontmatter {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
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
  excerpt: string;
  tags: string[];
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
const rawModules = import.meta.glob('/src/content/blog/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Cache posts to avoid re-parsing on every call
let cachedPosts: BlogPost[] | null = null;

export function getAllPosts(): BlogPost[] {
  if (cachedPosts) return cachedPosts;

  cachedPosts = Object.entries(modules)
    .map(([filepath, mod]) => {
      const filename = filepath.split('/').pop() || '';
      const slug = filename.replace(/\.mdx$/, '');
      const frontmatter = mod.frontmatter || {};

      const rawContent = rawModules[filepath] || '';
      const body = rawContent.replace(/^---[\s\S]*?^---/m, '');
      const words = body.split(/\s+/).filter(Boolean).length;
      const readingTimeMin = Math.max(1, Math.ceil(words / 200));

      const slugger = new GithubSlugger();
      const toc: TocItem[] = [];
      const headingRegex = /^(##|###)\s+(.+)$/gm;
      let match;
      while ((match = headingRegex.exec(body)) !== null) {
        if (!match[1] || !match[2]) continue;
        const level = match[1].length;
        const text = match[2].trim();
        // Remove markdown formatting like **, _ etc if any
        const cleanText = text.replace(/[*_`]/g, '');
        const id = slugger.slug(cleanText);
        toc.push({ id, text: cleanText, level });
      }

      return {
        slug,
        title: frontmatter.title || slug,
        date: frontmatter.date || '',
        author: frontmatter.author || 'Wraith Team',
        excerpt: frontmatter.excerpt || '',
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        readingTimeMin,
        wordCount: words,
        toc,
        Component: mod.default,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return cachedPosts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const posts = getAllPosts();
  return posts.find((p) => p.slug === slug);
}

export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tagSet = new Set<string>();
  posts.forEach((post) => {
    post.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}
