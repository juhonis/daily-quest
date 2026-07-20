import type { Quest, CompletionRecord } from '../../types'
import { groupQuestsByActivityReason } from '../../utils/dateUtils'
import { QuestCard } from './QuestCard'

interface QuestListProps {
  quests: Quest[]
  selectedDate: string
  completions: CompletionRecord[]
  onToggleCompletion: (questId: string, date: string) => void
  onToggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
}

const sections = [
  { key: 'rollover' as const, label: 'Rollover' },
  { key: 'todays' as const, label: 'Today' },
  { key: 'repeating' as const, label: 'Repeating' },
]

export function QuestList({
  quests,
  selectedDate,
  completions,
  onToggleCompletion,
  onToggleSubQuest,
  onDelete,
  onEdit,
}: QuestListProps) {
  const groups = groupQuestsByActivityReason(quests, selectedDate, completions)

  const hasAny = sections.some((s) => groups[s.key].length > 0)
  if (!hasAny) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No quests for this date. Tap + to add one.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {sections.map(({ key, label }) => {
        const items = groups[key]
        if (items.length === 0) return null
        return (
          <div key={key}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {label}
            </h3>
            <div className="space-y-2">
              {items.map((q) => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  selectedDate={selectedDate}
                  completions={completions}
                  onToggleCompletion={onToggleCompletion}
                  onToggleSubQuest={onToggleSubQuest}
                  onDelete={onDelete}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
