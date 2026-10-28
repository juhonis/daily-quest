import { useMemo } from 'react'
import type { Note } from '../../types'
import { Archive, RotateCcw } from 'lucide-react'

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '• ')
    .replace(/^>\s+/gm, '')
    .replace(/\|/g, ' ')
    .split('\n').filter(l => l.trim()).join('\n')
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
    <article
      className={`group relative rounded-xl p-4 ${
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
        className="absolute top-2 right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-black/20 transition-colors hover:bg-black/40"
        aria-label={note.archivedAt ? 'Unarchive note' : 'Archive note'}
      >
        {note.archivedAt ? (
          <RotateCcw className="w-3.5 h-3.5 text-white" />
        ) : (
          <Archive className="w-3.5 h-3.5 text-white" />
        )}
      </button>

      <button type="button" onClick={() => onView(note)} aria-label={`Read note: ${note.title}`} className="block min-h-24 w-full rounded-lg text-left">
      <h3 className="font-semibold text-base text-white pr-12 mb-2 break-words">
        {note.title}
      </h3>

      <p className="text-xs text-white/70 line-clamp-6 whitespace-pre-wrap leading-relaxed">
        {preview}
      </p>
      </button>
    </article>
  )
}
