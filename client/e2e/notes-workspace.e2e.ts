import { test, expect, type Page } from '@playwright/test'

async function seed(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('daily-quest-store')) return
    const base = { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-28T10:00:00Z', archivedAt: null }
    localStorage.setItem('daily-quest-store', JSON.stringify({ version: 0, state: {
      quests: [], completions: [],
      notes: [
        { ...base, id: 'shopping', title: 'Weekend shopping', content: '# Groceries\n\n- Milk\n- Bread\n\nRemember oat milk.', color: '#F59E0B', tags: ['Home'] },
        { ...base, id: 'ideas', title: 'Project ideas', content: 'A calm workspace and a pocket notebook.', color: '#3B82F6', tags: ['Work'], createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-10-28T12:00:00Z' },
        { ...base, id: 'reading', title: 'Reading list', content: '`Some book` to read next.', color: '#64748B', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
        { ...base, id: 'recipe', title: 'Saved recipe', content: '    indented recipe\n\nKeep the final newline.\n', color: '#10B981', tags: ['Home'], archivedAt: '2026-04-01T00:00:00Z', legacyMetadata: 'preserve' },
        { ...base, id: 'old-work', title: 'Old work notes', content: 'An archived project.', color: '#8B5CF6', tags: ['Work'], archivedAt: '2026-04-02T00:00:00Z' },
      ],
      noteTagColors: { Home: '#F59E0B', Work: '#3B82F6' },
    } }))
  })
  await page.goto('/')
  await goNotes(page)
}

async function goNotes(page: Page, mobile = false) {
  await page.getByRole('navigation', { name: mobile ? 'Mobile navigation' : 'Main navigation' }).getByRole('button', { name: 'Notes', exact: true }).click()
}
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('daily-quest-store') ?? 'null')?.state ?? { notes: [], noteTagColors: {} })
const workspace = (page: Page) => page.getByRole('region', { name: 'Notes workspace', exact: true })
async function create(page: Page) {
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  return page.getByRole('dialog', { name: 'New Note', exact: true })
}
async function edit(page: Page, title: string) {
  await page.getByRole('button', { name: `Read note: ${title}`, exact: true }).click()
  await page.getByRole('dialog', { name: title, exact: true }).getByRole('button', { name: 'Edit', exact: true }).click()
  return page.getByRole('dialog', { name: 'Edit Note', exact: true })
}

test('search, sorting and tag filters work in both active and archive views', async ({ page }, info) => {
  await seed(page)
  const notes = workspace(page)
  await expect(notes.getByRole('button', { name: /^Read note:/ })).toHaveCount(3)
  await expect(notes.getByRole('button', { name: /^Read note:/ }).first()).toHaveAttribute('aria-label', 'Read note: Project ideas')
  await page.screenshot({ path: info.outputPath('desktop-notes-subtle.png'), fullPage: true })
  await notes.getByRole('searchbox', { name: 'Search notes' }).fill('SHOPPING milk home')
  await expect(notes.getByRole('button', { name: /^Read note:/ })).toHaveCount(1)
  await notes.getByRole('button', { name: 'Clear search and tags', exact: true }).click()
  await notes.getByRole('combobox', { name: 'Sort notes', exact: true }).selectOption('oldest')
  await expect(notes.getByRole('button', { name: /^Read note:/ }).first()).toHaveAttribute('aria-label', 'Read note: Reading list')
  await notes.getByRole('button', { name: 'Tags', exact: true }).click()
  await notes.getByRole('button', { name: 'Home', exact: true }).click()
  await notes.getByRole('button', { name: 'Archived notes', exact: true }).click()
  await expect(notes.getByRole('button', { name: /^Read note:/ })).toHaveCount(1)
  await expect(notes.getByRole('button', { name: 'Read note: Saved recipe', exact: true })).toBeVisible()
  await notes.getByRole('searchbox', { name: 'Search notes' }).fill('no matching text')
  await expect(notes.getByText('No notes match your search or tags.', { exact: true })).toBeVisible()
  await notes.getByRole('button', { name: 'Clear search and tags', exact: true }).click()
  await expect(notes.getByRole('button', { name: /^Read note:/ })).toHaveCount(2)
})

