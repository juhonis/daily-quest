import { useState, useMemo, useImperativeHandle, type Ref } from 'react'
import { Archive, Palette, Plus, Search, SlidersHorizontal, StickyNote, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Button } from '../../components/ui/Button'
import { NoteCard } from './NoteCard'
import { NoteViewModal } from './NoteViewModal'
import { NoteEditor } from './NoteEditor'
import { filterNotes, type NoteAppearance, type NoteSort } from './noteUtils'
import { assignNoteTagColor } from './noteTagColors'
import type { Note } from '../../types'

export interface NotesGridHandle { createNote: () => void }
const appearanceKey = 'daily-quest-notes-appearance'

export function NotesGrid({ ref, showCreateButton = true }: { ref?: Ref<NotesGridHandle>; showCreateButton?: boolean }) {
  const notes = useStore((state) => state.notes)
  const tagColors = useStore((state) => state.noteTagColors)
  const filterTags = useStore((state) => state.filterNoteTags)
  const setFilterTags = useStore((state) => state.setFilterNoteTags)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editor, setEditor] = useState<{ id?: string; original?: Note; key: number } | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<NoteSort>('updated')
  const [archived, setArchived] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [error, setError] = useState('')
  const [appearance, setAppearance] = useState<NoteAppearance>(() => {
    try { return localStorage.getItem(appearanceKey) === 'colorful' ? 'colorful' : 'subtle' } catch { return 'subtle' }
  })
  const activeCount = notes.filter((note) => !note.archivedAt).length
  const archiveCount = notes.length - activeCount
  const allTags = useMemo(() => [...new Set([...notes.flatMap((note) => note.tags ?? []), ...filterTags])].sort(), [notes, filterTags])
  const filtered = useMemo(() => filterNotes(notes, archived, search, filterTags, sort), [notes, archived, search, filterTags, sort])

  function createNote() {
    setViewingId(null)
    setEditor({ key: Date.now() })
    setError('')
  }
  useImperativeHandle(ref, () => ({ createNote }))

  function save(note: Note) {
    const state = useStore.getState()
    if (editor?.id === note.id && !state.notes.some((old) => old.id === note.id)) {
      throw new Error('This note was removed. Review the Save as new note option to preserve your text.')
    }
    if (state.notes.some((old) => old.id === note.id)) state.updateNote(note.id, note)
    else state.addNote(note)
    for (const tag of note.tags ?? []) {
      const current = useStore.getState()
      if (!Object.hasOwn(current.noteTagColors, tag)) current.setNoteTagColor(tag, assignNoteTagColor(tag, current.noteTagColors))
    }
    if (!editor?.id || editor.id !== note.id) { setArchived(false); setSearch(''); setFilterTags([]) }
    setEditor(null)
    setError('')
  }

  function changeArchive(id: string, restore: boolean) {
    try {
      if (restore) useStore.getState().unarchiveNote(id)
      else useStore.getState().archiveNote(id)
      setError('')
    } catch { setError('Could not save the archive change. Check browser storage and retry.') }
  }

  function clearFilters() { setSearch(''); setFilterTags([]) }

  return (
    <section aria-label="Notes workspace" className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input type="search" aria-label="Search notes" placeholder="Search titles, content, or tags…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900/60 py-2 pl-10 pr-3 text-sm" /></div>
        <select aria-label="Sort notes" value={sort} onChange={(event) => setSort(event.target.value as NoteSort)} className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"><option value="updated">Recently updated</option><option value="newest">Newest created</option><option value="oldest">Oldest created</option><option value="title">Title A–Z</option></select>
        {showCreateButton && <Button onClick={createNote}><Plus className="h-4 w-4" />New note</Button>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1"><Button variant={archived ? 'ghost' : 'secondary'} aria-label="Active notes" aria-pressed={!archived} onClick={() => setArchived(false)}><StickyNote className="h-4 w-4" />Notes <span className="text-xs text-slate-500">{activeCount}</span></Button><Button variant={archived ? 'secondary' : 'ghost'} aria-label="Archived notes" aria-pressed={archived} onClick={() => setArchived(true)}><Archive className="h-4 w-4" />Archived <span className="text-xs text-slate-500">{archiveCount}</span></Button></div>
        <div className="flex flex-wrap gap-1"><Button variant="ghost" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal className="h-4 w-4" />Tags{filterTags.length ? ` (${filterTags.length})` : ''}</Button><Button variant="ghost" aria-label="Note appearance" aria-expanded={appearanceOpen} onClick={() => setAppearanceOpen(!appearanceOpen)}><Palette className="h-4 w-4" /><span className="hidden sm:inline">Appearance</span></Button></div>
      </div>
      {filtersOpen && <div className="rounded-xl border border-slate-800 p-3"><p className="mb-2 text-xs text-slate-500">Match any selected tag</p><div className="flex flex-wrap gap-2"><Button variant="secondary" aria-pressed={!filterTags.length} onClick={() => setFilterTags([])}>All tags</Button>{allTags.map((tag) => <Button key={tag} variant="ghost" aria-pressed={filterTags.includes(tag)} onClick={() => setFilterTags(filterTags.includes(tag) ? filterTags.filter((item) => item !== tag) : [...filterTags, tag])} className={`max-w-full break-all ${filterTags.includes(tag) ? 'bg-blue-500/10 text-blue-300' : ''}`}><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: Object.hasOwn(tagColors, tag) ? tagColors[tag] : '#3B82F6' }} />{tag}</Button>)}</div></div>}
      {appearanceOpen && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 p-3"><span className="mr-2 text-sm text-slate-400">Card colors</span>{(['subtle', 'colorful'] as const).map((value) => <Button key={value} variant={appearance === value ? 'secondary' : 'ghost'} aria-pressed={appearance === value} onClick={() => { setAppearance(value); try { localStorage.setItem(appearanceKey, value) } catch { /* Keep the chosen appearance for this session. */ } }}>{value === 'subtle' ? 'Subtle' : 'Colorful'}</Button>)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3"><p role="status" className="text-xs text-slate-500">{filtered.length} {filtered.length === 1 ? 'note' : 'notes'}{archived ? ' in archive' : ''}</p>{filtered.length > 0 && (search || filterTags.length > 0) && <Button variant="ghost" onClick={clearFilters}>Clear search and tags</Button>}</div>
      {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
      {filtered.length > 0 ? <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] items-stretch gap-4">
        {filtered.map((note) => <NoteCard key={note.id} note={note} onView={setViewingId} onArchive={(id) => changeArchive(id, false)} onUnarchive={(id) => changeArchive(id, true)} appearance={appearance} />)}
      </div> : <div className="space-y-3 rounded-xl border border-dashed border-slate-800 px-5 py-10 text-center">
        <StickyNote className="mx-auto h-8 w-8 text-slate-600" /><p className="text-sm text-slate-400">{search || filterTags.length ? 'No notes match your search or tags.' : archived ? 'No archived notes.' : notes.length ? 'All your notes are archived.' : 'A place for your first idea.'}</p>
        {search || filterTags.length ? <Button variant="secondary" onClick={clearFilters}>Clear search and tags</Button> : !archived && (notes.length ? <Button variant="secondary" onClick={() => setArchived(true)}>View archived notes</Button> : <Button variant="secondary" onClick={createNote}><Plus className="h-4 w-4" />Create your first note</Button>)}
      </div>}
      {archived && filtered.length > 0 && <div className="border-t border-slate-800 pt-3"><Button variant="ghost" className="text-red-400" onClick={() => {
        if (!window.confirm(`Delete these ${filtered.length} shown archived notes permanently?`)) return
        try { for (const note of filtered) useStore.getState().deleteNote(note.id); setError('') } catch { setError('Could not finish deleting notes. Check browser storage and retry.') }
      }}><Trash2 className="h-4 w-4" />Delete shown archived notes ({filtered.length})</Button></div>}
      {viewingId && <NoteViewModal note={notes.find((note) => note.id === viewingId)} onClose={() => setViewingId(null)} onEdit={(note) => { setViewingId(null); setEditor({ id: note.id, original: note, key: Date.now() }) }} />}
      {editor && <NoteEditor key={editor.key} initialData={notes.find((note) => note.id === editor.id) ?? editor.original} sourceMissing={!!editor.id && !notes.some((note) => note.id === editor.id)} onClose={() => setEditor(null)} onSave={save} />}
    </section>
  )
}
