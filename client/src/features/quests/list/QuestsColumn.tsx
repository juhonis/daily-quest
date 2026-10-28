import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List, SlidersHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../../../store/useStore'
import { Button } from '../../../components/ui/Button'
import { addDays, getActiveQuestsForDate, getFinishedQuestsForDate, getTodayLocal, parseDate } from '../../../utils/dateUtils'
import { QuickAddBar } from './QuickAddBar'
import { QuestsPanelsRow } from './QuestsPanelsRow'
import { EditPanelsModal } from './EditPanelsModal'
import { DayWeather } from '../../weather/DayWeather'

export function QuestsColumn({ onEdit, onChooseDate }: { onEdit: (id: string) => void; onChooseDate: () => void }) {
  const [layout, setLayout] = useState<'list' | 'board'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [showPanels, setShowPanels] = useState(false)
  const quests = useStore((s) => s.quests)
  const completions = useStore((s) => s.completions)
  const presets = useStore((s) => s.quickPresets)
  const selectedDate = useStore((s) => s.selectedDate)
  const setSelectedDate = useStore((s) => s.setSelectedDate)
  const filterTags = useStore((s) => s.filterTags)
  const setFilterTags = useStore((s) => s.setFilterTags)
  const tagColors = useStore((s) => s.tagColors)
  const tagPanels = useStore((s) => s.tagPanels)
  const addTagPanel = useStore((s) => s.addTagPanel)
  const addFromPreset = useStore((s) => s.addQuestFromPreset)
  const addPreset = useStore((s) => s.addQuickPreset)
  const deletePreset = useStore((s) => s.deleteQuickPreset)
  const toggleCompletion = useStore((s) => s.toggleCompletion)
  const toggleSubQuest = useStore((s) => s.toggleSubQuest)
  const deleteQuest = useStore((s) => s.deleteQuest)
  const allTags = useMemo(() => [...new Set(quests.flatMap((q) => q.tags ?? []))].sort(), [quests])
  const filtered = useMemo(() => filterTags.length === 0 ? quests : quests.filter((q) =>
    q.tags?.some((tag) => filterTags.includes(tag)) || ((!q.tags || !q.tags.length) && filterTags.includes('__untagged__')),
  ), [quests, filterTags])
  const active = getActiveQuestsForDate(quests, selectedDate, completions).length
  const done = getFinishedQuestsForDate(quests, selectedDate, completions).length
  const total = active + done
  const isToday = selectedDate === getTodayLocal()

  return (
    <div className="min-w-0 space-y-5">
      <header aria-label="Day overview" className="day-overview rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
       <DayWeather>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">{isToday ? 'Today' : format(parseDate(selectedDate), 'EEEE')}</h1>
          <div className="flex items-center gap-1">
            {!isToday && <Button variant="ghost" onClick={() => setSelectedDate(getTodayLocal())}>Today</Button>}
            <Button variant="icon" aria-label="Previous day" onClick={() => setSelectedDate(addDays(selectedDate, -1))}><ChevronLeft className="h-5 w-5" /></Button>
            <Button variant="icon" aria-label="Next day" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight className="h-5 w-5" /></Button>
          </div>
        </div>
        <button type="button" aria-label="Choose date" onClick={onChooseDate} className="mt-1 inline-flex min-h-11 max-w-full items-center gap-2 text-left text-sm text-slate-400 hover:text-slate-200"><CalendarDays className="h-4 w-4 shrink-0" /><span className="sm:hidden">{format(parseDate(selectedDate), 'EEE, d MMM')}</span><span className="hidden sm:inline">{format(parseDate(selectedDate), 'EEEE, d MMMM yyyy')}</span></button>
      </div>
       </DayWeather>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Daily quest progress" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={done}><div className="h-full rounded-full bg-blue-500 transition-[width]" style={{ width: `${total ? done / total * 100 : 0}%` }} /></div>
          <span className="text-sm text-slate-400">{total ? `${done} of ${total} done` : 'A fresh start'}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <QuickAddBar presets={presets} selectedDate={selectedDate} onInstantAdd={(preset, config) => addFromPreset(preset, selectedDate, config)} onManageAdd={addPreset} onManageDelete={deletePreset} />
          <Button variant="ghost" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><SlidersHorizontal className="h-4 w-4" />Filters{filterTags.length > 0 && <span className="rounded-full bg-blue-500/15 px-2 text-xs text-blue-300">{filterTags.length}</span>}</Button>
          {filterTags.length > 0 && <Button variant="ghost" onClick={() => setFilterTags([])}>Clear</Button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden rounded-lg border border-slate-800 p-1 sm:flex" aria-label="Task layout">
            <Button variant="ghost" aria-pressed={layout === 'list'} onClick={() => setLayout('list')} className={layout === 'list' ? 'bg-slate-800 text-white' : ''}><List className="h-4 w-4" />List</Button>
            <Button variant="ghost" aria-pressed={layout === 'board'} onClick={() => setLayout('board')} className={layout === 'board' ? 'bg-slate-800 text-white' : ''}><Columns3 className="h-4 w-4" />Board</Button>
          </div>
          <Button variant="ghost" onClick={() => setShowPanels(true)}>Customize</Button>
        </div>
      </div>
      {showFilters && <section aria-label="Quest filters" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="mb-3 text-sm font-medium text-slate-300">Filter by tag</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" aria-pressed={filterTags.length === 0} onClick={() => setFilterTags([])}>All quests</Button>
          {[...allTags, '__untagged__'].map((tag) => <Button key={tag} variant="ghost" aria-pressed={filterTags.includes(tag)} onClick={() => setFilterTags(filterTags.includes(tag) ? filterTags.filter((t) => t !== tag) : [...filterTags.filter((t) => t !== '__hide__'), tag])} className={filterTags.includes(tag) ? 'bg-blue-500/10 text-blue-300' : ''}>
            {tag !== '__untagged__' && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tagColors[tag] ?? '#3B82F6' }} />}{tag === '__untagged__' ? 'No tag' : tag}
          </Button>)}
        </div>
        {allTags.some((tag) => !tagPanels.includes(tag)) && <div className="mt-4 border-t border-slate-800 pt-3"><label htmlFor="tag-panel" className="mr-3 text-sm text-slate-400">Add a tag section</label><select id="tag-panel" value="" onChange={(event) => { if (event.target.value) addTagPanel(event.target.value) }} className="min-h-11 max-w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm"><option value="">Choose a tag…</option>{allTags.filter((tag) => !tagPanels.includes(tag)).map((tag) => <option key={tag}>{tag}</option>)}</select></div>}
      </section>}
      {total === 0 && <div className="rounded-xl border border-dashed border-slate-800 px-5 py-8 text-center"><p className="font-medium text-slate-300">Nothing planned for this day.</p><p className="mt-2 text-sm leading-relaxed text-slate-500">Use New to add a quest, or Quick add to start from a preset.</p></div>}
      <QuestsPanelsRow quests={filtered} completions={completions} selectedDate={selectedDate} onToggleCompletion={toggleCompletion} onToggleSubQuest={toggleSubQuest} onDelete={deleteQuest} onEdit={onEdit} layout={layout} />
      {showPanels && <EditPanelsModal onClose={() => setShowPanels(false)} />}
    </div>
  )
}