test('card appearance persists without changing stored note colors or timestamps', async ({ page }, info) => {
  await seed(page)
  const original = (await stored(page)).notes
  const notes = workspace(page)
  await notes.getByRole('button', { name: 'Note appearance', exact: true }).click()
  await notes.getByRole('button', { name: 'Colorful', exact: true }).click()
  const card = notes.getByRole('button', { name: 'Read note: Weekend shopping', exact: true }).locator('..')
  await expect.poll(() => card.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe('rgb(245, 158, 11)')
  expect(await card.evaluate((node) => getComputedStyle(node).color)).toBe('rgb(2, 6, 23)')
  await notes.getByRole('button', { name: 'Note appearance', exact: true }).click()
  await page.screenshot({ path: info.outputPath('desktop-notes-colorful.png'), fullPage: true })
  expect((await stored(page)).notes).toEqual(original)
  await page.reload()
  await goNotes(page)
  await expect.poll(() => workspace(page).getByRole('button', { name: 'Read note: Weekend shopping', exact: true }).locator('..').evaluate((node) => getComputedStyle(node).backgroundColor)).toBe('rgb(245, 158, 11)')
})

test.describe('phone notes', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('full-screen editing supports Markdown formatting, preview, tags, and a short viewport', async ({ page }, info) => {
    await page.goto('/')
    await goNotes(page, true)
    const editor = await create(page)
    await expect(editor.getByLabel('Title', { exact: true })).toBeFocused()
    await editor.getByLabel('Title', { exact: true }).fill('A phone note')
    const content = editor.getByLabel('Content', { exact: true })
    await content.fill('Milk\nBread')
    await content.selectText()
    await editor.getByRole('button', { name: 'Numbered list', exact: true }).tap()
    await expect(content).toHaveValue('1. Milk\n2. Bread')
    await content.press('ControlOrMeta+End')
    await content.press('Enter')
    await expect(content).toHaveValue('1. Milk\n2. Bread\n3. ')
    await content.press('Enter')
    await expect(content).toHaveValue('1. Milk\n2. Bread\n')
    const body = '## Phone note\n\n- Item one\n- Item two\n\n    indented code\n'
    await content.fill(body)
    await editor.getByRole('button', { name: 'Preview', exact: true }).tap()
    await expect(editor.getByRole('region', { name: 'Note preview' }).getByRole('heading', { name: 'Phone note', exact: true })).toBeVisible()
    await editor.getByRole('button', { name: 'Write', exact: true }).tap()
    await editor.getByRole('button', { name: /^Tags & color/ }).tap()
    await editor.getByRole('searchbox', { name: 'Find or create note tags', exact: true }).fill('Mobile')
    await editor.getByRole('button', { name: 'Create note tag “Mobile”', exact: true }).tap()
    expect((await stored(page)).noteTagColors).not.toHaveProperty('Mobile')
    await editor.getByRole('button', { name: 'Note color: Amber', exact: true }).tap()
    await content.focus()
    await page.setViewportSize({ width: 390, height: 430 })
    await expect(content).toBeInViewport()
    await expect(editor.getByRole('button', { name: 'Create', exact: true })).toBeInViewport()
    const bounds = await editor.boundingBox()
    expect(bounds!.x).toBe(0)
    expect(bounds!.width).toBe(390)
    await page.screenshot({ path: info.outputPath('phone-note-editor.png') })
    await editor.getByRole('button', { name: 'Create', exact: true }).tap()
    const note = (await stored(page)).notes.find((item: { title: string }) => item.title === 'A phone note')
    expect(note).toMatchObject({ content: body, color: '#F59E0B', tags: ['Mobile'], archivedAt: null })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Read note: A phone note', exact: true }).tap()
    const reader = page.getByRole('dialog', { name: 'A phone note', exact: true })
    await expect(reader.getByRole('heading', { name: 'Phone note', exact: true })).toBeVisible()
    await expect(reader.getByRole('button', { name: 'Edit', exact: true })).toBeInViewport()
    const editBounds = await reader.getByRole('button', { name: 'Edit', exact: true }).boundingBox()
    expect(editBounds!.y + editBounds!.height).toBeGreaterThan(844 - 80)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.screenshot({ path: info.outputPath('phone-note-reader.png') })
  })
})

