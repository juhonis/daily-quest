import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { QuestCard } from './list/QuestCard'
import { addDays, getStartOfWeek, getTodayLocal, hasCompletionBetween, hasCompletionOnDate } from '../../utils/dateUtils'

export function QuestLibrary({ onEdit, showHeading = true }: { onEdit: (id: string) => void; showHeading?: boolean }) {
  const quests = useStore((s) => s.quests)
  const completions = useStore((s) => s.completions)
  const selectedDate = useStore((s) => s.selectedDate)
  const toggleCompletion = useStore((s) => s.toggleCompletion)
  const toggleSubQuest = useStore((s) => s.toggleSubQuest)
  const deleteQuest = useStore((s) => s.deleteQuest)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('all')
  const [activity, setActivity] = useState('all')
  const filtered = useMemo(() => quests.filter((quest) => {
    if (scope === 'active' && (quest.archivedAt || quest.status !== 'active')) return false
    if (scope === 'parked' && (quest.archivedAt || quest.status !== 'inactive')) return false
    if (scope === 'archived' && !quest.archivedAt) return false
    if (activity === 'done' && !hasCompletionOnDate(completions, quest.id, selectedDate)) return false
    if (activity === 'not-done' && hasCompletionOnDate(completions, quest.id, selectedDate)) return false
    const today = getTodayLocal()
    if (activity === 'week' && !hasCompletionBetween(completions, quest.id, getStartOfWeek(today), today)) return false
    if (activity === 'month' && !hasCompletionBetween(completions, quest.id, addDays(today, -29), today)) return false
    return `${quest.title} ${quest.description ?? ''} ${(quest.tags ?? []).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())
  }), [quests, search, scope, activity, completions, selectedDate])

  return (
    <section className="space-y-5" aria-label="Quest library">
      {showHeading && <header><h1 className="text-2xl font-semibold tracking-tight text-white">Quest library</h1><p className="mt-1 text-sm text-slate-400">Find and edit quests across all dates.</p></header>}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input aria-label="Search quests" type="search" placeholder="Search titles, descriptions, or tags…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-3 text-sm" /></div>
        <select aria-label="Quest status" value={scope} onChange={(event) => setScope(event.target.value)} className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"><option value="all">All quests</option><option value="active">Active</option><option value="parked">Parked</option><option value="archived">Archived</option></select>
        <select aria-label="Completion history" value={activity} onChange={(event) => setActivity(event.target.value)} className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"><option value="all">Any completion history</option><option value="done">Done on {selectedDate}</option><option value="not-done">Not done on {selectedDate}</option><option value="week">Done this week</option><option value="month">Done in the last 30 days</option></select>
      </div>
      <p className="text-xs text-slate-500">{filtered.length} {filtered.length === 1 ? 'quest' : 'quests'} · Completion is managed from the Day view.</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-3">
        {filtered.map((quest) => <QuestCard key={quest.id} quest={quest} selectedDate={selectedDate} completions={completions} onToggleCompletion={toggleCompletion} onToggleSubQuest={toggleSubQuest} onDelete={deleteQuest} onEdit={onEdit} showCompletion={false} />)}
      </div>
      {filtered.length === 0 && <p className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">{quests.length ? 'No quests match your search.' : 'Your quests will appear here once you create one.'}</p>}
    </section>
  )
}
