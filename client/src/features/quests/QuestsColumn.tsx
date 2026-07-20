import { useState } from 'react'
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

  const allVisibleHidden = hiddenPanels.length === 5
  const isToday = selectedDate === getTodayLocal()
  const dateLabel = format(parseDate(selectedDate), 'EEEE dd/MM/yyyy')

  return (
    <div className="p-4 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Quests</h2>

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

      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="icon"
          aria-label="Previous day"
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <button
          onClick={() => setSelectedDate(getTodayLocal())}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            isToday ? 'text-slate-300' : 'text-blue-400 hover:text-blue-300'
          }`}
          title={isToday ? 'Today' : 'Jump to today'}
        >
          {!isToday && <CalendarCheck className="w-3.5 h-3.5" />}
          {dateLabel}
        </button>
        <Button
          variant="icon"
          aria-label="Next day"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {tab === 'quests' && (
        <>
          <div className="flex items-center gap-2 justify-between">
            <QuickAddBar
              presets={quickPresets}
              selectedDate={selectedDate}
              onInstantAdd={(preset) => addQuestFromPreset(preset, selectedDate)}
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
                quests={quests}
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
