import { useId, useState } from 'react'
import type { Quest, CompletionRecord } from '../../../../types'
import { QuestCard } from '../QuestCard'
import { X, GripVertical, ChevronDown } from 'lucide-react'

interface BasePanelProps {
  quests: Quest[]
  selectedDate: string
  completions: CompletionRecord[]
  onToggleCompletion: (questId: string, date: string) => void
  onToggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
  label: string
  emptyHint: string
  isDone?: boolean
  dragHandleProps?: Record<string, unknown>
  onHide?: () => void
  labelOverride?: string
  titleExtra?: React.ReactNode
  containerStyle?: React.CSSProperties
}

export function BasePanel({ quests, selectedDate, completions, onToggleCompletion, onToggleSubQuest, onDelete, onEdit, label, emptyHint, isDone, dragHandleProps, onHide, labelOverride, titleExtra, containerStyle }: BasePanelProps) {
  const [collapsed, setCollapsed] = useState(isDone ?? false)
  const contentId = useId()
  const expanded = !collapsed && quests.length > 0
  return (
    <section aria-label={labelOverride ?? label} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/35 p-3" style={containerStyle}>
      <div className="flex flex-wrap items-center gap-1">
        {dragHandleProps && <button {...dragHandleProps} aria-label={`Reorder ${label}`} className="hidden min-h-11 min-w-11 touch-none items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 sm:inline-flex"><GripVertical className="h-4 w-4" /></button>}
        <h2 className="min-w-0 flex-1"><button type="button" onClick={() => setCollapsed(!collapsed)} disabled={quests.length === 0} aria-expanded={expanded} aria-controls={contentId} className="flex min-h-11 w-full min-w-0 items-center gap-2 text-left">
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          <span className="min-w-0 break-words text-sm font-medium text-slate-300">{labelOverride ?? label}</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{quests.length}</span>
        </button></h2>
        {titleExtra}
        {onHide && <button type="button" onClick={onHide} aria-label={`Hide ${label}`} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-red-400"><X className="h-4 w-4" /></button>}
      </div>
      {quests.length === 0 && <p className="pl-6 text-xs leading-relaxed text-slate-500">{emptyHint}</p>}
      <div id={contentId} hidden={!expanded} className="mt-2 space-y-2">
        {quests.map((q) => <QuestCard key={q.id} quest={q} selectedDate={selectedDate} completions={completions} onToggleCompletion={onToggleCompletion} onToggleSubQuest={onToggleSubQuest} onDelete={onDelete} onEdit={onEdit} isDone={isDone} />)}
      </div>
    </section>
  )
}
