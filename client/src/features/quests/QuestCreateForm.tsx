import { useState, type FormEvent } from 'react'
import type { Quest, QuickPreset, QuestStatus, RepeatType } from '../../types'
import { Button } from '../../components/ui/Button'
import { Plus, X } from 'lucide-react'

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
    rollover: false,
    repeat: 'none' as RepeatType,
    repeatInterval: 1,
    repeatUnit: 'day' as 'day' | 'week' | 'month',
    subQuestInputs: [] as { id: string; title: string }[],
    xp: null as number | null,
    addToQuickAdd: false,
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
  }
}

export function QuestCreateForm({ initialData, defaultDate, onSave, onClose, onSavePreset }: QuestCreateFormProps) {
  const [form, setForm] = useState(initialData ? questToForm(initialData) : emptyForm(defaultDate))

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function addSubQuest() {
    const id = crypto.randomUUID()
    update('subQuestInputs', [...form.subQuestInputs, { id, title: '' }])
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
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.rollover}
            onChange={(e) => update('rollover', e.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-xs text-slate-400">Rollover (appears daily until done)</span>
        </label>

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
      </div>

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

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-slate-400">Sub-quests</label>
          <button
            type="button"
            onClick={addSubQuest}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {form.subQuestInputs.length === 0 && (
          <p className="text-xs text-slate-600">No sub-quests. Add a checklist item.</p>
        )}
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
                className="text-slate-500 hover:text-red-400 transition-colors"
                aria-label="Remove sub-quest"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
