import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { BasePanel } from '../quests/list/panels/BasePanel'

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
          quests={filteredQuests}
          selectedDate={selectedDate}
          completions={completions}
          onToggleCompletion={toggleCompletion}
          onToggleSubQuest={toggleSubQuest}
          onDelete={deleteQuest}
          onEdit={() => {}}
          label="All Quests"
          emptyHint="No quests found."
        />
      </div>
    </div>
  )
}
