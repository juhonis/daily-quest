import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Archive, CalendarDays, Plus, Save, X } from 'lucide-react'
import type { Quest, QuickPreset, RepeatType } from '../../../types'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { addDays, getTodayLocal } from '../../../utils/dateUtils'
import { useStore } from '../../../store/useStore'
import { EditorSection } from './EditorSection'
import { QuestTagPicker } from './QuestTagPicker'
import { buildPreset, buildQuest, editorFingerprint, editorValues, scheduleSummary, validateEditor, type EditorErrors, type QuestEditorValues } from './questEditorModel'
import { editorDraftKey, readQuestDraft } from './questDrafts'
import { useQuestDraft } from './useQuestDraft'
import { createId } from '../../../utils/createId'

interface QuestEditorProps {
  initialData?: Quest
  defaultDate: string
  onSave: (quest: Quest, preset?: QuickPreset) => void
  onClose: () => void
}

const fieldClass = 'min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600'

export function QuestEditor({ initialData, defaultDate, onSave, onClose }: QuestEditorProps) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [initial] = useState(() => {
    const key = editorDraftKey(initialData?.id)
    const clean = editorValues(initialData, defaultDate)
    const base = initialData ? editorFingerprint(editorValues(initialData, initialData.targetDate)) : 'new'
    const stored = readQuestDraft(key)
    const draft = stored && stored.sourceId === (initialData?.id ?? null) &&
      (initialData || !useStore.getState().quests.some((quest) => quest.id === stored.questId)) ? stored : null
    const stale = draft && draft.base !== base ? draft : null
    return {
      key, clean, base, sourceId: initialData?.id ?? null, original: initialData,
      questId: initialData?.id ?? draft?.questId ?? createId(),
      presetId: draft?.presetId ?? createId(),
      recovered: !!draft && !stale, values: draft && !stale ? draft.values : clean, stale,
    }
  })
  const [values, setValues] = useState(initial.values)
  const [stale, setStale] = useState(initial.stale)
  const [recovered, setRecovered] = useState(initial.recovered)
  const [errors, setErrors] = useState<EditorErrors>({})
  const [saveError, setSaveError] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const archived = !!(initialData ?? initial.original)?.archivedAt
  const dirty = editorFingerprint(values) !== editorFingerprint(initial.clean)
  const identity = useMemo(() => ({ sourceId: initial.sourceId, questId: initial.questId, presetId: initial.presetId, base: initial.base }), [initial])
  const draft = useQuestDraft(initial.key, values, identity, dirty, !!stale)

  function update<K extends keyof QuestEditorValues>(field: K, value: QuestEditorValues[K]) {
    setValues((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    setSaveError('')
  }

  function discard() {
    if ((dirty || stale) && !window.confirm('Discard unsaved quest changes?')) return false
    draft.clear()
    onClose()
    return true
  }

  function keepDraft() {
    if (!draft.flush()) { setSaveError('The draft could not be saved in this browser. Keep the editor open or save the quest.'); return }
    onClose()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (stale) return
    const validation = validateEditor(values, archived)
    setErrors(validation)
    if (Object.keys(validation).length) {
      if (validation.externalUrl || validation.xp) setMoreOpen(true)
      const field = Object.keys(validation)[0]
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus())
      return
    }
    try {
      const quest = buildQuest(values, initialData ?? initial.original, new Date().toISOString(), initial.questId, createId)
      const preset = !initial.sourceId && values.addToQuickAdd ? buildPreset(quest, initial.presetId) : undefined
      onSave(quest, preset)
      draft.clear()
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not save this quest. Your draft is still available.') }
  }

  function error(field: keyof EditorErrors) {
    return errors[field] ? <p id={`${id}-${field}-error`} className="mt-1 text-xs text-red-300">{errors[field]}</p> : null
  }

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span role="status" className={`text-xs ${draft.status === 'error' ? 'text-amber-300' : 'text-slate-500'}`}>
          {draft.status === 'error' ? 'Draft could not be saved.' : dirty ? draft.status === 'saved' ? 'Draft saved in this tab' : 'Saving draft…' : 'Saved locally when you create or update'}
        </span>
        {dirty && !stale && <Button type="button" variant="ghost" onClick={keepDraft} className="text-xs"><Save className="h-3.5 w-3.5" />Keep draft</Button>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button type="button" variant="ghost" onClick={discard}>Cancel</Button>
        <Button type="submit" form={id} disabled={!values.title.trim() || !!stale}>
          {values.status === 'inactive' && !archived ? 'Save parked quest' : initial.sourceId ? 'Update Quest' : 'Create Quest'}
        </Button>
      </div>
    </div>
  )

  return (
    <Modal isOpen title={initial.sourceId ? 'Edit quest' : 'New quest'} onClose={discard} className="max-w-2xl [color-scheme:dark]" footer={footer} initialFocusRef={titleRef}>
      <form ref={formRef} id={id} onSubmit={submit} noValidate className="space-y-5">
        {recovered && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-200">
          <p>Recovered unsaved changes from this tab.</p><Button type="button" variant="ghost" className="text-xs" onClick={() => { setValues(initial.clean); setRecovered(false) }}>Start fresh</Button>
        </div>}
        {stale && <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-slate-300">
          <p>This quest changed after the draft was started. Review the old draft or start with the current version.</p>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => { setValues(stale.values); setStale(null); setRecovered(true) }}>Resume earlier draft</Button><Button type="button" variant="ghost" onClick={() => setStale(null)}>Use current version</Button></div>
        </div>}
        {saveError && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{saveError}</p>}
        <fieldset disabled={!!stale} className="min-w-0 space-y-5 disabled:opacity-50">
          <div>
            <label htmlFor={`${id}-title`} className="mb-2 block text-sm font-medium text-slate-300">Title *</label>
            <input ref={titleRef} id={`${id}-title`} name="title" required value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="What would you like to do?" aria-invalid={!!errors.title} aria-describedby={errors.title ? `${id}-title-error` : undefined} className={`${fieldClass} text-base`} />
            {error('title')}
          </div>

          <fieldset disabled={archived} className="min-w-0 space-y-3">
            <legend className="mb-2 text-sm font-medium text-slate-300">Schedule</legend>
            {archived ? <p className="flex items-center gap-2 text-sm text-slate-400"><Archive className="h-4 w-4" />Archived quest</p> : <div className="flex flex-wrap gap-2">
              <Button type="button" variant={values.status === 'active' ? 'secondary' : 'ghost'} aria-pressed={values.status === 'active'} onClick={() => update('status', 'active')}><CalendarDays className="h-4 w-4" />Schedule</Button>
              <Button type="button" variant={values.status === 'inactive' ? 'secondary' : 'ghost'} aria-pressed={values.status === 'inactive'} onClick={() => update('status', 'inactive')}>Park for later</Button>
            </div>}
            {values.status === 'active' && <>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0"><label htmlFor={`${id}-date`} className="mb-1 block text-xs text-slate-400">Date</label><input id={`${id}-date`} name="targetDate" type="date" value={values.targetDate} onChange={(event) => update('targetDate', event.target.value)} aria-invalid={!!errors.targetDate} aria-describedby={errors.targetDate ? `${id}-targetDate-error` : undefined} className={fieldClass} />{error('targetDate')}</div>
                <div><label htmlFor={`${id}-repeat`} className="mb-1 block text-xs text-slate-400">Repeat</label><select id={`${id}-repeat`} value={values.repeat} onChange={(event) => update('repeat', event.target.value as RepeatType)} className={fieldClass}><option value="none">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom interval</option></select></div>
              </div>
              <div className="flex flex-wrap gap-1"><Button type="button" variant="ghost" className="text-xs" onClick={() => update('targetDate', getTodayLocal())}>Today</Button><Button type="button" variant="ghost" className="text-xs" onClick={() => update('targetDate', addDays(getTodayLocal(), 1))}>Tomorrow</Button></div>
              {values.repeat === 'custom' && <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0"><label htmlFor={`${id}-interval`} className="mb-1 block text-xs text-slate-400">Every</label><input id={`${id}-interval`} name="repeatInterval" type="number" min="1" step="1" inputMode="numeric" value={values.repeatInterval} onChange={(event) => update('repeatInterval', event.target.value)} aria-invalid={!!errors.repeatInterval} aria-describedby={errors.repeatInterval ? `${id}-repeatInterval-error` : undefined} className={fieldClass} />{error('repeatInterval')}</div>
                <div><label htmlFor={`${id}-unit`} className="mb-1 block text-xs text-slate-400">Unit</label><select id={`${id}-unit`} value={values.repeatUnit} onChange={(event) => update('repeatUnit', event.target.value as QuestEditorValues['repeatUnit'])} className={fieldClass}><option value="day">Days</option><option value="week">Weeks</option><option value="month">Months</option></select></div>
              </div>}
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1"><input type="checkbox" checked={values.rollover} onChange={(event) => update('rollover', event.target.checked)} className="h-4 w-4 shrink-0 accent-blue-500" /><span className="text-sm text-slate-300">Carry forward until completed</span></label>
            </>}
          </fieldset>
          <p className="rounded-lg bg-slate-800/40 px-3 py-2 text-xs leading-relaxed text-slate-400">{scheduleSummary(values, archived)}</p>

          <div className="space-y-3">
            <EditorSection title="Description" summary={values.description ? 'Added' : 'Optional'} defaultOpen={!!values.description}>
              <label htmlFor={`${id}-description`} className="sr-only">Description</label><textarea id={`${id}-description`} value={values.description} onChange={(event) => update('description', event.target.value)} rows={3} placeholder="A little more detail…" className={`${fieldClass} resize-y`} />
            </EditorSection>
            <EditorSection title="Subquests" summary={`${values.subQuests.length + (values.pendingStep.trim() ? 1 : 0)} steps`} defaultOpen={values.subQuests.length > 0 || !!values.pendingStep}>
              {values.subQuests.map((step, index) => <div key={step.id} className="flex min-w-0 items-center gap-2"><input aria-label={`Step ${index + 1}`} value={step.title} onChange={(event) => update('subQuests', values.subQuests.map((item) => item.id === step.id ? { ...item, title: event.target.value } : item))} className={fieldClass} /><Button type="button" variant="icon" aria-label={`Remove step ${index + 1}`} onClick={() => update('subQuests', values.subQuests.filter((item) => item.id !== step.id))}><X className="h-4 w-4" /></Button></div>)}
              <div className="flex min-w-0 items-center gap-2"><input aria-label="New step" value={values.pendingStep} onChange={(event) => update('pendingStep', event.target.value)} placeholder="Add a small step…" className={fieldClass} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (values.pendingStep.trim()) setValues((previous) => ({ ...previous, subQuests: [...previous.subQuests, { id: createId(), title: previous.pendingStep.trim() }], pendingStep: '' })) } }} /><Button type="button" variant="secondary" aria-label="Add step" disabled={!values.pendingStep.trim()} onClick={() => setValues((previous) => ({ ...previous, subQuests: [...previous.subQuests, { id: createId(), title: previous.pendingStep.trim() }], pendingStep: '' }))}><Plus className="h-4 w-4" /></Button></div>
              <p className="text-xs text-slate-500">A step left in the New step field is included when you save.</p>
            </EditorSection>
            <EditorSection title="Tags" summary={values.tags.length ? `${values.tags.length} selected` : 'Optional'} defaultOpen={values.tags.length > 0}>
              <QuestTagPicker tags={values.tags} query={values.tagQuery} onQueryChange={(query) => update('tagQuery', query)} onChange={(tags) => update('tags', tags)} />
            </EditorSection>
            <EditorSection title="More options" summary="Link, preset, XP" open={moreOpen} onOpenChange={setMoreOpen}>
              <div><label htmlFor={`${id}-link`} className="mb-1 block text-xs text-slate-400">External link</label><input id={`${id}-link`} name="externalUrl" type="url" inputMode="url" value={values.externalUrl} onChange={(event) => update('externalUrl', event.target.value)} placeholder="https://…" aria-invalid={!!errors.externalUrl} aria-describedby={errors.externalUrl ? `${id}-externalUrl-error` : undefined} className={fieldClass} />{error('externalUrl')}</div>
              {!initial.sourceId && <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2"><input type="checkbox" checked={values.addToQuickAdd} onChange={(event) => update('addToQuickAdd', event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-500" /><span><span className="text-sm text-slate-300">Save title and link to Quick add</span><span className="mt-1 block text-xs text-slate-500">Timing is chosen separately when you use the preset.</span></span></label>}
              <div><label htmlFor={`${id}-xp`} className="mb-1 block text-xs text-slate-400">XP (optional)</label><input id={`${id}-xp`} name="xp" type="number" min="0" value={values.xp} onChange={(event) => update('xp', event.target.value)} aria-invalid={!!errors.xp} aria-describedby={errors.xp ? `${id}-xp-error` : undefined} className={fieldClass} />{error('xp')}<p className="mt-1 text-xs text-slate-500">Metadata only; XP rewards are not implemented.</p></div>
            </EditorSection>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
