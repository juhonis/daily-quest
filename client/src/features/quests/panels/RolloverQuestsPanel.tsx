import type { Quest, CompletionRecord } from '../../../types'
import { BasePanel } from './BasePanel'

interface RolloverQuestsPanelProps {
  quests: Quest[]
  selectedDate: string
  completions: CompletionRecord[]
  onToggleCompletion: (questId: string, date: string) => void
  onToggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
}

export function RolloverQuestsPanel(props: RolloverQuestsPanelProps) {
  return <BasePanel {...props} label="Rollover" emptyHint="Nothing rolling over. All caught up." />
}
