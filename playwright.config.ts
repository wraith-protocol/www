import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { isVisualCliInvocation } from './tests/visual/route-inventory';

const isVisualOnlyInvocation = isVisualCliInvocation(process.argv.slice(2));

export default defineConfig({
  outputDir: join(tmpdir(), 'wraith-www-playwright-results'),
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: isVisualOnlyInvocation ? [['list'], ['./tests/visual/visual-reporter.ts']] : 'html',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: isVisualOnlyInvocation ? 'off' : 'on-first-retry',
    ...(isVisualOnlyInvocation ? { screenshot: 'off', video: 'off' } : {}),
  },
  projects: isVisualOnlyInvocation
    ? [
        {
          name: 'visual-chromium',
          testDir: './tests/visual',
          use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 },
        },
      ]
    : [
        {
          name: 'e2e-chromium',
          testDir: './e2e',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'a11y-chromium',
          testDir: './tests/a11y',
          use: { ...devices['Desktop Chrome'] },
        },
      ],
  webServer: {
    command: 'pnpm build && pnpm preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
