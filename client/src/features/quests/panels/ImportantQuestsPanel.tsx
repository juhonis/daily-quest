import type { Quest, CompletionRecord } from '../../../types'
import { BasePanel } from './BasePanel'

interface ImportantQuestsPanelProps {
  quests: Quest[]
  selectedDate: string
  completions: CompletionRecord[]
  onToggleCompletion: (questId: string, date: string) => void
  onToggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
}

export function ImportantQuestsPanel(props: ImportantQuestsPanelProps) {
  return <BasePanel {...props} label="Important today" emptyHint="No specific quests for this date." />
}
