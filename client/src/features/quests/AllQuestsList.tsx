import type { Quest, CompletionRecord } from '../../types'
import { formatForDisplay, hasCompletionOnDate } from '../../utils/dateUtils'
import { Checkbox } from '../../components/ui/Checkbox'
import { Button } from '../../components/ui/Button'
import { Trash2 } from 'lucide-react'

interface AllQuestsListProps {
  quests: Quest[]
  selectedDate: string
  completions: CompletionRecord[]
  onToggleCompletion: (questId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
  onJumpToDate: (date: string) => void
}

export function AllQuestsList({
  quests,
  selectedDate,
  completions,
  onToggleCompletion,
  onDelete,
  onEdit,
  onJumpToDate,
}: AllQuestsListProps) {
  if (quests.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No active quests. Tap + to add one.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {quests.map((q) => {
        const isChecked = hasCompletionOnDate(completions, q.id, selectedDate)
        return (
          <div
            key={q.id}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
          >
            <Checkbox
              checked={isChecked}
              onChange={() => onToggleCompletion(q.id, selectedDate)}
              label=""
              id={`all-${q.id}`}
            />
            <button
              onClick={() => onEdit(q.id)}
              className="flex-1 text-left text-xs text-slate-200 hover:text-blue-400 transition-colors truncate"
            >
              {q.title}
            </button>
            <button
              onClick={() => onJumpToDate(q.targetDate)}
              className="text-2xs text-slate-500 hover:text-slate-300 transition-colors shrink-0"
              title={`Jump to ${formatForDisplay(q.targetDate)}`}
            >
              {formatForDisplay(q.targetDate)}
            </button>
            {q.repeat !== 'none' && (
              <span className="text-2xs text-slate-600 uppercase shrink-0">{q.repeat}</span>
            )}
            <Button
              variant="icon"
              onClick={() => {
                if (window.confirm(`Delete "${q.title}"?`)) onDelete(q.id)
              }}
              aria-label={`Delete ${q.title}`}
            >
              <Trash2 className="w-3 h-3 text-slate-500 hover:text-red-400" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
