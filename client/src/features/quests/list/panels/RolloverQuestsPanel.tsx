import type { Quest, CompletionRecord } from '../../../../types'
import { BasePanel } from './BasePanel'

interface RolloverQuestsPanelProps {
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

export function RolloverQuestsPanel(props: RolloverQuestsPanelProps) {
  return <BasePanel {...props} label="Carried forward" emptyHint="No unfinished quests carried forward. All caught up." />
}
