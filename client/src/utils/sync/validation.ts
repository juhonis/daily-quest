import { guardCompletion, guardNote, guardQuest, guardQuickPreset } from '../exportImport'
import { completionKey } from './state'
import { canonical, recordKey, type RecordKind, type Revision, type SyncData, type SyncRecord } from './records'

export const MAX_SYNC_BYTES = 8 * 1024 * 1024
const kinds = new Set<RecordKind>(['quests', 'notes', 'completions', 'quickPresets', 'tagColors', 'noteTagColors', 'recovery'])
const color = /^(#[0-9a-fA-F]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid sync object.')
  return value as Record<string, unknown>
}

function validateValue(kind: RecordKind, id: string, value: unknown): unknown {
  if (value === null) return null
  if (kind === 'recovery') {
    const recovery = object(value)
    if (!kinds.has(recovery.kind as RecordKind) || recovery.kind === 'recovery' || typeof recovery.id !== 'string') throw new Error('Invalid recovery record.')
    return { kind: recovery.kind, id: recovery.id, value: validateValue(recovery.kind as RecordKind, recovery.id, recovery.value) }
  }
  if (kind === 'tagColors' || kind === 'noteTagColors') {
    if (typeof value !== 'string' || !color.test(value)) throw new Error('Invalid sync color.')
    return value
  }
  const guards = { quests: guardQuest, notes: guardNote, completions: guardCompletion, quickPresets: guardQuickPreset }
  const entity = guards[kind](value)
  const expectedId = kind === 'completions' ? completionKey(guardCompletion(value)) : entity.id
  if (expectedId !== id) throw new Error('Sync identity mismatch.')
  return kind === 'completions' ? { ...entity, id } : entity
}

export function parseSyncData(raw: unknown): SyncData {
  if (new TextEncoder().encode(JSON.stringify(raw)).length > MAX_SYNC_BYTES) throw new Error('Sync data exceeds the 8 MiB limit.')
  const root = object(raw)
  if (!Array.isArray(root.records) || root.records.length > 20000) throw new Error('Invalid sync record count.')
  const keys = new Set<string>()
  const records: SyncRecord[] = root.records.map((value) => {
    const record = object(value)
    if (!kinds.has(record.kind as RecordKind) || typeof record.id !== 'string' || record.id.length > MAX_SYNC_BYTES) throw new Error('Invalid sync record identity.')
    if (!Array.isArray(record.heads) || record.heads.length < 1 || record.heads.length > 100) throw new Error('Invalid revision count.')
    const kind = record.kind as RecordKind
    const id = record.id
    const heads: Revision[] = record.heads.map((rawHead) => {
      const head = object(rawHead)
      const entries = Object.entries(object(head.version))
      if (entries.length > 1000 || entries.some(([replica, n]) => !replica || replica.length > 100 || !Number.isSafeInteger(n) || (n as number) < 0)) throw new Error('Invalid revision vector.')
      return { version: Object.fromEntries(entries) as Revision['version'], value: validateValue(kind, id, head.value) }
    })
    const parsed = { kind, id, heads }
    const key = recordKey(parsed)
    if (keys.has(key)) throw new Error('Duplicate sync record.')
    keys.add(key)
    // Parsing fills optional legacy fields, but revision identity must remain stable.
    if (canonical(heads.map((h) => h.version)).length > MAX_SYNC_BYTES) throw new Error('Revision metadata too large.')
    return parsed
  })
  return { records }
}
