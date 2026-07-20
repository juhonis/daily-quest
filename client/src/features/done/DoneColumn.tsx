import { useStore } from '../../store/useStore'
import { formatForDisplay, getActiveQuestsForDate, getFinishedQuestsForDate } from '../../utils/dateUtils'
import { QuestCard } from '../quests/QuestCard'

export function DoneColumn() {
  const quests = useStore((s) => s.quests)
  const completions = useStore((s) => s.completions)
  const selectedDate = useStore((s) => s.selectedDate)
  const toggleCompletion = useStore((s) => s.toggleCompletion)

  const activeQuests = getActiveQuestsForDate(quests, selectedDate, completions)
  const finishedQuests = getFinishedQuestsForDate(quests, selectedDate, completions)

  return (
    <div className="p-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Done for {formatForDisplay(selectedDate)}
      </h2>
      {finishedQuests.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">
          Nothing done yet.
        </p>
      )}
      {finishedQuests.length > 0 && (
        <div className="space-y-2">
          {finishedQuests.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              selectedDate={selectedDate}
              completions={completions}
              onToggleCompletion={toggleCompletion}
              onToggleSubQuest={() => {}}
              onDelete={() => {}}
              onEdit={() => {}}
              isDone
            />
          ))}
        </div>
      )}
      {activeQuests.length === 0 && finishedQuests.length > 0 && (
        <p className="text-xs text-slate-600 text-center mt-4">
          All quests done for this date.
        </p>
      )}
    </div>
  )
}
