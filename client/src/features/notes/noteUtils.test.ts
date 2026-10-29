import { describe, expect, it } from 'vitest'
import type { Note } from '../../types'
import { filterNotes, NOTE_COLORS, noteExcerpt, noteTextColor } from './noteUtils'

const note = (id: string, title: string, content: string, overrides: Partial<Note> = {}): Note => ({
  id, title, content, color: '#3B82F6', createdAt: '2026-01-01', updatedAt: '2026-01-01', ...overrides,
})

describe('notes workspace filtering', () => {
  const notes = [
    note('a', 'Shopping', '**Milk** and bread', { tags: ['Home'] }),
    note('b', 'Books', 'Read a chapter', { updatedAt: '2026-02-01' }),
    note('c', 'Old shopping', 'Milk', { tags: ['Home'], archivedAt: '2026-01-02' }),
  ]
  it('searches across title, Markdown content and tags without changing input data', () => {
    expect(filterNotes(notes, false, 'SHOPPING milk home', [], 'updated').map((n) => n.id)).toEqual(['a'])
    expect(notes.map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })
  it('keeps archive scope independent of search and visible tag filters', () => {
    expect(filterNotes(notes, true, 'milk', ['Home'], 'updated').map((n) => n.id)).toEqual(['c'])
    expect(filterNotes(notes, true, '', ['Missing'], 'updated')).toEqual([])
  })
  it('supports recent updates and deterministic title ordering', () => {
    expect(filterNotes(notes, false, '', [], 'updated').map((n) => n.id)).toEqual(['b', 'a'])
    expect(filterNotes(notes, false, '', [], 'title').map((n) => n.id)).toEqual(['b', 'a'])
  })
  it('produces compact plain-text previews', () => {
    expect(noteExcerpt('# Heading\n- **Item**\n[Link](https://example.com)')).toBe('Heading\nItem\nLink')
    expect(noteExcerpt('a'.repeat(1000))).toHaveLength(400)
  })
})

describe('colorful note contrast', () => {
  function luminance(color: string) {
    const values = [0, 2, 4].map((i) => parseInt(color.slice(1 + i, 3 + i), 16) / 255)
      .map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)
    return values.reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0)
  }
  it.each(NOTE_COLORS)('uses readable text on $label', ({ value }) => {
    const a = luminance(value), b = luminance(noteTextColor(value))
    expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5)
  })
  it('handles imported RGB colors', () => {
    expect(noteTextColor('rgb(255, 255, 255)')).toBe('#020617')
    expect(noteTextColor('rgb(0, 0, 0)')).toBe('#ffffff')
    expect(noteTextColor('rgb(0, 0, 999)')).toBe('#ffffff')
  })
})
