import type { Note } from '../../types'
import { parseDate } from '../../utils/dateUtils'

export const NOTE_COLORS = [
  { label: 'Slate', value: '#64748B' }, { label: 'Amber', value: '#F59E0B' },
  { label: 'Emerald', value: '#10B981' }, { label: 'Blue', value: '#3B82F6' },
  { label: 'Pink', value: '#EC4899' }, { label: 'Orange', value: '#F97316' },
  { label: 'Violet', value: '#8B5CF6' },
]
export type NoteSort = 'updated' | 'newest' | 'oldest' | 'title'
export type NoteAppearance = 'subtle' | 'colorful'

export function filterNotes(notes: Note[], archived: boolean, query: string, tags: string[], sort: NoteSort): Note[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const timestamp = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0
  return notes.filter((note) => {
    if (!!note.archivedAt !== archived) return false
    if (tags.length && !note.tags?.some((tag) => tags.includes(tag))) return false
    const text = `${note.title}\n${note.content}\n${(note.tags ?? []).join(' ')}`.toLowerCase()
    return terms.every((term) => text.includes(term))
  }).sort((a, b) => {
    const order = sort === 'title' ? a.title.localeCompare(b.title)
      : sort === 'oldest' ? timestamp(a.createdAt) - timestamp(b.createdAt)
        : sort === 'newest' ? timestamp(b.createdAt) - timestamp(a.createdAt)
          : timestamp(b.updatedAt) - timestamp(a.updatedAt)
    return order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  })
}

export function noteExcerpt(content: string): string {
  return content.replace(/^```[^\n]*$/gm, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s*)/gm, '')
    .replace(/[*_`~]/g, '').replace(/\n{2,}/g, '\n').trim().slice(0, 400)
}

export function noteTextColor(color: string): '#ffffff' | '#020617' {
  const hex = /^#([a-f\d]{6})$/i.exec(color)
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(color)
  const channels = hex ? [0, 2, 4].map((index) => parseInt(hex[1].slice(index, index + 2), 16))
    : rgb ? rgb.slice(1).map((value) => Math.min(255, Number(value))) : null
  if (!channels) return '#ffffff'
  const luminance = (values: number[]) => values.map((n) => {
    const value = n / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }).reduce((sum, n, index) => sum + n * [0.2126, 0.7152, 0.0722][index], 0)
  const light = luminance(channels)
  return (1.05 / (light + 0.05)) >= ((light + 0.05) / (luminance([2, 6, 23]) + 0.05)) ? '#ffffff' : '#020617'
}

export function noteDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDate(value) : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown date'
}
