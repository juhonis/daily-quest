import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { editorDraftKey } from '../quests/create/questDrafts'
import { noteValues } from './noteEditorModel'
import { noteDraftKey, readNoteDraft, writeNoteDraft, type NoteDraft } from './noteDrafts'

const record: NoteDraft = { version: 1, sourceId: null, noteId: 'reserved-id', base: 'new', savedAt: '2026-01-01T00:00:00Z', values: { ...noteValues(), title: 'Draft', content: '    keep spaces\n' } }
function storage() {
  const map = new Map<string, string>()
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value) }, removeItem: (key: string) => { map.delete(key) } }
}

describe('note drafts', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()) })
  afterEach(() => vi.unstubAllGlobals())
  it('preserves unfinished content without mixing note and quest keys', () => {
    const key = noteDraftKey()
    expect(noteDraftKey()).toBe(key)
    expect(key).not.toBe(editorDraftKey())
    expect(writeNoteDraft(key, record)).toBe(true)
    expect(readNoteDraft(key)).toEqual(record)
    expect(localStorage.getItem('daily-quest-store')).toBeNull()
    writeNoteDraft(key, null)
    expect(readNoteDraft(key)).toBeNull()
  })
  it('ignores malformed, future-version and identity-mismatched drafts', () => {
    for (const text of ['broken', JSON.stringify({ ...record, version: 2 }), JSON.stringify({ ...record, sourceId: 'different' })]) {
      localStorage.setItem('bad', text)
      expect(readNoteDraft('bad')).toBeNull()
    }
  })
  it('reports size and storage failures without claiming successful recovery', () => {
    expect(writeNoteDraft('large', { ...record, values: { ...record.values, content: 'a'.repeat(1000001) } })).toBe(false)
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('Full') } })
    expect(writeNoteDraft('blocked', record)).toBe(false)
  })
})
