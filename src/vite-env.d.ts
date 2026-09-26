/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType } from 'react';
  export const frontmatter: {
    title: string;
    date: string;
    author: string;
    excerpt: string;
    tags: string[];
  };
  const Component: ComponentType;
  export default Component;
}
