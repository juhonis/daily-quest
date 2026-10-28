import { test, expect, type Page } from '@playwright/test'
import { addDays, getTodayLocal } from '../src/utils/dateUtils'

async function seed(page: Page, archived = false) {
  await page.addInitScript((archive) => {
    if (localStorage.getItem('daily-quest-store')) return
    const now = new Date()
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    localStorage.setItem('daily-quest-store', JSON.stringify({ version: 0, state: {
      quests: [{ id: 'existing', title: 'Existing quest', description: 'Original details', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: now.toISOString(), targetDate: date, repeat: 'weekly', rollover: true, status: archive ? 'inactive' : 'active', archivedAt: archive ? '2026-01-01' : null, externalUrl: 'https://example.com', icon: 'book', xp: 10, maxRolloverDays: 8, sortOrder: 3, tags: ['Personal'], subQuests: [{ id: 'done-step', title: 'An already completed step', isCompleted: true }] }],
      notes: [], completions: [], tagColors: { Personal: '#3B82F6' },
      quickPresets: [{ id: 'wordle', title: 'Wordle', isUserDefined: false, updatedAt: now.toISOString() }],
    } }))
  }, archived)
  await page.goto('/')
}

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('daily-quest-store')!).state)
const newEditor = async (page: Page) => {
  await page.getByRole('button', { name: 'New quest', exact: true }).click()
  return page.getByRole('dialog', { name: 'New quest', exact: true })
}
async function editFromLibrary(page: Page, title: string, mobile = false) {
  await page.getByRole('navigation', { name: mobile ? 'Mobile navigation' : 'Main navigation' }).getByRole('button', { name: 'Library', exact: true }).click()
  await page.getByRole('button', { name: `View quest: ${title}`, exact: true }).click()
  await page.getByRole('button', { name: 'Edit quest', exact: true }).click()
  return page.getByRole('dialog', { name: 'Edit quest', exact: true })
}

