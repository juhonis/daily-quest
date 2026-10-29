import { useMemo } from 'react'
import { useLocalDraft } from '../../../hooks/useLocalDraft'
import { writeQuestDraft, type QuestDraft } from './questDrafts'
import type { QuestEditorValues } from './questEditorModel'

export function useQuestDraft(key: string, values: QuestEditorValues, identity: Pick<QuestDraft, 'sourceId' | 'questId' | 'presetId' | 'base'>, dirty: boolean, blocked: boolean) {
  const draft = useMemo<QuestDraft | null>(() => dirty && !blocked ? {
    ...identity, version: 1, savedAt: new Date().toISOString(), values,
  } : null, [identity, values, dirty, blocked])
  return useLocalDraft(key, draft, blocked, writeQuestDraft)
}
