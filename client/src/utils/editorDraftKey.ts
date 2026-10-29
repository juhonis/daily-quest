import { createId } from './createId'

export function localEditorDraftKey(kind: 'quest' | 'note', sourceId?: string): string {
  let tab: string
  try {
    tab = sessionStorage.getItem('daily-quest-editor-tab') ?? createId()
    sessionStorage.setItem('daily-quest-editor-tab', tab)
  } catch { tab = 'local' }
  return `daily-${kind}-editor:v1:${tab}:${sourceId ? `edit:${encodeURIComponent(sourceId)}` : 'new'}`
}
