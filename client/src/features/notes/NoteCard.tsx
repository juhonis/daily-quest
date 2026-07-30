import { useMemo } from 'react'
import type { Note } from '../../types'
import { Archive, RotateCcw } from 'lucide-react'

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/[-*]{3,}/g, '')
    .replace(/\|/g, '')
    .trim()
}

interface NoteCardProps {
  note: Note
  onView: (note: Note) => void
  onArchive: (noteId: string) => void
  onUnarchive?: (noteId: string) => void
}

export function NoteCard({ note, onView, onArchive, onUnarchive }: NoteCardProps) {
  const preview = useMemo(() => stripMarkdown(note.content || ''), [note.content])
  return (
    <div
      onClick={() => onView(note)}
      className={`group relative rounded-lg p-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${
        note.archivedAt ? 'opacity-60' : ''
      }`}
      style={{ backgroundColor: note.color }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (note.archivedAt) {
            onUnarchive?.(note.id)
          } else {
            onArchive(note.id)
          }
        }}
        className="absolute top-2 right-2 z-10 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 hover:bg-black/40"
        aria-label={note.archivedAt ? 'Unarchive note' : 'Archive note'}
      >
        {note.archivedAt ? (
          <RotateCcw className="w-3.5 h-3.5 text-white" />
        ) : (
          <Archive className="w-3.5 h-3.5 text-white" />
        )}
      </button>

      <h3 className="font-semibold text-sm text-white pr-6 mb-1.5 truncate">
        {note.title}
      </h3>

      <p className="text-xs text-white/70 line-clamp-6 whitespace-pre-wrap leading-relaxed">
        {preview}
      </p>
    </div>
  )
}
