import { localEditorDraftKey } from '../../utils/editorDraftKey'
import { validNoteColor, type NoteEditorValues } from './noteEditorModel'

export interface NoteDraft {
  version: 1
  sourceId: string | null
  noteId: string
  base: string
  savedAt: string
  values: NoteEditorValues
}

export const noteDraftKey = (sourceId?: string) => localEditorDraftKey('note', sourceId)

function validValues(raw: unknown): raw is NoteEditorValues {
  if (!raw || typeof raw !== 'object') return false
  const value = raw as NoteEditorValues
  return typeof value.title === 'string' && typeof value.content === 'string' && typeof value.color === 'string' && validNoteColor(value.color) &&
    typeof value.tagQuery === 'string' && Array.isArray(value.tags) && value.tags.length <= 1000 && value.tags.every((tag) => typeof tag === 'string')
}

export function readNoteDraft(key: string): NoteDraft | null {
  try {
    const text = localStorage.getItem(key)
    if (!text || text.length > 1000000) return null
    const draft = JSON.parse(text) as NoteDraft
    if (!draft || draft.version !== 1 || (draft.sourceId !== null && typeof draft.sourceId !== 'string') ||
        typeof draft.noteId !== 'string' || !draft.noteId || (draft.sourceId !== null && draft.sourceId !== draft.noteId) ||
        typeof draft.base !== 'string' || typeof draft.savedAt !== 'string' || !Number.isFinite(Date.parse(draft.savedAt)) || !validValues(draft.values)) return null
    return draft
  } catch { return null }
}

export function writeNoteDraft(key: string, draft: NoteDraft | null): boolean {
  try {
    if (draft) {
      const text = JSON.stringify(draft)
      if (text.length > 1000000 || !validValues(draft.values)) return false
      localStorage.setItem(key, text)
    } else localStorage.removeItem(key)
    return true
  } catch { return false }
}
