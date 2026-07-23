import { useState, useMemo, type FormEvent } from 'react'
import type { Quest, QuickPreset, QuestStatus, RepeatType } from '../../../types'
import { useStore } from '../../../store/useStore'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { X, Settings, Pencil, Trash2 } from 'lucide-react'

interface QuestCreateFormProps {
  initialData?: Quest
  defaultDate: string
  onSave: (quest: Quest) => void
  onClose: () => void
  onSavePreset?: (preset: QuickPreset) => void
}

function emptyForm(defaultDate: string) {
  return {
    title: '',
    description: '',
    targetDate: defaultDate,
    status: 'active' as QuestStatus,
    rollover: true,
    repeat: 'none' as RepeatType,
    repeatInterval: 1,
    repeatUnit: 'day' as 'day' | 'week' | 'month',
    subQuestInputs: [] as { id: string; title: string }[],
    xp: null as number | null,
    addToQuickAdd: false,
    tags: [] as string[],
  }
}

function questToForm(q: Quest): ReturnType<typeof emptyForm> {
  return {
    title: q.title,
    description: q.description ?? '',
    targetDate: q.targetDate,
    status: q.status,
    rollover: q.rollover,
    repeat: q.repeat,
    repeatInterval: q.repeatConfig?.interval ?? 1,
    repeatUnit: q.repeatConfig?.unit ?? 'day',
    subQuestInputs: q.subQuests.map((sq) => ({ id: sq.id, title: sq.title })),
    xp: q.xp ?? null,
    addToQuickAdd: false,
    tags: q.tags ?? [],
  }
}

