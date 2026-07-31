import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react'
import { useStore } from '../../../store/useStore'
import { Button } from '../../../components/ui/Button'
import { Settings, Plus, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'
import { addDays, getTodayLocal, parseDate } from '../../../utils/dateUtils'
import { QuestsTabs } from '../QuestsTabs'
import { QuickAddBar } from './QuickAddBar'
import { QuestsPanelsRow } from './QuestsPanelsRow'
import { QuestCreateForm } from '../create/QuestCreateForm'
import { EditPanelsModal } from './EditPanelsModal'
import { NotesGrid } from '../../notes/NotesGrid'
import { CurrentWeather } from '../../weather/CurrentWeather'
import { WeatherCarousel } from '../../weather/WeatherCarousel'

const RainRadar = lazy(() =>
  import('../../weather/RainRadar').then(m => ({ default: m.RainRadar }))
)

function RadarFallback() {
  return (
    <div className="glass-panel rounded-xl p-3 w-[256px] min-h-[104px] flex flex-col gap-1">
      <span className="text-xs text-slate-500">Radar</span>
      <span className="text-xs text-slate-500">Loading...</span>
    </div>
  )
}

export function QuestsColumn() {
  const [tab, setTab] = useState<'quests' | 'create' | 'notes'>('quests')
  const [editingQuest, setEditingQuest] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [showEditPanels, setShowEditPanels] = useState(false)

  const quests = useStore((s) => s.quests)
  const completions = useStore((s) => s.completions)
  const quickPresets = useStore((s) => s.quickPresets)
  const selectedDate = useStore((s) => s.selectedDate)
  const setSelectedDate = useStore((s) => s.setSelectedDate)
  const toggleCompletion = useStore((s) => s.toggleCompletion)
  const toggleSubQuest = useStore((s) => s.toggleSubQuest)
  const deleteQuest = useStore((s) => s.deleteQuest)
  const addQuest = useStore((s) => s.addQuest)
  const updateQuest = useStore((s) => s.updateQuest)
  const addQuestFromPreset = useStore((s) => s.addQuestFromPreset)
  const addQuickPreset = useStore((s) => s.addQuickPreset)
  const deleteQuickPreset = useStore((s) => s.deleteQuickPreset)
  const hiddenPanels = useStore((s) => s.hiddenPanels)
  const filterTags = useStore((s) => s.filterTags)
  const setFilterTags = useStore((s) => s.setFilterTags)
  const tagColors = useStore((s) => s.tagColors)
  const tagPanels = useStore((s) => s.tagPanels)
  const addTagPanel = useStore((s) => s.addTagPanel)

  const [showTagPicker, setShowTagPicker] = useState(false)
  const tagPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showTagPicker) return
    function handler(e: MouseEvent) {
      if (tagPickerRef.current && !tagPickerRef.current.contains(e.target as Node)) {
        setShowTagPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTagPicker])

  const UNTAGGED = '__untagged__'
  const HIDE_ALL = '__hide__'

  const allTags = useMemo(() => {
    const set = new Set<string>()
    quests.forEach((q) => q.tags?.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [quests])

  const hasUntaggedQuests = quests.some((q) => !q.tags || q.tags.length === 0)

  const allTagsSelected = allTags.length > 0 && allTags.every((t) => filterTags.includes(t)) && !filterTags.includes(HIDE_ALL)
  const availableTags = allTags.filter((t) => !tagPanels.includes(t))

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

  const allVisibleHidden = hiddenPanels.length === 5 && tagPanels.length === 0
  const isToday = selectedDate === getTodayLocal()
  const dayName = format(parseDate(selectedDate), 'EEEE')
  const dateLabel = format(parseDate(selectedDate), 'dd/MM/yyyy')

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4">
        <div className="flex gap-4 mb-6">
        <div className="flex flex-col gap-4">
          <CurrentWeather />
          <Suspense fallback={<RadarFallback />}>
            <RainRadar />
          </Suspense>
        </div>
        <div className="flex-1 min-w-0">
          <WeatherCarousel />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mb-6">
        <Button
          variant="icon"
          aria-label="Previous day"
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <button
          onClick={() => setSelectedDate(getTodayLocal())}
          className={`flex flex-col items-center gap-0 transition-colors ${
            isToday ? 'text-slate-200' : 'text-blue-400 hover:text-blue-300'
          }`}
          title={isToday ? 'Today' : 'Jump to today'}
        >
          {!isToday && <CalendarCheck className="w-4 h-4 mb-0.5" />}
          <span className="text-lg font-semibold">{dayName}</span>
          <span className="text-xs text-slate-400">{dateLabel}</span>
        </button>
        <Button
          variant="icon"
          aria-label="Next day"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      <div className="text-center mb-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Daily Quests</h2>
      </div>

      <div className="flex justify-center mb-3">
        <QuestsTabs
          activeTab={tab}
          onChange={(t) => {
            if (t === 'create') {
              setEditingQuest(null)
              setFormKey((k) => k + 1)
            }
            setTab(t)
          }}
        />
      </div>
    </div>

      {tab === 'quests' && (
        <>
          <div className="px-4">
            <div className="flex items-center gap-2 justify-between">
              <QuickAddBar
                presets={quickPresets}
                selectedDate={selectedDate}
                 onInstantAdd={(preset, config) => addQuestFromPreset(preset, selectedDate, config)}
                onManageAdd={addQuickPreset}
                onManageDelete={deleteQuickPreset}
              />
              {(allTags.length > 0 || hasUntaggedQuests) && (
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
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
              <div className="relative flex items-center gap-1" ref={tagPickerRef}>
                {availableTags.length > 0 && (
                  <Button variant="icon" aria-label="Add tag panel" onClick={() => setShowTagPicker((o) => !o)}>
                    <Plus className="w-5 h-5" />
                  </Button>
                )}
                {showTagPicker && (
                  <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-slate-600 bg-slate-800 shadow-xl py-1 min-w-[140px]">
                    {availableTags.map((tag) => {
                      const color = tagColors[tag] ?? '#3B82F6'
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            addTagPanel(tag)
                            setShowTagPicker(false)
                          }}
                          className="w-full text-left px-3 py-1 text-xs text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                )}
                <Button variant="icon" aria-label="Edit panels" onClick={() => setShowEditPanels(true)}>
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
            {allVisibleHidden && (
              <p className="text-sm text-slate-500 text-center py-8">
                No panels visible. Tap Edit panels to show some, or add a tag panel with the + button.
              </p>
            )}
          </div>
          {!allVisibleHidden && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-4 pb-4">
               <QuestsPanelsRow
                quests={filteredQuests}
                completions={completions}
                selectedDate={selectedDate}
                onToggleCompletion={toggleCompletion}
                onToggleSubQuest={toggleSubQuest}
                onDelete={deleteQuest}
                onEdit={(id) => {
                  setEditingQuest(id)
                  setTab('create')
                }}
              />
            </div>
          )}
        </>
      )}

      {tab === 'notes' && (
        <div className="flex-1 overflow-y-auto">
          <NotesGrid />
        </div>
      )}

      {tab === 'create' && (
        <div className="flex-1 overflow-y-auto">
          <QuestCreateForm
            key={`${editingQuest ?? 'new'}-${formKey}`}
            initialData={editingQuest ? quests.find((q) => q.id === editingQuest) ?? undefined : undefined}
            defaultDate={selectedDate}
            onSavePreset={(preset) => addQuickPreset(preset)}
            onSave={(quest) => {
              const exists = quests.some((q) => q.id === quest.id)
              if (exists) {
                updateQuest(quest.id, quest)
              } else {
                addQuest(quest)
              }
              setEditingQuest(null)
              setFormKey((k) => k + 1)
            }}
            onClose={() => {
              setEditingQuest(null)
              setFormKey((k) => k + 1)
            }}
          />
        </div>
      )}

      {showEditPanels && (
        <EditPanelsModal onClose={() => setShowEditPanels(false)} />
      )}
    </div>
  )
}
