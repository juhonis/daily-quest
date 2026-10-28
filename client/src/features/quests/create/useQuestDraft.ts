import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { writeQuestDraft, type QuestDraft } from './questDrafts'
import type { QuestEditorValues } from './questEditorModel'

export function useQuestDraft(key: string, values: QuestEditorValues, identity: Pick<QuestDraft, 'sourceId' | 'questId' | 'presetId' | 'base'>, dirty: boolean, blocked: boolean) {
  const [saved, setSaved] = useState<{ draft: QuestDraft | null; ok: boolean } | null>(null)
  const finished = useRef(false)
  const latest = useRef<QuestDraft | null>(null)
  const draft = useMemo<QuestDraft | null>(() => dirty && !blocked ? {
    ...identity, version: 1, savedAt: new Date().toISOString(), values,
  } : null, [identity, values, dirty, blocked])

  useLayoutEffect(() => { latest.current = draft }, [draft])

  const flush = useCallback(() => {
    if (finished.current || blocked) return true
    const ok = writeQuestDraft(key, latest.current)
    setSaved({ draft: latest.current, ok })
    return ok
  }, [key, blocked])

  useEffect(() => {
    if (blocked) return
    const timer = setTimeout(flush, 300)
    return () => clearTimeout(timer)
  }, [draft, blocked, flush])

  useEffect(() => {
    const save = () => { if (!finished.current && !blocked) writeQuestDraft(key, latest.current) }
    const visibility = () => { if (document.visibilityState === 'hidden') save() }
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [key, blocked])

  function clear() {
    finished.current = true
    writeQuestDraft(key, null)
  }

  const status = saved?.ok === false ? 'error' : saved?.draft === draft && draft ? 'saved' : 'idle'
  return { status, flush, clear }
}
