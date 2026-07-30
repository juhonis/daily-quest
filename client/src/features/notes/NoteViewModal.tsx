import type { Note } from '../../types'
import { useStore } from '../../store/useStore'

interface NoteViewModalProps {
  note: Note
  onClose: () => void
  onEdit: (note: Note) => void
}

export function NoteViewModal({ note, onClose, onEdit }: NoteViewModalProps) {
  const noteTagColors = useStore((s) => s.noteTagColors)

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={note.title}
          className="w-full max-w-lg rounded-xl bg-slate-800 shadow-xl outline-none overflow-hidden mx-4"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3" style={{ backgroundColor: note.color }}>
            <h2 className="text-lg font-semibold text-white pr-4 break-words">{note.title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-full p-1 bg-black/20 hover:bg-black/40 transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 pt-3 pb-1">
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {note.tags.map((tag) => {
                  const color = noteTagColors[tag] ?? '#3B82F6'
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${color}33`, color }}
                    >
                      {tag}
                    </span>
                  )
                })}
              </div>
            )}

            <div className="max-h-80 overflow-y-auto -mx-6 px-6">
              {note.content ? (
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              ) : (
                <p className="text-sm text-slate-500 italic">No content</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-700">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => onEdit(note)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
