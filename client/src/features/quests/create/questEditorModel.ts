import type { Quest, QuestStatus, RepeatType, QuickPreset } from '../../../types'
import { formatForDisplay, parseDate } from '../../../utils/dateUtils'

export interface QuestEditorValues {
  title: string
  description: string
  targetDate: string
  status: QuestStatus
  repeat: RepeatType
  repeatInterval: string
  repeatUnit: 'day' | 'week' | 'month'
  rollover: boolean
  subQuests: { id: string; title: string }[]
  pendingStep: string
  tags: string[]
  tagQuery: string
  externalUrl: string
  xp: string
  addToQuickAdd: boolean
}

export type EditorErrors = Partial<Record<'title' | 'targetDate' | 'repeatInterval' | 'externalUrl' | 'xp', string>>

export function editorValues(quest: Quest | undefined, date: string): QuestEditorValues {
  return {
    title: quest?.title ?? '', description: quest?.description ?? '',
    targetDate: quest?.targetDate || date, status: quest?.status ?? 'active',
    repeat: quest?.repeat ?? 'none', repeatInterval: String(quest?.repeatConfig?.interval ?? 1),
    repeatUnit: quest?.repeatConfig?.unit ?? 'day', rollover: quest?.rollover ?? false,
    subQuests: quest?.subQuests.map(({ id, title }) => ({ id, title })) ?? [],
    pendingStep: '', tags: quest?.tags ?? [], tagQuery: '', externalUrl: quest?.externalUrl ?? '',
    xp: quest?.xp == null ? '' : String(quest.xp), addToQuickAdd: false,
  }
}

export function editorFingerprint(value: QuestEditorValues): string {
  return JSON.stringify([
    value.title, value.description, value.targetDate, value.status, value.repeat,
    value.repeatInterval, value.repeatUnit, value.rollover, value.subQuests,
    value.pendingStep, value.tags, value.tagQuery, value.externalUrl, value.xp, value.addToQuickAdd,
  ])
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = parseDate(value)
  return Number.isFinite(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10))
}

export function cleanExternalLink(value: string): string | undefined {
  return value.trim().replace(/^https?:\/\//i, (protocol) => protocol.toLowerCase()) || undefined
}

export function externalLinkError(value: string): string | undefined {
  if (!value.trim()) return undefined
  try {
    if (!/^https?:\/\//i.test(value.trim())) throw new Error()
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error()
  } catch { return 'Use a complete http:// or https:// link.' }
  return undefined
}

export function validateEditor(value: QuestEditorValues, archived = false): EditorErrors {
  const errors: EditorErrors = {}
  if (!value.title.trim()) errors.title = 'Give this quest a title.'
  if (!archived && value.status === 'active') {
    if (!validDate(value.targetDate)) errors.targetDate = 'Choose a valid date.'
    if (value.repeat === 'custom' && (!Number.isSafeInteger(Number(value.repeatInterval)) || Number(value.repeatInterval) < 1)) {
      errors.repeatInterval = 'Use a whole number of 1 or more.'
    }
  }
  const linkError = externalLinkError(value.externalUrl)
  if (linkError) errors.externalUrl = linkError
  if (value.xp.trim() && (!Number.isFinite(Number(value.xp)) || Number(value.xp) < 0)) {
    errors.xp = 'XP must be a number of 0 or more.'
  }
  return errors
}

export function buildQuest(value: QuestEditorValues, original: Quest | undefined, now: string, id: string, createId: () => string): Quest {
  if (Object.keys(validateEditor(value, !!original?.archivedAt)).length) throw new Error('Please check the highlighted fields.')
  const subQuests = value.subQuests.filter((step) => step.title.trim()).map((step) => ({
    id: step.id, title: step.title.trim(),
    isCompleted: original?.subQuests.find((old) => old.id === step.id)?.isCompleted ?? false,
  }))
  if (value.pendingStep.trim()) subQuests.push({ id: createId(), title: value.pendingStep.trim(), isCompleted: false })
  return {
    ...original,
    id: original?.id ?? id, createdAt: original?.createdAt ?? now, updatedAt: now,
    title: value.title.trim(), description: value.description.trim() || undefined,
    targetDate: original?.archivedAt ? original.targetDate : value.status === 'inactive' ? '' : value.targetDate,
    status: original?.archivedAt ? original.status : value.status,
    repeat: original?.archivedAt ? original.repeat : value.repeat,
    repeatConfig: original?.archivedAt ? original.repeatConfig : value.repeat === 'custom'
      ? { interval: Number.isSafeInteger(Number(value.repeatInterval)) && Number(value.repeatInterval) >= 1 ? Number(value.repeatInterval) : 1, unit: value.repeatUnit } : undefined,
    rollover: original?.archivedAt ? original.rollover : value.rollover,
    subQuests, tags: [...new Set(value.tags.map((tag) => tag.trim()).filter(Boolean))],
    externalUrl: cleanExternalLink(value.externalUrl),
    xp: value.xp.trim() ? Number(value.xp) : null,
    archivedAt: original?.archivedAt ?? null,
  }
}

export function buildPreset(quest: Quest, id: string): QuickPreset {
  return { id, title: quest.title, externalUrl: quest.externalUrl, icon: quest.icon, isUserDefined: true, updatedAt: quest.updatedAt }
}

export function scheduleSummary(value: QuestEditorValues, archived = false): string {
  if (archived) return 'Archived quest. Saving keeps its existing schedule and archive state.'
  if (value.status === 'inactive') return 'Parked in the Library. It will not appear on the calendar until you schedule it.'
  if (!validDate(value.targetDate)) return 'Choose a date to schedule this quest.'
  const date = formatForDisplay(value.targetDate)
  const timing = value.repeat === 'none' ? `Once on ${date}.`
    : value.repeat === 'custom' ? `Every ${value.repeatInterval || '…'} ${value.repeatUnit}${value.repeatInterval === '1' ? '' : 's'}, starting ${date}.`
      : `${value.repeat[0].toUpperCase()}${value.repeat.slice(1)}, starting ${date}.`
  return `${timing}${value.rollover ? ' Unfinished quests carry forward until completed.' : ''}`
}
