import { describe, expect, it } from 'vitest';
import {
  BlogManifestError,
  FrontmatterError,
  buildBlogManifest,
  deriveExcerpt,
  parseFrontmatter,
  serializeBlogManifest,
} from '../../scripts/blog-manifest-lib.mjs';

const VALID = `---
title: 'A valid post'
date: '2026-07-20'
author: 'lena-vogt'
tags: ['privacy', 'stealth-payments']
---

Body copy.`;

function source(slug: string, body = VALID, file = `src/content/blog/${slug}.mdx`) {
  return { slug, sourceFile: file, source: body };
}

function firstEntry(entries: ReturnType<typeof buildBlogManifest>) {
  const [entry] = entries;
  if (!entry) throw new Error('expected the manifest to contain at least one entry');
  return entry;
}

describe('parseFrontmatter: structured YAML', () => {
  it('parses flow arrays, including quoted items with commas', () => {
    const { data } = parseFrontmatter(`---
title: 'Flow arrays'
tags: ['privacy', "stealth, payments", 'wave-7']
---
body`);
    expect(data.tags).toEqual(['privacy', 'stealth, payments', 'wave-7']);
  });

  it('parses block sequences with Unicode values', () => {
    const { data } = parseFrontmatter(`---
title: 'Unicode'
tags:
  - 'Приватность'
  - 'プライバシー'
  - '🚀 launch'
---
body`);
    expect(data.tags).toEqual(['Приватность', 'プライバシー', '🚀 launch']);
  });

  it('parses multiline flow sequences', () => {
    const { data } = parseFrontmatter(`---
title: 'Multiline flow'
tags: [
  'privacy',
  'stealth-payments'
]
---
body`);
    expect(data.tags).toEqual(['privacy', 'stealth-payments']);
  });

  it('keeps quoted values containing colons, commas and hashes intact', () => {
    const { data } = parseFrontmatter(`---
title: "Stealth: private, by default #1"
excerpt: 'It''s a "quoted" excerpt'
tags: ['privacy']
---
body`);
    expect(data.title).toBe('Stealth: private, by default #1');
    expect(data.excerpt).toBe('It\'s a "quoted" excerpt');
  });

  it('decodes double-quoted escapes and Unicode escapes', () => {
    const { data } = parseFrontmatter(`---
title: "Quote: \\"inner\\" \\u00e9"
tags: ['privacy']
---
body`);
    expect(data.title).toBe('Quote: "inner" é');
  });

  it('parses literal block scalars with preserved newlines', () => {
    const { data } = parseFrontmatter(`---
title: 'Literal'
excerpt: |
  First line.
  Second line.
tags: ['privacy']
---
body`);
    expect(data.excerpt).toBe('First line.\nSecond line.\n');
  });

  it('parses folded block scalars into a single line', () => {
    const { data } = parseFrontmatter(`---
title: 'Folded'
excerpt: >
  First line.
  Second line.
tags: ['privacy']
---
body`);
    expect(data.excerpt).toBe('First line. Second line.\n');
  });

  it('keeps Unicode in plain and quoted scalars', () => {
    const { data } = parseFrontmatter(`---
title: 'Приватные платежи 🚀'
author: "Zoë Müller"
tags: ['privacidade']
---
body`);
    expect(data.title).toBe('Приватные платежи 🚀');
    expect(data.author).toBe('Zoë Müller');
  });

  it('parses booleans, numbers and nulls', () => {
    const { data } = parseFrontmatter(`---
title: 'Types'
draft: true
order: 3
nothing: null
tags: ['privacy']
---
body`);
    expect(data.draft).toBe(true);
    expect(data.order).toBe(3);
    expect(data.nothing).toBeNull();
  });

  it('strips comments outside quoted values', () => {
    const { data } = parseFrontmatter(`---
title: 'Comment test' # trailing comment
tags: ['privacy'] # another
---
body`);
    expect(data.title).toBe('Comment test');
    expect(data.tags).toEqual(['privacy']);
  });

  it('parses nested mappings', () => {
    const { data } = parseFrontmatter(`---
title: 'Nested'
tags: ['privacy']
seo:
  title: 'Nested title'
  priority: 1
---
body`);
    expect(data.seo).toEqual({ title: 'Nested title', priority: 1 });
  });

  it('separates the body from the frontmatter', () => {
    const { content } = parseFrontmatter(`---
title: 'Body'
tags: ['privacy']
---

# Heading

Paragraph.`);
    expect(content).toBe('# Heading\n\nParagraph.');
  });

  it('handles CRLF line endings', () => {
    const { data, content } = parseFrontmatter(
      `---\r\ntitle: 'CRLF'\r\ntags: ['privacy']\r\n---\r\n\r\nBody.`,
    );
    expect(data.title).toBe('CRLF');
    expect(content).toBe('Body.');
  });
});

