import { useState, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { getActiveQuestsForDate } from '../../utils/dateUtils'
import { Button } from '../../components/ui/Button'
import { Plus } from 'lucide-react'
import { QuestList } from './QuestList'
import { AllQuestsList } from './AllQuestsList'
import { QuestCreateModal } from './QuestCreateModal'
import { QuickAddCarousel } from './QuickAddCarousel'
import { QuickPresetManager } from './QuickPresetManager'
import type { QuickPreset } from '../../types'

export function QuestsColumn() {
  const [showAll, setShowAll] = useState(false)
  const [modalQuestId, setModalQuestId] = useState<string | null>(null)

  const quests = useStore((s) => s.quests)
  const completions = useStore((s) => s.completions)
  const quickPresets = useStore((s) => s.quickPresets)
  const selectedDate = useStore((s) => s.selectedDate)
  const setSelectedDate = useStore((s) => s.setSelectedDate)
  const toggleCompletion = useStore((s) => s.toggleCompletion)
  const toggleSubQuest = useStore((s) => s.toggleSubQuest)
  const deleteQuest = useStore((s) => s.deleteQuest)
  const addQuestFromPreset = useStore((s) => s.addQuestFromPreset)
  const addQuickPreset = useStore((s) => s.addQuickPreset)
  const deleteQuickPreset = useStore((s) => s.deleteQuickPreset)

  const activeQuests = getActiveQuestsForDate(quests, selectedDate, completions)

  const allActiveQuests = quests.filter((q) => q.status === 'active' && !q.archivedAt)

  const handleInstantAdd = useCallback(
    (preset: QuickPreset) => {
      addQuestFromPreset(preset, selectedDate)
      if (preset.externalUrl) {
        window.open(preset.externalUrl, '_blank', 'noopener')
      }
    },
    [addQuestFromPreset, selectedDate],
  )

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300">Quests</h2>
        <Button variant="icon" aria-label="Add quest" onClick={() => setModalQuestId('new')}>
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <QuickAddCarousel presets={quickPresets} onInstantAdd={handleInstantAdd} />

      <button
        onClick={() => setShowAll(!showAll)}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-4"
      >
        {showAll ? 'Show active for date' : 'Show all active quests'}
      </button>

      {showAll ? (
        <AllQuestsList
          quests={allActiveQuests}
          selectedDate={selectedDate}
          completions={completions}
          onToggleCompletion={toggleCompletion}
          onDelete={deleteQuest}
          onEdit={(id) => setModalQuestId(id)}
          onJumpToDate={setSelectedDate}
        />
      ) : (
        <QuestList
          quests={activeQuests}
          selectedDate={selectedDate}
          completions={completions}
          onToggleCompletion={toggleCompletion}
          onToggleSubQuest={toggleSubQuest}
          onDelete={deleteQuest}
          onEdit={(id) => setModalQuestId(id)}
        />
      )}

      <QuickPresetManager
        presets={quickPresets}
        onAdd={addQuickPreset}
        onDelete={deleteQuickPreset}
      />

      {modalQuestId && (
        <QuestCreateModal
          questId={modalQuestId === 'new' ? null : modalQuestId}
          onClose={() => setModalQuestId(null)}
        />
      )}
    </div>
  )
}
