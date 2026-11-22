export interface BlogFrontmatterData {
  title?: unknown;
  date?: unknown;
  publishedAt?: unknown;
  author?: unknown;
  excerpt?: unknown;
  tags?: unknown;
  locale?: unknown;
  draft?: unknown;
  [key: string]: unknown;
}

export interface ParsedFrontmatter {
  data: BlogFrontmatterData;
  content: string;
}

export interface BlogManifestSource {
  slug: string;
  sourceFile?: string;
  source: string;
}

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

export interface BuildBlogManifestOptions {
  authors?: Record<string, { name: string; optIn?: boolean }>;
  optOut?: string[];
}

export const SUPPORTED_LOCALES: string[];
export const BLOG_URL_PREFIX: string;

export class FrontmatterError extends Error {
  file: string;
  reason: string;
}

export class BlogManifestError extends Error {
  messages: string[];
}

export function parseFrontmatter(source: string, file?: string): ParsedFrontmatter;
export function validateFrontmatter(
  data: BlogFrontmatterData,
  options?: { slug?: string },
): string[];
export function deriveExcerpt(content: string, limit?: number): string;
export function buildBlogManifest(
  sources: BlogManifestSource[],
  options?: BuildBlogManifestOptions,
): BlogManifestEntry[];
export function serializeBlogManifest(entries: BlogManifestEntry[]): string;