describe('parseFrontmatter: malformed input', () => {
  it('rejects a missing frontmatter block', () => {
    expect(() => parseFrontmatter('No frontmatter here', 'post.mdx')).toThrow(FrontmatterError);
    expect(() => parseFrontmatter('No frontmatter here', 'post.mdx')).toThrow(
      /missing frontmatter block/,
    );
  });

  it('rejects an unterminated frontmatter block', () => {
    expect(() => parseFrontmatter(`---\ntitle: 'Broken'\ntags: ['privacy']`, 'post.mdx')).toThrow(
      /unterminated frontmatter block/,
    );
  });

  it('rejects lines that are not key/value pairs', () => {
    expect(() =>
      parseFrontmatter(`---\ntitle: 'Broken'\njust a sentence\ntags: ['privacy']\n---\nbody`),
    ).toThrow(/expected "key: value"/);
  });

  it('rejects duplicate keys', () => {
    expect(() =>
      parseFrontmatter(`---
title: 'One'
title: 'Two'
tags: ['privacy']
---
body`),
    ).toThrow(/duplicate key "title"/);
  });

  it('rejects unexpected indentation', () => {
    expect(() =>
      parseFrontmatter(`---
title: 'Indent'
  tags: ['privacy']
---
body`),
    ).toThrow(/unexpected indentation/);
  });

  it('rejects tab indentation', () => {
    expect(() => parseFrontmatter(`---\ntitle: 'Tabs'\n\ttags: ['privacy']\n---\nbody`)).toThrow(
      /tab indentation/,
    );
  });

  it('rejects unterminated quoted values', () => {
    expect(() =>
      parseFrontmatter(`---
title: "Unclosed
tags: ['privacy']
---
body`),
    ).toThrow(/unterminated quoted value/);
  });

  it('rejects unterminated flow sequences', () => {
    expect(() =>
      parseFrontmatter(`---
title: 'Flow'
tags: ['privacy'
---
body`),
    ).toThrow(/unterminated flow sequence/);
  });

  it('rejects invalid block scalar headers', () => {
    expect(() =>
      parseFrontmatter(`---
title: 'Block'
excerpt: |x
  text
tags: ['privacy']
---
body`),
    ).toThrow(/invalid block scalar header/);
  });
});