test('note drafts survive reload, stay separate from quests and clear after save', async ({ page }) => {
  await seed(page)
  let editor = await create(page)
  await editor.getByLabel('Title', { exact: true }).fill('Unfinished note')
  await editor.getByLabel('Content', { exact: true }).fill('    keep these spaces\n')
  await expect(editor.getByRole('status')).toHaveText('Draft saved in this tab')
  expect((await stored(page)).notes).toHaveLength(5)
  await page.reload()
  await goNotes(page)
  editor = await create(page)
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue('Unfinished note')
  await expect(editor.getByLabel('Content', { exact: true })).toHaveValue('    keep these spaces\n')
  await editor.getByRole('button', { name: 'Keep draft', exact: true }).click()
  const second = await page.context().newPage()
  try {
    await second.goto('/')
    await goNotes(second)
    const separate = await create(second)
    await expect(separate.getByLabel('Title', { exact: true })).toHaveValue('')
    await separate.getByRole('button', { name: 'Cancel', exact: true }).click()
  } finally { await second.close() }
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Day', exact: true }).click()
  await page.getByRole('button', { name: 'New quest', exact: true }).click()
  const quest = page.getByRole('dialog', { name: 'New quest', exact: true })
  await quest.getByLabel('Title *', { exact: true }).fill('Independent quest draft')
  await quest.getByRole('button', { name: 'Keep draft', exact: true }).click()
  await goNotes(page)
  editor = await create(page)
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue('Unfinished note')
  await editor.getByRole('button', { name: 'Create', exact: true }).click()
  expect((await stored(page)).notes).toHaveLength(6)
  editor = await create(page)
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue('')
})

test('discarding note tags and color choices does not mutate saved data', async ({ page }) => {
  await seed(page)
  const original = await stored(page)
  const editor = await create(page)
  await editor.getByLabel('Title', { exact: true }).fill('Not saving')
  await editor.getByRole('button', { name: /^Tags & color/ }).click()
  await editor.getByRole('searchbox', { name: 'Find or create note tags', exact: true }).fill('Draft only')
  await editor.getByRole('button', { name: 'Create note tag “Draft only”', exact: true }).click()
  await editor.getByRole('button', { name: 'Note color: Pink', exact: true }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect((await stored(page)).notes).toEqual(original.notes)
  expect((await stored(page)).noteTagColors).toEqual(original.noteTagColors)
})

test('archived notes can be edited without restoring them and bulk deletion respects filters', async ({ page }) => {
  await seed(page)
  const notes = workspace(page)
  await notes.getByRole('button', { name: 'Archived notes', exact: true }).click()
  const original = (await stored(page)).notes.find((note: { id: string }) => note.id === 'recipe')
  const editor = await edit(page, 'Saved recipe')
  const body = '    edited recipe\n\nKeep the newline.\n'
  await editor.getByLabel('Content', { exact: true }).fill(body)
  await editor.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await stored(page)).notes.find((note: { id: string }) => note.id === 'recipe')).toMatchObject({ content: body, id: original.id, createdAt: original.createdAt, archivedAt: original.archivedAt, color: original.color, legacyMetadata: 'preserve' })
  await notes.getByRole('button', { name: 'Tags', exact: true }).click()
  await notes.getByRole('button', { name: 'Home', exact: true }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await notes.getByRole('button', { name: 'Delete shown archived notes (1)', exact: true }).click()
  const ids = (await stored(page)).notes.map((note: { id: string }) => note.id)
  expect(ids).not.toContain('recipe')
  expect(ids).toContain('old-work')
  expect(ids).toContain('shopping')
})

