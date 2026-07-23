import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal } from '../../../components/ui/Modal'
import { useStore } from '../../../store/useStore'
import type { PanelId } from '../../../types'

interface EditPanelsModalProps {
  onClose: () => void
}

const PANEL_LABELS: Record<PanelId, string> = {
  daily: 'Daily',
  repeating: 'Repeating',
  important: 'Important today',
  rollover: 'Rollover',
  done: 'Done',
}

function SortableItem({ id, checked, onToggle }: { id: PanelId; checked: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg bg-slate-700 px-3 py-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 accent-blue-600"
      />
      <span className="text-sm text-slate-200">{PANEL_LABELS[id]}</span>
    </div>
  )
}

export function EditPanelsModal({ onClose }: EditPanelsModalProps) {
  const panelOrder = useStore((s) => s.panelOrder)
  const hiddenPanels = useStore((s) => s.hiddenPanels)
  const setPanelOrder = useStore((s) => s.setPanelOrder)
  const togglePanelHidden = useStore((s) => s.togglePanelHidden)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
    <Modal isOpen onClose={onClose} title="Edit panels">
      <p className="text-xs text-slate-500 mb-4">Drag to reorder. Toggle to show/hide.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={panelOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {panelOrder.map((id) => (
              <SortableItem
                key={id}
                id={id}
                checked={!hiddenPanels.includes(id)}
                onToggle={() => togglePanelHidden(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Modal>
  )
}
