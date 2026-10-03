declare module '../../scripts/gen-rss.mjs' {
  export type RssPost = {
    slug: string;
    title: string;
    excerpt?: string;
    content?: string;
    publishedAt: string;
    author?: string;
    tags?: string[];
    url?: string;
    draft?: boolean | string;
    preview?: boolean | string;
    status?: string;
  };

  export function getPosts(): RssPost[];
  export function isAllowedPost(post: unknown): boolean;
  export function buildRssFeed(
    posts: RssPost[],
    baseUrl?: string,
    options?: { tag?: string },
  ): string;
}

declare module '../scripts/gen-rss.mjs' {
  export type RssPost = {
    slug: string;
    title: string;
    excerpt?: string;
    content?: string;
    publishedAt: string;
    author?: string;
    tags?: string[];
    url?: string;
    draft?: boolean | string;
    preview?: boolean | string;
    status?: string;
  };

  export function getPosts(): RssPost[];
  export function isAllowedPost(post: unknown): boolean;
  export function buildRssFeed(
    posts: RssPost[],
    baseUrl?: string,
    options?: { tag?: string },
  ): string;
}

declare module './gen-rss.mjs' {
  export type RssPost = {
    slug: string;
    title: string;
    excerpt?: string;
    content?: string;
    publishedAt: string;
    author?: string;
    tags?: string[];
    url?: string;
    draft?: boolean | string;
    preview?: boolean | string;
    status?: string;
  };

  export function getPosts(): RssPost[];
  export function isAllowedPost(post: unknown): boolean;
  export function buildRssFeed(
    posts: RssPost[],
    baseUrl?: string,
    options?: { tag?: string },
  ): string;
}
