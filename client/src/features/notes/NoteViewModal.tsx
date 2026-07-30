import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { Note } from '../../types'
import { useStore } from '../../store/useStore'

interface NoteViewModalProps {
  note: Note
  onClose: () => void
  onEdit: (note: Note) => void
  onArchive: (noteId: string) => void
  onUnarchive: (noteId: string) => void
  onDelete: (noteId: string) => void
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2 mt-4 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-white mb-1.5 mt-3 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-100 mb-1 mt-2 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-slate-200 mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="text-sm text-slate-200 mb-2 pl-5 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="text-sm text-slate-200 mb-2 pl-5 list-decimal space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-slate-200">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="rounded-lg bg-slate-900/80 p-3 mb-2 overflow-x-auto text-xs text-slate-200">{children}</pre>
  ),
  code: ({ children }) => (
    <code className="text-pink-300 bg-slate-900/60 px-1 rounded text-xs">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-slate-500 pl-3 mb-2 text-slate-400 text-sm italic">{children}</blockquote>
  ),
  hr: () => <hr className="border-slate-600 my-3" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-slate-600 px-2 py-1 text-left text-slate-200 font-medium text-xs">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-600 px-2 py-1 text-slate-300 text-xs">{children}</td>
  ),
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="text-slate-100">{children}</em>,
}

export function NoteViewModal({ note, onClose, onEdit, onArchive, onUnarchive, onDelete }: NoteViewModalProps) {
  const noteTagColors = useStore((s) => s.noteTagColors)

  return (
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
          <h2 className="text-lg font-semibold text-white pr-4 break-words">
            {note.title}
            {note.archivedAt && <span className="ml-2 text-xs font-normal text-white/60">(archived)</span>}
          </h2>
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
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {note.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No content</p>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-700">
          <div>
            {note.archivedAt ? (
              <button
                onClick={() => {
                  if (window.confirm('Delete this note permanently?')) {
                    onDelete(note.id)
                    onClose()
                  }
                }}
                className="rounded-lg px-3 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Delete permanently
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Close
            </button>
            {note.archivedAt ? (
              <button
                onClick={() => { onUnarchive(note.id); onClose() }}
                className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500 transition-colors"
              >
                Unarchive
              </button>
            ) : (
              <>
                <button
                  onClick={() => onEdit(note)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => { onArchive(note.id); onClose() }}
                  className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500 transition-colors"
                >
                  Archive
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
