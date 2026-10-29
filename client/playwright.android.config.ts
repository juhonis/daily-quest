import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testMatch: '**/mobile-polish.e2e.ts',
  projects: [
    { name: 'chromium-mobile', use: { browserName: 'chromium', isMobile: true, hasTouch: true } },
    // Playwright cannot emulate isMobile in Firefox. This provides engine and
    // narrow-layout coverage, not a claim of testing Firefox on Android.
    { name: 'firefox-layout', use: { browserName: 'firefox', hasTouch: true } },
  ],
})
