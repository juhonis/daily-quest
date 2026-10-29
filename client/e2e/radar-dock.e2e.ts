import { test, expect, type Page, type Locator } from '@playwright/test'

const metadata = {
  host: 'https://radar.example',
  radar: { past: [
    { time: 1700000000, path: '/frame/one' },
    { time: 1700000600, path: '/frame/two' },
    { time: 1700001200, path: '/frame/three' },
  ] },
}
const tile = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#f1f5f9"/><path d="M0 180L90 90L180 150L256 30" fill="none" stroke="#94a3b8" stroke-width="3"/></svg>'
const rainTile = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><ellipse cx="120" cy="120" rx="55" ry="30" fill="#3b82f6" opacity=".3"/></svg>'

async function setup(page: Page, failRadar = false, liveProviders = false) {
  await page.route('https://api.open-meteo.com/**', async (route) => {
    const date = new URL(route.request().url()).searchParams.get('start_date')!
    await route.fulfill({ json: {
      current_weather: { temperature: 9, weathercode: 3, time: `${date}T12:00` },
      hourly: {
        time: [`${date}T12:00`, `${date}T13:00`],
        temperature_2m: [9, 10], weathercode: [3, 3], rain: [0, 0],
      },
    } })
  })
  if (!liveProviders) {
    await page.route('https://api.rainviewer.com/**', async (route) => {
      if (failRadar) await route.fulfill({ status: 503, body: 'Unavailable' })
      else await route.fulfill({ json: metadata })
    })
    await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: tile }))
    await page.route('https://radar.example/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: rainTile }))
  }
  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    localStorage.setItem('daily-quest-store', JSON.stringify({ version: 0, state: {
      quests: [{ id: 'radar-task', title: 'A task beside the radar', description: 'The radar should not prevent editing.', targetDate: today, createdAt: now.toISOString(), updatedAt: now.toISOString(), repeat: 'none', rollover: true, status: 'active', archivedAt: null, subQuests: [] }],
      notes: [{ id: 'note', title: 'A note beside the radar', content: 'Keep the radar available while browsing.', color: '#3B82F6', createdAt: now.toISOString(), updatedAt: now.toISOString() }],
      coords: { lat: 62.89, lon: 27.68 }, locationMode: 'manual', locationName: 'Kuopio, North Savo, Finland',
      completions: [],
    } }))
  })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Show radar', exact: true })).toBeVisible()
}

function projection(proxy: Locator) {
  return proxy.evaluate((node) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform)
    return { scale: matrix.m11, x: matrix.m41, y: matrix.m42 }
  })
}

