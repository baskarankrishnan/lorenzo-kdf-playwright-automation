import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * The whole framework uses paths relative to this project folder (e.g. `.env`,
 * `EXECUTION_PLANNER=./excelFramework/...`, `./pages`, `./reports`). When the
 * VS Code Playwright extension discovers tests it launches from the workspace
 * root, which breaks those relative paths and makes the planner look empty.
 * Force the working directory to this config's folder and load `.env` from here
 * so behaviour is identical regardless of the launching cwd.
 */
process.chdir(__dirname);
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */

/**
 * Reporter selection.
 * - Always keep Playwright's built-in `html` reporter (existing behavior).
 * - Additionally attach the custom consolidated reporter ONLY when explicitly
 *   requested (suite runs set `USE_CONSOLIDATED_REPORTER=true` via cross-env).
 *   This keeps single test / unit / validate runs completely unaffected.
 */
const reporters: NonNullable<Parameters<typeof defineConfig>[0]['reporter']> = [['html']];
if (process.env.USE_CONSOLIDATED_REPORTER === 'true') {
  reporters.push(['./core/reporters/Reporter.ts']);
}

/**
 * Headed / headless is configurable via the HEADED env var (set it in .env or
 * the shell). HEADED=true → visible browser window; anything else → headless.
 */
const isHeaded = String(process.env.HEADED).toLowerCase() === 'true';

export default defineConfig({
  testDir: './',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: reporters,
  /* Per-test timeout. KDF workflows have 100-200 steps and run for several
     minutes; Playwright's 30s default aborts a test mid-run and tears down the
     page/context, which surfaces as "Target page/context/browser has been
     closed" and "no valid page available" for every remaining step. Configurable
     via TEST_TIMEOUT_MS (default 30 minutes). */
  timeout: Number(process.env.TEST_TIMEOUT_MS) || 30 * 60 * 1000,
  /* Assertion timeout for expect(); configurable via EXPECT_TIMEOUT_MS. */
  expect: { timeout: Number(process.env.EXPECT_TIMEOUT_MS) || 15_000 },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Headed/headless controlled by the HEADED env var (configurable per run). */
    headless: !isHeaded,
    /* Lorenzo runs over http/self-signed in some envs; ignore cert issues. */
    ignoreHTTPSErrors: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      // Primary project runs on Microsoft Edge (msedge channel), not bundled Chromium.
      // NOTE: do NOT spread devices['Desktop Edge'] here — it sets deviceScaleFactor,
      // which is incompatible with `viewport: null` (maximized window) and throws in newContext.
      name: 'edge',
      use: {
        channel: 'msedge',
        viewport: null,
        launchOptions: {
          args: ['--disable-web-security', '--ignore-certificate-errors', '--start-maximized'],
        },
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
