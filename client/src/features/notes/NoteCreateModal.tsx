import { useState, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { X, Bold, Italic, List, ListOrdered, Code, Quote, Heading2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { useStore } from '../../store/useStore'
import { assignNoteTagColor, getNoteTagStyle } from './noteTagColors'
import type { Note } from '../../types'

interface FormatResult {
  text: string
  newStart: number
  newEnd: number
}

interface FormatButtonProps {
  label: string
  onClick: () => void
  children: ReactNode
}

function applyInlineFormat(
  content: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string,
  placeholder: string,
): FormatResult {
  const selected = content.slice(start, end)
  const inner = selected.trim() === '' ? placeholder : selected
  const text = content.slice(0, start) + prefix + inner + suffix + content.slice(end)
  return { text, newStart: start + prefix.length, newEnd: start + prefix.length + inner.length }
}

function applyBlockFormat(
  content: string,
  start: number,
  end: number,
  prefix: string,
  placeholder: string,
): FormatResult {
  const lineStart = content.lastIndexOf('\n', start - 1) + 1
  let lineEnd = content.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = content.length
  const raw = content.slice(lineStart, lineEnd)

  if (!raw.trim()) {
    const text = content.slice(0, lineStart) + prefix + placeholder + content.slice(lineEnd)
    return { text, newStart: lineStart + prefix.length, newEnd: lineStart + prefix.length + placeholder.length }
  }

  const ordered = /^\d/.test(prefix)
  const lines = raw.split('\n')
  const nonEmpty = lines.filter((l) => l.trim() !== '')
  const allPrefixed = nonEmpty.every((l) =>
    ordered ? /^(\d+\.\s|-\s)/.test(l) : l.startsWith(prefix),
  )

  const newLines = allPrefixed
    ? lines.map((l) =>
        ordered ? l.replace(/^(\d+\.\s|-\s)/, '') : l.startsWith(prefix) ? l.slice(prefix.length) : l,
      )
    : lines.map((l) => (l.trim() === '' ? l : prefix + l))

  const newBlock = newLines.join('\n')
  const text = content.slice(0, lineStart) + newBlock + content.slice(lineEnd)
  return { text, newStart: lineStart, newEnd: lineStart + newBlock.length }
}

function FormatButton({ label, onClick, children }: FormatButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-600 bg-slate-700 text-slate-300 transition-colors hover:bg-slate-600 hover:text-white"
    >
      {children}
    </button>
  )
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  function applyFormat(result: FormatResult) {
    const ta = textareaRef.current
    setContent(result.text)
    requestAnimationFrame(() => {
      if (ta) {
        ta.focus()
        ta.setSelectionRange(result.newStart, result.newEnd)
      }
    })
  }

  function handleInline(prefix: string, suffix: string, placeholder: string) {
    const ta = textareaRef.current
    if (!ta) return
    applyFormat(applyInlineFormat(content, ta.selectionStart, ta.selectionEnd, prefix, suffix, placeholder))
  }

  function handleBlock(prefix: string, placeholder: string) {
    const ta = textareaRef.current
    if (!ta) return
    applyFormat(applyBlockFormat(content, ta.selectionStart, ta.selectionEnd, prefix, placeholder))
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
          <div className="flex flex-wrap gap-1 mb-1.5">
            <FormatButton label="Bold" onClick={() => handleInline('**', '**', 'bold text')}>
              <Bold className="w-3.5 h-3.5" />
            </FormatButton>
            <FormatButton label="Italic" onClick={() => handleInline('*', '*', 'italic text')}>
              <Italic className="w-3.5 h-3.5" />
            </FormatButton>
            <FormatButton label="Bullet list" onClick={() => handleBlock('- ', 'List item')}>
              <List className="w-3.5 h-3.5" />
            </FormatButton>
            <FormatButton label="Numbered list" onClick={() => handleBlock('1. ', 'List item')}>
              <ListOrdered className="w-3.5 h-3.5" />
            </FormatButton>
            <FormatButton label="Quote" onClick={() => handleBlock('> ', 'Quote')}>
              <Quote className="w-3.5 h-3.5" />
            </FormatButton>
            <FormatButton label="Heading" onClick={() => handleBlock('## ', 'Heading')}>
              <Heading2 className="w-3.5 h-3.5" />
            </FormatButton>
            <FormatButton label="Code" onClick={() => handleInline('`', '`', 'code')}>
              <Code className="w-3.5 h-3.5" />
            </FormatButton>
          </div>
          <textarea
            ref={textareaRef}
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
