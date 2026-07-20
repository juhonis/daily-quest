import type { Quest, CompletionRecord } from '../../../types'
import { QuestCard } from '../QuestCard'

interface BasePanelProps {
  quests: Quest[]
  selectedDate: string
  completions: CompletionRecord[]
  onToggleCompletion: (questId: string, date: string) => void
  onToggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
  label: string
  emptyHint: string
  isDone?: boolean
}

export function BasePanel({
  quests,
  selectedDate,
  completions,
  onToggleCompletion,
  onToggleSubQuest,
  onDelete,
  onEdit,
  label,
  emptyHint,
  isDone,
}: BasePanelProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3 h-full flex flex-col">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {label}
      </h3>
      {quests.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-4 flex-1">{emptyHint}</p>
      ) : (
        <div className="space-y-2 flex-1">
          {quests.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              selectedDate={selectedDate}
              completions={completions}
              onToggleCompletion={onToggleCompletion}
              onToggleSubQuest={onToggleSubQuest}
              onDelete={onDelete}
              onEdit={onEdit}
              isDone={isDone}
            />
          ))}
        </div>
      )}
    </div>
  )
}
