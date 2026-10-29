import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

// Reproducible raster assets from the scalable source. PNGs are checked in;
// normal builds do not need a browser or an image-generation dependency.
const source = await readFile(new URL('../public/app-icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  for (const [filename, size] of [['app-icon-192.png', 192], ['app-icon-512.png', 512], ['app-icon-maskable-512.png', 512]]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:#0f172a}svg{display:block;width:100%;height:100%}</style>${source}`)
    await page.screenshot({ path: fileURLToPath(new URL(`../public/${filename}`, import.meta.url)) })
  }
} finally { await browser.close() }
