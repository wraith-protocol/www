declare module '../../scripts/gen-rss.mjs' {
  export type RssPost = {
    slug: string;
    title: string;
    excerpt?: string;
    content?: string;
    publishedAt: string;
    author?: string;
    url?: string;
  };

  export function getPosts(): RssPost[];
  export function buildRssFeed(posts: RssPost[], baseUrl?: string): string;
}
