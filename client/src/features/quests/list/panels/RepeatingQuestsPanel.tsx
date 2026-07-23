import type { Quest, CompletionRecord } from '../../../../types'
import { BasePanel } from './BasePanel'

interface RepeatingQuestsPanelProps {
  quests: Quest[]
  selectedDate: string
  completions: CompletionRecord[]
  onToggleCompletion: (questId: string, date: string) => void
  onToggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
  dragHandleProps?: Record<string, unknown>
  onHide?: () => void
  labelOverride?: string
}

export function RepeatingQuestsPanel(props: RepeatingQuestsPanelProps) {
  return <BasePanel {...props} label="Repeating" emptyHint="No repeating quests for today." />
}
