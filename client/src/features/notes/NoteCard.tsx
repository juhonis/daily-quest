import { useMemo } from 'react'
import { Archive, RotateCcw } from 'lucide-react'
import type { Note } from '../../types'
import { noteDate, noteExcerpt, noteTextColor, type NoteAppearance } from './noteUtils'

interface NoteCardProps {
  note: Note
  onView: (id: string) => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
  appearance: NoteAppearance
}

export function NoteCard({ note, onView, onArchive, onUnarchive, appearance }: NoteCardProps) {
  const preview = useMemo(() => noteExcerpt(note.content), [note.content])
  const colorful = appearance === 'colorful'
  return (
    <article className={`relative flex min-w-0 flex-col overflow-hidden rounded-xl border ${colorful ? 'border-transparent' : 'border-slate-800 bg-slate-900/50'}`}
      style={colorful ? { backgroundColor: note.color, color: noteTextColor(note.color) } : { borderTopColor: note.color, borderTopWidth: 3 }}>
      <button type="button" onClick={() => onView(note.id)} aria-label={`Read note: ${note.title}`} className="flex min-h-40 w-full min-w-0 flex-1 flex-col items-stretch justify-start p-4 text-left hover:bg-white/[.025]">
        <span className={`mb-2 block break-words pr-10 text-base font-semibold ${colorful ? '' : 'text-slate-200'}`}>{note.title}</span>
        <span className={`block whitespace-pre-wrap break-words text-sm leading-relaxed line-clamp-4 ${colorful ? '' : 'text-slate-400'}`}>{preview || 'No content yet'}</span>
      </button>
      <button type="button" onClick={() => note.archivedAt ? onUnarchive(note.id) : onArchive(note.id)}
        className={`absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-lg ${colorful ? 'bg-black/5 hover:bg-black/10' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`}
        aria-label={`${note.archivedAt ? 'Restore note' : 'Archive note'}: ${note.title}`}>
        {note.archivedAt ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
      </button>
      <div className="space-y-2 px-4 pb-4">
        {!!note.tags?.length && <div className="flex flex-wrap gap-1.5">{note.tags.slice(0, 2).map((tag) => <span key={tag} className={`max-w-full break-all rounded-md px-2 py-1 text-xs ${colorful ? 'bg-black/5' : 'bg-slate-800/60 text-slate-400'}`}>{tag}</span>)}{note.tags.length > 2 && <span className={`py-1 text-xs ${colorful ? '' : 'text-slate-500'}`}>+{note.tags.length - 2}</span>}</div>}
        <p className={`text-xs ${colorful ? '' : 'text-slate-500'}`}>{note.archivedAt ? 'Archived · ' : 'Updated · '}<time dateTime={note.updatedAt}>{noteDate(note.updatedAt)}</time></p>
      </div>
    </article>
  )
}
