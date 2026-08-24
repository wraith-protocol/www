import type { ComponentType } from 'react';

export interface BlogPostFrontmatter {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  readingTime: string;
  wordCount: number;
  rawContent: string;
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

export function getAllPosts(): BlogPost[] {
  return Object.entries(modules)
    .map(([filepath, mod]) => {
      const filename = filepath.split('/').pop() || '';
      const slug = filename.replace(/\.mdx$/, '');
      const frontmatter = mod.frontmatter || {};

      const rawContent = rawModules[filepath] || '';
      // Strip frontmatter to get more accurate word count
      const bodyContent = rawContent.replace(/^---[\s\S]*?---/, '').trim();
      const words = bodyContent.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

      return {
        slug,
        title: frontmatter.title || slug,
        date: frontmatter.date || '',
        author: frontmatter.author || 'Wraith Team',
        excerpt: frontmatter.excerpt || '',
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        readingTime: `${readingTimeMinutes} min read`,
        wordCount,
        rawContent,
        Component: mod.default,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
