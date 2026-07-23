import type { Quest, CompletionRecord } from '../../../../types'
import { QuestCard } from '../QuestCard'
import { X, GripVertical } from 'lucide-react'

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
  dragHandleProps?: Record<string, unknown>
  onHide?: () => void
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
  dragHandleProps,
  onHide,
}: BasePanelProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3 h-full flex flex-col min-w-0">
      <div className="flex items-center gap-1 mb-3 min-w-0">
        {dragHandleProps && (
          <button {...dragHandleProps} className="p-0.5 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 flex-shrink-0">
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex-1 min-w-0 truncate" title={label}>
          {label}
        </h3>
        {onHide && (
          <button onClick={onHide} className="p-0.5 text-slate-500 hover:text-red-400 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {quests.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-4 flex-1">{emptyHint}</p>
      ) : (
        <div className="space-y-2 flex-1 min-w-0">
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
