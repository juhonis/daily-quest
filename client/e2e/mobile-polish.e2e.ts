import { test, expect, type Page } from '@playwright/test'

test.use({ viewport: { width: 393, height: 851 }, hasTouch: true })

async function seed(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('daily-quest-store')) return
    localStorage.setItem('daily-quest-store', JSON.stringify({ version: 0, state: {
      quests: [], completions: [],
      notes: [{ id: 'back-note', title: 'A note to navigate', content: 'Keep the correct navigation layer.', color: '#3B82F6', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
    } }))
  })
  await page.goto('/')
}
const nav = (page: Page) => page.getByRole('navigation', { name: 'Mobile navigation' })
const notes = async (page: Page) => { await nav(page).getByRole('button', { name: 'Notes', exact: true }).click() }

test('Back and Forward move through app views, and the URL survives reload', async ({ page }) => {
  await seed(page)
  const initialUrl = page.url()
  const skip = page.getByRole('link', { name: 'Skip to workspace', exact: true })
  await skip.focus()
  await skip.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  expect(page.url()).toBe(initialUrl)
  await notes(page)
  await expect(page).toHaveURL(/view=notes/)
  await nav(page).getByRole('button', { name: 'Library', exact: true }).click()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Quest library', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Quest library', exact: true })).toBeVisible()
})

test('Back closes readers and nested settings one layer at a time', async ({ page }) => {
  await seed(page)
  await notes(page)
  await page.getByRole('button', { name: 'Read note: A note to navigate', exact: true }).click()
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible()
  await nav(page).getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('dialog', { name: 'Settings', exact: true }).getByRole('button', { name: 'Edit panels', exact: true }).click()
  await page.goBack()
  await expect(page.getByRole('dialog', { name: 'Edit panels', exact: true })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
})

test('declining discard after Back preserves the editor and its history entry', async ({ page }) => {
  await seed(page)
  await notes(page)
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'New Note', exact: true })
  await editor.getByLabel('Title', { exact: true }).fill('Still editing')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.goBack()
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue('Still editing')
  await expect(editor).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.goBack()
  await expect(editor).toHaveCount(0)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
})

test('save, native Escape, and reader-to-editor handoffs leave no empty Back step', async ({ page }) => {
  await seed(page)
  await notes(page)
  await page.getByRole('button', { name: 'Read note: A note to navigate', exact: true }).click()
  await page.getByRole('dialog', { name: 'A note to navigate', exact: true }).getByRole('button', { name: 'Edit', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Edit Note', exact: true })
  await editor.getByLabel('Content', { exact: true }).fill('Updated through a handoff.')
  await editor.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(editor).toHaveCount(0)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await notes(page)
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goForward()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
})

test('panel move buttons, visibility and merge controls work on a narrow screen', async ({ page }, info) => {
  await seed(page)
  await page.getByRole('button', { name: 'Customize', exact: true }).click()
  const panels = page.getByRole('dialog', { name: 'Edit panels', exact: true })
  await expect(panels.getByRole('button', { name: 'Move Daily up', exact: true })).toBeDisabled()
  await panels.getByRole('button', { name: 'Move Daily down', exact: true }).tap()
  await expect(panels.getByRole('button', { name: /^Reorder / }).first()).toHaveAttribute('aria-label', 'Reorder Repeating')
  await panels.getByRole('button', { name: 'Move Daily up', exact: true }).tap()
  await expect(panels.getByRole('button', { name: /^Reorder / }).first()).toHaveAttribute('aria-label', 'Reorder Daily')
  await panels.getByRole('checkbox', { name: 'Daily', exact: true }).uncheck()
  await panels.getByRole('combobox', { name: 'Merge Daily into', exact: true }).selectOption('repeating')
  await expect(panels.getByText('Merged into Repeating', { exact: true })).toBeVisible()
  await panels.getByRole('button', { name: 'Unmerge Daily', exact: true }).tap()
  await expect(panels.getByRole('combobox', { name: 'Merge Daily into', exact: true })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('daily-quest-store')!).state.hiddenPanels)).toContain('daily')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await page.screenshot({ path: info.outputPath('android-panel-customization.png') })
})

