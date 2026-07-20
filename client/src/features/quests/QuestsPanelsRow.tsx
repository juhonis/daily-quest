import type { Quest, CompletionRecord, PanelId } from '../../types'
import { useStore } from '../../store/useStore'
import {
  groupQuestsByActivityReason,
  getFinishedQuestsForDate,
} from '../../utils/dateUtils'
import { DailyQuestsPanel } from './panels/DailyQuestsPanel'
import { RepeatingQuestsPanel } from './panels/RepeatingQuestsPanel'
import { ImportantQuestsPanel } from './panels/ImportantQuestsPanel'
import { RolloverQuestsPanel } from './panels/RolloverQuestsPanel'
import { DoneQuestsPanel } from './panels/DoneQuestsPanel'

const PANEL_MAP: Record<PanelId, typeof DailyQuestsPanel> = {
  daily: DailyQuestsPanel,
  repeating: RepeatingQuestsPanel,
  important: ImportantQuestsPanel,
  rollover: RolloverQuestsPanel,
  done: DoneQuestsPanel,
}

interface QuestsPanelsRowProps {
  quests: Quest[]
  completions: CompletionRecord[]
  selectedDate: string
  onToggleCompletion: (questId: string, date: string) => void
  onToggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
}

export function QuestsPanelsRow(props: QuestsPanelsRowProps) {
  const panelOrder = useStore((s) => s.panelOrder)
  const hiddenPanels = useStore((s) => s.hiddenPanels)

  const groups = groupQuestsByActivityReason(props.quests, props.selectedDate, props.completions)
  const finished = getFinishedQuestsForDate(props.quests, props.selectedDate, props.completions)

  const questMap: Record<PanelId, Quest[]> = {
    daily: groups.repeating.filter((q) => q.repeat === 'daily'),
    repeating: groups.repeating.filter((q) => q.repeat !== 'daily'),
    important: groups.todays,
    rollover: groups.rollover,
    done: finished,
  }

  const visiblePanels = panelOrder.filter((id) => !hiddenPanels.includes(id))

  return (
    <div className="flex flex-row gap-3 overflow-x-auto items-stretch">
      {visiblePanels.map((id) => {
        const Panel = PANEL_MAP[id]
        const quests = questMap[id]
        return (
          <div key={id} className="flex-1 min-w-0">
            <Panel
              quests={quests}
              selectedDate={props.selectedDate}
              completions={props.completions}
              onToggleCompletion={props.onToggleCompletion}
              onToggleSubQuest={props.onToggleSubQuest}
              onDelete={props.onDelete}
              onEdit={props.onEdit}
            />
          </div>
        )
      })}
    </div>
  )
}
