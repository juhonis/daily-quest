import { useState } from 'react'
import type { Quest, CompletionRecord } from '../../../types'
import { useStore } from '../../../store/useStore'
import { Checkbox } from '../../../components/ui/Checkbox'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { hasCompletionOnDate, repeatDescription } from '../../../utils/dateUtils'
import { ChevronDown, ChevronRight, ExternalLink, Pencil, Repeat, Trash2 } from 'lucide-react'

interface QuestCardProps {
  quest: Quest
  selectedDate: string
  completions: CompletionRecord[]
  onToggleCompletion: (questId: string, date: string) => void
  onToggleSubQuest: (questId: string, subQuestId: string, date: string) => void
  onDelete: (questId: string) => void
  onEdit: (questId: string) => void
  isDone?: boolean
  showCompletion?: boolean
}

export function QuestCard({ quest, selectedDate, completions, onToggleCompletion, onToggleSubQuest, onDelete, onEdit, isDone, showCompletion = true }: QuestCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [subquestsOpen, setSubquestsOpen] = useState(false)
  const tagColors = useStore((s) => s.tagColors)
  const isChecked = showCompletion && hasCompletionOnDate(completions, quest.id, selectedDate)
  const repeatInfo = repeatDescription(quest)
  const completedSubquests = quest.subQuests.filter((sq) => sq.isCompleted).length
  const firstColor = quest.tags?.[0] ? tagColors[quest.tags[0]] : undefined

  return (
    <>
      <article className={`min-w-0 rounded-lg border border-slate-800 px-2 py-1 ${isDone ? 'bg-slate-900/40' : 'bg-slate-900'}`} style={firstColor ? { borderLeftColor: firstColor, borderLeftWidth: 3 } : undefined}>
        <div className="flex min-w-0 items-start gap-1">
          {showCompletion && <Checkbox checked={isChecked} onChange={() => onToggleCompletion(quest.id, selectedDate)} label="" ariaLabel={`${isChecked ? 'Mark incomplete' : 'Complete'}: ${quest.title}`} />}
          <button type="button" onClick={() => setDetailsOpen(true)} aria-label={`View quest: ${quest.title}`} className="flex min-h-11 min-w-0 flex-1 items-start justify-between gap-3 rounded-lg px-2 py-3 text-left hover:bg-slate-800/50">
            <span className={`min-w-0 break-words text-sm font-medium ${isChecked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{quest.title}</span>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
          </button>
        </div>
        {quest.subQuests.length > 0 && showCompletion && <div className="pl-12">
          <button type="button" aria-expanded={subquestsOpen} onClick={() => setSubquestsOpen(!subquestsOpen)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-slate-400 hover:text-slate-200"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${subquestsOpen ? '' : '-rotate-90'}`} />{completedSubquests} of {quest.subQuests.length} steps</button>
          {subquestsOpen && <div className="mb-2 space-y-1 border-l border-slate-800 pl-2">{quest.subQuests.map((sq) => <Checkbox key={sq.id} checked={sq.isCompleted} onChange={() => onToggleSubQuest(quest.id, sq.id, selectedDate)} label={sq.title} />)}</div>}
        </div>}
      </article>
      {detailsOpen && <Modal isOpen onClose={() => setDetailsOpen(false)} title={quest.title}>
        <div className="space-y-5">
          {quest.description && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{quest.description}</p>}
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Scheduled</dt><dd className="text-right">{quest.targetDate || 'Not scheduled'}</dd></div>
            {repeatInfo && <div className="flex justify-between gap-4"><dt className="inline-flex items-center gap-2 text-slate-500"><Repeat className="h-4 w-4" />Repeat</dt><dd className="text-right">{repeatInfo}</dd></div>}
            {quest.rollover && <div><dt className="text-slate-500">Carry forward</dt><dd className="mt-1">Appears daily until completed.</dd></div>}
            {quest.archivedAt && <div><dt className="text-slate-500">Archived</dt><dd>{quest.archivedAt}</dd></div>}
          </dl>
          {!!quest.tags?.length && <div className="flex flex-wrap gap-2">{quest.tags.map((tag) => <span key={tag} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tagColors[tag] ?? '#3B82F6' }} />{tag}</span>)}</div>}
          {!showCompletion && quest.subQuests.length > 0 && <ul className="space-y-2 text-sm text-slate-400">{quest.subQuests.map((sq) => <li key={sq.id}>{sq.title}</li>)}</ul>}
          <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
            <Button onClick={() => { setDetailsOpen(false); onEdit(quest.id) }}><Pencil className="h-4 w-4" />Edit quest</Button>
            {quest.externalUrl && /^https?:\/\//.test(quest.externalUrl) && <a href={quest.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-blue-400 hover:bg-slate-800"><ExternalLink className="h-4 w-4" />Open link</a>}
            <Button variant="ghost" className="text-red-400" onClick={() => { if (window.confirm(`Delete "${quest.title}"?`)) { setDetailsOpen(false); onDelete(quest.id) } }}><Trash2 className="h-4 w-4" />Delete</Button>
          </div>
        </div>
      </Modal>}
    </>
  )
}
