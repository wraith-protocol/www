import {
  SUPPORTED_LOCALES,
  ogImageSlugFor,
  resolveRouteMetadata,
  type Locale,
  type OgImageJob,
} from '../../src/utils/og-metadata';
import { decodePng, PngError } from './png';
import { OG_COLORS, OG_HEIGHT, OG_WIDTH, SAFE_AREA, expectedText } from './render';

export type OgIssueCode =
  | 'malformed-image'
  | 'wrong-dimensions'
  | 'blank-image'
  | 'unsafe-text-bounds'
  | 'clipped-text'
  | 'missing-glyphs'
  | 'missing-font'
  | 'unsafe-filename'
  | 'duplicate-file'
  | 'duplicate-output'
  | 'metadata-mismatch'
  | 'missing-metadata'
  | 'unexpected-file'
  | 'missing-file';

export interface OgIssue {
  code: OgIssueCode;
  file: string;
  message: string;
}

/** Locale-free, lowercase kebab-case slug, optionally prefixed by a non-default locale. */
const SAFE_FILENAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.png$/;
const MAX_FILENAME_LENGTH = 100;

/** A channel this far from the surface colour counts as painted. */
const PAINT_THRESHOLD = 16;
/** Below this share of painted pixels a card is treated as blank. */
export const MIN_PAINTED_RATIO = 0.005;
/** Anti-aliasing allowance at the safe-area edge, in pixels. */
const EDGE_TOLERANCE = 2;

export interface TextRun {
  text: string;
  x: number;
  /** Baseline. */
  y: number;
  width: number;
  height: number;
}

export function localizedRoutePath(routePath: string, locale: Locale): string {
  if (locale === 'en') return routePath;
  return routePath === '/' ? `/${locale}` : `/${locale}${routePath}`;
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

export function checkFilename(job: OgImageJob): OgIssue[] {
  const issues: OgIssue[] = [];
  const fail = (message: string) =>
    issues.push({ code: 'unsafe-filename', file: job.file, message });

  if (!SAFE_FILENAME.test(job.file)) {
    fail(
      `"${job.file}" must be lowercase kebab-case ending in .png (no spaces or path separators)`,
    );
  }
  if (job.file.length > MAX_FILENAME_LENGTH) {
    fail(`"${job.file}" is longer than ${MAX_FILENAME_LENGTH} characters`);
  }
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === 'en') continue;
    const prefixed = job.file.startsWith(`${locale}-`);
    if (job.locale === locale && !prefixed) {
      fail(`"${job.file}" is a ${locale} image but lacks the "${locale}-" prefix`);
    }
    if (job.locale !== locale && prefixed) {
      fail(`"${job.file}" is a ${job.locale} image but carries the "${locale}-" prefix`);
    }
  }
  return issues;
}

/** Required metadata per layout family. */
export function checkRequiredMetadata(job: OgImageJob): OgIssue[] {
  const missing: string[] = [];
  if (isBlank(job.title)) missing.push('title');
  if (isBlank(job.subtitle)) missing.push('subtitle');
  if (isBlank(job.description)) missing.push('description');

  if (job.kind === 'post') {
    if (isBlank(job.author)) missing.push('author');
    if (isBlank(job.byline) || (job.author && !job.byline!.includes(job.author))) {
      missing.push('byline');
    }
    if (!job.tags || job.tags.length === 0 || job.tags.some(isBlank)) missing.push('tags');
  }
  if (job.kind === 'tag') {
    if (isBlank(job.tag)) missing.push('tag');
    else if (!job.title.includes(job.tag!)) missing.push('tag in title');
    if (isBlank(job.label)) missing.push('label');
  }
  if (job.kind === 'author') {
    if (isBlank(job.author)) missing.push('author');
    else if (job.title !== job.author) missing.push('author as title');
    if (isBlank(job.label)) missing.push('label');
  }

  return missing.length === 0
    ? []
    : [
        {
          code: 'missing-metadata',
          file: job.file,
          message: `${job.kind} card for ${job.routePath} (${job.locale}) is missing: ${missing.join(', ')}`,
        },
      ];
}

