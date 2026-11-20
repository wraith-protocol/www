import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { isPathOutsideRepoOrInApprovedBaselineDir } from './route-inventory';
import { formatVisualReportLine, type VisualCheckReportRecord } from './region-diff';
import { VISUAL_ANNOTATION_TYPE } from './stabilize';

export function buildVisualMarkdownSummary(records: readonly VisualCheckReportRecord[]): string {
  const passed = records.filter((r) => r.status === 'passed').length;
  const failed = records.filter((r) => r.status === 'failed').length;

  const lines = [
    '### Visual Regression Coverage Report',
    '',
    `Total checks: ${records.length} | Passed: ${passed} | Failed: ${failed}`,
    '',
    '| Route | Locale | Theme | Viewport | Status | Changed Region |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const r of records) {
    lines.push(
      `| \`${r.route}\` | \`${r.locale}\` | \`${r.theme}\` | \`${r.viewport}\` | ${r.status} | \`${r.changedRegion}\` |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

export default class VisualRegressionReporter implements Reporter {
  private readonly records: VisualCheckReportRecord[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    const annotation = result.annotations.find((item) => item.type === VISUAL_ANNOTATION_TYPE);
    if (annotation?.description) {
      try {
        const parsed = JSON.parse(annotation.description) as VisualCheckReportRecord;
        this.records.push(parsed);
        if (parsed.status === 'failed') {
          process.stderr.write(`[visual-diff] ${formatVisualReportLine(parsed)}\n`);
        }
        return;
      } catch {
        // Fall back to test title metadata if annotation parsing fails.
      }
    }

    if (result.status !== 'passed' && result.status !== 'skipped') {
      this.records.push({
        route: test.title,
        routeId: 'unknown',
        layoutFamily: 'unknown',
        locale: 'en',
        theme: 'dark',
        viewport: 'desktop (1280x800)',
        status: 'failed',
        changedRegion: 'page-load-or-assertion-failure',
        baselineFile: '',
      });
    }
  }

  onEnd(_result: FullResult): void {
    if (this.records.length === 0) return;

    const failed = this.records.filter((r) => r.status === 'failed');
    process.stdout.write(
      `\n[visual-summary] ${this.records.length - failed.length}/${this.records.length} passed (${failed.length} failed)\n`,
    );

    for (const item of failed) {
      process.stdout.write(`[visual-failure] ${formatVisualReportLine(item)}\n`);
    }

    const externalReportPath = process.env.PLAYWRIGHT_VISUAL_REPORT_FILE;
    if (externalReportPath) {
      if (!isPathOutsideRepoOrInApprovedBaselineDir(externalReportPath)) {
        throw new Error(
          `Refusing to write Playwright visual runtime report inside repository outside approved baseline directory: ${externalReportPath}`,
        );
      }
      mkdirSync(dirname(externalReportPath), { recursive: true });
      const payload = {
        generatedAt: '2026-01-15T12:00:00.000Z',
        total: this.records.length,
        passed: this.records.length - failed.length,
        failed: failed.length,
        checks: this.records,
        markdown: buildVisualMarkdownSummary(this.records),
      };
      writeFileSync(externalReportPath, JSON.stringify(payload, null, 2), 'utf8');
    }
  }
}
