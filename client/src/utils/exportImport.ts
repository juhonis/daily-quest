import type {
  AppState,
  ImportPayload,
  Note,
  PanelId,
  Quest,
  QuickPreset,
  CompletionRecord,
  SubQuest,
} from '../types'
import {
  normalizeQuest,
  normalizeCompletion,
  normalizeNote,
  normalizeQuickPreset,
} from './normalize'

const APP = 'daily-quest'
export const CURRENT_SCHEMA_VERSION = 1

const REPEAT_TYPES = new Set(['none', 'daily', 'weekly', 'monthly', 'custom'])
const STATUSES = new Set(['active', 'inactive'])
const PANEL_IDS = new Set<PanelId>(['daily', 'repeating', 'important', 'rollover', 'done'])
const LOCATION_MODES = new Set<'auto' | 'manual'>(['auto', 'manual'])
const REPEAT_UNITS = new Set<'day' | 'week' | 'month'>(['day', 'week', 'month'])

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
const RGB_COLOR_RE = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/
const HTTP_URL_RE = /^https?:\/\//

function fail(message: string): never {
  throw new Error(message)
}

function expectRecord(v: unknown, path: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    fail(`${path} must be an object`)
  }
  return v as Record<string, unknown>
}

function expectString(v: unknown, path: string): string {
  if (typeof v !== 'string') fail(`${path} must be a string`)
  return v
}

function expectBoolean(v: unknown, path: string): boolean {
  if (typeof v !== 'boolean') fail(`${path} must be a boolean`)
  return v
}

