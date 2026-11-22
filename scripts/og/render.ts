import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import React from 'react';
import type { OgImageJob } from '../../src/utils/og-metadata';

const h = React.createElement;

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * Everything the card paints must stay inside this box (the card padding).
 * Social platforms crop and round the edges of previews, so the margin is
 * kept free of text.
 */
export const SAFE_AREA = { top: 64, right: 80, bottom: 64, left: 80 } as const;

export const OG_COLORS = {
  surface: '#0e0e0e',
  primary: '#c6c6c7',
  onSurface: '#e6e1e5',
  onSurfaceVariant: '#c4c7c5',
  outline: '#767575',
  outlineVariant: '#444444',
} as const;

export const OG_FONT_FAMILY = 'Space Grotesk';
export const DEFAULT_FONT_DIR = join(
  rootDir,
  'node_modules',
  '@fontsource',
  'space-grotesk',
  'files',
);
export const OG_FONT_FILES = [
  { file: 'space-grotesk-latin-400-normal.woff', weight: 400 },
  { file: 'space-grotesk-latin-700-normal.woff', weight: 700 },
] as const;

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: 'normal';
};

export class OgFontError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OgFontError';
  }
}

/** Font signatures satori can parse. woff2 is deliberately absent. */
const FONT_SIGNATURES = new Set(['wOFF', 'OTTO', 'true', '\u0000\u0001\u0000\u0000']);

/**
 * Loads the card fonts, failing loudly instead of letting satori fall back to
 * a missing face. A missing, empty, or non-parseable file is an error.
 */
export function loadOgFonts(fontDir: string = DEFAULT_FONT_DIR): OgFont[] {
  return OG_FONT_FILES.map(({ file, weight }) => {
    const path = join(fontDir, file);
    if (!existsSync(path)) {
      throw new OgFontError(`OG font not found: ${path}`);
    }
    const buf = readFileSync(path);
    if (buf.byteLength < 1024) {
      throw new OgFontError(`OG font is empty or truncated: ${path} (${buf.byteLength} bytes)`);
    }
    const signature = buf.subarray(0, 4).toString('latin1');
    if (!FONT_SIGNATURES.has(signature)) {
      throw new OgFontError(
        `OG font has an unsupported format (signature ${JSON.stringify(signature)}): ${path}`,
      );
    }
    const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    return { name: OG_FONT_FAMILY, data, weight, style: 'normal' };
  });
}

/** Font size for the title, stepped down so long (often translated) titles fit. */
export function titleFontSize(title: string): number {
  if (title.length > 40) return 52;
  if (title.length > 25) return 60;
  if (title.length > 18) return 68;
  return 76;
}

/** Meta line under the subtitle: byline and `#tags` for blog posts. */
export function metaLine(job: OgImageJob): string | null {
  if (job.kind !== 'post') return null;
  const parts = [job.byline, (job.tags ?? []).map((tag) => `#${tag}`).join('  ')].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join('  ·  ') : null;
}

/** Text the card is expected to paint, in reading order. */
export function expectedText(job: OgImageJob): string[] {
  return [
    'W',
    'WRAITH PROTOCOL',
    job.label?.toUpperCase(),
    job.title,
    job.subtitle,
    metaLine(job),
    'usewraith.xyz',
    job.chainBadge,
  ].filter((part): part is string => Boolean(part));
}

export function ogCard(job: OgImageJob) {
  const C = OG_COLORS;
  const meta = metaLine(job);

  return h(
    'div',
    {
      style: {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        background: C.surface,
        padding: `${SAFE_AREA.top}px ${SAFE_AREA.right}px ${SAFE_AREA.bottom}px ${SAFE_AREA.left}px`,
        fontFamily: OG_FONT_FAMILY,
      },
    },
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 14 } },
      h(
        'div',
        {
          style: {
            width: 38,
            height: 38,
            background: C.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: C.surface,
          },
        },
        'W',
      ),
      h(
        'span',
        {
          style: {
            color: C.primary,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.2em',
          },
        },
        'WRAITH PROTOCOL',
      ),
    ),
    h('div', { style: { flex: 1 } }),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 22 } },
      job.label
        ? h(
            'div',
            {
              style: {
                fontSize: 15,
                fontWeight: 600,
                color: C.outline,
                letterSpacing: '0.2em',
              },
            },
            job.label.toUpperCase(),
          )
        : null,
      h(
        'div',
        {
          style: {
            fontSize: titleFontSize(job.title),
            fontWeight: 700,
            color: C.onSurface,
            lineHeight: 1.05,
            maxWidth: 920,
          },
        },
        job.title,
      ),
      h(
        'div',
        {
          style: {
            fontSize: 28,
            fontWeight: 400,
            color: C.onSurfaceVariant,
            maxWidth: 820,
          },
        },
        job.subtitle,
      ),
      meta
        ? h(
            'div',
            {
              style: {
                fontSize: 18,
                fontWeight: 400,
                color: C.outline,
                letterSpacing: '0.04em',
                maxWidth: 920,
              },
            },
            meta,
          )
        : null,
    ),
    h('div', { style: { height: 52 } }),
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 14,
            color: C.outline,
            letterSpacing: '0.06em',
          },
        },
        'usewraith.xyz',
      ),
      job.chainBadge != null
        ? h(
            'div',
            {
              style: {
                border: `1px solid ${C.outlineVariant}`,
                padding: '6px 18px',
                fontSize: 13,
                color: C.outline,
                letterSpacing: '0.1em',
              },
            },
            job.chainBadge,
          )
        : h('div', {}),
    ),
  );
}

export interface OgSvgResult {
  svg: string;
  /** Text segments no loaded font could draw (satori would render them as tofu). */
  missingGlyphs: string[];
}

/**
 * Renders the card to SVG. With `embedFont: false` satori emits one `<text>`
 * element per word with its layout box, which the validator inspects; the
 * layout is identical to the glyph-path output used for the PNG.
 */
export async function renderOgSvg(
  job: OgImageJob,
  fonts: OgFont[],
  { embedFont = true }: { embedFont?: boolean } = {},
): Promise<OgSvgResult> {
  const missingGlyphs: string[] = [];
  const svg = await satori(ogCard(job), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
    embedFont,
    loadAdditionalAsset: async (_languageCode: string, segment: string) => {
      missingGlyphs.push(segment);
      return [];
    },
  });
  return { svg, missingGlyphs };
}

export function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } });
  return Buffer.from(resvg.render().asPng());
}

export async function renderOgPng(job: OgImageJob, fonts: OgFont[]): Promise<Buffer> {
  return svgToPng((await renderOgSvg(job, fonts)).svg);
}
