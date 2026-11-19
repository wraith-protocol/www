import { describe, expect, it } from 'vitest';
import {
  ARCHIVE_ROBOTS_INDEX,
  ARCHIVE_ROBOTS_NOINDEX,
  archiveDescription,
  archiveImagePath,
  archiveTitle,
  findTagForSlug,
  isArchivePath,
  isIndexableAuthorId,
  isValidArchiveSlug,
  parseArchivePath,
  slugifyTag,
} from '../utils/blog-archives';

const TAGS = ['privacy', 'stealth-payments', 'wave-7', 'Wave 8'];
const AUTHORS = {
  'lena-vogt': { optIn: true },
  'wraith-team': { optIn: false },
};

describe('blog archive slug policy', () => {
  it('canonicalizes tags into lowercase dash-separated slugs', () => {
    expect(slugifyTag('Stealth Payments')).toBe('stealth-payments');
    expect(slugifyTag('  WAVE 7  ')).toBe('wave-7');
    expect(slugifyTag('C++ & Rust')).toBe('c-rust');
  });

  it('accepts canonical slugs only', () => {
    expect(isValidArchiveSlug('stealth-payments')).toBe(true);
    expect(isValidArchiveSlug('wave-7')).toBe(true);
    expect(isValidArchiveSlug('')).toBe(false);
    expect(isValidArchiveSlug('Stealth-Payments')).toBe(false);
    expect(isValidArchiveSlug('stealth_payments')).toBe(false);
    expect(isValidArchiveSlug('stealth%20payments')).toBe(false);
    expect(isValidArchiveSlug('-stealth-payments')).toBe(false);
    expect(isValidArchiveSlug('stealth--payments')).toBe(false);
  });

  it('parses known archive paths', () => {
    expect(parseArchivePath('/blog/tag/stealth-payments')).toEqual({
      kind: 'tag',
      slug: 'stealth-payments',
      routePath: '/blog/tag/stealth-payments',
    });
    expect(parseArchivePath('/blog/author/lena-vogt')).toEqual({
      kind: 'author',
      slug: 'lena-vogt',
      routePath: '/blog/author/lena-vogt',
    });
    expect(parseArchivePath('/blog/tag/privacy/')).toEqual({
      kind: 'tag',
      slug: 'privacy',
      routePath: '/blog/tag/privacy',
    });
  });

  it('rejects malformed or nested archive paths', () => {
    const malformed = [
      '/blog/tag/',
      '/blog/author/',
      '/blog/tag/Not-A-Tag',
      '/blog/author/lena_vogt',
      '/blog/tag/stealth%20payments',
      '/blog/tag/stealth-payments/extra',
      '/blog/tag//privacy',
      '/blog/post/privacy',
      '/blog/tag',
      '/blog/author',
    ];

    for (const path of malformed) {
      expect(parseArchivePath(path), `${path} must not parse`).toBeNull();
    }
  });

  it('recognises the archive namespace even when the slug is malformed', () => {
    expect(isArchivePath('/blog/tag/Not-A-Tag')).toBe(true);
    expect(isArchivePath('/blog/author/lena_vogt')).toBe(true);
    expect(isArchivePath('/blog/tag')).toBe(true);
    expect(isArchivePath('/blog/some-post')).toBe(false);
    expect(isArchivePath('/blog')).toBe(false);
  });
});

describe('blog archive indexability policy', () => {
  it('resolves a tag slug back to its source tag', () => {
    expect(findTagForSlug('stealth-payments', TAGS)).toBe('stealth-payments');
    expect(findTagForSlug('wave-7', TAGS)).toBe('wave-7');
    expect(findTagForSlug('wave-8', TAGS)).toBe('Wave 8');
    expect(findTagForSlug('nonexistent-tag', TAGS)).toBeUndefined();
    expect(findTagForSlug('Wave-7', TAGS)).toBeUndefined();
  });

  it('indexes only opted-in authors who are not on the opt-out list', () => {
    expect(isIndexableAuthorId('lena-vogt', AUTHORS, [])).toBe(true);
    expect(isIndexableAuthorId('wraith-team', AUTHORS, [])).toBe(false);
    expect(isIndexableAuthorId('lena-vogt', AUTHORS, ['lena-vogt'])).toBe(false);
    expect(isIndexableAuthorId('nobody', AUTHORS, [])).toBe(false);
    expect(isIndexableAuthorId('Lena-Vogt', AUTHORS, [])).toBe(false);
  });

  it('exposes the robots directives used by the app and middleware', () => {
    expect(ARCHIVE_ROBOTS_INDEX).toBe('index, follow');
    expect(ARCHIVE_ROBOTS_NOINDEX).toBe('noindex, nofollow');
  });
});

describe('blog archive metadata policy', () => {
  it('builds localized titles and descriptions for tags', () => {
    const en = archiveDescription('tag', 'stealth-payments', 'en');
    const es = archiveDescription('tag', 'stealth-payments', 'es');
    const pt = archiveDescription('tag', 'stealth-payments', 'pt');

    expect(archiveTitle('tag', 'stealth-payments', 'en')).toBe(
      '#stealth-payments — Wraith Protocol',
    );
    expect(en).toContain('stealth-payments');
    expect(es).not.toBe(en);
    expect(pt).not.toBe(en);
    expect(pt).not.toBe(es);
  });

  it('builds localized titles and descriptions for authors', () => {
    const en = archiveDescription('author', 'Lena Vogt', 'en');
    const es = archiveDescription('author', 'Lena Vogt', 'es');
    const pt = archiveDescription('author', 'Lena Vogt', 'pt');

    expect(archiveTitle('author', 'Lena Vogt', 'en')).toBe('Lena Vogt — Wraith Protocol Blog');
    expect(en).toContain('Lena Vogt');
    expect(es).toContain('Lena Vogt');
    expect(pt).toContain('Lena Vogt');
    expect(es).not.toBe(en);
    expect(pt).not.toBe(en);
  });

  it('uses locale-prefixed OG image paths', () => {
    expect(archiveImagePath('tag', 'stealth-payments', 'en')).toBe(
      '/og/blog-tag-stealth-payments.png',
    );
    expect(archiveImagePath('tag', 'stealth-payments', 'es')).toBe(
      '/og/es-blog-tag-stealth-payments.png',
    );
    expect(archiveImagePath('author', 'lena-vogt', 'pt')).toBe('/og/pt-blog-author-lena-vogt.png');
  });
});