test('an open reader follows updates and does not display a deleted snapshot', async ({ page }) => {
  await seed(page)
  await page.getByRole('button', { name: 'Read note: Weekend shopping', exact: true }).click()
  const other = await page.context().newPage()
  try {
    await other.goto('/')
    await goNotes(other)
    const editor = await edit(other, 'Weekend shopping')
    await editor.getByLabel('Content', { exact: true }).fill('Changed while the reader stays open.')
    await editor.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Weekend shopping', exact: true }).getByText('Changed while the reader stays open.', { exact: true })).toBeVisible()
    await other.getByRole('button', { name: 'Archive note: Weekend shopping', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Weekend shopping', exact: true }).getByText('Archived', { exact: true })).toBeVisible()
    await workspace(other).getByRole('button', { name: 'Archived notes', exact: true }).click()
    await other.getByRole('button', { name: 'Read note: Weekend shopping', exact: true }).click()
    other.once('dialog', (dialog) => dialog.accept())
    await other.getByRole('dialog', { name: 'Weekend shopping', exact: true }).getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Note unavailable', exact: true })).toBeVisible()
    await expect(page.getByText('Changed while the reader stays open.', { exact: true })).toHaveCount(0)
  } finally { await other.close() }
})

test('an earlier note draft is not silently applied over changed content', async ({ page }) => {
  await seed(page)
  let editor = await edit(page, 'Weekend shopping')
  await editor.getByLabel('Content', { exact: true }).fill('My unfinished version')
  await editor.getByRole('button', { name: 'Keep draft', exact: true }).click()
  const other = await page.context().newPage()
  try {
    await other.goto('/')
    await goNotes(other)
    const second = await edit(other, 'Weekend shopping')
    await second.getByLabel('Content', { exact: true }).fill('Updated in another tab')
    await second.getByRole('button', { name: 'Save', exact: true }).click()
    editor = await edit(page, 'Weekend shopping')
    await expect(editor.getByText('This note changed after the draft was started. Review the old draft or use the current version.', { exact: true })).toBeVisible()
    await expect(editor.getByLabel('Content', { exact: true })).toBeDisabled()
    await editor.getByRole('button', { name: 'Use current version', exact: true }).click()
    await expect(editor.getByLabel('Content', { exact: true })).toHaveValue('Updated in another tab')
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
    editor = await edit(page, 'Weekend shopping')
    await expect(editor.getByText('Recovered unsaved changes from this tab.', { exact: true })).toHaveCount(0)
  } finally { await other.close() }
})

test('a deleted note can be saved explicitly as a new note without reviving its old ID', async ({ page }) => {
  await seed(page)
  const editor = await edit(page, 'Project ideas')
  await editor.getByLabel('Title', { exact: true }).fill('Recovered project text')
  const other = await page.context().newPage()
  try {
    await other.goto('/')
    await goNotes(other)
    await other.getByRole('button', { name: 'Archive note: Project ideas', exact: true }).click()
    await workspace(other).getByRole('button', { name: 'Archived notes', exact: true }).click()
    await other.getByRole('button', { name: 'Read note: Project ideas', exact: true }).click()
    other.once('dialog', (dialog) => dialog.accept())
    await other.getByRole('dialog', { name: 'Project ideas', exact: true }).getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(editor.getByRole('button', { name: 'Save as new note', exact: true })).toBeVisible()
    await editor.getByRole('button', { name: 'Save as new note', exact: true }).click()
    const notes = (await stored(page)).notes
    expect(notes.some((note: { id: string }) => note.id === 'ideas')).toBe(false)
    expect(notes.find((note: { title: string }) => note.title === 'Recovered project text').id).not.toBe('ideas')
  } finally { await other.close() }
})

test('draft-storage failure does not claim success or prevent saving the actual note', async ({ page }) => {
  await seed(page)
  const editor = await create(page)
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith('daily-note-editor:v1:')) throw new DOMException('Full', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await editor.getByLabel('Title', { exact: true }).fill('A note worth saving')
  await expect(editor.getByRole('status')).toHaveText('Draft could not be saved.')
  await editor.getByRole('button', { name: 'Keep draft', exact: true }).click()
  await expect(editor.getByRole('alert')).toContainText('The draft could not be saved in this browser.')
  await editor.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(editor).toHaveCount(0)
  expect((await stored(page)).notes.some((note: { title: string }) => note.title === 'A note worth saving')).toBe(true)
})
