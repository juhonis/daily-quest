import { useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../../store/useStore'
import { hasCompletionOnDate, repeatDescription } from '../../../utils/dateUtils'
import { Repeat, Calendar, Award, ExternalLink } from 'lucide-react'

interface QuestHistoryPanelProps {
  selectedQuestId: string | null
  onSelectQuest: (questId: string) => void
}

export function QuestHistoryPanel({ selectedQuestId, onSelectQuest }: QuestHistoryPanelProps) {
  const quests = useStore((s) => s.quests)
  const tagColors = useStore((s) => s.tagColors)
  const completions = useStore((s) => s.completions)
  const selectedDate = useStore((s) => s.selectedDate)
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [doneFilter, setDoneFilter] = useState<'all' | 'done' | 'not-done'>('all')
  const [hovered, setHovered] = useState<{ questId: string; top: number; left: number } | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const activeQuest = useMemo(() => {
    if (!hovered) return null
    return quests.find((q) => q.id === hovered.questId) ?? null
  }, [hovered, quests])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    quests.forEach((q) => q.tags?.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [quests])

  const filtered = useMemo(() => {
    let list = [...quests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    if (filterTags.length > 0) {
      list = list.filter((q) => q.tags?.some((t) => filterTags.includes(t)))
    }
    if (doneFilter === 'done') {
      list = list.filter((q) => hasCompletionOnDate(completions, q.id, selectedDate))
    } else if (doneFilter === 'not-done') {
      list = list.filter((q) => !hasCompletionOnDate(completions, q.id, selectedDate))
    }
    return list
  }, [quests, filterTags, doneFilter, completions, selectedDate])

  function handleMouseEnter(questId: string, e: React.MouseEvent) {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    setHovered({ questId, top: rect.bottom + 4, left: rect.left })
  }

  function handleMouseLeave() {
    hideTimer.current = setTimeout(() => setHovered(null), 200)
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3 space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quest History</h3>

      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterTags([])}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              filterTags.length === 0
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => {
            const color = tagColors[tag] ?? '#3B82F6'
            return (
              <button
                key={tag}
                onClick={() => {
                  setFilterTags(
                    filterTags.includes(tag)
                      ? filterTags.filter((t) => t !== tag)
                      : [...filterTags, tag],
                  )
                }}
                className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                  filterTags.includes(tag) ? 'text-white border-transparent' : 'hover:brightness-125'
                }`}
                style={filterTags.includes(tag) ? { backgroundColor: color } : { borderColor: color, color }}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {(['all', 'done', 'not-done'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setDoneFilter(option)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              doneFilter === option
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {option === 'all' ? 'All' : option === 'done' ? 'Done' : 'Not done'}
          </button>
        ))}
      </div>

      <div className="space-y-1 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {filtered.map((quest) => {
          return (
            <button
              key={quest.id}
              onClick={() => onSelectQuest(quest.id)}
              className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                selectedQuestId === quest.id
                  ? 'border border-blue-600/30'
                  : 'hover:bg-slate-700/50 border border-transparent'
              }`}
              style={selectedQuestId === quest.id ? { backgroundColor: '#3B82F633' } : {}}
            >
              <div className="text-sm font-medium text-slate-200 truncate">
                <span
                  className="cursor-pointer hover:text-blue-400 transition-colors"
                  onMouseEnter={(e) => handleMouseEnter(quest.id, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  {quest.title}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500">{quest.targetDate}</span>
                {quest.tags && quest.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {quest.tags.map((t) => {
                      const c = tagColors[t] ?? '#3B82F6'
                      return (
                        <span key={t} className="text-[10px] px-1 rounded" style={{ backgroundColor: `${c}33`, color: c }}>
                          {t}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">No quests found.</p>
        )}
      </div>

      {createPortal(
        hovered && activeQuest && (
          <div
            style={{ position: 'fixed', top: hovered.top, left: hovered.left, zIndex: 50 }}
            className="w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl"
            onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current) }}
            onMouseLeave={handleMouseLeave}
          >
            {activeQuest.description && (
              <p className="text-xs text-slate-300 mb-2">{activeQuest.description}</p>
            )}

            <div className="space-y-1.5 text-xs text-slate-400">
              {repeatDescription(activeQuest) && (
                <div className="flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5" />
                  <span>{repeatDescription(activeQuest)}</span>
                </div>
              )}

              {activeQuest.rollover && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Rolls over until done</span>
                </div>
              )}

              {activeQuest.xp != null && (
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>{activeQuest.xp} XP</span>
                </div>
              )}
            </div>

            {activeQuest.tags && activeQuest.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activeQuest.tags.map((tag) => {
                  const color = tagColors[tag] ?? '#3B82F6'
                  return (
                    <span key={tag} className="rounded-md px-1.5 py-0.5 text-xs" style={{ backgroundColor: `${color}26`, borderColor: `${color}33`, color }}>
                      {tag}
                    </span>
                  )
                })}
              </div>
            )}

            {activeQuest.externalUrl && (
              <div className="mt-3 pt-2 border-t border-slate-700">
                <button
                  onClick={(e) => { e.stopPropagation(); window.open(activeQuest.externalUrl, '_blank', 'noopener') }}
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open link
                </button>
              </div>
            )}
          </div>
        ),
        document.body,
      )}
    </div>
  )
}
