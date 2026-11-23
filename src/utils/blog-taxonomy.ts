import authorsData from '../data/authors.json';
import authorsOptOutData from '../data/authors-optout.json';

/**
 * Pure blog taxonomy helpers (tags and authors).
 *
 * Kept free of `import.meta.glob` so the edge middleware and the build
 * scripts (OG images, sitemap) can share the exact rules the blog pages use.
 */

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

export const COLLAPSED_AUTHOR_NAME = 'Wraith Team';

const authors = (authorsData ?? {}) as Record<string, Author>;
const optOutList = (authorsOptOutData ?? []) as string[];

/**
 * Returns the public author profile for an id, or undefined if the author
 * opted out (or is unknown). Opted-out and unknown ids never get a page.
 */
export function getAuthorById(id: string): AuthorProfile | undefined {
  const author = ownAuthor(id);
  if (!author) return undefined;
  if (optOutList.includes(id) || !author.optIn) return undefined;
  return { ...author, id };
}

/** Own-property lookup, so ids like `constructor` never resolve to an author. */
function ownAuthor(id: string): Author | undefined {
  return Object.prototype.hasOwnProperty.call(authors, id) ? authors[id] : undefined;
}

/** Every author that has a public archive page, sorted by id. */
export function listPublicAuthors(): AuthorProfile[] {
  return Object.keys(authors)
    .sort()
    .map((id) => getAuthorById(id))
    .filter((author): author is AuthorProfile => author !== undefined);
}

/**
 * Resolves a raw frontmatter author id into a display name and an optional
 * page link id. Opted-out authors collapse to "Wraith Team" with no link;
 * unknown ids fall back to the raw string with no link (graceful, no crash).
 */
export function resolveAuthor(authorId: string): { name: string; linkId: string | null } {
  if (optOutList.includes(authorId)) {
    return { name: COLLAPSED_AUTHOR_NAME, linkId: null };
  }

  const author = ownAuthor(authorId);
  if (author && author.optIn) {
    return { name: author.name, linkId: authorId };
  }
  if (author && !author.optIn) {
    return { name: COLLAPSED_AUTHOR_NAME, linkId: null };
  }

  return { name: authorId, linkId: null };
}

export function slugifyTag(tag: string): string {
  return String(tag)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
