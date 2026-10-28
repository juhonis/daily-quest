import { describe, expect, it } from 'vitest'
import type { Note } from '../../types'
import { buildNote, noteBaseline, noteValues } from './noteEditorModel'

const original: Note = { id: 'note', title: 'Title', content: 'Original', color: 'rgb(10, 20, 30)', tags: ['Work'], archivedAt: '2026-01-02', createdAt: '2025-01-01', updatedAt: '2026-01-01' }

describe('note editor model', () => {
  it('preserves Markdown whitespace and existing metadata including archive state', () => {
    const note = { ...original, futureMetadata: 'keep' }
    const body = '    indented code\n\n```ts\nconst x = 1\n```\n'
    const edited = buildNote({ ...noteValues(note), title: ' Edited ', content: body }, note, 'unused', '2026-02-01')
    expect(edited).toMatchObject({ id: original.id, title: 'Edited', content: body, color: original.color, archivedAt: original.archivedAt, createdAt: original.createdAt, futureMetadata: 'keep' })
  })
  it('uses a new identity only for a new note and deduplicates chosen tags', () => {
    expect(buildNote({ ...noteValues(), title: 'New', tags: [' Work ', 'Work'] }, undefined, 'new-id', '2026-02-01')).toMatchObject({ id: 'new-id', tags: ['Work'], archivedAt: null })
  })
  it('compares editable content rather than timestamps or archive-only changes', () => {
    expect(noteBaseline(original)).toBe(noteBaseline({ ...original, updatedAt: '2026-02-01', archivedAt: null }))
    expect(noteBaseline(original)).not.toBe(noteBaseline({ ...original, content: 'Changed elsewhere' }))
  })
  it('rejects blank titles and invalid colors', () => {
    expect(() => buildNote(noteValues(), undefined, 'new', '2026-02-01')).toThrow('title')
    expect(() => buildNote({ ...noteValues(), title: 'Title', color: 'url(evil)' }, undefined, 'new', '2026-02-01')).toThrow('color')
  })
})
