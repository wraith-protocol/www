import { createHash } from 'crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { listOgImageJobs, type OgImageJob } from '../../src/utils/og-metadata';
import { loadOgFonts, OgFontError, renderOgSvg, svgToPng, type OgFont } from './render';
import {
  checkFilename,
  checkGlyphs,
  checkLayout,
  checkPixels,
  validateJobMatrix,
  type OgIssue,
} from './validate';

export interface GenerateOgOptions {
  outDir: string;
  jobs?: OgImageJob[];
  /** Fonts, or the directory to load them from. */
  fonts?: OgFont[] | { dir: string };
}

export interface GenerateOgResult {
  /** Written file name → SHA-256 of its bytes. */
  files: Record<string, string>;
  issues: OgIssue[];
}

function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Renders every OG card into a freshly emptied `outDir`, re-reads each file
 * from disk and validates it, then checks the directory holds exactly the
 * expected files. Never throws for content problems — they are returned as
 * issues so a single run reports all of them.
 */
export async function generateOgImages(options: GenerateOgOptions): Promise<GenerateOgResult> {
  const jobs = options.jobs ?? listOgImageJobs();
  const issues: OgIssue[] = validateJobMatrix(jobs);
  const files: Record<string, string> = {};

  let fonts: OgFont[];
  try {
    fonts = Array.isArray(options.fonts)
      ? options.fonts
      : loadOgFonts(options.fonts && 'dir' in options.fonts ? options.fonts.dir : undefined);
  } catch (error) {
    if (!(error instanceof OgFontError)) throw error;
    return {
      files,
      issues: [...issues, { code: 'missing-font', file: '*', message: error.message }],
    };
  }

  rmSync(options.outDir, { recursive: true, force: true });
  mkdirSync(options.outDir, { recursive: true });

  const owners = new Map<string, string>();
  const expected = new Set<string>();

  for (const job of jobs) {
    // An unsafe name could escape outDir or clobber another image; the matrix
    // check has already reported it, so it is never written.
    if (checkFilename(job).length > 0 || expected.has(job.file)) continue;
    expected.add(job.file);

    let layout, painted;
    try {
      layout = await renderOgSvg(job, fonts, { embedFont: false });
      painted = await renderOgSvg(job, fonts);
    } catch (error) {
      issues.push({
        code: 'missing-font',
        file: job.file,
        message: `render failed: ${(error as Error).message}`,
      });
      continue;
    }

    const path = join(options.outDir, job.file);
    writeFileSync(path, svgToPng(painted.svg));
    const onDisk = readFileSync(path);
    const hash = sha256(onDisk);
    files[job.file] = hash;

    issues.push(
      ...checkPixels(job.file, onDisk),
      ...checkLayout(job, layout.svg),
      ...checkGlyphs(job, [...layout.missingGlyphs, ...painted.missingGlyphs]),
    );

    const twin = owners.get(hash);
    if (twin) {
      issues.push({
        code: 'duplicate-output',
        file: job.file,
        message: `byte-identical to ${twin} — a route or locale is reusing another card's copy`,
      });
    } else {
      owners.set(hash, job.file);
    }
  }

  issues.push(...auditOgDir(options.outDir, expected));

  return { files, issues };
}

/** The OG directory must hold exactly the job files — no stale or missing images. */
export function auditOgDir(outDir: string, expected: Iterable<string>): OgIssue[] {
  const issues: OgIssue[] = [];
  const wanted = new Set(expected);
  const present = new Set(readdirSync(outDir));
  for (const file of [...present].sort()) {
    if (!wanted.has(file)) {
      issues.push({ code: 'unexpected-file', file, message: 'not produced by any OG job' });
    }
  }
  for (const file of [...wanted].sort()) {
    if (!present.has(file)) {
      issues.push({ code: 'missing-file', file, message: 'OG job produced no file' });
    }
  }
  return issues;
}

export function formatIssues(issues: OgIssue[]): string {
  return issues.map((issue) => `  [${issue.code}] ${issue.file}: ${issue.message}`).join('\n');
}
