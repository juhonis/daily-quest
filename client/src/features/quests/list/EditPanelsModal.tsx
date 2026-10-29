import { useId, useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { usePanelSensors } from '../../../hooks/usePanelSensors'
import { useStore } from '../../../store/useStore'
import type { PanelId } from '../../../types'

const labels: Record<PanelId, string> = {
  daily: 'Daily', repeating: 'Repeating', important: 'Planned', rollover: 'Carried forward', done: 'Done',
}
const panelIds: PanelId[] = ['daily', 'repeating', 'important', 'rollover', 'done']

function SortableItem({ id, index, count, onMove }: { id: PanelId; index: number; count: number; onMove: (id: PanelId, offset: number) => void }) {
  const checkboxId = useId()
  const hidden = useStore((state) => state.hiddenPanels)
  const toggle = useStore((state) => state.togglePanelHidden)
  const merged = useStore((state) => state.mergedPanels)
  const merge = useStore((state) => state.mergePanel)
  const unmerge = useStore((state) => state.unmergePanel)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const mergedInto = merged[id]
  const included = Object.entries(merged).filter(([, target]) => target === id).map(([source]) => labels[source as PanelId])
  const targets = panelIds.filter((target) => target !== id && !(target in merged))

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className="rounded-xl border border-slate-800 bg-slate-950/25 p-3">
      <div className="flex min-w-0 items-center gap-1">
        <button ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Reorder ${labels[id]}`} style={{ touchAction: 'manipulation' }} className="inline-flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 active:cursor-grabbing"><GripVertical className="h-5 w-5" /></button>
        <label htmlFor={checkboxId} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-2"><input id={checkboxId} type="checkbox" checked={!hidden.includes(id)} onChange={() => toggle(id)} className="h-4 w-4 shrink-0 accent-blue-500" /><span className="min-w-0 break-words text-sm text-slate-200">{labels[id]}</span></label>
        <Button type="button" variant="icon" aria-label={`Move ${labels[id]} up`} disabled={index === 0} onClick={() => onMove(id, -1)}><ArrowUp className="h-4 w-4" /></Button>
        <Button type="button" variant="icon" aria-label={`Move ${labels[id]} down`} disabled={index === count - 1} onClick={() => onMove(id, 1)}><ArrowDown className="h-4 w-4" /></Button>
      </div>
      {included.length > 0 && <p className="mt-2 text-xs text-slate-500">Includes {included.join(', ')}. Unmerge included sections before merging this section elsewhere.</p>}
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 border-t border-slate-800 pt-2">
        {mergedInto ? <><span className="min-w-0 flex-1 text-xs text-slate-400">Merged into {labels[mergedInto]}</span><Button type="button" variant="ghost" onClick={() => unmerge(id)} aria-label={`Unmerge ${labels[id]}`}>Unmerge</Button></>
          : <select aria-label={`Merge ${labels[id]} into`} disabled={included.length > 0 || targets.length === 0} value="" onChange={(event) => { if (event.target.value) merge(id, event.target.value as PanelId) }} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-400 disabled:opacity-40"><option value="">Keep as a separate section</option>{targets.map((target) => <option key={target} value={target}>Merge into {labels[target]}</option>)}</select>}
      </div>
    </div>
  )
}

export function EditPanelsModal({ onClose }: { onClose: () => void }) {
  const order = useStore((state) => state.panelOrder)
  const setOrder = useStore((state) => state.setPanelOrder)
  const tagPanels = useStore((state) => state.tagPanels)
  const removeTagPanel = useStore((state) => state.removeTagPanel)
  const colors = useStore((state) => state.tagColors)
  const [announcement, setAnnouncement] = useState('')
  const sensors = usePanelSensors()

  function move(id: PanelId, to: number) {
    const from = order.indexOf(id)
    if (from < 0 || to < 0 || to >= order.length || from === to) return
    setOrder(arrayMove(order, from, to))
    setAnnouncement(`${labels[id]} moved to position ${to + 1} of ${order.length}.`)
  }
  function dragEnd({ active, over }: DragEndEvent) {
    if (over) move(active.id as PanelId, order.indexOf(over.id as PanelId))
  }

  return (
    <Modal isOpen onClose={onClose} title="Edit panels">
      <p className="mb-4 text-sm leading-relaxed text-slate-400">Use the arrows to reorder, or hold a drag handle briefly before moving it. Scroll from the rest of the row. Toggle a section to show or hide it.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">{order.map((id, index) => <SortableItem key={id} id={id} index={index} count={order.length} onMove={(item, offset) => move(item, order.indexOf(item) + offset)} />)}</div>
        </SortableContext>
      </DndContext>
      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
      {tagPanels.length > 0 && <section className="mt-6 space-y-2"><h3 className="text-sm font-medium text-slate-300">Tag sections</h3>{tagPanels.map((tag) => <div key={tag} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-800 p-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: Object.hasOwn(colors, tag) ? colors[tag] : '#3B82F6' }} /><span className="min-w-0 flex-1 break-all text-sm text-slate-300">{tag}</span><Button type="button" variant="icon" aria-label={`Remove ${tag} panel`} onClick={() => removeTagPanel(tag)}><X className="h-4 w-4" /></Button></div>)}</section>}
    </Modal>
  )
}
