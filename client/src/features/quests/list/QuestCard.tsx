import { useState, useRef } from 'react'
import type { Quest, CompletionRecord, SubQuest } from '../../../types'
import { useStore } from '../../../store/useStore'
import { Checkbox } from '../../../components/ui/Checkbox'
import { Button } from '../../../components/ui/Button'
import { hasCompletionOnDate, repeatDescription } from '../../../utils/dateUtils'
import { Trash2, ExternalLink, Pencil, Repeat, Calendar, Award } from 'lucide-react'

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
  const [hoverOpen, setHoverOpen] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const isChecked = hasCompletionOnDate(completions, quest.id, selectedDate)
  const repeatInfo = repeatDescription(quest)
  const tagColors = useStore((s) => s.tagColors)

  function handleMouseEnter() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setHoverOpen(true)
  }

  function handleMouseLeave() {
    hideTimer.current = setTimeout(() => setHoverOpen(false), 200)
  }

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
          <span
            className="relative inline-block max-w-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <span
              className={`text-sm font-medium cursor-pointer hover:text-blue-400 transition-colors break-words ${isChecked ? 'line-through text-slate-500' : 'text-slate-200'}`}
            >
              {quest.title}
            </span>
            <div
              className={`absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl transition-opacity duration-150 ${
                hoverOpen ? 'opacity-100 block' : 'opacity-0 hidden pointer-events-none'
              }`}
            >
              {quest.description && (
                <p className="text-xs text-slate-300 mb-2">{quest.description}</p>
              )}

              <div className="space-y-1.5 text-xs text-slate-400">
                {repeatInfo && (
                  <div className="flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>{repeatInfo}</span>
                  </div>
                )}

                {quest.rollover && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Rolls over until done</span>
                  </div>
                )}

                {quest.xp != null && (
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>{quest.xp} XP</span>
                  </div>
                )}
              </div>

              {quest.tags && quest.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {quest.tags.map((tag) => {
                    const color = tagColors[tag] ?? '#3B82F6'
                    return (
                      <span key={tag} className="rounded-md px-1.5 py-0.5 text-xs" style={{ backgroundColor: `${color}26`, borderColor: `${color}33`, color }}>
                        {tag}
                      </span>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700">
                {quest.externalUrl && (
                  <button
                    onClick={() => window.open(quest.externalUrl, '_blank', 'noopener')}
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open link
                  </button>
                )}
                <button
                  onClick={() => onEdit(quest.id)}
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              </div>
            </div>
          </span>
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
