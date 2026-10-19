import { describe, expect, it } from 'vitest';
import {
  parseFrontmatter,
  validateFrontmatter,
  buildManifestEntries,
  readManifest,
  resolveAuthorName,
  isIsoDate,
  isStringArray,
  BlogManifestError,
} from '../../scripts/lib/blog-manifest.mjs';

type ManifestEntry = {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  url: string;
};

const base = (overrides: Record<string, unknown> = {}) => ({
  title: 'T',
  date: '2026-07-20',
  author: 'wraith-team',
  excerpt: 'E',
  tags: ['a', 'b'],
  ...overrides,
});

describe('parseFrontmatter', () => {
  it('parses standard frontmatter', () => {
    const { data, body } = parseFrontmatter(
      "---\ntitle: 'T'\ndate: '2026-07-20'\n---\n\nbody",
      'x.mdx',
    );
    expect(data.title).toBe('T');
    expect(data.date).toBe('2026-07-20');
    expect(body).toContain('body');
  });

  it('parses YAML arrays', () => {
    const { data } = parseFrontmatter('---\ntags: [privacy, stealth-payments]\n---\n', 'x.mdx');
    expect(data.tags).toEqual(['privacy', 'stealth-payments']);
  });

  it('parses quoted string values', () => {
    const { data } = parseFrontmatter(
      '---\ntitle: "Hello, World"\nauthor: \'lena-vogt\'\n---\n',
      'x.mdx',
    );
    expect(data.title).toBe('Hello, World');
    expect(data.author).toBe('lena-vogt');
  });

  it('parses multiline values', () => {
    const { data } = parseFrontmatter('---\nexcerpt: |\n  line one\n  line two\n---\n', 'x.mdx');
    expect(data.excerpt).toContain('line one');
    expect(data.excerpt).toContain('line two');
  });

  it('parses special characters in values', () => {
    const { data } = parseFrontmatter("---\ntitle: 'Café & co: 50%'\n---\n", 'x.mdx');
    expect(data.title).toBe('Café & co: 50%');
  });

  it('throws on malformed YAML', () => {
    expect(() => parseFrontmatter('---\ntitle: [unclosed\n---\n', 'bad.mdx')).toThrow(
      BlogManifestError,
    );
  });

  it('throws on missing frontmatter', () => {
    expect(() => parseFrontmatter('just body', 'nofm.mdx')).toThrow(BlogManifestError);
  });

  it('throws when frontmatter is not a mapping', () => {
    expect(() => parseFrontmatter('---\n- item1\n- item2\n---\n', 'arr.mdx')).toThrow(
      BlogManifestError,
    );
  });
});

describe('validateFrontmatter', () => {
  it('returns a normalized manifest entry for valid data', () => {
    const entry = validateFrontmatter(base(), 'x.mdx', 'slug');
    expect(entry).toEqual({
      slug: 'slug',
      title: 'T',
      date: '2026-07-20',
      author: 'wraith-team',
      excerpt: 'E',
      tags: ['a', 'b'],
      url: 'https://usewraith.xyz/blog/slug',
    });
  });

  it('throws on missing required fields', () => {
    expect(() => validateFrontmatter({ title: 'T' }, 'x.mdx', 'slug')).toThrow(BlogManifestError);
  });

  it('throws on invalid date', () => {
    expect(() => validateFrontmatter(base({ date: 'not-a-date' }), 'x.mdx', 'slug')).toThrow(
      BlogManifestError,
    );
  });

  it('throws on invalid author format', () => {
    expect(() => validateFrontmatter(base({ author: 42 }), 'x.mdx', 'slug')).toThrow(
      BlogManifestError,
    );
    expect(() => validateFrontmatter(base({ author: '' }), 'x.mdx', 'slug')).toThrow(
      BlogManifestError,
    );
  });

  it('throws on invalid tag types', () => {
    expect(() => validateFrontmatter(base({ tags: 'not-array' }), 'x.mdx', 'slug')).toThrow(
      BlogManifestError,
    );
    expect(() => validateFrontmatter(base({ tags: [1, 2] }), 'x.mdx', 'slug')).toThrow(
      BlogManifestError,
    );
  });

  it('throws on non-string title', () => {
    expect(() => validateFrontmatter(base({ title: null }), 'x.mdx', 'slug')).toThrow(
      BlogManifestError,
    );
  });

  it('identifies the affected file and field in the error', () => {
    try {
      validateFrontmatter(base({ date: 'bad' }), 'src/content/blog/x.mdx', 'slug');
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BlogManifestError);
      expect((error as BlogManifestError).file).toBe('src/content/blog/x.mdx');
      expect((error as BlogManifestError).field).toBe('date');
      expect(String(error)).toContain('src/content/blog/x.mdx');
      expect(String(error)).toContain('date');
    }
  });
});

describe('date and tag helpers', () => {
  it('validates ISO dates', () => {
    expect(isIsoDate('2026-07-20')).toBe(true);
    expect(isIsoDate('2026-07-20T12:00:00Z')).toBe(true);
    expect(isIsoDate('not-a-date')).toBe(false);
    expect(isIsoDate('')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it('validates string arrays', () => {
    expect(isStringArray(['a', 'b'])).toBe(true);
    expect(isStringArray([])).toBe(true);
    expect(isStringArray('a')).toBe(false);
    expect(isStringArray([1, 'b'])).toBe(false);
    expect(isStringArray(null)).toBe(false);
  });
});

describe('manifest generation', () => {
  it('builds entries from all MDX posts sorted by date desc', () => {
    const entries = buildManifestEntries() as ManifestEntry[];
    expect(entries.length).toBeGreaterThan(0);
    const slugs = entries.map((e) => e.slug);
    expect(slugs).toContain('wave-7-kickoff');
    expect(slugs).toContain('privacy-by-default');
    const dates = entries.map((e) => new Date(e.date).getTime());
    const sorted = dates.every((d, i) => i === 0 || (dates[i - 1] ?? 0) >= d);
    expect(sorted).toBe(true);
  });

  it('produces deterministic output', () => {
    const a = buildManifestEntries();
    const b = buildManifestEntries();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('entries have required fields and valid types', () => {
    const entries = buildManifestEntries() as ManifestEntry[];
    for (const entry of entries) {
      expect(typeof entry.slug).toBe('string');
      expect(typeof entry.title).toBe('string');
      expect(entry.title.length).toBeGreaterThan(0);
      expect(isIsoDate(entry.date)).toBe(true);
      expect(typeof entry.author).toBe('string');
      expect(entry.author.length).toBeGreaterThan(0);
      expect(typeof entry.excerpt).toBe('string');
      expect(Array.isArray(entry.tags)).toBe(true);
      expect(entry.tags.every((t) => typeof t === 'string')).toBe(true);
      expect(entry.url).toBe(`https://usewraith.xyz/blog/${entry.slug}`);
    }
  });

  it('reads the generated manifest', () => {
    const manifest = readManifest() as ManifestEntry[];
    expect(manifest.length).toBe(buildManifestEntries().length);
  });
});

describe('resolveAuthorName', () => {
  it('resolves opted-in author to display name', () => {
    expect(resolveAuthorName('lena-vogt')).toBe('Lena Vogt');
  });

  it('collapses opted-out author to Wraith Team', () => {
    expect(resolveAuthorName('wraith-team')).toBe('Wraith Team');
  });

  it('falls back to raw id for unknown authors', () => {
    expect(resolveAuthorName('does-not-exist')).toBe('does-not-exist');
  });

  it('returns Wraith Team for empty author', () => {
    expect(resolveAuthorName('')).toBe('Wraith Team');
  });
});
