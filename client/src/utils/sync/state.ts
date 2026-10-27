import type { AppState, CompletionRecord, Note, Quest, QuickPreset } from '../../types'
import { canonical, mergeRecords, primary, recordKey, writeRecord, type SyncData, type SyncRecord } from './records'

export type SyncFields = Pick<AppState, 'quests' | 'notes' | 'completions' | 'quickPresets' | 'tagColors' | 'noteTagColors'>
export const completionKey = (c: CompletionRecord) => JSON.stringify([c.questId, c.completedOn])

function snapshot(state: SyncFields): SyncRecord[] {
  const records: SyncRecord[] = []
  for (const kind of ['quests', 'notes', 'completions', 'quickPresets'] as const) {
    for (const value of state[kind]) {
      const id = kind === 'completions' ? completionKey(value as CompletionRecord) : value.id
      const normalized = kind === 'completions' ? { ...value, id } : value
      records.push({ kind, id, heads: [{ version: {}, value: normalized }] })
    }
  }
  for (const kind of ['tagColors', 'noteTagColors'] as const) {
    for (const [id, value] of Object.entries(state[kind])) records.push({ kind, id, heads: [{ version: {}, value }] })
  }
  return records
}

export function ensureSync(state: SyncFields & { sync?: SyncData }): SyncData {
  const existing = state.sync ?? { records: [] }
  const keys = new Set(existing.records.map(recordKey))
  return mergeRecords(existing, { records: snapshot(state).filter((r) => !keys.has(recordKey(r))) })
}

export function trackChanges(before: SyncFields & { sync?: SyncData }, after: SyncFields, replica: string): SyncData {
  const data = ensureSync(before)
  const previous = new Map(snapshot(before).map((r) => [recordKey(r), r]))
  const next = new Map(snapshot(after).map((r) => [recordKey(r), r]))
  const records = new Map(data.records.map((r) => [recordKey(r), r]))
  for (const key of new Set([...previous.keys(), ...next.keys()])) {
    const oldValue = previous.get(key)?.heads[0].value ?? null
    const value = next.get(key)?.heads[0].value ?? null
    if (canonical(oldValue) === canonical(value)) continue
    const record = records.get(key) ?? next.get(key)!
    records.set(key, writeRecord(record, value, replica))
  }
  return mergeRecords({ records: [...records.values()] })
}

export function projectSync(data: SyncData): SyncFields {
  const fields: SyncFields = { quests: [], notes: [], completions: [], quickPresets: [], tagColors: {}, noteTagColors: {} }
  for (const record of data.records) {
    const value = primary(record).value
    if (value === null) continue
    switch (record.kind) {
      case 'quests': fields.quests.push(value as Quest); break
      case 'notes': fields.notes.push(value as Note); break
      case 'completions': fields.completions.push(value as CompletionRecord); break
      case 'quickPresets': fields.quickPresets.push(value as QuickPreset); break
      case 'tagColors': Object.defineProperty(fields.tagColors, record.id, { value, enumerable: true, configurable: true, writable: true }); break
      case 'noteTagColors': Object.defineProperty(fields.noteTagColors, record.id, { value, enumerable: true, configurable: true, writable: true }); break
    }
  }
  const liveQuests = new Set(fields.quests.map((q) => q.id))
  fields.completions = fields.completions.filter((c) => liveQuests.has(c.questId))
  return fields
}

export function restoreSync(current: SyncFields & { sync?: SyncData }, desired: SyncFields, backup: SyncData | undefined, replica: string): SyncData {
  const context = mergeRecords(ensureSync(current), backup ?? { records: [] })
  const desiredRecords = new Map(snapshot(desired).map((r) => [recordKey(r), r]))
  const records = new Map(context.records.map((r) => [recordKey(r), r]))
  for (const key of new Set([...records.keys(), ...desiredRecords.keys()])) {
    const record = records.get(key) ?? desiredRecords.get(key)!
    if (record.kind === 'recovery') continue
    records.set(key, writeRecord(record, desiredRecords.get(key)?.heads[0].value ?? null, replica))
  }
  return mergeRecords({ records: [...records.values()] })
}
