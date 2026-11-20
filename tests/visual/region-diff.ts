import { inflateSync } from 'node:zlib';
import type { Page } from '@playwright/test';
import type { NamedRegionHint, VisualTheme, VisualViewportName } from './route-inventory';

export interface PageRegionBox {
  readonly name: string;
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

export interface DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

export interface RegionDiffAttribution {
  readonly changedRegion: string;
  readonly diffPixelCount: number;
  readonly totalPixels: number;
  readonly dimensionMismatch: boolean;
  readonly boundingBox: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  } | null;
}

export interface VisualCheckReportRecord {
  readonly route: string;
  readonly routeId: string;
  readonly layoutFamily: string;
  readonly locale: string;
  readonly theme: VisualTheme;
  readonly viewport: `${VisualViewportName} (${number}x${number})`;
  readonly status: 'passed' | 'failed' | 'skipped';
  readonly changedRegion: string;
  readonly baselineFile: string;
  readonly diffPixelCount?: number;
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePngRgba(buffer: Uint8Array): DecodedPng {
  if (buffer.length < 33) {
    throw new Error('Invalid PNG buffer: header truncated');
  }
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (buffer[i] !== PNG_SIGNATURE[i]) {
      throw new Error('Invalid PNG signature');
    }
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let palette: Uint8Array | null = null;
  const idatChunks: Uint8Array[] = [];

  while (offset + 8 <= buffer.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      buffer[offset + 4] ?? 0,
      buffer[offset + 5] ?? 0,
      buffer[offset + 6] ?? 0,
      buffer[offset + 7] ?? 0,
    );
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) {
      throw new Error(`Truncated PNG chunk: ${type}`);
    }

    if (type === 'IHDR') {
      width = view.getUint32(dataStart, false);
      height = view.getUint32(dataStart + 4, false);
      bitDepth = buffer[dataStart + 8] ?? 0;
      colorType = buffer[dataStart + 9] ?? 0;
    } else if (type === 'PLTE') {
      palette = buffer.subarray(dataStart, dataEnd);
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (width <= 0 || height <= 0 || bitDepth !== 8) {
    throw new Error(`Unsupported PNG format (${width}x${height}, bitDepth=${bitDepth})`);
  }

  const channels =
    colorType === 6
      ? 4
      : colorType === 2
        ? 3
        : colorType === 4
          ? 2
          : colorType === 0 || colorType === 3
            ? 1
            : 0;
  if (channels === 0) {
    throw new Error(`Unsupported PNG colorType=${colorType}`);
  }

  const totalIdatLength = idatChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const compressed = new Uint8Array(totalIdatLength);
  let cursor = 0;
  for (const chunk of idatChunks) {
    compressed.set(chunk, cursor);
    cursor += chunk.length;
  }

  const inflated = inflateSync(compressed);
  const stride = width * channels;
  const rgba = new Uint8Array(width * height * 4);
  const prevRow = new Uint8Array(stride);
  const currRow = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = inflated[rowStart] ?? 0;

    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[rowStart + 1 + x] ?? 0;
      const left = x >= channels ? (currRow[x - channels] ?? 0) : 0;
      const up = prevRow[x] ?? 0;
      const upLeft = x >= channels ? (prevRow[x - channels] ?? 0) : 0;

      let recon = raw;
      if (filter === 1) recon = (raw + left) & 0xff;
      else if (filter === 2) recon = (raw + up) & 0xff;
      else if (filter === 3) recon = (raw + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) recon = (raw + paethPredictor(left, up, upLeft)) & 0xff;

      currRow[x] = recon;
    }

    for (let px = 0; px < width; px += 1) {
      const dst = (y * width + px) * 4;
      const src = px * channels;
      if (colorType === 6) {
        rgba[dst] = currRow[src] ?? 0;
        rgba[dst + 1] = currRow[src + 1] ?? 0;
        rgba[dst + 2] = currRow[src + 2] ?? 0;
        rgba[dst + 3] = currRow[src + 3] ?? 255;
      } else if (colorType === 2) {
        rgba[dst] = currRow[src] ?? 0;
        rgba[dst + 1] = currRow[src + 1] ?? 0;
        rgba[dst + 2] = currRow[src + 2] ?? 0;
        rgba[dst + 3] = 255;
      } else if (colorType === 4) {
        const lum = currRow[src] ?? 0;
        rgba[dst] = lum;
        rgba[dst + 1] = lum;
        rgba[dst + 2] = lum;
        rgba[dst + 3] = currRow[src + 1] ?? 255;
      } else if (colorType === 0) {
        const lum = currRow[src] ?? 0;
        rgba[dst] = lum;
        rgba[dst + 1] = lum;
        rgba[dst + 2] = lum;
        rgba[dst + 3] = 255;
      } else if (colorType === 3 && palette) {
        const idx = (currRow[src] ?? 0) * 3;
        rgba[dst] = palette[idx] ?? 0;
        rgba[dst + 1] = palette[idx + 1] ?? 0;
        rgba[dst + 2] = palette[idx + 2] ?? 0;
        rgba[dst + 3] = 255;
      }
    }

