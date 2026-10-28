import { test, expect, type Page } from '@playwright/test'
import { addDays, addMonths } from '../src/utils/dateUtils'

async function seed(page: Page) {
  await page.addInitScript(() => {
    const now = new Date()
    const day = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const today = day(now)
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
    const base = { createdAt: now.toISOString(), updatedAt: now.toISOString(), targetDate: today, status: 'active', archivedAt: null, subQuests: [], tags: ['Personal'], rollover: false, repeat: 'none' }
    localStorage.setItem('daily-quest-store', JSON.stringify({ version: 0, state: {
      quests: [
        { ...base, id: 'read', title: 'Read ten pages', description: 'A small daily habit, away from the screen.', repeat: 'daily', subQuests: [{ id: 'book', title: 'Choose a book', isCompleted: false }] },
        { ...base, id: 'plan', title: 'Plan the weekend with a long title that should wrap comfortably', rollover: true },
        { ...base, id: 'walk', title: 'Go for an evening walk', targetDate: day(yesterday), rollover: true, tags: ['Outside'] },
      ],
      notes: [{ id: 'ideas', title: 'Weekend ideas', content: 'A walk by the water\nTry a new recipe\nFind something good to read', color: '#3B82F6', createdAt: now.toISOString(), updatedAt: now.toISOString() }],
      completions: [],
      tagColors: { Personal: '#3B82F6', Outside: '#10B981' },
      quickPresets: [{ id: 'wordle', title: 'Wordle', externalUrl: 'https://nytimes.com/games/wordle', isUserDefined: false, updatedAt: now.toISOString() }],
    } }))
  })
  await page.goto('/')
}

const navigation = (page: Page, mobile = false) => page.getByRole('navigation', { name: mobile ? 'Mobile navigation' : 'Main navigation' })