test('radar docks without blocking task completion, editing, or navigation', async ({ page }, info) => {
  await setup(page)
  const content = page.locator('.workspace-content')
  const before = (await content.boundingBox())!.width
  await page.getByRole('button', { name: 'Show radar', exact: true }).click()
  const radar = page.getByRole('complementary', { name: 'Rain radar', exact: true })
  await expect(radar.getByRole('region', { name: 'Rain radar map', exact: true })).toBeVisible()
  await expect(radar.getByRole('link', { name: 'OpenStreetMap', exact: true })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
  await expect(radar.getByRole('link', { name: 'RainViewer', exact: true })).toHaveAttribute('href', 'https://www.rainviewer.com/')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Hide radar', exact: true })).toHaveAttribute('aria-expanded', 'true')
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  const openWidth = (await content.boundingBox())!.width
  expect(before - openWidth).toBeGreaterThan(300)
  const bounds = await radar.boundingBox()
  const contentBounds = await content.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(contentBounds!.x + contentBounds!.width)
  await page.getByRole('checkbox', { name: 'Complete: A task beside the radar', exact: true }).click()
  await expect(page.getByText('1 of 1 done', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'New quest', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'New quest', exact: true })
  await editor.getByLabel('Title *', { exact: true }).fill('Created while radar stays open')
  await editor.getByRole('button', { name: 'Create Quest', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View quest: Created while radar stays open', exact: true })).toBeVisible()
  await expect(radar).toBeVisible()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Notes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Read note: A note beside the radar', exact: true })).toBeVisible()
  await expect(radar).toBeVisible()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Library', exact: true }).click()
  await expect(page.getByRole('searchbox', { name: 'Search quests' })).toBeVisible()
  await expect(radar).toBeVisible()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Day', exact: true }).click()
  await page.screenshot({ path: info.outputPath('desktop-radar-dock.png'), fullPage: true })
  await radar.getByRole('button', { name: 'Close radar', exact: true }).click()
  await expect(radar).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show radar', exact: true })).toBeFocused()
  expect((await content.boundingBox())!.width - openWidth).toBeGreaterThan(300)
})

test('map view and playback survive moving between the dock and inline layout', async ({ page }, info) => {
  await setup(page)
  await page.getByRole('button', { name: 'Show radar', exact: true }).click()
  const radar = page.getByRole('complementary', { name: 'Rain radar', exact: true })
  const map = radar.locator('.leaflet-container')
  await expect(map).toBeVisible()
  const originalMap = await map.elementHandle()
  await radar.getByRole('button', { name: 'Pause radar animation', exact: true }).click()
  const frame = radar.getByRole('slider', { name: 'Radar frame', exact: true })
  await frame.focus()
  await frame.press('Home')
  await expect(frame).toHaveValue('0')
  const proxy = map.locator('.leaflet-proxy')
  const initial = await projection(proxy)
  await map.locator('.leaflet-control-zoom-in').click()
  await expect.poll(async () => (await projection(proxy)).scale).toBe(initial.scale * 2)
  const zoomed = await projection(proxy)
  await map.focus()
  await map.press('ArrowRight')
  await expect.poll(async () => (await projection(proxy)).x).toBe(zoomed.x + 80)
  const panned = await projection(proxy)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(async () => (await map.boundingBox())!.height).toBe(224)
  // Allow the ResizeObserver's scheduled Leaflet update to finish before
  // comparing projected center/zoom, rather than only checking CSS dimensions.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect.poll(async () => (await projection(proxy)).scale).toBe(panned.scale)
  const resized = await projection(proxy)
  expect(Math.abs(resized.x - panned.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(resized.y - panned.y)).toBeLessThanOrEqual(1)
  expect(await map.evaluate((node, original) => node === original, originalMap)).toBe(true)
  await expect(frame).toHaveValue('0')
  await expect(radar.getByRole('button', { name: 'Play radar animation', exact: true })).toBeVisible()
  const radarBounds = await radar.boundingBox()
  const contentBounds = await page.locator('.workspace-content').boundingBox()
  expect(radarBounds!.y + radarBounds!.height).toBeLessThanOrEqual(contentBounds!.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await page.screenshot({ path: info.outputPath('phone-inline-radar.png'), fullPage: true })
  for (const width of [320, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    expect(await map.evaluate((node, original) => node === original, originalMap)).toBe(true)
    const view = await projection(proxy)
    expect(view.scale).toBe(panned.scale)
    expect(Math.abs(view.x - panned.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(view.y - panned.y)).toBeLessThanOrEqual(1)
    await expect(frame).toHaveValue('0')
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await radar.getByRole('button', { name: 'Change radar location', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Set location', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(radar).toBeVisible()
  await radar.getByRole('button', { name: 'Play radar animation', exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(radar).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show radar', exact: true })).toBeFocused()
})

test('failed radar stays non-modal and can be retried or closed from another view', async ({ page }) => {
  await setup(page, true)
  await page.getByRole('button', { name: 'Show radar', exact: true }).click()
  const radar = page.getByRole('complementary', { name: 'Rain radar', exact: true })
  await expect(radar.getByText('Radar could not be loaded.', { exact: true })).toBeVisible()
  await page.route('https://api.rainviewer.com/**', (route) => route.fulfill({ json: metadata }))
  await radar.getByRole('button', { name: 'Retry radar', exact: true }).click()
  await expect(radar.getByRole('region', { name: 'Rain radar map', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Notes', exact: true }).click()
  await radar.getByRole('button', { name: 'Close radar', exact: true }).click()
  await expect(radar).toHaveCount(0)
  await expect(page.locator('main')).toBeFocused()
})

for (const provider of ['background map', 'rain overlay'] as const) {
  test(`${provider} tile failures can be retried without resetting the map or frame`, async ({ page }) => {
    await setup(page)
    const url = provider === 'background map' ? 'https://tile.openstreetmap.org/**' : 'https://radar.example/**'
    let failing = true
    await page.route(url, (route) => failing
      ? route.fulfill({ status: 503, body: 'Unavailable' })
      : route.fulfill({ contentType: 'image/svg+xml', body: provider === 'background map' ? tile : rainTile }))
    await page.getByRole('button', { name: 'Show radar', exact: true }).click()
    const radar = page.getByRole('complementary', { name: 'Rain radar', exact: true })
    const message = radar.getByText(provider === 'background map'
      ? 'Background map tiles could not be loaded.'
      : 'Rain overlay tiles could not be loaded. Animation paused.', { exact: true })
    await expect(message).toBeVisible()
    if (provider === 'background map') await radar.getByRole('button', { name: 'Pause radar animation', exact: true }).click()
    await expect(radar.getByRole('button', { name: 'Play radar animation', exact: true })).toBeVisible()
    const frame = radar.getByRole('slider', { name: 'Radar frame', exact: true })
    await frame.focus()
    await frame.press('End')
    await expect(message).toBeVisible()
    const map = radar.locator('.leaflet-container')
    const originalMap = await map.elementHandle()
    const view = await projection(map.locator('.leaflet-proxy'))
    // One broken service must not hide tiles from the other service.
    const workingSource = provider === 'background map' ? 'https://radar.example/' : 'https://tile.openstreetmap.org/'
    await expect.poll(() => map.locator(`img.leaflet-tile-loaded[src^="${workingSource}"]`).count()).toBeGreaterThan(0)
    failing = false
    await radar.getByRole('button', { name: `Retry ${provider}`, exact: true }).click()
    await expect(message).toHaveCount(0)
    const recoveredSource = provider === 'background map' ? 'https://tile.openstreetmap.org/' : 'https://radar.example/'
    await expect.poll(() => map.locator(`img.leaflet-tile-loaded[src^="${recoveredSource}"]`).count()).toBeGreaterThan(0)
    expect(await map.evaluate((node, original) => node === original, originalMap)).toBe(true)
    expect(await projection(map.locator('.leaflet-proxy'))).toEqual(view)
    await expect(frame).toHaveValue('2')
    await expect(radar.getByRole('button', { name: 'Play radar animation', exact: true })).toBeVisible()
    await radar.getByRole('button', { name: 'Play radar animation', exact: true }).click()
    await expect(frame).not.toHaveValue('2')
  })
}

test('live radar providers render in the dock and phone layout', async ({ page }, info) => {
  test.skip(process.env.RADAR_LIVE_SMOKE !== '1', 'Opt-in check: requests only the currently visible provider tiles.')
  await setup(page, false, true)
  await page.getByRole('button', { name: 'Show radar', exact: true }).click()
  const radar = page.getByRole('complementary', { name: 'Rain radar', exact: true })
  await radar.getByRole('button', { name: 'Pause radar animation', exact: true }).click()
  const map = radar.locator('.leaflet-container')
  const expectLoadedTiles = () => expect.poll(() => map.locator('img.leaflet-tile').evaluateAll((tiles) =>
    tiles.length > 0 && tiles.every((tile) => tile instanceof HTMLImageElement && tile.complete && tile.naturalWidth > 0),
  )).toBe(true)
  for (const source of ['https://tile.openstreetmap.org/', '/256/']) {
    await expect.poll(() => map.locator(`img.leaflet-tile-loaded[src*="${source}"]`).count()).toBeGreaterThan(0)
  }
  await expectLoadedTiles()
  await expect(radar.getByText(/tiles could not be loaded/)).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('live-desktop-radar.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(map).toHaveCSS('height', '224px')
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expectLoadedTiles()
  await expect(radar.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible()
  await expect(radar.getByRole('link', { name: 'RainViewer', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await page.screenshot({ path: info.outputPath('live-phone-radar.png'), fullPage: true })
})
