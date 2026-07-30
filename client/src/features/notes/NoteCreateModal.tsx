import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import type { Note } from '../../types'

const NOTE_COLORS = [
  { label: 'Slate', value: '#64748B' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Emerald', value: '#10B981' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Violet', value: '#8B5CF6' },
]

interface NoteCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (note: Note) => void
  initialData?: Note
}

export function NoteCreateModal({ isOpen, onClose, onSave, initialData }: NoteCreateModalProps) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [color, setColor] = useState(initialData?.color ?? NOTE_COLORS[0].value)

  function handleSave() {
    if (!title.trim()) return
    const now = new Date().toISOString()
    onSave({
      id: initialData?.id ?? crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
      color,
      createdAt: initialData?.createdAt ?? now,
      updatedAt: now,
    })
    if (!initialData) {
      setTitle('')
      setContent('')
      setColor(NOTE_COLORS[0].value)
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Note' : 'New Note'}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write something..."
            rows={8}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
          <div className="flex gap-2">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`w-8 h-8 rounded-full transition-transform ${
                  color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
                aria-label={c.label}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initialData ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
