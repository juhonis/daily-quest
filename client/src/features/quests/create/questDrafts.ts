import type { QuestEditorValues } from './questEditorModel'
import { localEditorDraftKey } from '../../../utils/editorDraftKey'

export interface QuestDraft {
  version: 1
  sourceId: string | null
  questId: string
  presetId: string
  base: string
  savedAt: string
  values: QuestEditorValues
}

export function editorDraftKey(sourceId?: string): string {
  return localEditorDraftKey('quest', sourceId)
}

function validValues(raw: unknown): raw is QuestEditorValues {
  if (!raw || typeof raw !== 'object') return false
  const value = raw as QuestEditorValues
  for (const key of ['title', 'description', 'targetDate', 'repeatInterval', 'pendingStep', 'tagQuery', 'externalUrl', 'xp'] as const) {
    if (typeof value[key] !== 'string') return false
  }
  if (!['active', 'inactive'].includes(value.status) || !['none', 'daily', 'weekly', 'monthly', 'custom'].includes(value.repeat) ||
      !['day', 'week', 'month'].includes(value.repeatUnit) || typeof value.rollover !== 'boolean' || typeof value.addToQuickAdd !== 'boolean') return false
  if (!Array.isArray(value.tags) || value.tags.length > 1000 || !value.tags.every((tag) => typeof tag === 'string')) return false
  if (!Array.isArray(value.subQuests) || value.subQuests.length > 1000) return false
  const ids = new Set<string>()
  return value.subQuests.every((step) => {
    if (!step || typeof step.id !== 'string' || !step.id || typeof step.title !== 'string' || ids.has(step.id)) return false
    ids.add(step.id)
    return true
  })
}

export function readQuestDraft(key: string): QuestDraft | null {
  try {
    const text = localStorage.getItem(key)
    if (!text || text.length > 1000000) return null
    const draft = JSON.parse(text) as QuestDraft
    if (!draft || draft.version !== 1 || (draft.sourceId !== null && typeof draft.sourceId !== 'string') ||
        typeof draft.questId !== 'string' || !draft.questId || typeof draft.presetId !== 'string' ||
        typeof draft.base !== 'string' || typeof draft.savedAt !== 'string' || !Number.isFinite(Date.parse(draft.savedAt)) ||
        !validValues(draft.values) || (draft.sourceId !== null && draft.sourceId !== draft.questId)) return null
    return draft
  } catch { return null }
}

export function writeQuestDraft(key: string, draft: QuestDraft | null): boolean {
  try {
    if (draft) {
      const text = JSON.stringify(draft)
      if (text.length > 1000000 || !validValues(draft.values)) return false
      localStorage.setItem(key, text)
    }
    else localStorage.removeItem(key)
    return true
  } catch { return false }
}
