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

function SortablePanel({
  id,
  quests,
  ...rest
}: { id: PanelId; quests: Quest[] } & Omit<QuestsPanelsRowProps, 'quests'>) {
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
        dragHandleProps={dragHandleProps}
        onHide={() => togglePanelHidden(id)}
      />
    </div>
  )
}

export function QuestsPanelsRow(props: QuestsPanelsRowProps) {
  const panelOrder = useStore((s) => s.panelOrder)
  const hiddenPanels = useStore((s) => s.hiddenPanels)
  const setPanelOrder = useStore((s) => s.setPanelOrder)

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

  const visiblePanels = panelOrder.filter((id) => !hiddenPanels.includes(id))

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={visiblePanels} strategy={rectSortingStrategy}>
        <div className="flex flex-row gap-3 h-full items-stretch min-w-0">
          {visiblePanels.map((id) => (
            <SortablePanel
              key={id}
              id={id}
              {...props}
              quests={questMap[id]}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
