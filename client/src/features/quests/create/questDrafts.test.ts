import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { editorValues } from './questEditorModel'
import { editorDraftKey, readQuestDraft, writeQuestDraft, type QuestDraft } from './questDrafts'

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
    clear: () => values.clear(),
  }
}

const draft: QuestDraft = {
  version: 1, sourceId: null, questId: 'new', presetId: 'preset', base: 'new', savedAt: '2026-10-28T12:00:00.000Z',
  values: { ...editorValues(undefined, '2026-10-28'), title: 'Unfinished', pendingStep: 'A step not added yet' },
}

describe('local quest drafts', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()) })
  afterEach(() => vi.unstubAllGlobals())

  it('roundtrips unfinished values without creating application data', () => {
    expect(writeQuestDraft('draft', draft)).toBe(true)
    expect(readQuestDraft('draft')).toEqual(draft)
    expect(localStorage.getItem('daily-quest-store')).toBeNull()
    expect(writeQuestDraft('draft', null)).toBe(true)
    expect(readQuestDraft('draft')).toBeNull()
  })

  it('uses stable per-tab keys for reloads and separate keys for individual edits', () => {
    const key = editorDraftKey()
    expect(editorDraftKey()).toBe(key)
    expect(editorDraftKey('quest')).not.toBe(key)
    sessionStorage.clear()
    expect(editorDraftKey()).not.toBe(key)
  })

  it('ignores corrupt, incompatible and mismatched drafts', () => {
    localStorage.setItem('draft', 'broken')
    expect(readQuestDraft('draft')).toBeNull()
    localStorage.setItem('draft', JSON.stringify({ ...draft, version: 99 }))
    expect(readQuestDraft('draft')).toBeNull()
    localStorage.setItem('draft', JSON.stringify({ ...draft, sourceId: 'different' }))
    expect(readQuestDraft('draft')).toBeNull()
    localStorage.setItem('draft', JSON.stringify({ ...draft, values: { ...draft.values, subQuests: [{ id: 'same', title: 'a' }, { id: 'same', title: 'b' }] } }))
    expect(readQuestDraft('draft')).toBeNull()
  })

  it('reports failed storage writes rather than claiming a saved draft', () => {
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('Full') }, removeItem: () => { throw new Error('Blocked') } })
    expect(writeQuestDraft('draft', draft)).toBe(false)
    expect(writeQuestDraft('draft', null)).toBe(false)
  })

  it('does not claim to save drafts that cannot be recovered within its size limit', () => {
    expect(writeQuestDraft('draft', { ...draft, values: { ...draft.values, description: 'a'.repeat(1000001) } })).toBe(false)
    expect(readQuestDraft('draft')).toBeNull()
  })
})
