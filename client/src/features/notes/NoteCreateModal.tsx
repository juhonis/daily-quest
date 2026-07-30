import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { useStore } from '../../store/useStore'
import { assignNoteTagColor, getNoteTagStyle } from './noteTagColors'
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
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  const noteTagColors = useStore((s) => s.noteTagColors)
  const setNoteTagColor = useStore((s) => s.setNoteTagColor)

  const allNoteTags = useMemo(() => {
    const set = new Set<string>()
    Object.keys(noteTagColors).forEach((t) => set.add(t))
    return [...set].sort()
  }, [noteTagColors])

  const suggestions = tagInput.trim()
    ? allNoteTags.filter((t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t))
    : []

  function ensureColor(tag: string) {
    if (!noteTagColors[tag]) {
      setNoteTagColor(tag, assignNoteTagColor(tag, noteTagColors))
    }
  }

  function addTag(raw: string) {
    const trimmed = raw.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      ensureColor(trimmed)
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleSave() {
    if (!title.trim()) return
    const now = new Date().toISOString()
    onSave({
      id: initialData?.id ?? crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
      color,
      tags: tags.length > 0 ? tags : undefined,
      createdAt: initialData?.createdAt ?? now,
      updatedAt: now,
    })
    if (!initialData) {
      setTitle('')
      setContent('')
      setColor(NOTE_COLORS[0].value)
      setTags([])
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
          <label className="block text-sm font-medium text-slate-300 mb-1">Tags</label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => {
                const color = noteTagColors[tag] ?? '#3B82F6'
                return (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
                    style={getNoteTagStyle(color)}
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="opacity-70 hover:opacity-100" style={{ color }}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
              placeholder="Add a tag..."
              className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => addTag(tagInput)}
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 transition-colors"
            >
              Add
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {suggestions.map((s) => {
                const color = noteTagColors[s] ?? '#3B82F6'
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { addTag(s) }}
                    className="text-xs transition-colors hover:opacity-80"
                    style={{ color }}
                  >
                    + {s}
                  </button>
                )
              })}
            </div>
          )}
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
