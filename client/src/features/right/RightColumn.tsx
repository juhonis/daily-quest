import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { BasePanel } from '../quests/list/panels/BasePanel'
import { getTodayLocal, hasCompletionOnDate, hasCompletionBetween, getStartOfWeek, addDays } from '../../utils/dateUtils'

const UNTAGGED = '__untagged__'
const HIDE_ALL = '__hide__'

export function RightColumn() {
  const quests = useStore((s) => s.quests)
  const completions = useStore((s) => s.completions)
  const selectedDate = useStore((s) => s.selectedDate)
  const toggleCompletion = useStore((s) => s.toggleCompletion)
  const toggleSubQuest = useStore((s) => s.toggleSubQuest)
  const deleteQuest = useStore((s) => s.deleteQuest)
  const tagColors = useStore((s) => s.tagColors)

  const [filterTags, setFilterTags] = useState<string[]>([])
  const [doneMode, setDoneMode] = useState<'not-done' | 'done'>('done')
  const [doneRange, setDoneRange] = useState<'today' | 'this-week' | 'last-30-days'>('today')

  const allTags = useMemo(() => {
    const set = new Set<string>()
    quests.forEach((q) => q.tags?.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [quests])

  const hasUntaggedQuests = quests.some((q) => !q.tags || q.tags.length === 0)

  const allTagsSelected = allTags.length > 0 && allTags.every((t) => filterTags.includes(t)) && !filterTags.includes(HIDE_ALL)

  const filteredQuests = useMemo(() => {
    if (filterTags.length === 0) return quests
    if (filterTags.includes(HIDE_ALL)) return []
    return quests.filter((q) => {
      const hasTags = q.tags && q.tags.length > 0
      const matchesTag = hasTags && q.tags!.some((t) => filterTags.includes(t))
      const matchesUntagged = !hasTags && filterTags.includes(UNTAGGED)
      return matchesTag || matchesUntagged
    })
  }, [quests, filterTags])

  const toggledQuests = useMemo(() => {
    const today = getTodayLocal()
    return filteredQuests.filter((q) => {
      if (doneMode === 'not-done') {
        return !hasCompletionOnDate(completions, q.id, selectedDate)
      }
      switch (doneRange) {
        case 'today':
          return hasCompletionOnDate(completions, q.id, today)
        case 'this-week':
          return hasCompletionBetween(completions, q.id, getStartOfWeek(today), today)
        case 'last-30-days':
          return hasCompletionBetween(completions, q.id, addDays(today, -29), today)
      }
    })
  }, [filteredQuests, completions, selectedDate, doneMode, doneRange])

  const doneRanges: { key: 'today' | 'this-week' | 'last-30-days'; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'this-week', label: 'This week' },
    { key: 'last-30-days', label: 'Last 30 days' },
  ]

  return (
    <div className="p-4 h-full flex flex-col min-w-0">
      {(allTags.length > 0 || hasUntaggedQuests) && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <button
            onClick={() => {
              if (filterTags.length === 0) {
                setFilterTags([...allTags, UNTAGGED])
              } else if (allTagsSelected) {
                setFilterTags([HIDE_ALL])
              } else {
                setFilterTags([...allTags, UNTAGGED])
              }
            }}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              filterTags.length === 0 || allTagsSelected
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
                  if (filterTags.includes(HIDE_ALL)) {
                    setFilterTags([tag])
                  } else {
                    setFilterTags(
                      filterTags.includes(tag)
                        ? filterTags.filter((t) => t !== tag)
                        : [...filterTags, tag],
                    )
                  }
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
          {hasUntaggedQuests && (
            <button
              onClick={() => {
                if (filterTags.includes(HIDE_ALL)) {
                  setFilterTags([UNTAGGED])
                } else {
                  setFilterTags(
                    filterTags.includes(UNTAGGED)
                      ? filterTags.filter((t) => t !== UNTAGGED)
                      : [...filterTags, UNTAGGED],
                  )
                }
              }}
              className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                filterTags.includes(UNTAGGED) && !filterTags.includes(HIDE_ALL)
                  ? 'bg-slate-600 text-white border-transparent'
                  : 'text-slate-400 border-slate-500 hover:text-slate-300 hover:border-slate-400'
              }`}
            >
              No tag
            </button>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <BasePanel
          quests={toggledQuests}
          selectedDate={selectedDate}
          completions={completions}
          onToggleCompletion={toggleCompletion}
          onToggleSubQuest={toggleSubQuest}
          onDelete={deleteQuest}
          onEdit={() => {}}
          label="All Quests"
          emptyHint="No quests found."
          titleExtra={
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDoneMode('done')}
                className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                  doneMode === 'done'
                    ? 'bg-green-700/40 text-green-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Done
              </button>
              <button
                onClick={() => setDoneMode('not-done')}
                className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                  doneMode === 'not-done'
                    ? 'bg-blue-700/40 text-blue-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Not done
              </button>
              {doneMode === 'done' && (
                <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-700">
                  {doneRanges.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setDoneRange(r.key)}
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                        doneRange === r.key
                          ? 'bg-green-700/40 text-green-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          }
        />
      </div>
    </div>
  )
}
