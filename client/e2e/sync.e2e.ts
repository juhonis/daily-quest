import { test, expect, type Page } from '@playwright/test'

const note = (content: string) => ({ id: 'shared', title: 'Shared note', content, color: '#3B82F6', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' })

async function seed(page: Page, content: string) {
  await page.addInitScript((value) => {
    if (!localStorage.getItem('daily-quest-store')) localStorage.setItem('daily-quest-store', JSON.stringify({ state: { notes: [value] }, version: 0 }))
  }, note(content))
  await page.goto('/')
}

async function pair(host: Page, guest: Page) {
  const beforeHost = (await stored(host)).notes
  const beforeGuest = (await stored(guest)).notes
  if (!await host.getByRole('dialog', { name: 'Settings', exact: true }).isVisible()) await host.getByRole('button', { name: 'Settings', exact: true }).click()
  await host.getByRole('button', { name: 'Sync devices', exact: true }).click()
  const hostDialog = host.getByRole('dialog', { name: 'Sync devices', exact: true })
  await hostDialog.getByRole('button', { name: 'Start sync', exact: true }).click()
  const code = await hostDialog.locator('p').filter({ hasText: /^[A-Z2-9]{8}$/ }).innerText()
  await guest.goto(`/#sync=${code}`)
  const guestDialog = guest.getByRole('dialog', { name: 'Sync devices', exact: true })
  await guestDialog.getByRole('button', { name: 'Join sync', exact: true }).click()
  const confirm = hostDialog.getByRole('button', { name: 'Codes match — sync' })
  await expect(confirm).toBeVisible({ timeout: 20000 })
  const verification = await hostDialog.locator('p').filter({ hasText: /^[a-f0-9]{4} [a-f0-9]{4} [a-f0-9]{4}$/ }).innerText()
  await expect(guestDialog.getByText(verification, { exact: true })).toBeVisible()
  // No app records should transfer until the explicit confirmation.
  expect((await stored(host)).notes).toEqual(beforeHost)
  expect((await stored(guest)).notes).toEqual(beforeGuest)
  expect(new URL(guest.url()).hash).toBe('')
  return { hostDialog, guestDialog, confirm }
}

async function sync(host: Page, guest: Page) {
  const { hostDialog, guestDialog, confirm } = await pair(host, guest)
  await confirm.click()
  await expect(hostDialog.getByRole('status')).toHaveText('Sync complete', { timeout: 20000 })
  await expect(guestDialog.getByRole('status')).toHaveText('Sync complete', { timeout: 20000 })
  await hostDialog.getByRole('button', { name: 'Done', exact: true }).click()
  await guestDialog.getByRole('button', { name: 'Done', exact: true }).click()
}

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('daily-quest-store')!).state)

test('real browser peers pair, preserve conflicts, retry, and propagate restored deletions', async ({ browser }) => {
  const left = await browser.newContext(), right = await browser.newContext()
  const a = await left.newPage(), b = await right.newPage()
  try {
    await seed(a, 'Laptop text')
    await seed(b, 'Desktop text')
    await sync(a, b)
    const first = await stored(a)
    expect((await stored(b)).sync).toEqual(first.sync)
    expect(first.sync.records.filter((r: { kind: string }) => r.kind === 'recovery')).toHaveLength(1)
    await sync(a, b)
    expect((await stored(a)).sync).toEqual(first.sync)

    // Restore an empty legacy backup: deletion must succeed older peer copies.
    const settings = a.getByRole('dialog', { name: 'Settings', exact: true })
    await settings.locator('input[type=file]').setInputFiles({
      name: 'empty.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ app: 'daily-quest', schemaVersion: 1, data: {} })),
    })
    await settings.getByRole('button', { name: 'Download backup', exact: true }).click()
    await settings.getByRole('button', { name: 'Replace & import', exact: true }).click()
    await sync(a, b)
    expect((await stored(a)).notes).toEqual([])
    expect((await stored(b)).notes).toEqual([])
    expect((await stored(b)).sync).toEqual((await stored(a)).sync)
  } finally { await left.close(); await right.close() }
})

test('only one tab can sync and cancellation releases the lock', async ({ browser }) => {
  const context = await browser.newContext()
  const a = await context.newPage(), b = await context.newPage()
  try {
    await seed(a, 'Local note')
    await b.goto('/')
    for (const page of [a, b]) {
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      await page.getByRole('button', { name: 'Sync devices', exact: true }).click()
    }
    await a.getByRole('button', { name: 'Start sync', exact: true }).click()
    await expect(a.getByRole('dialog', { name: 'Sync devices' }).getByRole('status')).toHaveText('Waiting for the other device…')
    await b.getByRole('button', { name: 'Start sync', exact: true }).click()
    await expect(b.getByRole('alert')).toContainText('Another tab is already syncing')
    await a.getByRole('button', { name: 'Cancel sync', exact: true }).click()
    await b.getByRole('button', { name: 'Start sync', exact: true }).click()
    await expect(b.getByRole('dialog', { name: 'Sync devices' }).getByRole('status')).toHaveText('Waiting for the other device…')
    await b.getByRole('button', { name: 'Cancel sync', exact: true }).click()
    expect((await stored(a)).notes[0].content).toBe('Local note')
  } finally { await context.close() }
})

test('a storage failure never reports sync complete', async ({ browser }) => {
  const left = await browser.newContext(), right = await browser.newContext()
  const a = await left.newPage(), b = await right.newPage()
  try {
    await seed(a, 'Laptop text')
    await seed(b, 'Desktop text')
    const { hostDialog, guestDialog, confirm } = await pair(a, b)
    await a.evaluate(() => {
      Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError') }
    })
    await confirm.click()
    await expect(hostDialog.getByRole('alert')).toContainText('could not be saved locally')
    await expect(hostDialog.getByRole('status')).toHaveText('Sync incomplete')
    await expect(guestDialog.getByRole('status')).toHaveText('Sync incomplete', { timeout: 10000 })
    expect((await stored(a)).notes[0].content).toBe('Laptop text')
  } finally { await left.close(); await right.close() }
})
