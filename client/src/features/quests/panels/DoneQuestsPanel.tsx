import type { Quest, CompletionRecord } from '../../../types'
import { BasePanel } from './BasePanel'

interface DoneQuestsPanelProps {
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

export function DoneQuestsPanel(props: DoneQuestsPanelProps) {
  return <BasePanel {...props} label="Done" emptyHint="Nothing done yet." isDone />
}
