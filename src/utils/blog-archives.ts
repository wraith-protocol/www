/**
 * Blog archive SEO policy.
 *
 * Tag and author archives are real pages: when the tag or author exists they
 * are indexable and get a canonical URL, description, OG image and robots
 * directive. When they do not exist (or the slug is malformed) they are
 * non-indexable and must never reach the sitemap or RSS output.
 *
 * This module is pure so the app, the OG metadata resolver, the sitemap
 * generator and the tests can all apply exactly the same rules.
 */

export type ArchiveKind = 'tag' | 'author';
export type ArchiveLocale = 'en' | 'es' | 'pt';

export const ARCHIVE_ROBOTS_INDEX = 'index, follow';
export const ARCHIVE_ROBOTS_NOINDEX = 'noindex, nofollow';

/** Canonical slugs are lowercase alphanumeric words separated by single dashes. */
const CANONICAL_ARCHIVE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARCHIVE_PATH = /^\/blog\/(tag|author)\/([^/]+)\/?$/;

export interface ParsedArchiveRoute {
  kind: ArchiveKind;
  slug: string;
  routePath: string;
}

export function slugifyTag(tag: string): string {
  return String(tag)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Rejects empty, uppercase, encoded, underscored or otherwise malformed slugs. */
export function isValidArchiveSlug(slug: string): boolean {
  return typeof slug === 'string' && CANONICAL_ARCHIVE_SLUG.test(slug);
}

export function archiveRoutePath(kind: ArchiveKind, slug: string): string {
  return `/blog/${kind}/${slug}`;
}

export function archiveImageKey(kind: ArchiveKind, slug: string): string {
  return `blog-${kind}-${slug}`;
}

/** Public OG image path for an archive, locale-prefixed like every other job. */
export function archiveImagePath(kind: ArchiveKind, slug: string, locale: ArchiveLocale): string {
  const prefix = locale === 'en' ? '' : `${locale}-`;
  return `/og/${prefix}${archiveImageKey(kind, slug)}.png`;
}

/**
 * Parses a locale-stripped pathname into an archive route. Returns null for
 * anything malformed, including extra path segments and non-canonical slugs.
 */
export function parseArchivePath(pathname: string): ParsedArchiveRoute | null {
  const match = pathname.match(ARCHIVE_PATH);
  if (!match) return null;

  const kind = match[1] as ArchiveKind;
  const slug = match[2];
  if (!slug || !isValidArchiveSlug(slug)) return null;

  return { kind, slug, routePath: archiveRoutePath(kind, slug) };
}

/** True when the path is in the archive namespace, even if the slug is malformed. */
export function isArchivePath(pathname: string): boolean {
  return /^\/blog\/(?:tag|author)(?:\/|$)/.test(pathname);
}

/** Resolves a canonical tag slug back to the source tag, or undefined. */
export function findTagForSlug(slug: string, tags: readonly string[]): string | undefined {
  if (!isValidArchiveSlug(slug)) return undefined;
  return tags.find((tag) => slugifyTag(tag) === slug);
}

export function isIndexableTagSlug(slug: string, tags: readonly string[]): boolean {
  return findTagForSlug(slug, tags) !== undefined;
}

interface AuthorLike {
  optIn?: boolean;
}

/**
 * Authors are indexable only when they exist, opted in, and are not on the
 * opt-out list. The slug must also be canonical.
 */
export function isIndexableAuthorId(
  id: string,
  authors: Record<string, AuthorLike>,
  optOut: readonly string[],
): boolean {
  if (!isValidArchiveSlug(id)) return false;
  const author = authors[id];
  if (!author) return false;
  if (optOut.includes(id) || !author.optIn) return false;
  return true;
}

interface ArchiveCopy {
  title: (value: string) => string;
  description: (value: string) => string;
}

const TAG_COPY: Record<ArchiveLocale, ArchiveCopy> = {
  en: {
    title: (tag) => `#${tag} — Wraith Protocol`,
    description: (tag) =>
      `Blog posts tagged ${tag} from Wraith Protocol on private payments and stealth infrastructure.`,
  },
  es: {
    title: (tag) => `#${tag} — Wraith Protocol`,
    description: (tag) =>
      `Artículos del blog etiquetados ${tag} de Wraith Protocol sobre pagos privados e infraestructura de sigilo.`,
  },
  pt: {
    title: (tag) => `#${tag} — Wraith Protocol`,
    description: (tag) =>
      `Posts do blog marcados com ${tag} da Wraith Protocol sobre pagamentos privados e infraestrutura de sigilo.`,
  },
};

const AUTHOR_COPY: Record<ArchiveLocale, ArchiveCopy> = {
  en: {
    title: (name) => `${name} — Wraith Protocol Blog`,
    description: (name) =>
      `Posts by ${name} on Wraith Protocol's privacy-preserving payments blog.`,
  },
  es: {
    title: (name) => `${name} — Wraith Protocol Blog`,
    description: (name) =>
      `Artículos de ${name} en el blog de pagos con privacidad de Wraith Protocol.`,
  },
  pt: {
    title: (name) => `${name} — Wraith Protocol Blog`,
    description: (name) =>
      `Posts de ${name} no blog de pagamentos com privacidade da Wraith Protocol.`,
  },
};

function copyFor(kind: ArchiveKind, locale: ArchiveLocale): ArchiveCopy {
  const table = kind === 'tag' ? TAG_COPY : AUTHOR_COPY;
  return table[locale] ?? table.en;
}

export function archiveTitle(
  kind: ArchiveKind,
  value: string,
  locale: ArchiveLocale = 'en',
): string {
  return copyFor(kind, locale).title(value);
}

export function archiveDescription(
  kind: ArchiveKind,
  value: string,
  locale: ArchiveLocale = 'en',
): string {
  return copyFor(kind, locale).description(value);
}

export function archiveOgImage(
  kind: ArchiveKind,
  value: string,
  locale: ArchiveLocale = 'en',
): { title: string; subtitle: string } {
  return {
    title: kind === 'tag' ? `#${value}` : value,
    subtitle: archiveDescription(kind, value, locale),
  };
}
