import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { Button } from '../../components/ui/Button'
import { Settings, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'
import { addDays, getTodayLocal, parseDate } from '../../utils/dateUtils'
import { QuestsTabs } from './QuestsTabs'
import { QuickAddBar } from './QuickAddBar'
import { QuestsPanelsRow } from './QuestsPanelsRow'
import { QuestCreateForm } from './QuestCreateForm'
import { EditPanelsModal } from './EditPanelsModal'
import { CurrentWeather } from '../weather/CurrentWeather'
import { WeatherCarousel } from '../weather/WeatherCarousel'

export function QuestsColumn() {
  const [tab, setTab] = useState<'quests' | 'create'>('quests')
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

  const allTags = useMemo(() => {
    const set = new Set<string>()
    quests.forEach((q) => q.tags?.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [quests])

  const filteredQuests = filterTags.length > 0
    ? quests.filter((q) => q.tags?.some((t) => filterTags.includes(t)))
    : quests

  const allVisibleHidden = hiddenPanels.length === 5
  const isToday = selectedDate === getTodayLocal()
  const dayName = format(parseDate(selectedDate), 'EEEE')
  const dateLabel = format(parseDate(selectedDate), 'dd/MM/yyyy')

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex gap-4 mb-6">
        <CurrentWeather />
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

      {tab === 'quests' && (
        <>
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
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
              {allTags.map((tag) => (
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
                    filterTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 justify-between">
            <QuickAddBar
              presets={quickPresets}
              selectedDate={selectedDate}
               onInstantAdd={(preset, config) => addQuestFromPreset(preset, selectedDate, config)}
              onManageAdd={addQuickPreset}
              onManageDelete={deleteQuickPreset}
            />
            <Button variant="icon" aria-label="Edit panels" onClick={() => setShowEditPanels(true)}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
          {allVisibleHidden ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No panels visible. Tap Edit panels to show some.
            </p>
          ) : (
            <div className="flex-1 overflow-y-auto">
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

      {tab === 'create' && (
        <div className="flex-1 overflow-y-auto">
          <QuestCreateForm
            key={`${editingQuest ?? 'new'}-${formKey}`}
            initialData={editingQuest ? quests.find((q) => q.id === editingQuest) ?? undefined : undefined}
            defaultDate={selectedDate}
            onSavePreset={(preset) => addQuickPreset(preset)}
            onSave={(quest) => {
              if (editingQuest) {
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
