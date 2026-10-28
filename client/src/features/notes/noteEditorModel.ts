import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import type { Note } from '../../types'
import { NOTE_COLORS } from './noteUtils'

export interface NoteEditorValues {
  title: string
  content: string
  color: string
  tags: string[]
  tagQuery: string
}

export function noteValues(note?: Note): NoteEditorValues {
  return { title: note?.title ?? '', content: note?.content ?? '', color: note?.color ?? NOTE_COLORS[0].value, tags: note?.tags ?? [], tagQuery: '' }
}

export function noteFingerprint(value: NoteEditorValues): string {
  return JSON.stringify([value.title, value.content, value.color, value.tags, value.tagQuery])
}

export function noteBaseline(note?: Note): string {
  return note ? bytesToHex(sha256(new TextEncoder().encode(noteFingerprint(noteValues(note))))) : 'new'
}

export function validNoteColor(value: string): boolean {
  return /^#[a-f\d]{6}$/i.test(value) || /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(value)
}

export function buildNote(values: NoteEditorValues, original: Note | undefined, id: string, now: string): Note {
  if (!values.title.trim()) throw new Error('Give this note a title.')
  if (!validNoteColor(values.color)) throw new Error('Choose a valid note color.')
  return {
    ...original, id: original?.id ?? id, title: values.title.trim(),
    // Markdown indentation and trailing newlines are meaningful: keep the body intact.
    content: values.content, color: values.color,
    tags: [...new Set(values.tags.map((tag) => tag.trim()).filter(Boolean))],
    createdAt: original?.createdAt ?? now, updatedAt: now, archivedAt: original?.archivedAt ?? null,
  }
}