/**
 * The image must describe the same route and locale the middleware serves it
 * for: same slug, same locale, same copy as `resolveRouteMetadata`.
 */
export function checkRouteMetadata(job: OgImageJob): OgIssue[] {
  const issues: OgIssue[] = [];
  const fail = (message: string) =>
    issues.push({ code: 'metadata-mismatch', file: job.file, message });

  if (!SUPPORTED_LOCALES.includes(job.locale)) {
    fail(`unsupported locale "${job.locale}"`);
    return issues;
  }

  const path = localizedRoutePath(job.routePath, job.locale);
  const meta = resolveRouteMetadata(path);
  if (!meta) {
    fail(`${path} resolves to no route metadata, so this image would never be served`);
    return issues;
  }
  if (meta.locale !== job.locale) {
    fail(`${path} resolves to locale "${meta.locale}", image is "${job.locale}"`);
  }
  const slug = ogImageSlugFor(path, job.locale);
  if (`${slug}.png` !== job.file) {
    fail(`${path} is served /og/${slug}.png, but this image is ${job.file}`);
  }
  if (meta.ogImage.title !== job.title) {
    fail(`title "${job.title}" differs from route metadata "${meta.ogImage.title}"`);
  }
  if (meta.ogImage.subtitle !== undefined && meta.ogImage.subtitle !== job.subtitle) {
    fail(`subtitle "${job.subtitle}" differs from route metadata "${meta.ogImage.subtitle}"`);
  }
  if (meta.description !== job.description) {
    fail(`description differs from route metadata for ${path}`);
  }
  if ((meta.ogImage.chainBadge ?? undefined) !== (job.chainBadge ?? undefined)) {
    fail(
      `chain badge "${job.chainBadge}" differs from route metadata "${meta.ogImage.chainBadge}"`,
    );
  }
  return issues;
}

