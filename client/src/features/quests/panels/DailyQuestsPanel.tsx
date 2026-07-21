import type { Quest, CompletionRecord } from '../../../types'
import { BasePanel } from './BasePanel'

interface DailyQuestsPanelProps {
  quests: Quest[]
  selectedDate: string
  completions: CompletionRecord[]
  onToggleCompletion: (questId: string, date: string) => void
  onToggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
  dragHandleProps?: Record<string, unknown>
  onHide?: () => void
}

export function DailyQuestsPanel(props: DailyQuestsPanelProps) {
  return <BasePanel {...props} label="Daily" emptyHint="No daily quests repeating today." />
}
