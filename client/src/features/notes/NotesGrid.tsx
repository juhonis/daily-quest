import { useState } from 'react'
import { Plus, StickyNote } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { NoteCard } from './NoteCard'
import { NoteCreateModal } from './NoteCreateModal'
import type { Note } from '../../types'

export function NotesGrid() {
  const notes = useStore((s) => s.notes)
  const addNote = useStore((s) => s.addNote)
  const updateNote = useStore((s) => s.updateNote)
  const deleteNote = useStore((s) => s.deleteNote)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  function handleSave(note: Note) {
    const exists = notes.some((n) => n.id === note.id)
    if (exists) {
      updateNote(note.id, note)
    } else {
      addNote(note)
    }
    setEditingNote(null)
  }

  function handleEdit(note: Note) {
    setEditingNote(note)
    setModalOpen(true)
  }

  function handleCreate() {
    setEditingNote(null)
    setModalOpen(true)
  }

  return (
    <div className="h-full flex flex-col">
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 auto-rows-min">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
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

      <NoteCreateModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingNote(null)
        }}
        onSave={handleSave}
        initialData={editingNote ?? undefined}
      />
    </div>
  )
}
