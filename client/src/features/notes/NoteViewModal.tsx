import { useState } from 'react'
import type { Note } from '../../types'
import { useStore } from '../../store/useStore'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Archive, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { NoteMarkdown } from './NoteMarkdown'
import { noteDate } from './noteUtils'

export function NoteViewModal({ note, onClose, onEdit }: { note?: Note; onClose: () => void; onEdit: (note: Note) => void }) {
  const [error, setError] = useState('')
  if (!note) return <Modal isOpen onClose={onClose} title="Note unavailable"><p className="text-sm text-slate-400">This note is no longer available. It may have been removed in another tab.</p></Modal>

  function archive(restore: boolean) {
    if (!note) return
    try {
      if (restore) useStore.getState().unarchiveNote(note.id)
      else useStore.getState().archiveNote(note.id)
      onClose()
    } catch { setError('Could not save the archive change. Check browser storage and retry.') }
  }

  const footer = <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex flex-wrap gap-1">
      {note.archivedAt ? <>
        <Button variant="ghost" onClick={() => archive(true)}><RotateCcw className="h-4 w-4" />Restore</Button>
        <Button variant="ghost" className="text-red-400" onClick={() => {
          if (!window.confirm('Delete this note permanently?')) return
          try { useStore.getState().deleteNote(note.id); onClose() } catch { setError('Could not delete the note. Check browser storage and retry.') }
        }}><Trash2 className="h-4 w-4" />Delete</Button>
      </> : <Button variant="ghost" onClick={() => archive(false)}><Archive className="h-4 w-4" />Archive</Button>}
    </div>
    <div className="ml-auto flex gap-2"><Button variant="ghost" onClick={onClose}>Close</Button><Button onClick={() => onEdit(note)}><Pencil className="h-4 w-4" />Edit</Button></div>
  </div>

  return (
    <Modal isOpen onClose={onClose} title={note.title} className="note-dialog max-w-3xl" footer={footer}>
      <article className="mx-auto max-w-prose space-y-5">
        <div className="h-1 rounded-full" style={{ backgroundColor: note.color }} />
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span>Created {noteDate(note.createdAt)}</span><span>Updated {noteDate(note.updatedAt)}</span>{note.archivedAt && <span className="text-amber-300">Archived</span>}</div>
        {!!note.tags?.length && <div className="flex flex-wrap gap-2">{note.tags.map((tag) => <span key={tag} className="max-w-full break-all rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400">{tag}</span>)}</div>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {note.content ? <NoteMarkdown content={note.content} /> : <p className="py-8 text-sm text-slate-500">No content yet.</p>}
      </article>
    </Modal>
  )
}
