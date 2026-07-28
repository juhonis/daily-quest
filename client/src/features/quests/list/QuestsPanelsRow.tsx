import {
  type DragEndEvent,
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Quest, CompletionRecord, PanelId } from '../../../types'
import { useStore } from '../../../store/useStore'
import {
  groupQuestsByActivityReason,
  getFinishedQuestsForDate,
} from '../../../utils/dateUtils'
import { DailyQuestsPanel } from './panels/DailyQuestsPanel'
import { RepeatingQuestsPanel } from './panels/RepeatingQuestsPanel'
import { ImportantQuestsPanel } from './panels/ImportantQuestsPanel'
import { RolloverQuestsPanel } from './panels/RolloverQuestsPanel'
import { DoneQuestsPanel } from './panels/DoneQuestsPanel'
import { TagPanel } from './panels/TagPanel'

const PANEL_MAP: Record<PanelId, typeof DailyQuestsPanel> = {
  daily: DailyQuestsPanel,
  repeating: RepeatingQuestsPanel,
  important: ImportantQuestsPanel,
  rollover: RolloverQuestsPanel,
  done: DoneQuestsPanel,
}

const PANEL_LABELS: Record<PanelId, string> = {
  daily: 'Daily',
  repeating: 'Repeating',
  important: 'Important today',
  rollover: 'Rollover',
  done: 'Done',
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

function SortablePanel({
  id,
  quests,
  labelOverride,
  ...rest
}: { id: PanelId; quests: Quest[]; labelOverride?: string } & Omit<QuestsPanelsRowProps, 'quests'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  const togglePanelHidden = useStore((s) => s.togglePanelHidden)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  const dragHandleProps = {
    ref: setActivatorNodeRef,
    ...listeners,
    ...attributes,
  }
  const Panel = PANEL_MAP[id]

  return (
    <div ref={setNodeRef} style={style} className="flex-1 min-w-0">
      <Panel
        quests={quests}
        {...rest}
        labelOverride={labelOverride}
        dragHandleProps={dragHandleProps}
        onHide={() => togglePanelHidden(id)}
      />
    </div>
  )
}

export function QuestsPanelsRow(props: QuestsPanelsRowProps) {
  const panelOrder = useStore((s) => s.panelOrder)
  const hiddenPanels = useStore((s) => s.hiddenPanels)
  const mergedPanels = useStore((s) => s.mergedPanels)
  const setPanelOrder = useStore((s) => s.setPanelOrder)
  const tagPanels = useStore((s) => s.tagPanels)
  const removeTagPanel = useStore((s) => s.removeTagPanel)
  const allQuests = useStore((s) => s.quests)

  const groups = groupQuestsByActivityReason(
    props.quests,
    props.selectedDate,
    props.completions,
  )
  const finished = getFinishedQuestsForDate(
    props.quests,
    props.selectedDate,
    props.completions,
  )

  const questMap: Record<PanelId, Quest[]> = {
    daily: [
      ...groups.repeating.filter((q) => q.repeat === 'daily'),
      ...groups.todays.filter((q) => q.repeat === 'daily' && !q.rollover),
    ],
    repeating: [
      ...groups.repeating.filter((q) => q.repeat !== 'daily'),
      ...groups.todays.filter((q) => q.repeat !== 'none' && q.repeat !== 'daily' && !q.rollover),
    ],
    important: groups.todays.filter((q) => q.rollover || q.repeat === 'none'),
    rollover: groups.rollover,
    done: finished,
  }

  const visiblePanels = panelOrder.filter((id) => !hiddenPanels.includes(id) && !(id in mergedPanels))

  const mergedQuestMap = { ...questMap }
  for (const [source, target] of Object.entries(mergedPanels)) {
    mergedQuestMap[target as PanelId] = [
      ...mergedQuestMap[target as PanelId],
      ...questMap[source as PanelId],
    ]
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = panelOrder.indexOf(active.id as PanelId)
      const newIndex = panelOrder.indexOf(over.id as PanelId)
      setPanelOrder(arrayMove(panelOrder, oldIndex, newIndex))
    }
  }

  return (
    <div className="flex flex-row gap-3 h-full items-stretch min-w-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visiblePanels} strategy={rectSortingStrategy}>
          {visiblePanels.map((id) => {
            const mergedSources = Object.entries(mergedPanels)
              .filter(([, target]) => target === id)
              .map(([source]) => PANEL_LABELS[source as PanelId])
            const labelOverride = mergedSources.length > 0
              ? `${PANEL_LABELS[id]} + ${mergedSources.join(', ')}`
              : undefined
            return (
              <SortablePanel
                key={id}
                id={id}
                {...props}
                quests={mergedQuestMap[id]}
                labelOverride={labelOverride}
              />
            )
          })}
        </SortableContext>
      </DndContext>
      {tagPanels.map((tag) => (
        <div key={tag} className="flex-1 min-w-0">
          <TagPanel
            tag={tag}
            quests={allQuests}
            {...props}
            onHide={() => removeTagPanel(tag)}
          />
        </div>
      ))}
    </div>
  )
}
