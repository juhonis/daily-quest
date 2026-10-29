import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Bold, ChevronDown, Code, Heading2, Italic, List, ListOrdered, Quote, Save } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useLocalDraft } from '../../hooks/useLocalDraft'
import type { Note } from '../../types'
import { buildNote, noteBaseline, noteFingerprint, noteValues, type NoteEditorValues } from './noteEditorModel'
import { noteDraftKey, readNoteDraft, writeNoteDraft, type NoteDraft } from './noteDrafts'
import { applyBlockFormat, applyInlineFormat, continueMarkdownList, linePrefix, type FormatResult } from './noteFormatting'
import { NOTE_COLORS } from './noteUtils'
import { NoteTagPicker } from './NoteTagPicker'
import { NoteMarkdown } from './NoteMarkdown'
import { createId } from '../../utils/createId'

function FormatButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active} onPointerDown={(event) => { if (event.pointerType === 'mouse') event.preventDefault() }} onClick={onClick} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-blue-500/15 text-blue-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>{children}</button>
}

export function NoteEditor({ initialData, sourceMissing = false, onClose, onSave }: {
  initialData?: Note
  sourceMissing?: boolean
  onClose: () => void
  onSave: (note: Note) => void
}) {
  const id = useId()
  const titleRef = useRef<HTMLInputElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const [initial] = useState(() => {
    const key = noteDraftKey(initialData?.id)
    const clean = noteValues(initialData)
    const base = noteBaseline(initialData)
    const saved = readNoteDraft(key)
    const stored = saved && saved.sourceId === (initialData?.id ?? null) &&
      (initialData || !useStore.getState().notes.some((note) => note.id === saved.noteId)) ? saved : null
    const stale = stored && stored.base !== base ? stored : null
    return { key, clean, base, original: initialData, sourceId: initialData?.id ?? null,
      noteId: initialData?.id ?? stored?.noteId ?? createId(), recoveryId: createId(),
      values: stored && !stale ? stored.values : clean, recovered: !!stored && !stale, stale }
  })
  const [values, setValues] = useState(initial.values)
  const [stale, setStale] = useState(initial.stale)
  const [recovered, setRecovered] = useState(initial.recovered)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [metadataOpen, setMetadataOpen] = useState(values.tags.length > 0)
  const [cursor, setCursor] = useState(0)
  const dirty = noteFingerprint(values) !== noteFingerprint(initial.clean)
  const record = useMemo<NoteDraft | null>(() => dirty && !stale ? {
    version: 1, sourceId: initial.sourceId, noteId: initial.noteId, base: initial.base,
    savedAt: new Date().toISOString(), values,
  } : null, [dirty, stale, initial, values])
  const draft = useLocalDraft(initial.key, record, !!stale, writeNoteDraft)
  const prefix = linePrefix(values.content, cursor)?.trimStart()
  const palette = NOTE_COLORS.some((color) => color.value === values.color) ? NOTE_COLORS : [{ label: 'Current color', value: values.color }, ...NOTE_COLORS]

  function update<K extends keyof NoteEditorValues>(key: K, value: NoteEditorValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }))
    setError('')
  }

  function discard() {
    if ((dirty || stale) && !window.confirm('Discard unsaved note changes?')) return false
    draft.clear()
    onClose()
    return true
  }

  function keep() {
    if (!draft.flush()) { setError('The draft could not be saved in this browser. Keep the editor open or save the note.'); return }
    onClose()
  }

  function apply(result: FormatResult) {
    update('content', result.text)
    setCursor(result.newStart)
    requestAnimationFrame(() => { textarea.current?.focus({ preventScroll: true }); textarea.current?.setSelectionRange(result.newStart, result.newEnd) })
  }
  function inline(marker: string, placeholder: string) {
    if (!textarea.current) return
    apply(applyInlineFormat(values.content, textarea.current.selectionStart, textarea.current.selectionEnd, marker, marker, placeholder))
  }
  function block(marker: string, placeholder: string) {
    if (!textarea.current) return
    apply(applyBlockFormat(values.content, textarea.current.selectionStart, textarea.current.selectionEnd, marker, placeholder))
  }
  function contentKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return
    if ((event.ctrlKey || event.metaKey) && ['b', 'i'].includes(event.key.toLowerCase())) {
      event.preventDefault()
      inline(event.key.toLowerCase() === 'b' ? '**' : '*', event.key.toLowerCase() === 'b' ? 'bold text' : 'italic text')
    } else if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const result = continueMarkdownList(values.content, event.currentTarget.selectionStart, event.currentTarget.selectionEnd)
      if (result) { event.preventDefault(); apply(result) }
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (stale) return
    try {
      onSave(buildNote(values, sourceMissing ? undefined : initialData ?? initial.original, sourceMissing ? initial.recoveryId : initial.noteId, new Date().toISOString()))
      draft.clear()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save this note. Your draft remains available.')
      if (!values.title.trim()) titleRef.current?.focus()
    }
  }

  const footer = <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex flex-wrap items-center gap-2"><span role="status" className={`text-xs ${draft.status === 'error' ? 'text-amber-300' : 'text-slate-500'}`}>{draft.status === 'error' ? 'Draft could not be saved.' : dirty ? draft.status === 'saved' ? 'Draft saved in this tab' : 'Saving draft…' : 'Notes stay local until you sync'}</span>{dirty && !stale && <Button variant="ghost" type="button" className="text-xs" onClick={keep}><Save className="h-3.5 w-3.5" />Keep draft</Button>}</div>
    <div className="ml-auto flex gap-2"><Button variant="ghost" type="button" onClick={discard}>Cancel</Button><Button type="submit" form={id} disabled={!values.title.trim() || !!stale}>{sourceMissing ? 'Save as new note' : initial.sourceId ? 'Save' : 'Create'}</Button></div>
  </div>

  return (
    <Modal isOpen title={initial.sourceId ? 'Edit Note' : 'New Note'} onClose={discard} className="note-dialog max-w-3xl [color-scheme:dark]" footer={footer} initialFocusRef={titleRef}>
      <form ref={form} id={id} onSubmit={submit} noValidate className="min-w-0 space-y-4" onKeyDown={(event) => {
        if (!event.nativeEvent.isComposing && (event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); form.current?.requestSubmit() }
      }}>
        {recovered && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-200"><p>Recovered unsaved changes from this tab.</p><Button type="button" variant="ghost" className="text-xs" onClick={() => { setValues(initial.clean); setRecovered(false) }}>Start fresh</Button></div>}
        {stale && <div className="space-y-2 rounded-lg border border-amber-500/20 p-3 text-sm text-slate-300"><p>This note changed after the draft was started. Review the old draft or use the current version.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => { setValues(stale.values); setStale(null); setRecovered(true) }}>Resume earlier draft</Button><Button type="button" variant="ghost" onClick={() => setStale(null)}>Use current version</Button></div></div>}
        {sourceMissing && <p className="rounded-lg border border-amber-500/20 p-3 text-sm text-amber-200">This note was removed while you were editing. Save as a new note to keep your text.</p>}
        {(initialData ?? initial.original)?.archivedAt && !sourceMissing && <p className="text-xs text-slate-500">Archived note. Saving edits keeps it archived.</p>}
        {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
        <fieldset disabled={!!stale} className="min-w-0 space-y-4 disabled:opacity-50">
          <div><label htmlFor={`${id}-title`} className="mb-1 block text-sm font-medium text-slate-300">Title</label><input ref={titleRef} id={`${id}-title`} required value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="Note title…" className="min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-base" /></div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2"><label htmlFor={`${id}-content`} className="text-sm font-medium text-slate-300">Content</label><div className="flex gap-1"><Button type="button" variant={mode === 'write' ? 'secondary' : 'ghost'} aria-pressed={mode === 'write'} onClick={() => setMode('write')}>Write</Button><Button type="button" variant={mode === 'preview' ? 'secondary' : 'ghost'} aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>Preview</Button></div></div>
            {mode === 'write' && <div role="toolbar" aria-label="Markdown formatting" className="flex min-w-0 gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/30 px-1 py-1">
              <FormatButton label="Bold" onClick={() => inline('**', 'bold text')}><Bold className="h-4 w-4" /></FormatButton><FormatButton label="Italic" onClick={() => inline('*', 'italic text')}><Italic className="h-4 w-4" /></FormatButton><FormatButton label="Bullet list" active={prefix === '- '} onClick={() => block('- ', 'List item')}><List className="h-4 w-4" /></FormatButton><FormatButton label="Numbered list" active={!!prefix && /^\d/.test(prefix)} onClick={() => block('1. ', 'List item')}><ListOrdered className="h-4 w-4" /></FormatButton><FormatButton label="Quote" active={prefix === '> '} onClick={() => block('> ', 'Quote')}><Quote className="h-4 w-4" /></FormatButton><FormatButton label="Heading" active={!!prefix?.startsWith('#')} onClick={() => block('## ', 'Heading')}><Heading2 className="h-4 w-4" /></FormatButton><FormatButton label="Code" onClick={() => inline('`', 'code')}><Code className="h-4 w-4" /></FormatButton>
            </div>}
            <textarea ref={textarea} id={`${id}-content`} hidden={mode !== 'write'} value={values.content} onChange={(event) => { update('content', event.target.value); setCursor(event.target.selectionStart) }} onSelect={(event) => setCursor(event.currentTarget.selectionStart)} onKeyDown={contentKey} placeholder="Write in Markdown, or just start typing…" className="min-h-[40dvh] w-full min-w-0 resize-y rounded-lg border border-slate-700 bg-slate-950/40 p-3 font-mono text-sm leading-relaxed" />
            {mode === 'preview' && <section aria-label="Note preview" className="min-h-[40dvh] min-w-0 rounded-lg border border-slate-800 p-4">{values.content ? <NoteMarkdown content={values.content} /> : <p className="text-sm text-slate-500">Your note preview will appear here.</p>}</section>}
          </div>
          <section className="rounded-xl border border-slate-800"><button type="button" aria-expanded={metadataOpen} aria-controls={`${id}-metadata`} onClick={() => setMetadataOpen(!metadataOpen)} className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 text-sm text-slate-400"><span>Tags & color{values.tags.length ? ` · ${values.tags.length} ${values.tags.length === 1 ? 'tag' : 'tags'}` : ''}</span><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: values.color }} /><ChevronDown className={`h-4 w-4 ${metadataOpen ? 'rotate-180' : ''}`} /></span></button>
            <div id={`${id}-metadata`} hidden={!metadataOpen} className="space-y-4 border-t border-slate-800 p-3"><NoteTagPicker tags={values.tags} query={values.tagQuery} onQuery={(value) => update('tagQuery', value)} onChange={(value) => update('tags', value)} /><fieldset><legend className="mb-2 text-xs text-slate-400">Note color</legend><div className="flex flex-wrap gap-1">{palette.map((color) => <button type="button" key={color.value} aria-label={`Note color: ${color.label}`} aria-pressed={values.color === color.value} title={color.label} onClick={() => update('color', color.value)} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${values.color === color.value ? 'bg-slate-800 ring-1 ring-slate-500' : 'hover:bg-slate-800'}`}><span className="h-5 w-5 rounded-full" style={{ backgroundColor: color.value }} /></button>)}</div></fieldset></div>
          </section>
        </fieldset>
      </form>
    </Modal>
  )
}
