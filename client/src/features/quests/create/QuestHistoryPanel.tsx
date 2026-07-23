import { useState, useMemo } from 'react'
import { useStore } from '../../../store/useStore'

interface QuestHistoryPanelProps {
  selectedQuestId: string | null
  onSelectQuest: (questId: string) => void
}

export function QuestHistoryPanel({ selectedQuestId, onSelectQuest }: QuestHistoryPanelProps) {
  const quests = useStore((s) => s.quests)
  const tagColors = useStore((s) => s.tagColors)
  const [filterTags, setFilterTags] = useState<string[]>([])

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
    return list
  }, [quests, filterTags])

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
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  filterTags.includes(tag) ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={filterTags.includes(tag) ? { backgroundColor: color } : {}}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.map((quest) => (
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
            <div className="text-sm font-medium text-slate-200 truncate">{quest.title}</div>
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
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">No quests found.</p>
        )}
      </div>
    </div>
  )
}
