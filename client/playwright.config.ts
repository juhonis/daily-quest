import { defineConfig } from '@playwright/test'

const env = { WRANGLER_REGISTRY_PATH: `${process.cwd()}/.wrangler/e2e-registry-${process.pid}` }

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://localhost:8788', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: [
    { command: `npm run dev -- --env preview --persist-to .wrangler/e2e-${process.pid}`, env, cwd: '../sync-worker', wait: { stdout: /Ready on http:\/\/(?:localhost|127\.0\.0\.1):8787/ }, timeout: 120000 },
    { command: 'npm run build && npm run dev:sync', env, wait: { stdout: /Ready on http:\/\/(?:localhost|127\.0\.0\.1):8788/ }, timeout: 120000 },
  ],
})