describe('buildBlogManifest: validation', () => {
  it('builds a normalized, deterministic manifest entry', () => {
    const entry = firstEntry(
      buildBlogManifest(
        [
          source(
            'valid-post',
            `---
title: 'Valid post'
date: 2026-07-20
author: 'lena-vogt'
excerpt: 'An excerpt.'
tags: ['Privacy', 'privacy', 'stealth-payments']
locale: 'en'
draft: false
---

Body copy.`,
          ),
        ],
        {
          authors: { 'lena-vogt': { name: 'Lena Vogt', optIn: true } },
        },
      ),
    );

    expect(entry.slug).toBe('valid-post');
    expect(entry.date).toBe('2026-07-20');
    expect(entry.author).toBe('lena-vogt');
    expect(entry.authorName).toBe('Lena Vogt');
    expect(entry.authorId).toBe('lena-vogt');
    expect(entry.tags).toEqual(['Privacy', 'privacy', 'stealth-payments']);
    expect(entry.locale).toBe('en');
    expect(entry.draft).toBe(false);
    expect(entry.url).toBe('https://usewraith.xyz/blog/valid-post');
    expect(entry.content).toBe('Body copy.');
  });

  it('collapses opted-out authors and keeps unknown authors verbatim', () => {
    const entries = buildBlogManifest(
      [
        source(
          'opted-out',
          `---
title: 'Opted out'
date: '2026-07-20'
author: 'wraith-team'
tags: ['privacy']
---
body`,
        ),
        source(
          'unknown',
          `---
title: 'Unknown'
date: '2026-07-21'
author: 'Guest Author'
tags: ['privacy']
---
body`,
        ),
      ],
      {
        authors: { 'wraith-team': { name: 'Wraith Protocol Team', optIn: false } },
        optOut: ['wraith-team'],
      },
    );

    expect(entries.find((entry) => entry.slug === 'opted-out')?.authorName).toBe('Wraith Team');
    expect(entries.find((entry) => entry.slug === 'opted-out')?.authorId).toBeNull();
    expect(entries.find((entry) => entry.slug === 'unknown')?.authorName).toBe('Guest Author');
    expect(entries.find((entry) => entry.slug === 'unknown')?.authorId).toBeNull();
  });

  it('defaults locale to en and draft to false', () => {
    const entry = firstEntry(buildBlogManifest([source('defaults')]));
    expect(entry.locale).toBe('en');
    expect(entry.draft).toBe(false);
  });

  it('sorts newest-first and breaks date ties by slug', () => {
    const entries = buildBlogManifest([
      source(
        'b-post',
        `---
title: 'B'
date: '2026-07-20'
author: 'a'
tags: ['x']
---
body`,
      ),
      source(
        'a-post',
        `---
title: 'A'
date: '2026-07-20'
author: 'a'
tags: ['x']
---
body`,
      ),
      source(
        'newest',
        `---
title: 'Newest'
date: '2026-08-01'
author: 'a'
tags: ['x']
---
body`,
      ),
    ]);

    expect(entries.map((entry) => entry.slug)).toEqual(['newest', 'a-post', 'b-post']);
  });

  it('rejects duplicate slugs', () => {
    expect(() =>
      buildBlogManifest([source('same-slug'), source('same-slug', VALID, 'other.mdx')]),
    ).toThrow(BlogManifestError);
    expect(() =>
      buildBlogManifest([source('same-slug'), source('same-slug', VALID, 'other.mdx')]),
    ).toThrow(/duplicate slug "same-slug"/);
  });

  it('rejects invalid slugs', () => {
    expect(() => buildBlogManifest([source('Not_A_Slug')])).toThrow(/lowercase kebab-case/);
  });

  it('rejects missing and invalid required fields', () => {
    const bad = `---
date: '2026-07-20'
author: ''
tags: 'privacy'
locale: 'fr'
draft: 'yes'
---
body`;

    try {
      buildBlogManifest([source('bad-post', bad)]);
      throw new Error('expected buildBlogManifest to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BlogManifestError);
      const messages = (error as InstanceType<typeof BlogManifestError>).messages.join('\n');
      expect(messages).toContain('required field "title"');
      expect(messages).toContain('required field "author"');
      expect(messages).toContain('required field "tags" must be an array');
      expect(messages).toContain('field "locale" must be one of');
      expect(messages).toContain('field "draft" must be a boolean');
    }
  });

  it('rejects invalid dates, including impossible calendar dates', () => {
    for (const date of ['not-a-date', '2026-13-40', '2026-02-30']) {
      expect(() =>
        buildBlogManifest([
          source(
            'bad-date',
            `---
title: 'Bad date'
date: '${date}'
author: 'a'
tags: ['x']
---
body`,
          ),
        ]),
      ).toThrow(/required field "date"/);
    }
  });

  it('accepts ISO timestamps and normalizes them to a date', () => {
    const entry = firstEntry(
      buildBlogManifest([
        source(
          'timestamp',
          `---
title: 'Timestamp'
publishedAt: '2026-07-20T12:34:56.000Z'
author: 'a'
tags: ['x']
---
body`,
        ),
      ]),
    );
    expect(entry.date).toBe('2026-07-20');
  });

  it('reports malformed frontmatter per file', () => {
    const missingFields = `---
title: 'No date or tags'
author: 'a'
---
body`;
    const malformed = `---
title: 'Unterminated
tags: ['privacy']
---
body`;
    const unterminated = `---
title: 'Open quote
---
body`;

    try {
      buildBlogManifest([
        source('missing-fields', missingFields),
        source('malformed-block', malformed),
        source('unterminated-quote', unterminated),
      ]);
      throw new Error('expected buildBlogManifest to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BlogManifestError);
      const messages = (error as InstanceType<typeof BlogManifestError>).messages.join('\n');
      expect(messages).toContain('src/content/blog/missing-fields.mdx: required field "date"');
      expect(messages).toContain('src/content/blog/missing-fields.mdx: required field "tags"');
      expect(messages).toContain(
        'src/content/blog/malformed-block.mdx: unexpected text after quoted value',
      );
      expect(messages).toContain(
        'src/content/blog/unterminated-quote.mdx: unterminated quoted value',
      );
    }
  });

  it('serializes deterministically with a stable key order', () => {
    const entries = buildBlogManifest([source('valid-post')]);
    const first = serializeBlogManifest(entries);
    const second = serializeBlogManifest(buildBlogManifest([source('valid-post')]));

    expect(first).toBe(second);
    expect(first.endsWith('\n')).toBe(true);
    expect(Object.keys(JSON.parse(first)[0])).toEqual([
      'slug',
      'title',
      'excerpt',
      'content',
      'date',
      'author',
      'authorName',
      'authorId',
      'tags',
      'locale',
      'draft',
      'url',
      'sourceFile',
    ]);
  });
});

describe('deriveExcerpt', () => {
  it('falls back to the first body paragraph when excerpt is absent', () => {
    const entry = firstEntry(
      buildBlogManifest([
        source(
          'no-excerpt',
          `---
title: 'No excerpt'
date: '2026-07-20'
author: 'a'
tags: ['x']
---

# Heading

The **first** paragraph is used as the excerpt.

Second paragraph.`,
        ),
      ]),
    );
    expect(entry.excerpt).toBe('The first paragraph is used as the excerpt.');
  });

  it('ignores code fences and empty content', () => {
    expect(deriveExcerpt('```\ncode\n```\n')).toBe('');
  });
});