test('desktop reclaims calendar space and offers list and board layouts', async ({ page }, info) => {
  await seed(page)
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Weather', exact: true })).not.toBeVisible()
  await page.screenshot({ path: info.outputPath('desktop-list.png'), fullPage: true })
  const before = await page.locator('main').boundingBox()
  await page.getByRole('button', { name: 'Hide calendar', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Calendar sidebar' })).toHaveCount(0)
  const after = await page.locator('main').boundingBox()
  expect(after!.width - before!.width).toBeGreaterThan(200)
  await page.getByRole('button', { name: 'Board', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Board', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'View quest: Read ten pages' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('desktop-board.png'), fullPage: true })
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await navigation(page).getByRole('button', { name: 'Library', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search quests' }).fill('weekend')
  await expect(page.getByRole('button', { name: /^View quest:/ })).toHaveCount(1)
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.getByRole('button', { name: /^View quest:/ }).click()
  await page.getByRole('button', { name: 'Edit quest', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Edit quest', exact: true })).toBeVisible()
})

test.describe('touch interactions', () => {
test.use({ isMobile: true, hasTouch: true })
test('phone can edit and complete a quest, then create and read a note', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page)
  await expect(navigation(page, true)).toBeVisible()
  await page.screenshot({ path: info.outputPath('phone-day.png'), fullPage: true })
  await page.getByRole('button', { name: 'View quest: Read ten pages' }).tap()
  const details = page.getByRole('dialog', { name: 'Read ten pages', exact: true })
  await expect(details.getByText('A small daily habit, away from the screen.')).toBeVisible()
  await details.getByRole('button', { name: 'Edit quest', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Edit quest', exact: true })
  await editor.getByLabel('Title *', { exact: true }).fill('Read twenty pages')
  await editor.getByRole('button', { name: 'Update Quest', exact: true }).click()
  await expect(editor).toHaveCount(0)
  // Completing moves the row into the collapsed Done section, so assert the
  // resulting progress rather than requiring the original input to stay mounted.
  await page.getByRole('checkbox', { name: 'Complete: Read twenty pages', exact: true }).click()
  await expect(page.getByText('1 of 3 done', { exact: true })).toBeVisible()
  await page.getByRole('region', { name: 'Done', exact: true }).getByRole('button', { expanded: false }).click()
  await expect(page.getByRole('checkbox', { name: 'Mark incomplete: Read twenty pages', exact: true })).toBeChecked()
  await navigation(page, true).getByRole('button', { name: 'Notes', exact: true }).tap()
  await page.getByRole('button', { name: 'New note', exact: true }).tap()
  const noteEditor = page.getByRole('dialog', { name: 'New Note', exact: true })
  await noteEditor.getByLabel('Title', { exact: true }).fill('An idea captured on my phone')
  await noteEditor.getByLabel('Content', { exact: true }).fill('Keep it simple and comfortable to use.')
  await noteEditor.getByRole('button', { name: 'Create', exact: true }).click()
  await page.getByRole('button', { name: 'Read note: An idea captured on my phone', exact: true }).click()
  const note = page.getByRole('dialog', { name: 'An idea captured on my phone', exact: true })
  await expect(note.getByText('Keep it simple and comfortable to use.')).toBeVisible()
  await note.getByRole('button', { name: 'Close', exact: true }).first().click()
  await page.screenshot({ path: info.outputPath('phone-notes.png'), fullPage: true })
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('daily-quest-store')!).state)
  expect(stored.notes).toHaveLength(2)
  expect(stored.quests.find((q: { id: string }) => q.id === 'read').title).toBe('Read twenty pages')
  expect(stored.completions).toHaveLength(1)
  await navigation(page, true).getByRole('button', { name: 'Library', exact: true }).tap()
  await page.getByRole('combobox', { name: 'Completion history', exact: true }).selectOption('done')
  await expect(page.getByRole('button', { name: /^View quest:/ })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'View quest: Read twenty pages', exact: true })).toBeVisible()
})
})

test('calendar keyboard navigation moves real focus and nested dialogs restore it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page)
  const choose = page.getByRole('button', { name: 'Choose date', exact: true })
  await choose.click()
  const calendar = page.getByRole('dialog', { name: 'Choose a date', exact: true })
  const selected = calendar.locator('button[data-date][aria-pressed=true]')
  const oldDate = await selected.getAttribute('data-date')
  await selected.focus()
  await page.keyboard.press('ArrowRight')
  const expectedDate = addDays(oldDate!, 1)
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement)?.dataset.date)).toBe(expectedDate)
  await page.keyboard.press('PageDown')
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement)?.dataset.date)).toBe(addMonths(expectedDate, 1))
  await page.keyboard.press('Enter')
  await expect(calendar).toHaveCount(0)
  await expect(choose).toBeFocused()
  const settingsButton = navigation(page, true).getByRole('button', { name: 'Settings', exact: true })
  await settingsButton.click()
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
  await settings.getByRole('button', { name: 'Edit panels', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Edit panels', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(settings).toBeVisible()
  await expect(settings.getByRole('button', { name: 'Edit panels', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(settings).toHaveCount(0)
  await expect(settingsButton).toBeFocused()
})

test('cancelling an edited quest protects the draft until discard is confirmed', async ({ page }) => {
  await seed(page)
  await page.getByRole('button', { name: 'New quest', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'New quest', exact: true })
  await editor.getByLabel('Title *', { exact: true }).fill('An unfinished idea')
  page.once('dialog', (dialog) => dialog.dismiss())
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(editor.getByLabel('Title *', { exact: true })).toHaveValue('An unfinished idea')
  page.once('dialog', (dialog) => dialog.accept())
  await page.keyboard.press('Escape')
  await expect(editor).toHaveCount(0)
  const titles = await page.evaluate(() => JSON.parse(localStorage.getItem('daily-quest-store')!).state.quests.map((q: { title: string }) => q.title))
  expect(titles).not.toContain('An unfinished idea')
})

for (const width of [320, 768, 1280]) {
  test(`workspace and editors fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await seed(page)
    const overflows = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(await overflows()).toBe(false)
    await page.getByRole('button', { name: 'New quest', exact: true }).click()
    const editor = page.getByRole('dialog', { name: 'New quest', exact: true })
    const bounds = await editor.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
    expect(bounds!.height).toBeLessThanOrEqual(800)
    await editor.getByLabel('Title *', { exact: true }).fill('A new quest')
    await editor.getByRole('button', { name: 'Create Quest', exact: true }).click()
    await expect(page.getByRole('button', { name: 'View quest: A new quest', exact: true })).toBeVisible()
    expect(await overflows()).toBe(false)
  })
}
