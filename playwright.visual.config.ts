import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import {
  APPROVED_VISUAL_BASELINE_DIR,
  isPathOutsideRepoOrInApprovedBaselineDir,
} from './tests/visual/route-inventory';

const defaultTempOutputDir = join(tmpdir(), 'wraith-www-playwright-visual');
const configuredOutputDir = process.env.PLAYWRIGHT_VISUAL_OUTPUT_DIR
  ? resolve(process.env.PLAYWRIGHT_VISUAL_OUTPUT_DIR)
  : defaultTempOutputDir;

if (!isPathOutsideRepoOrInApprovedBaselineDir(configuredOutputDir)) {
  throw new Error(
    `Playwright visual outputDir must stay outside the repository (or inside ${APPROVED_VISUAL_BASELINE_DIR}): received ${configuredOutputDir}`,
  );
}

const serverCommand = existsSync('./dist/index.html')
  ? 'pnpm preview -- --port 4173'
  : 'pnpm build && pnpm preview -- --port 4173';

export default defineConfig({
  testDir: './tests/visual',
  outputDir: configuredOutputDir,
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['./tests/visual/visual-reporter.ts']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'en-US',
    timezoneId: 'UTC',
    deviceScaleFactor: 1,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'visual-chromium',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: serverCommand,
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
