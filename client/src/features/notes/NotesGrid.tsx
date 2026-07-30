import { useState, useMemo } from 'react'
import { Plus, StickyNote } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { NoteCard } from './NoteCard'
import { NoteViewModal } from './NoteViewModal'
import { NoteCreateModal } from './NoteCreateModal'
import type { Note } from '../../types'

export function NotesGrid() {
  const notes = useStore((s) => s.notes)
  const noteTagColors = useStore((s) => s.noteTagColors)
  const filterNoteTags = useStore((s) => s.filterNoteTags)
  const setFilterNoteTags = useStore((s) => s.setFilterNoteTags)
  const addNote = useStore((s) => s.addNote)
  const updateNote = useStore((s) => s.updateNote)
  const deleteNote = useStore((s) => s.deleteNote)

  const [viewingNote, setViewingNote] = useState<Note | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [sortNewest, setSortNewest] = useState(true)

  const allNoteTags = useMemo(() => {
    const set = new Set<string>()
    Object.keys(noteTagColors).forEach((t) => set.add(t))
    notes.forEach((n) => n.tags?.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [notes, noteTagColors])

  const filteredNotes = useMemo(() => {
    const filtered = filterNoteTags.length === 0
      ? [...notes]
      : notes.filter((n) => n.tags?.some((t) => filterNoteTags.includes(t)))
    filtered.sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt)
      return sortNewest ? -cmp : cmp
    })
    return filtered
  }, [notes, filterNoteTags, sortNewest])

  function handleSave(note: Note) {
    const exists = notes.some((n) => n.id === note.id)
    if (exists) {
      updateNote(note.id, note)
    } else {
      addNote(note)
    }
    setEditingNote(null)
  }

  function handleView(note: Note) {
    setViewingNote(note)
  }

  function handleEditFromView(note: Note) {
    setViewingNote(null)
    setEditingNote(note)
    setFormKey((k) => k + 1)
    setEditModalOpen(true)
  }

  function handleCreate() {
    setEditingNote(null)
    setFormKey((k) => k + 1)
    setEditModalOpen(true)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSortNewest(true)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              sortNewest ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortNewest(false)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              !sortNewest ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Oldest
          </button>
        </div>
        {allNoteTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterNoteTags([])}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              filterNoteTags.length === 0
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            All
          </button>
          {allNoteTags.map((tag) => {
            const color = noteTagColors[tag] ?? '#3B82F6'
            return (
              <button
                key={tag}
                onClick={() => {
                  setFilterNoteTags(
                    filterNoteTags.includes(tag)
                      ? filterNoteTags.filter((t) => t !== tag)
                      : [...filterNoteTags, tag],
                  )
                }}
                className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                  filterNoteTags.includes(tag) ? 'text-white border-transparent' : 'hover:brightness-125'
                }`}
                style={filterNoteTags.includes(tag) ? { backgroundColor: color } : { borderColor: color, color }}
              >
                {tag}
              </button>
            )
          })}
        </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <StickyNote className="w-12 h-12" />
            <p className="text-sm">No notes yet</p>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first note
            </button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <StickyNote className="w-12 h-12" />
            <p className="text-sm">No notes match the selected tags</p>
            <button
              onClick={() => setFilterNoteTags([])}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 auto-rows-min">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onView={handleView}
                onDelete={deleteNote}
              />
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <button
            onClick={handleCreate}
            className="absolute bottom-6 right-6 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-colors"
            aria-label="Create note"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {viewingNote && (
        <NoteViewModal
          note={viewingNote}
          onClose={() => setViewingNote(null)}
          onEdit={handleEditFromView}
        />
      )}

      <NoteCreateModal
        key={`${editingNote?.id ?? 'new'}-${formKey}`}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditingNote(null)
        }}
        onSave={handleSave}
        initialData={editingNote ?? undefined}
      />
    </div>
  )
}