test('compact editor and Quick add agree on one-off and carry-forward scheduling', async ({ page }, info) => {
  await seed(page)
  const editor = await newEditor(page)
  await expect(editor.getByLabel('Title *', { exact: true })).toBeFocused()
  await expect(editor.getByRole('button', { name: /^Description/ })).toHaveAttribute('aria-expanded', 'false')
  await expect(editor.getByRole('button', { name: /^Subquests/ })).toHaveAttribute('aria-expanded', 'false')
  await expect(editor.getByRole('button', { name: /^More options/ })).toHaveAttribute('aria-expanded', 'false')
  await expect(editor.getByRole('checkbox', { name: 'Carry forward until completed', exact: true })).not.toBeChecked()
  await editor.getByLabel('Title *', { exact: true }).fill('A focused one-off quest')
  await page.screenshot({ path: info.outputPath('desktop-quest-editor.png') })
  await editor.getByRole('button', { name: 'Create Quest', exact: true }).click()
  let state = await stored(page)
  expect(state.quests.find((q: { title: string }) => q.title === 'A focused one-off quest')).toMatchObject({ repeat: 'none', rollover: false, targetDate: getTodayLocal() })
  await page.getByRole('button', { name: 'Quick add', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Once', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Wordle', exact: true }).click()
  await page.getByRole('button', { name: 'Quick add', exact: true }).click()
  await page.getByRole('button', { name: 'Carry forward', exact: true }).click()
  await page.getByRole('button', { name: 'Wordle', exact: true }).click()
  state = await stored(page)
  const presets = state.quests.filter((q: { title: string }) => q.title === 'Wordle')
  expect(presets.map((q: { rollover: boolean }) => q.rollover).sort()).toEqual([false, true])
  await page.getByRole('button', { name: 'Next day', exact: true }).click()
  const carried = page.getByRole('region', { name: 'Carried forward', exact: true })
  await expect(carried.getByRole('button', { name: 'View quest: Wordle', exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'View quest: A focused one-off quest', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Quick add', exact: true }).click()
  await page.getByRole('button', { name: 'Manage presets (1)', exact: true }).click()
  await page.getByRole('textbox', { name: 'Preset title', exact: true }).fill('Reusable capture')
  await page.getByRole('textbox', { name: 'Preset URL', exact: true }).fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Use a complete http:// or https:// link.')
  expect((await stored(page)).quickPresets).toHaveLength(1)
  await page.getByRole('textbox', { name: 'Preset URL', exact: true }).fill('HTTPS://example.com/capture')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  expect((await stored(page)).quickPresets.find((preset: { title: string }) => preset.title === 'Reusable capture').externalUrl).toBe('https://example.com/capture')
})

test.describe('phone editor', () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } })

  test('custom scheduling, optional details, tags and presets save together', async ({ page }, info) => {
    await seed(page)
    const editor = await newEditor(page)
    await editor.getByLabel('Title *', { exact: true }).fill('A recurring plan')
    await editor.getByLabel('Repeat', { exact: true }).selectOption('custom')
    await editor.getByLabel('Every', { exact: true }).fill('0')
    await editor.getByRole('button', { name: 'Create Quest', exact: true }).click()
    await expect(editor.getByText('Use a whole number of 1 or more.', { exact: true })).toBeVisible()
    await editor.getByLabel('Every', { exact: true }).fill('3')
    await editor.getByLabel('Unit', { exact: true }).selectOption('week')
    await editor.getByRole('checkbox', { name: 'Carry forward until completed', exact: true }).check()
    await editor.getByRole('button', { name: /^Description/ }).tap()
    await editor.getByLabel('Description', { exact: true }).fill('Keep the full context available.')
    await editor.getByRole('button', { name: /^Subquests/ }).tap()
    await editor.getByRole('textbox', { name: 'New step', exact: true }).fill('Include this step on save')
    await editor.getByRole('button', { name: /^Tags/ }).tap()
    await editor.getByRole('button', { name: 'Add tag Personal', exact: true }).tap()
    await editor.getByRole('searchbox', { name: 'Find or create tags', exact: true }).fill('New tag')
    await editor.getByRole('button', { name: 'Create tag “New tag”', exact: true }).tap()
    expect((await stored(page)).tagColors).not.toHaveProperty('New tag')
    await editor.getByRole('button', { name: /^More options/ }).tap()
    await editor.getByLabel('External link', { exact: true }).fill('javascript:alert(1)')
    await editor.getByRole('button', { name: /^More options/ }).tap()
    await editor.getByRole('button', { name: 'Create Quest', exact: true }).click()
    await expect(editor.getByText('Use a complete http:// or https:// link.', { exact: true })).toBeVisible()
    await editor.getByLabel('External link', { exact: true }).fill('https://example.com/plan')
    await expect(editor.getByLabel('External link', { exact: true })).toBeVisible()
    await editor.getByRole('checkbox', { name: /Save title and link to Quick add/ }).check()
    await editor.getByLabel('XP (optional)', { exact: true }).fill('15')
    await page.setViewportSize({ width: 390, height: 430 })
    await expect(editor.getByLabel('XP (optional)', { exact: true })).toBeInViewport()
    await expect(editor.getByRole('button', { name: 'Create Quest', exact: true })).toBeInViewport()
    await page.screenshot({ path: info.outputPath('phone-editor-short-viewport.png') })
    await editor.getByRole('button', { name: 'Create Quest', exact: true }).click()
    const state = await stored(page)
    expect(state.quests.find((q: { title: string }) => q.title === 'A recurring plan')).toMatchObject({ repeat: 'custom', repeatConfig: { interval: 3, unit: 'week' }, rollover: true, tags: ['Personal', 'New tag'], xp: 15, externalUrl: 'https://example.com/plan', subQuests: [{ title: 'Include this step on save', isCompleted: false }] })
    expect(state.quickPresets.find((p: { title: string }) => p.title === 'A recurring plan')).toMatchObject({ title: 'A recurring plan', externalUrl: 'https://example.com/plan', isUserDefined: true })
    expect(state.tagColors).toHaveProperty('New tag')
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })

  test('a parked quest can be scheduled later from Library', async ({ page }) => {
    await seed(page)
    let editor = await newEditor(page)
    await editor.getByLabel('Title *', { exact: true }).fill('An idea for later')
    await editor.getByRole('button', { name: 'Park for later', exact: true }).tap()
    await expect(editor.getByLabel('Date', { exact: true })).toHaveCount(0)
    await editor.getByRole('button', { name: 'Save parked quest', exact: true }).tap()
    expect((await stored(page)).quests.find((q: { title: string }) => q.title === 'An idea for later')).toMatchObject({ status: 'inactive', targetDate: '' })
    editor = await editFromLibrary(page, 'An idea for later', true)
    await expect(editor.getByRole('button', { name: 'Park for later', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await editor.getByRole('button', { name: 'Schedule', exact: true }).tap()
    await editor.getByLabel('Date', { exact: true }).fill(addDays(getTodayLocal(), 1))
    await editor.getByRole('button', { name: 'Update Quest', exact: true }).tap()
    expect((await stored(page)).quests.find((q: { title: string }) => q.title === 'An idea for later')).toMatchObject({ status: 'active', targetDate: addDays(getTodayLocal(), 1) })
    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Day', exact: true }).tap()
    await page.getByRole('button', { name: 'Next day', exact: true }).tap()
    await expect(page.getByRole('button', { name: 'View quest: An idea for later', exact: true })).toBeVisible()
  })
})

test('drafts survive reload, remain separate between tabs and clear after save', async ({ page }) => {
  await seed(page)
  let editor = await newEditor(page)
  await editor.getByLabel('Title *', { exact: true }).fill('A recovered idea')
  await editor.getByRole('button', { name: /^Subquests/ }).click()
  await editor.getByRole('textbox', { name: 'New step', exact: true }).fill('Still being written')
  await expect(editor.getByRole('status')).toHaveText('Draft saved in this tab')
  expect((await stored(page)).quests).toHaveLength(1)
  await page.reload()
  editor = await newEditor(page)
  await expect(editor.getByLabel('Title *', { exact: true })).toHaveValue('A recovered idea')
  await expect(editor.getByRole('textbox', { name: 'New step', exact: true })).toHaveValue('Still being written')
  await expect(editor.getByText('Recovered unsaved changes from this tab.', { exact: true })).toBeVisible()
  await editor.getByRole('button', { name: 'Keep draft', exact: true }).click()
  await expect(editor).toHaveCount(0)
  const other = await page.context().newPage()
  try {
    await other.goto('/')
    const separate = await newEditor(other)
    await expect(separate.getByLabel('Title *', { exact: true })).toHaveValue('')
    await separate.getByRole('button', { name: 'Cancel', exact: true }).click()
  } finally { await other.close() }
  editor = await newEditor(page)
  await expect(editor.getByLabel('Title *', { exact: true })).toHaveValue('A recovered idea')
  await editor.getByRole('button', { name: 'Create Quest', exact: true }).click()
  expect((await stored(page)).quests).toHaveLength(2)
  expect((await stored(page)).quests.find((q: { title: string }) => q.title === 'A recovered idea').subQuests).toMatchObject([{ title: 'Still being written' }])
  editor = await newEditor(page)
  await expect(editor.getByLabel('Title *', { exact: true })).toHaveValue('')
})

test('an edit draft based on an older quest requires an explicit recovery choice', async ({ page }) => {
  await seed(page)
  let editor = await editFromLibrary(page, 'Existing quest')
  await editor.getByLabel('Title *', { exact: true }).fill('My unfinished edit')
  await editor.getByRole('button', { name: 'Keep draft', exact: true }).click()
  const other = await page.context().newPage()
  try {
    await other.goto('/')
    const second = await editFromLibrary(other, 'Existing quest')
    await second.getByLabel('Title *', { exact: true }).fill('Changed in another tab')
    await second.getByRole('button', { name: 'Update Quest', exact: true }).click()
    editor = await editFromLibrary(page, 'Changed in another tab')
    await expect(editor.getByText('This quest changed after the draft was started. Review the old draft or start with the current version.', { exact: true })).toBeVisible()
    await expect(editor.getByLabel('Title *', { exact: true })).toBeDisabled()
    await editor.getByRole('button', { name: 'Resume earlier draft', exact: true }).click()
    await expect(editor.getByLabel('Title *', { exact: true })).toHaveValue('My unfinished edit')
    await editor.getByRole('button', { name: 'Update Quest', exact: true }).click()
    expect((await stored(page)).quests[0]).toMatchObject({ id: 'existing', title: 'My unfinished edit', createdAt: '2025-01-01T00:00:00.000Z', subQuests: [{ id: 'done-step', isCompleted: true }] })
  } finally { await other.close() }
})

test('unsaved tag choices do not mutate data and global management is in Settings', async ({ page }) => {
  await seed(page)
  const original = await stored(page)
  const editor = await newEditor(page)
  await editor.getByLabel('Title *', { exact: true }).fill('Not saving this')
  await editor.getByRole('button', { name: /^Tags/ }).click()
  await editor.getByRole('searchbox', { name: 'Find or create tags', exact: true }).fill('Draft only')
  await editor.getByRole('button', { name: 'Create tag “Draft only”', exact: true }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect((await stored(page)).tagColors).toEqual(original.tagColors)
  expect((await stored(page)).quests).toEqual(original.quests)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Manage quest tags', exact: true }).click()
  const manager = page.getByRole('dialog', { name: 'Quest tags', exact: true })
  await manager.getByRole('button', { name: /^Personal/ }).click()
  await manager.getByLabel('Tag name', { exact: true }).fill('Focus')
  await manager.getByRole('button', { name: 'Rename', exact: true }).click()
  await manager.getByRole('button', { name: 'Set tag color #10B981', exact: true }).click()
  expect((await stored(page)).quests[0].tags).toEqual(['Focus'])
  expect((await stored(page)).tagColors.Focus).toBe('#10B981')
})

test('editing an archived quest preserves scheduling, completions and advanced metadata', async ({ page }) => {
  await seed(page, true)
  const original = (await stored(page)).quests[0]
  const editor = await editFromLibrary(page, 'Existing quest')
  await expect(editor.getByText('Archived quest', { exact: true })).toBeVisible()
  await editor.getByLabel('Title *', { exact: true }).fill('Renamed archived quest')
  await editor.getByRole('button', { name: 'Update Quest', exact: true }).click()
  const result = (await stored(page)).quests[0]
  for (const key of ['id', 'createdAt', 'targetDate', 'repeat', 'rollover', 'status', 'archivedAt', 'icon', 'externalUrl', 'xp', 'maxRolloverDays', 'sortOrder', 'subQuests']) {
    expect(result[key]).toEqual(original[key])
  }
  expect(result.title).toBe('Renamed archived quest')
})

test('failed draft storage keeps the editor open but does not prevent saving the quest', async ({ page }) => {
  await seed(page)
  const editor = await newEditor(page)
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith('daily-quest-editor:v1:')) throw new DOMException('Full', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await editor.getByLabel('Title *', { exact: true }).fill('Save without draft storage')
  await expect(editor.getByRole('status')).toHaveText('Draft could not be saved.')
  await editor.getByRole('button', { name: 'Keep draft', exact: true }).click()
  await expect(editor.getByRole('alert')).toContainText('The draft could not be saved in this browser.')
  await editor.getByRole('button', { name: 'Create Quest', exact: true }).click()
  await expect(editor).toHaveCount(0)
  expect((await stored(page)).quests.find((q: { title: string }) => q.title === 'Save without draft storage')).toBeTruthy()
})
