import { test, expect, type Page, type Route } from '@playwright/test'
import { getTodayLocal, addDays } from '../src/utils/dateUtils'

async function seed(page: Page, withWeather = false) {
  await page.addInitScript((weather) => {
    localStorage.setItem('daily-quest-store', JSON.stringify({ version: 0, state: {
      quests: [], notes: [], completions: [],
      ...(weather ? { coords: { lat: 62.89, lon: 27.68 }, locationMode: 'manual', locationName: 'Kuopio, North Savo, Finland' } : {}),
    } }))
  }, withWeather)
  await page.goto('/')
}

function responseFor(date: string) {
  return {
    current_weather: { temperature: 9, weathercode: 3, time: `${date}T12:30` },
    hourly: {
      time: Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`),
      temperature_2m: Array.from({ length: 24 }, (_, hour) => 7 + hour % 5),
      weathercode: Array.from({ length: 24 }, (_, hour) => hour === 17 ? 61 : 3),
      rain: Array.from({ length: 24 }, (_, hour) => hour === 17 ? 0.5 : 0),
    },
  }
}

async function mockWeather(page: Page, handler?: (route: Route) => Promise<void>) {
  await page.route('https://api.open-meteo.com/v1/forecast?**', handler ?? (async (route) => {
    const date = new URL(route.request().url()).searchParams.get('start_date')!
    await route.fulfill({ json: responseFor(date) })
  }))
}

test('calendar scrolls independently, preserves selection and anchors prepended months', async ({ page }, info) => {
  await seed(page)
  const sidebar = page.getByRole('complementary', { name: 'Calendar sidebar' })
  const calendar = sidebar.getByRole('region', { name: 'Scrollable calendar' })
  const selected = sidebar.locator('button[data-date][aria-pressed=true]')
  const selection = await selected.getAttribute('data-date')
  await expect.poll(() => calendar.evaluate((node) => node.scrollTop)).toBeGreaterThan(100)
  const visibleMonths = await calendar.evaluate((node) => {
    const bounds = node.getBoundingClientRect()
    return [...node.querySelectorAll('[data-calendar-month]')].filter((month) => {
      const rect = month.getBoundingClientRect()
      return rect.bottom > bounds.top && rect.top < bounds.bottom
    }).length
  })
  expect(visibleMonths).toBeGreaterThanOrEqual(2)
  const before = await calendar.evaluate((node) => node.scrollTop)
  await calendar.hover()
  await page.mouse.wheel(0, 250)
  await expect.poll(() => calendar.evaluate((node) => node.scrollTop)).toBeGreaterThan(before)
  await expect(selected).toHaveAttribute('data-date', selection!)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)

  const first = await calendar.locator('[data-calendar-month]').first().getAttribute('data-calendar-month')
  const anchorOffset = await calendar.evaluate((node) => {
    node.scrollTop = 10
    return node.querySelector<HTMLElement>('[data-calendar-month]')!.offsetTop - node.scrollTop
  })
  await expect.poll(() => calendar.locator('[data-calendar-month]').first().getAttribute('data-calendar-month')).not.toBe(first)
  const afterOffset = await calendar.locator(`[data-calendar-month="${first}"]`).evaluate((node) => {
    const parent = node.parentElement!
    return (node as HTMLElement).offsetTop - parent.scrollTop
  })
  expect(Math.abs(afterOffset - anchorOffset)).toBeLessThan(2)
  expect(await calendar.locator('[data-calendar-month]').count()).toBeLessThanOrEqual(13)
  await expect(selected).toHaveAttribute('data-date', selection!)
  for (let index = 0; index < 3; index++) {
    const count = await calendar.locator('[data-calendar-month]').count()
    const start = await calendar.locator('[data-calendar-month]').first().getAttribute('data-calendar-month')
    await calendar.evaluate((node) => { node.scrollTop = node.scrollHeight - node.clientHeight - 10 })
    if (count < 13) {
      await expect.poll(() => calendar.locator('[data-calendar-month]').count()).toBe(Math.min(13, count + 3))
    } else {
      await expect.poll(() => calendar.locator('[data-calendar-month]').first().getAttribute('data-calendar-month')).not.toBe(start)
    }
    expect(await calendar.locator('[data-calendar-month]').count()).toBeLessThanOrEqual(13)
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  }
  await sidebar.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(selected).toBeInViewport()
  await page.screenshot({ path: info.outputPath('multi-month-calendar.png'), fullPage: true })
})

test('weather shows a loading state until data arrives', async ({ page }) => {
  let release!: () => void
  const waiting = new Promise<void>((resolve) => { release = resolve })
  await mockWeather(page, async (route) => {
    await waiting
    const date = new URL(route.request().url()).searchParams.get('start_date')!
    await route.fulfill({ json: responseFor(date) })
  })
  try {
    await seed(page, true)
    await expect(page.getByText('Loading weather…', { exact: true })).toBeVisible()
    await expect(page.getByText('Loading forecast…', { exact: true })).toBeVisible()
    release()
    await expect(page.getByRole('group', { name: 'Current weather', exact: true }).getByText('9°C', { exact: true })).toBeVisible()
    await expect(page.getByText('Loading forecast…', { exact: true })).toHaveCount(0)
  } finally { release() }
})

test('weather is inline, shares today data, and fits desktop and phone widths', async ({ page }, info) => {
  const requested: string[] = []
  await mockWeather(page, async (route) => {
    const date = new URL(route.request().url()).searchParams.get('start_date')!
    requested.push(date)
    await route.fulfill({ json: responseFor(date) })
  })
  await seed(page, true)
  const weather = page.getByRole('region', { name: 'Weather', exact: true })
  const summary = weather.getByRole('group', { name: 'Day summary', exact: true })
  const current = weather.getByRole('group', { name: 'Current weather', exact: true })
  const forecast = weather.getByRole('group', { name: 'Hourly forecast', exact: true })
  await expect(summary.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(summary.getByRole('group', { name: 'Current weather', exact: true })).toBeVisible()
  await expect(current.getByText('9°C', { exact: true })).toBeVisible()
  await expect(current.getByText('Now', { exact: true })).toHaveCount(0)
  await expect(current.locator('[title="Kuopio, North Savo, Finland"]')).toHaveText('Kuopio')
  const summaryBounds = await summary.boundingBox()
  const forecastBounds = await forecast.boundingBox()
  expect(forecastBounds!.x).toBeGreaterThanOrEqual(summaryBounds!.x + summaryBounds!.width)
  await expect(forecast.locator('[aria-current=time]')).toHaveCount(1)
  expect(requested).toEqual([getTodayLocal()])
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.screenshot({ path: info.outputPath('desktop-inline-weather.png'), fullPage: true })

  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(weather).toBeVisible()
    const bounds = await weather.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: info.outputPath('phone-inline-weather.png'), fullPage: true })
  await page.getByRole('button', { name: 'Next day', exact: true }).click()
  const tomorrow = addDays(getTodayLocal(), 1)
  await expect(forecast.getByText(`Hourly · ${tomorrow}`, { exact: true })).toBeVisible()
  await expect(forecast.getByRole('status')).toHaveCount(0)
  await expect(current.getByText('9°C', { exact: true })).toBeVisible()
  await expect(current.getByText('Now', { exact: true })).toBeVisible()
  expect(requested).toEqual([getTodayLocal(), tomorrow])
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(current.getByText('Now', { exact: true })).toHaveCount(0)
  await expect(forecast.getByText(`Hourly · ${getTodayLocal()}`, { exact: true })).toBeVisible()
  expect(requested).toEqual([getTodayLocal(), tomorrow])

  // Choosing an out-of-range day must not show stale hourly data or fetch it.
  await page.getByRole('button', { name: 'Choose date', exact: true }).click()
  const calendar = page.getByRole('dialog', { name: 'Choose a date', exact: true })
  const future = await calendar.locator('[data-calendar-month]').last().getAttribute('data-calendar-month')
  await calendar.locator(`[data-date="${future}"]`).click()
  await expect(forecast.getByText('Forecast unavailable for this date.', { exact: true })).toBeVisible()
  await expect(current.getByText('9°C', { exact: true })).toBeVisible()
  expect(requested).not.toContain(future)
})

test('weather error can be retried and location and radar dialogs stay usable', async ({ page }) => {
  let fail = true
  await mockWeather(page, async (route) => {
    if (fail) await route.fulfill({ status: 503, body: 'Unavailable' })
    else {
      const date = new URL(route.request().url()).searchParams.get('start_date')!
      await route.fulfill({ json: responseFor(date) })
    }
  })
  await page.route('https://api.rainviewer.com/**', (route) => route.abort())
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page, true)
  await expect(page.getByText('Forecast could not be loaded.', { exact: true })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Retry forecast', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Current weather', exact: true }).getByText('9°C', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Change weather location', exact: true }).click()
  const location = page.getByRole('dialog', { name: 'Set location', exact: true })
  await expect(location).toBeVisible()
  await expect(location.getByText('Current location: Kuopio, North Savo, Finland', { exact: true })).toBeVisible()
  await location.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Show radar', exact: true }).click()
  const radar = page.getByRole('dialog', { name: 'Rain radar', exact: true })
  await expect(radar).toBeVisible()
  const bounds = await radar.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  await page.keyboard.press('Escape')
  await expect(radar).toHaveCount(0)
})