    prevRow.set(currRow);
  }

  return { width, height, rgba };
}

function regionArea(region: PageRegionBox): number {
  return Math.max(1, region.right - region.left) * Math.max(1, region.bottom - region.top);
}

function strictlyEncloses(outer: PageRegionBox, inner: PageRegionBox): boolean {
  if (outer.name === inner.name) return false;
  const encloses =
    outer.left <= inner.left + 2 &&
    outer.top <= inner.top + 2 &&
    outer.right >= inner.right - 2 &&
    outer.bottom >= inner.bottom - 2;
  return encloses && regionArea(outer) > regionArea(inner) * 1.1;
}

function isGenericAutoName(name: string): boolean {
  return /^(header|section|article|table|footer)-\d+$/.test(name);
}

function pruneEnclosingContainers(candidates: readonly PageRegionBox[]): PageRegionBox[] {
  return candidates.filter(
    (candidate) =>
      !candidates.some(
        (other) =>
          !(isGenericAutoName(other.name) && !isGenericAutoName(candidate.name)) &&
          strictlyEncloses(candidate, other),
      ),
  );
}

function selectChangedRegions(
  regions: readonly PageRegionBox[],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  dimensionMismatch: boolean,
): PageRegionBox[] {
  const overlapping = regions.filter(
    (region) =>
      region.bottom >= minY && region.top <= maxY && region.right >= minX && region.left <= maxX,
  );
  if (overlapping.length === 0) return [];

  if (dimensionMismatch) {
    // When document height/width shifts, every section below `minY` moves
    // downstream. Attribute the regression to the most specific region covering
    // the shift origin (`minY`) rather than blaming shifted sections below it.
    const originCovering = overlapping.filter(
      (region) => region.top <= minY + 4 && region.bottom >= minY,
    );
    if (originCovering.length > 0) {
      const specificOrigin = pruneEnclosingContainers(originCovering);
      return [...specificOrigin].sort((a, b) => regionArea(a) - regionArea(b)).slice(0, 2);
    }
  }

  const specific = pruneEnclosingContainers(overlapping);
  return [...specific]
    .sort((a, b) => {
      const interA =
        Math.max(0, Math.min(a.right, maxX + 1) - Math.max(a.left, minX)) *
        Math.max(0, Math.min(a.bottom, maxY + 1) - Math.max(a.top, minY));
      const interB =
        Math.max(0, Math.min(b.right, maxX + 1) - Math.max(b.left, minX)) *
        Math.max(0, Math.min(b.bottom, maxY + 1) - Math.max(b.top, minY));
      const coverageA = interA / regionArea(a);
      const coverageB = interB / regionArea(b);
      if (Math.abs(coverageB - coverageA) > 0.05) {
        return coverageB - coverageA;
      }
      return regionArea(a) - regionArea(b);
    })
    .slice(0, 3);
}