export function QuestCreateForm({ initialData, defaultDate, onSave, onClose, onSavePreset }: QuestCreateFormProps) {
  const [form, setForm] = useState(initialData ? questToForm(initialData) : emptyForm(defaultDate))

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const [subQuestInput, setSubQuestInput] = useState('')

  function addSubQuest(title: string) {
    const trimmed = title.trim()
    if (!trimmed) return
    const id = crypto.randomUUID()
    update('subQuestInputs', [...form.subQuestInputs, { id, title: trimmed }])
    setSubQuestInput('')
  }

  function removeSubQuest(id: string) {
    update('subQuestInputs', form.subQuestInputs.filter((sq) => sq.id !== id))
  }

  function updateSubQuest(id: string, title: string) {
    update('subQuestInputs', form.subQuestInputs.map((sq) => (sq.id === id ? { ...sq, title } : sq)))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return

    const now = new Date().toISOString()
    const quest: Quest = {
      id: initialData?.id ?? crypto.randomUUID(),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      createdAt: initialData?.createdAt ?? now,
      targetDate: form.targetDate,
      repeat: form.repeat,
      repeatConfig: form.repeat === 'custom' ? { interval: form.repeatInterval, unit: form.repeatUnit } : undefined,
      rollover: form.rollover,
      subQuests: form.subQuestInputs
        .filter((sq) => sq.title.trim())
        .map((sq) => ({
          id: sq.id,
          title: sq.title.trim(),
          isCompleted: initialData?.subQuests.find((s) => s.id === sq.id)?.isCompleted ?? false,
        })),
      externalUrl: initialData?.externalUrl,
      icon: initialData?.icon,
      status: form.status,
      archivedAt: initialData?.archivedAt ?? null,
      xp: form.xp ?? null,
      maxRolloverDays: initialData?.maxRolloverDays ?? null,
      sortOrder: initialData?.sortOrder,
      tags: form.tags.length > 0 ? form.tags : undefined,
    }

    if (form.addToQuickAdd && onSavePreset && !initialData) {
      onSavePreset({
        id: crypto.randomUUID(),
        title: form.title.trim(),
        externalUrl: quest.externalUrl,
        isUserDefined: true,
      })
    }

    onSave(quest)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <SectionCard title="Details">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="What do you want to do?"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Optional details..."
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </SectionCard>

          <SectionCard title="Sub-quests">
            <div className="space-y-2">
              {form.subQuestInputs.map((sq) => (
                <div key={sq.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sq.title}
                    onChange={(e) => updateSubQuest(sq.id, e.target.value)}
                    placeholder="Sub-quest title"
                    className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeSubQuest(sq.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                    aria-label="Remove sub-quest"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {form.subQuestInputs.length === 0 && (
                <p className="text-xs text-slate-600">No sub-quests yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={subQuestInput}
                onChange={(e) => setSubQuestInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubQuest(subQuestInput) } }}
                placeholder="Add a sub-quest..."
                className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => addSubQuest(subQuestInput)} className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 transition-colors">
                Add
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Schedule">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Date</label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => update('targetDate', e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Repeat</label>
                <select
                  value={form.repeat}
                  onChange={(e) => update('repeat', e.target.value as RepeatType)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {form.repeat === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Interval</label>
                  <input
                    type="number"
                    min={1}
                    value={form.repeatInterval}
                    onChange={(e) => update('repeatInterval', Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Unit</label>
                  <select
                    value={form.repeatUnit}
                    onChange={(e) => update('repeatUnit', e.target.value as 'day' | 'week' | 'month')}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="day">Days</option>
                    <option value="week">Weeks</option>
                    <option value="month">Months</option>
                  </select>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.rollover}
                onChange={(e) => update('rollover', e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-xs text-slate-400">Rollover (appears daily until done)</span>
            </label>
          </SectionCard>

          <SectionCard title="Tags & XP">
            <TagInput tags={form.tags} onAddTag={(tag) => update('tags', [...form.tags, tag])} onRemoveTag={(tag) => update('tags', form.tags.filter((t) => t !== tag))} />
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">XP (optional)</label>
              <input
                type="number"
                min={0}
                value={form.xp ?? ''}
                onChange={(e) => update('xp', e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g. 10"
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!initialData && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.addToQuickAdd}
                  onChange={(e) => update('addToQuickAdd', e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-xs text-slate-400">Add to Quick Add</span>
              </label>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!form.title.trim()}>
          {initialData ? 'Save Changes' : 'Create Quest'}
        </Button>
      </div>
    </form>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3 space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

function TagInput({ tags, onAddTag, onRemoveTag }: { tags: string[]; onAddTag: (tag: string) => void; onRemoveTag: (tag: string) => void }) {
  const [input, setInput] = useState('')
  const [showTagMgr, setShowTagMgr] = useState(false)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const quests = useStore((s) => s.quests)
  const deleteTag = useStore((s) => s.deleteTag)
  const renameTag = useStore((s) => s.renameTag)
  const allTags = useMemo(() => {
    const set = new Set<string>()
    quests.forEach((q) => q.tags?.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [quests])

  const suggestions = input.trim()
    ? allTags.filter((t) => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t))
    : []

  function handleAdd() {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onAddTag(trimmed)
    }
    setInput('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-slate-400">Tags</label>
        <button
          type="button"
          onClick={() => setShowTagMgr(!showTagMgr)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Manage tags"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      <Modal isOpen={showTagMgr} onClose={() => setShowTagMgr(false)} title="Manage Tags">
        {allTags.length === 0 ? (
          <p className="text-sm text-slate-500">No tags yet.</p>
        ) : (
          <div className="space-y-2">
            {allTags.map((tag) => (
              <div key={tag} className="flex items-center gap-2">
                {editingTag === tag ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const val = editValue.trim()
                        if (val && val !== tag) renameTag(tag, val)
                        setEditingTag(null)
                        setShowTagMgr(false)
                      }
                      if (e.key === 'Escape') setEditingTag(null)
                    }}
                    onBlur={() => {
                      const val = editValue.trim()
                      if (val && val !== tag) renameTag(tag, val)
                      setEditingTag(null)
                    }}
                    autoFocus
                    className="flex-1 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span className="flex-1 text-sm text-slate-200">{tag}</span>
                )}
                <button
                  type="button"
                  onClick={() => { setEditingTag(tag); setEditValue(tag) }}
                  className="text-slate-500 hover:text-blue-400 transition-colors shrink-0"
                  aria-label={`Edit tag ${tag}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete tag "${tag}"? This will remove it from all quests.`)) {
                      deleteTag(tag)
                    }
                  }}
                  className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                  aria-label={`Delete tag ${tag}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-blue-600/20 border border-blue-600/30 px-2 py-0.5 text-xs text-blue-300">
              {tag}
              <button type="button" onClick={() => onRemoveTag(tag)} className="text-blue-400 hover:text-blue-200">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {allTags.filter((t) => !tags.includes(t)).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {allTags.filter((t) => !tags.includes(t)).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => { onAddTag(tag); setInput('') }}
              className="shrink-0 rounded-lg border border-slate-700 bg-slate-700/60 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder="Add a tag..."
          className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={handleAdd} className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 transition-colors">
          Add
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onAddTag(s); setInput('') }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