test('a held touch handle reorders while a short swipe does not', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Trusted multi-step touch dispatch uses Chromium CDP; other engines retain move-button coverage.')
  await seed(page)
  await page.getByRole('button', { name: 'Customize', exact: true }).click()
  const panels = page.getByRole('dialog', { name: 'Edit panels', exact: true })
  const handle = panels.getByRole('button', { name: 'Reorder Daily', exact: true })
  const source = (await handle.boundingBox())!
  const target = (await panels.getByRole('button', { name: 'Reorder Repeating', exact: true }).boundingBox())!
  const cdp = await page.context().newCDPSession(page)
  const point = (x: number, y: number) => [{ x, y, id: 1 }]
  const x = source.x + source.width / 2, y = source.y + source.height / 2
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(x, y) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(x, y + 40) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(panels.getByRole('button', { name: /^Reorder / }).first()).toHaveAttribute('aria-label', 'Reorder Daily')
  await handle.scrollIntoViewIfNeeded()
  const start = (await handle.boundingBox())!
  const finish = (await panels.getByRole('button', { name: 'Reorder Repeating', exact: true }).boundingBox())!
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(start.x + start.width / 2, start.y + start.height / 2) })
  await expect(handle).toHaveAttribute('aria-pressed', 'true')
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(start.x + start.width / 2, finish.y + finish.height / 2 + 20) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(panels.getByRole('button', { name: /^Reorder / }).first()).toHaveAttribute('aria-label', 'Reorder Repeating')
  expect(target.height).toBeGreaterThanOrEqual(44)
})

test('manifest supplies real install icons and a stable standalone identity', async ({ page }) => {
  await seed(page)
  const manifest = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ id: '/', start_url: '/', scope: '/', display: 'standalone', orientation: 'any' })
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((value: { sizes: string; purpose: string }) => value.sizes === `${size}x${size}` && value.purpose === 'any')
    expect(icon).toBeTruthy()
    const image = await (await page.request.get(icon.src)).body()
    expect(image.subarray(1, 4).toString()).toBe('PNG')
    expect(image.readUInt32BE(16)).toBe(size)
    expect(image.readUInt32BE(20)).toBe(size)
  }
  expect(manifest.icons.some((value: { sizes: string; purpose: string }) => value.sizes === '512x512' && value.purpose === 'maskable')).toBe(true)
})

test('the installed-app cache can reopen and save local notes offline', async ({ page, context }) => {
  await seed(page)
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  try {
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
    await notes(page)
    await page.getByRole('button', { name: 'New note', exact: true }).click()
    const editor = page.getByRole('dialog', { name: 'New Note', exact: true })
    await editor.getByLabel('Title', { exact: true }).fill('Saved while offline')
    await editor.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Read note: Saved while offline', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Read note: Saved while offline', exact: true })).toBeVisible()
  } finally { await context.setOffline(false) }
})

test('local editing works when the secure-context-only randomUUID API is absent', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined }))
  await seed(page)
  await page.getByRole('button', { name: 'New quest', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'New quest', exact: true })
  await editor.getByLabel('Title *', { exact: true }).fill('Local Android test')
  await editor.getByRole('button', { name: 'Create Quest', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View quest: Local Android test', exact: true })).toBeVisible()
})

test('reload drops transient dialog entries while keeping its draft recoverable', async ({ page }) => {
  await seed(page)
  await notes(page)
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  let editor = page.getByRole('dialog', { name: 'New Note', exact: true })
  await editor.getByLabel('Title', { exact: true }).fill('Resume after reload')
  await expect(editor.getByRole('status')).toHaveText('Draft saved in this tab')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  editor = page.getByRole('dialog', { name: 'New Note', exact: true })
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue('Resume after reload')
  await editor.getByRole('button', { name: 'Keep draft', exact: true }).click()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
})

test('a visual-only keyboard viewport keeps the editor footer above the IME', async ({ page }, info) => {
  await seed(page)
  await notes(page)
  await page.evaluate(() => {
    const viewport = new EventTarget() as EventTarget & { height: number; offsetTop: number; scale: number }
    Object.assign(viewport, { height: 350, offsetTop: 0, scale: 1 })
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
  })
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'New Note', exact: true })
  await editor.getByLabel('Title', { exact: true }).fill('Keyboard-safe note')
  await editor.getByLabel('Content', { exact: true }).fill('The visual viewport can shrink independently of layout.')
  await expect(editor).toHaveAttribute('data-keyboard-viewport', 'true')
  const save = editor.getByRole('button', { name: 'Create', exact: true })
  const bounds = await save.boundingBox()
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(350)
  await page.screenshot({ path: info.outputPath('visual-keyboard-editor.png') })
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: window.innerHeight })
    window.visualViewport!.dispatchEvent(new Event('resize'))
  })
  await expect(editor).not.toHaveAttribute('data-keyboard-viewport', 'true')
  await save.click()
  await expect(page.getByRole('button', { name: 'Read note: Keyboard-safe note', exact: true })).toBeVisible()
})
