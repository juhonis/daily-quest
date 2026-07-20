import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { Button } from '../../components/ui/Button'
import { Settings } from 'lucide-react'
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

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300">Quests</h2>
        {tab === 'quests' && (
          <Button variant="icon" aria-label="Edit panels" onClick={() => setShowEditPanels(true)}>
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>

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

      {tab === 'quests' && (
        <>
          <QuickAddBar
            presets={quickPresets}
            selectedDate={selectedDate}
            onInstantAdd={(preset) => addQuestFromPreset(preset, selectedDate)}
            onManageAdd={addQuickPreset}
            onManageDelete={deleteQuickPreset}
          />
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
