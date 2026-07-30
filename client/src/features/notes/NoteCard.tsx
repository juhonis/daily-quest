import type { Note } from '../../types'
import { X } from 'lucide-react'

interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (noteId: string) => void
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  return (
    <div
      onClick={() => onEdit(note)}
      className="group relative rounded-lg p-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{ backgroundColor: note.color }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(note.id)
        }}
        className="absolute top-2 right-2 z-10 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 hover:bg-black/40"
        aria-label="Delete note"
      >
        <X className="w-3.5 h-3.5 text-white" />
      </button>

      <h3 className="font-semibold text-sm text-white pr-6 mb-1.5 truncate">
        {note.title}
      </h3>

      <p className="text-xs text-white/70 line-clamp-6 whitespace-pre-wrap leading-relaxed">
        {note.content}
      </p>
    </div>
  )
}
