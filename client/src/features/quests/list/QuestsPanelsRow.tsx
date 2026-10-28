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
  important: 'Planned',
  rollover: 'Carried forward',
  done: 'Done',
}

interface QuestsPanelsRowProps {
  layout?: 'list' | 'board'
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
  layout,
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
    <div ref={setNodeRef} style={style} className="min-w-0">
      <Panel
        quests={quests}
        {...rest}
        labelOverride={labelOverride}
        dragHandleProps={layout === 'board' ? dragHandleProps : undefined}
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
  const tagColors = useStore((s) => s.tagColors)
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
  const emptyPanels = props.layout !== 'board' ? visiblePanels.filter((id) => mergedQuestMap[id].length === 0) : []
  const displayedPanels = visiblePanels.filter((id) => !emptyPanels.includes(id))

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
    <div className={`grid min-w-0 items-start gap-4 ${props.layout === 'board' ? 'sm:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]' : 'grid-cols-1'}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visiblePanels} strategy={rectSortingStrategy}>
          {displayedPanels.map((id) => {
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
        <div key={tag} className="min-w-0">
          <TagPanel
            tag={tag}
            questList={allQuests}
            color={tagColors[tag] ?? '#3B82F6'}
            {...props}
          />
        </div>
      ))}
      {emptyPanels.length > 0 && <details className="col-span-full rounded-xl border border-dashed border-slate-800 px-4 py-1">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-slate-500">{emptyPanels.length} empty {emptyPanels.length === 1 ? 'section' : 'sections'}</summary>
        <div className="space-y-3 pb-3">{emptyPanels.map((id) => {
          const Panel = PANEL_MAP[id]
          return <Panel key={id} {...props} quests={[]} />
        })}</div>
      </details>}
      {visiblePanels.length === 0 && tagPanels.length === 0 && <p className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">No sections are visible. Open Customize to show some.</p>}
    </div>
  )
}
