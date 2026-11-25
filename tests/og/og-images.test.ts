/**
 * Generated Open Graph image validation.
 *
 * Renders the full OG matrix (core routes, blog posts, case studies, tag
 * archives, author archives × every locale) twice into clean directories and
 * checks the PNGs themselves — dimensions, painted pixels, safe text bounds,
 * fonts and glyphs, filenames, duplicates and route/locale metadata — plus a
 * set of broken fixtures proving each check actually fails.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import blogManifest from '../../src/data/blog-manifest.json';
import caseStudies from '../../src/data/case-studies.json';
import {
  SUPPORTED_LOCALES,
  listBlogTags,
  listOgImageJobs,
  type OgImageJob,
} from '../../src/utils/og-metadata';
import { listPublicAuthors } from '../../src/utils/blog-taxonomy';
import { auditOgDir, generateOgImages, type GenerateOgResult } from '../../scripts/og/generate';
import { decodePng, encodePng } from '../../scripts/og/png';
import {
  DEFAULT_FONT_DIR,
  OG_COLORS,
  OG_FONT_FILES,
  OG_HEIGHT,
  OG_WIDTH,
  loadOgFonts,
  OgFontError,
  renderOgSvg,
  svgToPng,
  titleFontSize,
} from '../../scripts/og/render';
import {
  checkGlyphs,
  checkLayout,
  checkPixels,
  parseTextRuns,
  validateJobMatrix,
  type OgIssueCode,
} from '../../scripts/og/validate';

const FULL_RUN_TIMEOUT = 300_000;

const jobs = listOgImageJobs();
const fonts = loadOgFonts();
const tmpRoot = mkdtempSync(join(tmpdir(), 'wraith-og-'));

function job(file: string): OgImageJob {
  const found = jobs.find((candidate) => candidate.file === file);
  if (!found) throw new Error(`no OG job writes ${file}`);
  return found;
}

const codes = (issues: { code: OgIssueCode }[]) => issues.map((issue) => issue.code);

function solidPng(width: number, height: number, rgba: [number, number, number, number]) {
  const pixels = new Uint8Array(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set(rgba, i);
  return encodePng(width, height, pixels);
}

function surfaceRgba(alpha = 255): [number, number, number, number] {
  const n = parseInt(OG_COLORS.surface.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, alpha];
}

async function renderIssues(target: OgImageJob) {
  const layout = await renderOgSvg(target, fonts, { embedFont: false });
  const painted = await renderOgSvg(target, fonts);
  const png = svgToPng(painted.svg);
  return [
    ...checkPixels(target.file, png),
    ...checkLayout(target, layout.svg),
    ...checkGlyphs(target, [...layout.missingGlyphs, ...painted.missingGlyphs]),
  ];
}

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('og images: matrix', () => {
  it('covers core routes, posts, case studies, tag and author archives in every locale', () => {
    const has = (routePath: string) =>
      SUPPORTED_LOCALES.every((locale) =>
        jobs.some((candidate) => candidate.routePath === routePath && candidate.locale === locale),
      );

    for (const routePath of ['/', '/blog', '/stellar', '/grants', '/use-cases/calculator']) {
      expect(has(routePath), routePath).toBe(true);
    }
    for (const post of blogManifest) {
      expect(has(`/blog/${post.slug}`), post.slug).toBe(true);
    }
    for (const study of caseStudies.entries) {
      expect(has(`/case-studies/${study.slug}`), study.slug).toBe(true);
    }

    const tags = listBlogTags();
    expect(tags.length).toBeGreaterThan(0);
    for (const { slug } of tags) {
      expect(has(`/blog/tag/${slug}`), `tag ${slug}`).toBe(true);
    }

    const authors = listPublicAuthors();
    expect(authors.map((author) => author.id)).toContain('lena-vogt');
    for (const author of authors) {
      expect(has(`/blog/author/${author.id}`), `author ${author.id}`).toBe(true);
    }
  });

  it('gives opted-out and unknown authors no archive card', () => {
    const authorRoutes = jobs.filter((j) => j.kind === 'author').map((j) => j.routePath);
    expect(authorRoutes).not.toContain('/blog/author/wraith-team');
    expect(authorRoutes.some((route) => route.includes('Wraith'))).toBe(false);
  });

  it('carries author and tag metadata on every blog post card', () => {
    const posts = jobs.filter((j) => j.kind === 'post');
    expect(posts.length).toBe(blogManifest.length * SUPPORTED_LOCALES.length);
    for (const post of posts) {
      expect(post.author, post.file).toBeTruthy();
      expect(post.tags?.length, post.file).toBeGreaterThan(0);
      expect(post.byline, post.file).toContain(post.author!);
    }
    const lena = job('es-blog-stealth-addresses-explained.png');
    expect(lena.byline).toBe('Por Lena Vogt');
    expect(lena.tags).toEqual(['cryptography', 'stealth-payments', 'privacy']);
  });

  it('lists jobs in a stable order', () => {
    expect(listOgImageJobs().map((j) => j.file)).toEqual(jobs.map((j) => j.file));
  });

  it('passes every matrix check for the real content', () => {
    expect(validateJobMatrix(jobs)).toEqual([]);
  });
});

describe('og images: generated output', () => {
  let first: GenerateOgResult;
  let second: GenerateOgResult;
  const firstDir = join(tmpRoot, 'run-1', 'og');
  const secondDir = join(tmpRoot, 'run-2', 'og');

  beforeAll(async () => {
    first = await generateOgImages({ outDir: firstDir });
    second = await generateOgImages({ outDir: secondDir });
  }, FULL_RUN_TIMEOUT);

  it('renders every job with zero validation issues', () => {
    expect(first.issues).toEqual([]);
    expect(Object.keys(first.files).sort()).toEqual(jobs.map((j) => j.file).sort());
  });

  it('writes 1200x630 PNGs that decode cleanly', () => {
    for (const file of Object.keys(first.files)) {
      const { width, height } = decodePng(readFileSync(join(firstDir, file)));
      expect([width, height], file).toEqual([OG_WIDTH, OG_HEIGHT]);
    }
  });

  it('is deterministic across two clean runs', () => {
    expect(second.issues).toEqual([]);
    expect(second.files).toEqual(first.files);
  });

  it('never produces two identical images', () => {
    const hashes = Object.values(first.files);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('starts from an empty directory, so stale images cannot survive', async () => {
    const dir = join(tmpRoot, 'stale', 'og');
    const subset = [job('home.png')];
    await generateOgImages({ outDir: dir, jobs: subset, fonts });
    writeFileSync(join(dir, 'blog-tag-removed.png'), 'stale');
    const rerun = await generateOgImages({ outDir: dir, jobs: subset, fonts });
    expect(rerun.issues).toEqual([]);
    expect(existsSync(join(dir, 'blog-tag-removed.png'))).toBe(false);
  });
});

describe('og images: broken output is rejected', () => {
  const home = job('home.png');

  it('flags a blank image', () => {
    expect(codes(checkPixels('blank.png', solidPng(OG_WIDTH, OG_HEIGHT, surfaceRgba())))).toEqual([
      'blank-image',
    ]);
  });

  it('flags a fully transparent image as blank', () => {
    expect(
      codes(checkPixels('clear.png', solidPng(OG_WIDTH, OG_HEIGHT, [255, 255, 255, 0]))),
    ).toEqual(['blank-image']);
  });

  it('flags malformed PNG bytes', async () => {
    const good = svgToPng((await renderOgSvg(home, fonts)).svg);

    const flipped = Buffer.from(good);
    const at = flipped.length - 20;
    flipped.writeUInt8(flipped.readUInt8(at) ^ 0xff, at);
    const truncated = good.subarray(0, Math.floor(good.length / 2));
    const notPng = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');

    for (const [name, bytes] of [
      ['flipped', flipped],
      ['truncated', truncated],
      ['not-png', notPng],
      ['empty', Buffer.alloc(0)],
    ] as const) {
      expect(codes(checkPixels(`${name}.png`, bytes)), name).toEqual(['malformed-image']);
    }
  });

  it('flags wrong dimensions', () => {
    expect(codes(checkPixels('small.png', solidPng(600, 315, [230, 225, 229, 255])))).toEqual([
      'wrong-dimensions',
    ]);
  });

  it('flags paint inside the safe-area margin', () => {
    const fullBleed = solidPng(OG_WIDTH, OG_HEIGHT, [230, 225, 229, 255]);
    expect(codes(checkPixels('full-bleed.png', fullBleed))).toEqual(['unsafe-text-bounds']);
  });

  it('flags a missing font directory without writing any image', async () => {
    const dir = join(tmpRoot, 'no-fonts', 'og');
    const result = await generateOgImages({
      outDir: dir,
      jobs: [home],
      fonts: { dir: join(tmpRoot, 'nowhere') },
    });
    expect(codes(result.issues)).toEqual(['missing-font']);
    expect(Object.keys(result.files)).toEqual([]);
  });

  it('rejects truncated and woff2 font files', () => {
    const dir = mkdtempSync(join(tmpRoot, 'fonts-'));
    const [regular, bold] = OG_FONT_FILES;
    copyFileSync(join(DEFAULT_FONT_DIR, regular.file), join(dir, regular.file));

    writeFileSync(join(dir, bold.file), Buffer.alloc(10));
    expect(() => loadOgFonts(dir)).toThrow(OgFontError);

    const woff2 = Buffer.alloc(4096);
    woff2.write('wOF2', 0, 'latin1');
    writeFileSync(join(dir, bold.file), woff2);
    expect(() => loadOgFonts(dir)).toThrow(/unsupported format/);
  });

  it('flags glyphs no loaded font can draw', async () => {
    const issues = await renderIssues({ ...home, title: 'ステルス支払い' });
    expect(codes(issues)).toContain('missing-glyphs');
  });

  it('flags a translated title too long for the card', async () => {
    const stellar = job('es-stellar.png');
    const issues = await renderIssues({
      ...stellar,
      title: `${stellar.title} `.repeat(8).trim(),
      subtitle: `${stellar.subtitle} `.repeat(4).trim(),
    });
    expect(codes(issues)).toContain('unsafe-text-bounds');
  });

  it('flags a title that is truncated or ellipsized on the card', async () => {
    const target = job('pt-blog-wave-7-kickoff.png');
    const truncated = await renderOgSvg(
      { ...target, title: `${target.title.slice(0, 12)}…` },
      fonts,
      { embedFont: false },
    );
    expect(codes(checkLayout(target, truncated.svg))).toContain('clipped-text');
  });

  it('flags a post card that lost its author or tags', () => {
    const post = job('blog-stealth-addresses-explained.png');
    const issues = validateJobMatrix([{ ...post, author: '', byline: undefined, tags: [] }]);
    expect(codes(issues)).toContain('missing-metadata');
    expect(issues.find((i) => i.code === 'missing-metadata')!.message).toMatch(/author.*tags/);
  });

  it('flags unsafe filenames and never writes them', async () => {
    const unsafe: OgImageJob[] = [
      { ...home, file: '../escape.png' },
      { ...home, file: 'Blog Post.png' },
      { ...home, file: 'home.PNG' },
      { ...home, file: 'es-home.png' },
      { ...job('es-home.png'), file: 'home-es.png' },
    ];
    for (const candidate of unsafe) {
      expect(codes(validateJobMatrix([candidate])), candidate.file).toContain('unsafe-filename');
    }

    const dir = join(tmpRoot, 'unsafe', 'og');
    await generateOgImages({ outDir: dir, jobs: [unsafe[0]!], fonts });
    expect(existsSync(join(tmpRoot, 'unsafe', 'escape.png'))).toBe(false);
  });

  it('flags two jobs writing the same file', () => {
    const issues = validateJobMatrix([home, { ...job('blog.png'), file: 'home.png' }]);
    expect(codes(issues)).toContain('duplicate-file');
  });

  it('flags two different files with byte-identical output', async () => {
    const dir = join(tmpRoot, 'dupe', 'og');
    const result = await generateOgImages({
      outDir: dir,
      jobs: [
        job('es-grants.png'),
        { ...job('es-grants.png'), routePath: '/pt/grants', file: 'pt-grants.png', locale: 'pt' },
      ],
      fonts,
    });
    expect(codes(result.issues)).toContain('duplicate-output');
  });

  it('flags a route/locale metadata mismatch', () => {
    const es = job('es-grants.png');
    const cases: OgImageJob[] = [
      { ...es, locale: 'pt', file: 'pt-grants.png' },
      { ...es, title: job('grants.png').title },
      { ...es, routePath: '/blog/tag/not-a-tag', file: 'es-blog-tag-not-a-tag.png' },
      { ...job('blog-author-lena-vogt.png'), routePath: '/blog/author/wraith-team' },
      { ...job('stellar.png'), chainBadge: undefined },
    ];
    for (const candidate of cases) {
      expect(codes(validateJobMatrix([candidate])), JSON.stringify(candidate)).toContain(
        'metadata-mismatch',
      );
    }
  });

  it('flags stale and missing files in the output directory', () => {
    const dir = mkdtempSync(join(tmpRoot, 'audit-'));
    writeFileSync(join(dir, 'home.png'), '');
    writeFileSync(join(dir, 'old-route.png'), '');
    expect(codes(auditOgDir(dir, ['home.png', 'blog.png']))).toEqual([
      'unexpected-file',
      'missing-file',
    ]);
  });
});

/**
 * One layout baseline per card family — not one per image — so copy edits
 * don't churn baselines while template regressions (moved, resized or
 * dropped text) still show up as a diff. Refresh with `vitest run -u tests/og`.
 */