function expectNumber(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${path} must be a number`)
  return v
}

function expectArray(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(`${path} must be an array`)
  return v
}

function expectEnum<T extends string>(v: unknown, allowed: ReadonlySet<T>, path: string): T {
  if (typeof v !== 'string' || !allowed.has(v as T)) fail(`${path} is invalid`)
  return v as T
}

function expectColor(v: unknown, path: string): string {
  if (typeof v !== 'string' || (!HEX_COLOR_RE.test(v) && !RGB_COLOR_RE.test(v))) {
    fail(`${path} is not a valid color`)
  }
  return v
}

function expectHttpsUrl(v: unknown, path: string): string {
  if (typeof v !== 'string' || !HTTP_URL_RE.test(v)) {
    fail(`${path} must be an http(s) URL`)
  }
  return v
}

function optionalString(v: unknown, path: string): string | undefined {
  if (v === undefined || v === null) return undefined
  return expectString(v, path)
}

function nullableString(v: unknown, path: string): string | null {
  if (v === undefined || v === null) return null
  return expectString(v, path)
}

function nullableNumber(v: unknown, path: string): number | null {
  if (v === undefined || v === null) return null
  const n = expectNumber(v, path)
  return Number.isFinite(n) ? n : fail(`${path} must be a number`)
}

function optionalNumber(v: unknown, path: string): number | undefined {
  if (v === undefined || v === null) return undefined
  return expectNumber(v, path)
}

function optionalStringArray(v: unknown, path: string): string[] | undefined {
  if (v === undefined || v === null) return undefined
  return expectArray(v, path).map((item) => expectString(item, `${path}[]`))
}

function guardSubQuest(v: unknown): SubQuest {
  const r = expectRecord(v, 'subQuest')
  return {
    id: expectString(r.id, 'subQuest.id'),
    title: expectString(r.title, 'subQuest.title'),
    isCompleted: expectBoolean(r.isCompleted, 'subQuest.isCompleted'),
  }
}

function guardQuest(v: unknown): Quest {
  const r = expectRecord(v, 'quest')
  const id = expectString(r.id, 'quest.id')
  const title = expectString(r.title, 'quest.title')
  const createdAt = expectString(r.createdAt, 'quest.createdAt')
  const targetDate = expectString(r.targetDate, 'quest.targetDate')
  const repeat = expectEnum(r.repeat, REPEAT_TYPES, 'quest.repeat')
  const rollover = expectBoolean(r.rollover, 'quest.rollover')
  const status = expectEnum(r.status, STATUSES, 'quest.status')
  const subQuests = expectArray(r.subQuests, 'quest.subQuests').map(guardSubQuest)
  if (r.externalUrl != null) expectHttpsUrl(r.externalUrl, 'quest.externalUrl')

  const quest = {
    id,
    title,
    createdAt,
    targetDate,
    repeat,
    rollover,
    status,
    subQuests,
    description: optionalString(r.description, 'quest.description'),
    externalUrl: optionalString(r.externalUrl, 'quest.externalUrl'),
    icon: optionalString(r.icon, 'quest.icon'),
    archivedAt: nullableString(r.archivedAt, 'quest.archivedAt'),
    xp: nullableNumber(r.xp, 'quest.xp'),
    maxRolloverDays: nullableNumber(r.maxRolloverDays, 'quest.maxRolloverDays'),
    sortOrder: optionalNumber(r.sortOrder, 'quest.sortOrder'),
    tags: optionalStringArray(r.tags, 'quest.tags'),
    repeatConfig: r.repeatConfig == null ? undefined : guardRepeatConfig(r.repeatConfig),
    updatedAt: optionalString(r.updatedAt, 'quest.updatedAt'),
  } as Quest
  return normalizeQuest(quest)
}

function guardRepeatConfig(v: unknown): Quest['repeatConfig'] {
  const r = expectRecord(v, 'quest.repeatConfig')
  return {
    interval: expectNumber(r.interval, 'quest.repeatConfig.interval'),
    unit: expectEnum(r.unit, REPEAT_UNITS, 'quest.repeatConfig.unit'),
  }
}

function guardCompletion(v: unknown): CompletionRecord {
  const r = expectRecord(v, 'completion')
  const completion = {
    id: expectString(r.id, 'completion.id'),
    questId: expectString(r.questId, 'completion.questId'),
    completedOn: expectString(r.completedOn, 'completion.completedOn'),
    updatedAt: optionalString(r.updatedAt, 'completion.updatedAt'),
  } as CompletionRecord
  return normalizeCompletion(completion)
}

function guardNote(v: unknown): Note {
  const r = expectRecord(v, 'note')
  const note = {
    id: expectString(r.id, 'note.id'),
    title: expectString(r.title, 'note.title'),
    content: expectString(r.content, 'note.content'),
    color: expectColor(r.color, 'note.color'),
    createdAt: expectString(r.createdAt, 'note.createdAt'),
    tags: optionalStringArray(r.tags, 'note.tags'),
    updatedAt: optionalString(r.updatedAt, 'note.updatedAt'),
    archivedAt: nullableString(r.archivedAt, 'note.archivedAt'),
  } as Note
  return normalizeNote(note)
}

function guardQuickPreset(v: unknown): QuickPreset {
  const r = expectRecord(v, 'quickPreset')
  if (r.externalUrl != null) expectHttpsUrl(r.externalUrl, 'quickPreset.externalUrl')
  const preset = {
    id: expectString(r.id, 'quickPreset.id'),
    title: expectString(r.title, 'quickPreset.title'),
    externalUrl: optionalString(r.externalUrl, 'quickPreset.externalUrl'),
    icon: optionalString(r.icon, 'quickPreset.icon'),
    isUserDefined: expectBoolean(r.isUserDefined, 'quickPreset.isUserDefined'),
    updatedAt: optionalString(r.updatedAt, 'quickPreset.updatedAt'),
  } as QuickPreset
  return normalizeQuickPreset(preset)
}

function guardPanelId(v: unknown, path: string): PanelId {
  return expectEnum(v, PANEL_IDS, path)
}

function guardColorMap(v: unknown, path: string): Record<string, string> {
  const r = expectRecord(v, path)
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(r)) {
    out[key] = expectColor(value, `${path}.${key}`)
  }
  return out
}

function guardPanelMap(v: unknown, path: string): Partial<Record<PanelId, PanelId>> {
  const r = expectRecord(v, path)
  const out: Partial<Record<PanelId, PanelId>> = {}
  for (const [key, value] of Object.entries(r)) {
    out[guardPanelId(key, `${path}.${key}`)] = guardPanelId(value, `${path}.${key}`)
  }
  return out
}

function assertUniqueQuests(quests: Quest[]): void {
  const seen = new Set<string>()
  for (const q of quests) {
    if (seen.has(q.id)) fail(`Duplicate quest id: ${q.id}`)
    seen.add(q.id)
  }
}

function assertUniqueCompletions(completions: CompletionRecord[]): void {
  const seen = new Set<string>()
  for (const c of completions) {
    const key = `${c.questId}|${c.completedOn}`
    if (seen.has(key)) fail(`Duplicate completion for quest ${c.questId} on ${c.completedOn}`)
    seen.add(key)
  }
}

function assertUniqueIds<T extends { id: string }>(items: T[], label: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) fail(`Duplicate ${label} id: ${item.id}`)
    seen.add(item.id)
  }
}

export function parseImport(json: string): ImportPayload {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    fail('This file is not valid JSON.')
  }

  const root = expectRecord(raw, 'file')
  if (root.app !== APP) fail('This file is not a Daily Quest export.')

  const version = root.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    fail('This file has no valid schema version.')
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    fail(`This backup was made by a newer version of Daily Quest (schema v${version}). Update the app to import it.`)
  }

  const d = expectRecord(root.data, 'data')

  const quests = expectArray(d.quests ?? [], 'data.quests').map(guardQuest)
  const completions = expectArray(d.completions ?? [], 'data.completions').map(guardCompletion)
  const notes = expectArray(d.notes ?? [], 'data.notes').map(guardNote)
  const quickPresets = expectArray(d.quickPresets ?? [], 'data.quickPresets').map(guardQuickPreset)
  const panelOrder = expectArray(d.panelOrder ?? [], 'data.panelOrder').map((v) =>
    guardPanelId(v, 'data.panelOrder[]'),
  )
  const hiddenPanels = expectArray(d.hiddenPanels ?? [], 'data.hiddenPanels').map((v) =>
    guardPanelId(v, 'data.hiddenPanels[]'),
  )
  const mergedPanels =
    d.mergedPanels == null ? {} : guardPanelMap(d.mergedPanels, 'data.mergedPanels')
  const tagPanels = expectArray(d.tagPanels ?? [], 'data.tagPanels').map((v) =>
    expectString(v, 'data.tagPanels[]'),
  )
  const tagColors = d.tagColors == null ? {} : guardColorMap(d.tagColors, 'data.tagColors')
  const noteTagColors =
    d.noteTagColors == null ? {} : guardColorMap(d.noteTagColors, 'data.noteTagColors')
  const locationMode =
    d.locationMode == null ? 'auto' : expectEnum(d.locationMode, LOCATION_MODES, 'data.locationMode')
  const locationName =
    d.locationName == null ? '' : expectString(d.locationName, 'data.locationName')

  assertUniqueQuests(quests)
  assertUniqueCompletions(completions)
  assertUniqueIds(notes, 'note')
  assertUniqueIds(quickPresets, 'quick preset')

  return {
    quests,
    completions,
    notes,
    quickPresets,
    panelOrder,
    hiddenPanels,
    mergedPanels,
    tagPanels,
    tagColors,
    noteTagColors,
    locationMode,
    locationName,
  }
}

export function exportData(state: AppState): string {
  const data = {
    quests: state.quests,
    completions: state.completions,
    notes: state.notes,
    quickPresets: state.quickPresets,
    panelOrder: state.panelOrder,
    hiddenPanels: state.hiddenPanels,
    mergedPanels: state.mergedPanels,
    tagPanels: state.tagPanels,
    tagColors: state.tagColors,
    noteTagColors: state.noteTagColors,
    locationMode: state.locationMode,
    locationName: state.locationName,
  }
  return JSON.stringify(
    {
      app: APP,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2,
  )
}

export function downloadJson(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
