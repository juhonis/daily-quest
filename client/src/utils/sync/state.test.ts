import { describe, expect, it } from 'vitest'
import type { Note } from '../../types'
import { ensureSync, projectSync, restoreSync, trackChanges, type SyncFields } from './state'
import { mergeRecords, primary } from './records'

const empty = (): SyncFields => ({ quests: [], notes: [], completions: [], quickPresets: [], tagColors: {}, noteTagColors: {} })
const note: Note = { id: 'n', title: 'Note', content: 'original', color: '#ffffff', createdAt: '2026-01-01', updatedAt: '2026-01-01' }

describe('tracked state', () => {
  it('migrates content without rewriting it', () => {
    const state = { ...empty(), notes: [note] }
    expect(projectSync(ensureSync(state))).toEqual(state)
  })

  it('records deletions and prevents stale data from returning', () => {
    const before = { ...empty(), notes: [note] }
    const initial = ensureSync(before)
    const deleted = trackChanges({ ...before, sync: initial }, empty(), 'a')
    expect(projectSync(mergeRecords(initial, deleted)).notes).toEqual([])
    expect(primary(deleted.records[0]).value).toBeNull()
  })

  it('retains independent offline edits for recovery', () => {
    const base = { ...empty(), notes: [note] }
    const a = trackChanges(base, { ...base, notes: [{ ...note, content: 'a' }] }, 'a')
    const b = trackChanges(base, { ...base, notes: [{ ...note, content: 'b' }] }, 'b')
    const merged = mergeRecords(a, b)
    expect(merged.records.some((r) => r.kind === 'recovery')).toBe(true)
    expect(projectSync(merged).notes).toHaveLength(1)
  })

  it('preserves different legacy content even when one device edited before first sync', () => {
    const a = { ...empty(), notes: [note] }
    const b = { ...empty(), notes: [{ ...note, content: 'unseen legacy text' }] }
    const edited = trackChanges(a, { ...a, notes: [{ ...note, content: 'new local edit' }] }, 'a')
    const merged = mergeRecords(edited, ensureSync(b))
    expect(merged.records.some((r) => r.kind === 'recovery')).toBe(true)
  })

  it('tracks each color key including deletion', () => {
    const base = { ...empty(), tagColors: { tag: '#ffffff' } }
    expect(projectSync(trackChanges(base, empty(), 'a')).tagColors).toEqual({})
  })

  it('restores old content as a new causal change', () => {
    const original = { ...empty(), notes: [note] }
    const edited = { ...original, notes: [{ ...note, content: 'new' }] }
    const sync = trackChanges(original, edited, 'a')
    const restored = restoreSync({ ...edited, sync }, original, undefined, 'restore')
    expect(projectSync(mergeRecords(sync, restored)).notes[0].content).toBe('original')
    expect(projectSync(restored).notes[0].updatedAt).toBe(note.updatedAt)
  })
})