/** Checks that need no rendering: filenames, duplicates, metadata. */
export function validateJobMatrix(jobs: OgImageJob[]): OgIssue[] {
  const issues: OgIssue[] = [];
  const owners = new Map<string, OgImageJob>();
  const routes = new Map<string, OgImageJob>();

  for (const job of jobs) {
    issues.push(...checkFilename(job), ...checkRequiredMetadata(job), ...checkRouteMetadata(job));

    const previous = owners.get(job.file);
    if (previous) {
      issues.push({
        code: 'duplicate-file',
        file: job.file,
        message: `written by both ${previous.routePath} (${previous.locale}) and ${job.routePath} (${job.locale})`,
      });
    } else {
      owners.set(job.file, job);
    }

    const routeKey = `${job.locale} ${job.routePath}`;
    const sameRoute = routes.get(routeKey);
    if (sameRoute) {
      issues.push({
        code: 'duplicate-file',
        file: job.file,
        message: `${job.routePath} (${job.locale}) already has an image: ${sameRoute.file}`,
      });
    } else {
      routes.set(routeKey, job);
    }
  }
  return issues;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Reads the word boxes from an SVG rendered with `embedFont: false`. */
export function parseTextRuns(svg: string): TextRun[] {
  const runs: TextRun[] = [];
  for (const match of svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const attrs = match[1]!;
    const num = (name: string) => {
      const value = attrs.match(new RegExp(`\\s${name}="(-?[\\d.]+(?:e-?\\d+)?)"`))?.[1];
      return value === undefined ? NaN : Number(value);
    };
    runs.push({
      text: decodeEntities(match[2]!),
      x: num('x'),
      y: num('y'),
      width: num('width'),
      height: num('height'),
    });
  }
  return runs;
}

const compact = (value: string) => value.replace(/\s+/g, '');

export function checkLayout(job: OgImageJob, layoutSvg: string): OgIssue[] {
  const issues: OgIssue[] = [];
  const runs = parseTextRuns(layoutSvg).filter((run) => run.text.trim() !== '');

  if (runs.length === 0) {
    return [{ code: 'clipped-text', file: job.file, message: 'card renders no text at all' }];
  }

  const minX = SAFE_AREA.left - EDGE_TOLERANCE;
  const maxX = OG_WIDTH - SAFE_AREA.right + EDGE_TOLERANCE;
  const minY = SAFE_AREA.top;
  const maxY = OG_HEIGHT - SAFE_AREA.bottom + EDGE_TOLERANCE;
  const outside = runs.filter(
    (run) =>
      ![run.x, run.y, run.width].every(Number.isFinite) ||
      run.x < minX ||
      run.x + run.width > maxX ||
      run.y < minY ||
      run.y > maxY,
  );
  if (outside.length > 0) {
    const sample = outside
      .slice(0, 4)
      .map((run) => `"${run.text}" @${Math.round(run.x)},${Math.round(run.y)}`)
      .join(', ');
    issues.push({
      code: 'unsafe-text-bounds',
      file: job.file,
      message: `${outside.length} word(s) fall outside the ${OG_WIDTH}x${OG_HEIGHT} safe area (${sample})`,
    });
  }

  // Every expected string must be painted in order — a truncated, ellipsized
  // or dropped title shows up as a missing sequence here.
  const painted = compact(runs.map((run) => run.text).join(''));
  let cursor = 0;
  for (const expected of expectedText(job)) {
    const needle = compact(expected);
    const at = painted.indexOf(needle, cursor);
    if (at === -1) {
      issues.push({
        code: 'clipped-text',
        file: job.file,
        message: `"${expected}" is not fully rendered on the card`,
      });
    } else {
      cursor = at + needle.length;
    }
  }

  return issues;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function checkPixels(file: string, png: Uint8Array): OgIssue[] {
  let decoded;
  try {
    decoded = decodePng(png);
  } catch (error) {
    const message = error instanceof PngError ? error.message : String(error);
    return [{ code: 'malformed-image', file, message }];
  }

  const { width, height, pixels } = decoded;
  if (width !== OG_WIDTH || height !== OG_HEIGHT) {
    return [
      {
        code: 'wrong-dimensions',
        file,
        message: `image is ${width}x${height}, expected ${OG_WIDTH}x${OG_HEIGHT}`,
      },
    ];
  }

  const [sr, sg, sb] = hexToRgb(OG_COLORS.surface);
  const left = SAFE_AREA.left - EDGE_TOLERANCE;
  const right = width - SAFE_AREA.right + EDGE_TOLERANCE;
  const top = SAFE_AREA.top - EDGE_TOLERANCE;
  const bottom = height - SAFE_AREA.bottom + EDGE_TOLERANCE;

  // Pixels are composited over the surface, so a transparent image reads as
  // blank: |(c - s) * a / 255| is the visible distance from the background.
  const limit = PAINT_THRESHOLD * 255;
  let painted = 0;
  let inMargin = 0;
  let i = 0;
  for (let y = 0; y < height; y++) {
    const rowInMargin = y < top || y >= bottom;
    for (let x = 0; x < width; x++, i += 4) {
      const a = pixels[i + 3]!;
      if (
        Math.abs((pixels[i]! - sr) * a) > limit ||
        Math.abs((pixels[i + 1]! - sg) * a) > limit ||
        Math.abs((pixels[i + 2]! - sb) * a) > limit
      ) {
        painted++;
        if (rowInMargin || x < left || x >= right) inMargin++;
      }
    }
  }

  const issues: OgIssue[] = [];
  const ratio = painted / (width * height);
  if (ratio < MIN_PAINTED_RATIO) {
    issues.push({
      code: 'blank-image',
      file,
      message: `only ${(ratio * 100).toFixed(2)}% of pixels differ from the background (min ${(
        MIN_PAINTED_RATIO * 100
      ).toFixed(2)}%)`,
    });
  }
  if (inMargin > 0) {
    issues.push({
      code: 'unsafe-text-bounds',
      file,
      message: `${inMargin} painted pixel(s) inside the safe-area margin`,
    });
  }
  return issues;
}

export function checkGlyphs(job: OgImageJob, missingGlyphs: string[]): OgIssue[] {
  if (missingGlyphs.length === 0) return [];
  const unique = [...new Set(missingGlyphs)];
  return [
    {
      code: 'missing-glyphs',
      file: job.file,
      message: `no loaded font can draw: ${unique.map((s) => JSON.stringify(s)).join(', ')}`,
    },
  ];
}
