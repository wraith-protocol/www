import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
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
    // The same route matrix at a mobile viewport: the navigation collapses into
    // the hamburger menu and the responsive layouts kick in, which is where
    // accessibility regressions actually differ from desktop.
    {
      name: 'a11y-chromium-mobile',
      testDir: './tests/a11y',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