describe('og images: layout baselines', () => {
  const families: Record<string, string> = {
    'page-home': 'home.png',
    'page-badge': 'es-stellar.png',
    post: 'pt-blog-wave-7-kickoff.png',
    'case-study': 'case-study-payroll-processor.png',
    'tag-archive': 'es-blog-tag-stealth-payments.png',
    'author-archive': 'blog-author-lena-vogt.png',
  };

  for (const [family, file] of Object.entries(families)) {
    it(`matches the ${family} baseline`, async () => {
      const target = job(file);
      const { svg } = await renderOgSvg(target, fonts, { embedFont: false });

      const lines: Array<{ y: number; x: number; right: number; text: string }> = [];
      for (const run of parseTextRuns(svg)) {
        const y = Math.round(run.y);
        let line = lines.find((candidate) => candidate.y === y);
        if (!line) {
          line = { y, x: Math.round(run.x), right: 0, text: '' };
          lines.push(line);
        }
        line.text += run.text;
        if (run.text.trim()) line.right = Math.max(line.right, Math.round(run.x + run.width));
      }
      for (const line of lines) line.text = line.text.trim();

      const baseline = {
        file,
        kind: target.kind,
        locale: target.locale,
        titleFontSize: titleFontSize(target.title),
        lines: lines.filter((line) => line.text !== '').sort((a, b) => a.y - b.y || a.x - b.x),
      };
      await expect(`${JSON.stringify(baseline, null, 2)}\n`).toMatchFileSnapshot(
        `./__baselines__/${family}.json`,
      );
    });
  }
});
