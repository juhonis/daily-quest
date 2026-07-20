import type { Quest, CompletionRecord, SubQuest } from '../../types'
import { Checkbox } from '../../components/ui/Checkbox'
import { Button } from '../../components/ui/Button'
import { hasCompletionOnDate } from '../../utils/dateUtils'
import { Trash2, ExternalLink } from 'lucide-react'

interface QuestCardProps {
  quest: Quest
  selectedDate: string
  completions: CompletionRecord[]
  onToggleCompletion: (questId: string, date: string) => void
  onToggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
  isDone?: boolean
}

export function QuestCard({
  quest,
  selectedDate,
  completions,
  onToggleCompletion,
  onToggleSubQuest,
  onDelete,
  onEdit,
  isDone,
}: QuestCardProps) {
  const isChecked = hasCompletionOnDate(completions, quest.id, selectedDate)

  function handleDelete() {
    if (window.confirm(`Delete "${quest.title}"?`)) {
      onDelete(quest.id)
    }
  }

  return (
    <div className={`rounded-lg border p-3 transition-colors ${isDone ? 'border-slate-700 bg-slate-800/40' : 'border-slate-700 bg-slate-800'}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isChecked}
          onChange={() => onToggleCompletion(quest.id, selectedDate)}
          label=""
          id={`done-${quest.id}`}
        />
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onEdit(quest.id)}
            className={`text-left text-sm font-medium hover:text-blue-400 transition-colors ${isChecked ? 'line-through text-slate-500' : 'text-slate-200'}`}
          >
            {quest.title}
          </button>
          {quest.description && (
            <p className="text-xs text-slate-500 mt-0.5">{quest.description}</p>
          )}
          {quest.externalUrl && (
            <button
              onClick={() => window.open(quest.externalUrl, '_blank', 'noopener')}
              className="inline-flex items-center gap-1 mt-1 text-xs text-slate-500 hover:text-blue-400 transition-colors"
              aria-label={`Open ${quest.title}`}
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </button>
          )}
        </div>
        <Button
          variant="icon"
          onClick={handleDelete}
          aria-label={`Delete ${quest.title}`}
        >
          <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
        </Button>
      </div>

      {quest.subQuests.length > 0 && (
        <div className="ml-7 mt-2 space-y-1 border-l border-slate-700 pl-3">
          {quest.subQuests.map((sq: SubQuest) => (
            <Checkbox
              key={sq.id}
              checked={sq.isCompleted}
              onChange={() => onToggleSubQuest(quest.id, sq.id, selectedDate)}
              label={sq.title}
            />
          ))}
        </div>
      )}
    </div>
  )
}
