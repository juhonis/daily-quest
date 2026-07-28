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
  color?: string
  dragHandleProps?: Record<string, unknown>
  onHide?: () => void
  labelOverride?: string
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = Number.parseInt(h.substring(0, 2), 16)
  const g = Number.parseInt(h.substring(2, 4), 16)
  const b = Number.parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function TagPanel({ tag, quests, color, ...rest }: TagPanelProps) {
  const filtered = quests.filter((q) => q.tags?.includes(tag))
  return (
    <BasePanel
      {...rest}
      quests={filtered}
      label={tag}
      emptyHint={`No quests tagged "${tag}".`}
      containerStyle={color ? { backgroundColor: hexToRgba(color, 0.1) } : undefined}
    />
  )
}
