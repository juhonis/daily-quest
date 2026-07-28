import type { Quest, CompletionRecord } from '../../../../types'
import { BasePanel } from './BasePanel'

interface TagPanelProps {
  tag: string
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

export function TagPanel({ tag, quests, ...rest }: TagPanelProps) {
  const filtered = quests.filter((q) => q.tags?.includes(tag))
  return (
    <BasePanel
      {...rest}
      quests={filtered}
      label={tag}
      emptyHint={`No quests tagged "${tag}".`}
    />
  )
}
