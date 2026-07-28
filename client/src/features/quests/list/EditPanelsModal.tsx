import { useState, useEffect, useRef } from 'react'
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

const MERGE_ORDER: PanelId[] = ['daily', 'repeating', 'important', 'rollover', 'done']

function SortableItem({ id, checked, onToggle }: { id: PanelId; checked: boolean; onToggle: () => void }) {
  const mergedPanels = useStore((s) => s.mergedPanels)
  const mergePanel = useStore((s) => s.mergePanel)
  const unmergePanel = useStore((s) => s.unmergePanel)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showPicker) return
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const mergedInto = mergedPanels[id]
  const mergeTargets = MERGE_ORDER.filter(
    (p) => p !== id && !(p in mergedPanels),
  )
  const mergedIntoLabels = Object.entries(mergedPanels)
    .filter(([, target]) => target === id)
    .map(([source]) => PANEL_LABELS[source as PanelId])

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
      <span className="text-sm text-slate-200 flex-1">{PANEL_LABELS[id]}</span>

      {mergedIntoLabels.length > 0 && (
        <span className="text-[10px] text-slate-500">
          +{mergedIntoLabels.join(', ')}
        </span>
      )}

      {mergedInto ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500">
            → {PANEL_LABELS[mergedInto]}
          </span>
          <button
            onClick={() => unmergePanel(id)}
            className="p-0.5 text-slate-500 hover:text-red-400 transition-colors"
            aria-label={`Unmerge ${PANEL_LABELS[id]}`}
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker((o) => !o)}
            className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label={`Merge ${PANEL_LABELS[id]}`}
          >
            +
          </button>
          {showPicker && mergeTargets.length > 0 && (
            <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-slate-600 bg-slate-800 shadow-xl py-1 min-w-[140px]">
              {mergeTargets.map((target) => (
                <button
                  key={target}
                  onClick={() => {
                    mergePanel(id, target)
                    setShowPicker(false)
                  }}
                  className="w-full text-left px-3 py-1 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  {PANEL_LABELS[target]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function EditPanelsModal({ onClose }: EditPanelsModalProps) {
  const panelOrder = useStore((s) => s.panelOrder)
  const hiddenPanels = useStore((s) => s.hiddenPanels)
  const mergedPanels = useStore((s) => s.mergedPanels)
  const setPanelOrder = useStore((s) => s.setPanelOrder)
  const togglePanelHidden = useStore((s) => s.togglePanelHidden)
  const tagPanels = useStore((s) => s.tagPanels)
  const removeTagPanel = useStore((s) => s.removeTagPanel)
  const tagColors = useStore((s) => s.tagColors)

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

  const hasMerges = Object.keys(mergedPanels).length > 0

  return (
    <Modal isOpen onClose={onClose} title="Edit panels">
      <p className="text-xs text-slate-500 mb-4">
        Drag to reorder. Toggle to show/hide. Press + to merge a panel into another.
      </p>
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

      {hasMerges && (
        <p className="text-[10px] text-slate-600 mt-3">
          Merged panels' quests appear inside the panel they are merged into.
        </p>
      )}

      {tagPanels.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Custom tag panels
          </h4>
          <div className="space-y-2">
            {tagPanels.map((tag) => {
              const color = tagColors[tag] ?? '#3B82F6'
              return (
                <div
                  key={tag}
                  className="flex items-center gap-3 rounded-lg bg-slate-700 px-3 py-2"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-slate-200 flex-1">{tag}</span>
                  <button
                    onClick={() => removeTagPanel(tag)}
                    className="p-0.5 text-slate-500 hover:text-red-400 transition-colors"
                    aria-label={`Remove ${tag} panel`}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}