export function computeChangedRegionAttribution(
  expectedPng: Uint8Array,
  actualPng: Uint8Array,
  regions: readonly PageRegionBox[],
  channelTolerance = 4,
): RegionDiffAttribution {
  const expected = decodePngRgba(expectedPng);
  const actual = decodePngRgba(actualPng);
  const compareWidth = Math.min(expected.width, actual.width);
  const compareHeight = Math.min(expected.height, actual.height);
  const dimensionMismatch = expected.width !== actual.width || expected.height !== actual.height;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = -1;
  let maxY = -1;
  let diffPixelCount = 0;

  for (let y = 0; y < compareHeight; y += 1) {
    for (let x = 0; x < compareWidth; x += 1) {
      const eIdx = (y * expected.width + x) * 4;
      const aIdx = (y * actual.width + x) * 4;
      const dr = Math.abs((expected.rgba[eIdx] ?? 0) - (actual.rgba[aIdx] ?? 0));
      const dg = Math.abs((expected.rgba[eIdx + 1] ?? 0) - (actual.rgba[aIdx + 1] ?? 0));
      const db = Math.abs((expected.rgba[eIdx + 2] ?? 0) - (actual.rgba[aIdx + 2] ?? 0));
      const da = Math.abs((expected.rgba[eIdx + 3] ?? 0) - (actual.rgba[aIdx + 3] ?? 0));

      if (
        dr > channelTolerance ||
        dg > channelTolerance ||
        db > channelTolerance ||
        da > channelTolerance
      ) {
        diffPixelCount += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (dimensionMismatch) {
    const extraRows =
      Math.abs(expected.height - actual.height) * Math.max(expected.width, actual.width);
    const extraCols = Math.abs(expected.width - actual.width) * compareHeight;
    diffPixelCount += extraRows + extraCols;
    if (maxX < 0) {
      minX = 0;
      minY = compareHeight;
      maxX = Math.max(expected.width, actual.width) - 1;
      maxY = Math.max(expected.height, actual.height) - 1;
    } else {
      maxY = Math.max(maxY, Math.max(expected.height, actual.height) - 1);
      maxX = Math.max(maxX, Math.max(expected.width, actual.width) - 1);
    }
  }

  const totalPixels =
    Math.max(expected.width, actual.width) * Math.max(expected.height, actual.height);

  if (maxX < 0 || maxY < 0) {
    return {
      changedRegion: 'none',
      diffPixelCount: 0,
      totalPixels,
      dimensionMismatch: false,
      boundingBox: null,
    };
  }

  const attributed = selectChangedRegions(regions, minX, minY, maxX, maxY, dimensionMismatch);

  const regionNames =
    attributed.length > 0
      ? Array.from(new Set(attributed.map((r) => r.name))).join(', ')
      : `viewport-band(y=${minY}..${maxY})`;

  const sizeSuffix = dimensionMismatch
    ? ` [size ${expected.width}x${expected.height} -> ${actual.width}x${actual.height}]`
    : '';

  return {
    changedRegion: `${regionNames} (x=${minX}..${maxX}, y=${minY}..${maxY})${sizeSuffix}`,
    diffPixelCount,
    totalPixels,
    dimensionMismatch,
    boundingBox: { minX, minY, maxX, maxY },
  };
}

function hasSameBounds(a: PageRegionBox, b: PageRegionBox): boolean {
  return (
    Math.abs(a.left - b.left) <= 2 &&
    Math.abs(a.top - b.top) <= 2 &&
    Math.abs(a.right - b.right) <= 2 &&
    Math.abs(a.bottom - b.bottom) <= 2
  );
}

export async function capturePageRegions(
  page: Page,
  hints: readonly NamedRegionHint[],
): Promise<PageRegionBox[]> {
  const collected: PageRegionBox[] = [];

  for (const hint of hints) {
    const locator = page.locator(hint.selector).first();
    if ((await locator.count()) === 0) continue;
    const box = await locator.boundingBox();
    if (!box || box.width <= 0 || box.height <= 0) continue;
    collected.push({
      name: hint.name,
      left: Math.round(box.x),
      top: Math.round(box.y),
      right: Math.round(box.x + box.width),
      bottom: Math.round(box.y + box.height),
    });
  }

  const autoRegions = await page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        'header, main > section, main article, main table, footer',
      ),
    );

    return nodes
      .map((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        const heading = el.querySelector('h1, h2, h3')?.textContent?.trim() ?? '';
        const aria = el.getAttribute('aria-label')?.trim() ?? '';
        const id = el.id?.trim() ?? '';
        const tag = el.tagName.toLowerCase();
        const rawLabel = aria || heading;
        const normalized = rawLabel
          ? rawLabel
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
              .slice(0, 36)
          : '';
        const label = id || normalized || `${tag}-${index + 1}`;
        return {
          name: label,
          left: Math.round(rect.left + window.scrollX),
          top: Math.round(rect.top + window.scrollY),
          right: Math.round(rect.right + window.scrollX),
          bottom: Math.round(rect.bottom + window.scrollY),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  });

  const existingNames = new Set(collected.map((r) => r.name));
  for (const region of autoRegions) {
    if (existingNames.has(region.name)) continue;
    if (collected.some((existing) => hasSameBounds(existing, region))) continue;
    collected.push(region);
    existingNames.add(region.name);
  }

  return collected;
}

export function formatVisualReportLine(record: VisualCheckReportRecord): string {
  return [
    `route=${record.route}`,
    `locale=${record.locale}`,
    `theme=${record.theme}`,
    `viewport=${record.viewport}`,
    `status=${record.status}`,
    `changedRegion=${record.changedRegion}`,
  ].join(' | ');
}
