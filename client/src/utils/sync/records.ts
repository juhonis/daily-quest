import { advanceVersion, compareVersions, mergeVersions, type VersionVector } from './versionVector'

export type RecordKind = 'quests' | 'notes' | 'completions' | 'quickPresets' | 'tagColors' | 'noteTagColors' | 'recovery'
export interface Revision {
  version: VersionVector
  value: unknown | null
}
export interface SyncRecord {
  kind: RecordKind
  id: string
  heads: Revision[]
}
export interface SyncData {
  records: SyncRecord[]
}
export interface Recovery {
  kind: Exclude<RecordKind, 'recovery'>
  id: string
  value: unknown
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

export const recordKey = (record: Pick<SyncRecord, 'kind' | 'id'>) => canonical([record.kind, record.id])

export function mergeHeads(heads: Revision[]): Revision[] {
  const unique = [...new Map(heads.map((head) => [canonical(head), head])).values()]
  return unique.filter((head) => !unique.some((other) =>
    compareVersions(head.version, other.version) === 'before',
  )).sort((a, b) => canonical(a) < canonical(b) ? -1 : canonical(a) > canonical(b) ? 1 : 0)
}

// Deletion wins concurrent races; retained recovery records preserve edited content.
export function primary(record: SyncRecord): Revision {
  return record.heads.find((head) => head.value === null) ?? record.heads[record.heads.length - 1]
}

export function mergeRecords(...datasets: SyncData[]): SyncData {
  const records = new Map<string, SyncRecord>()
  for (const data of datasets) {
    for (const record of data.records) {
      const key = recordKey(record)
      const previous = records.get(key)
      records.set(key, { ...record, heads: mergeHeads([...(previous?.heads ?? []), ...record.heads]) })
    }
  }
  for (const record of [...records.values()]) {
    if (!['notes', 'quests', 'quickPresets'].includes(record.kind)) continue
    const winner = primary(record)
    for (const head of record.heads) {
      if (head.value === null || canonical(head.value) === canonical(winner.value)) continue
      // Full identity avoids hash collisions and is stable across retries and peers.
      const id = canonical([record.kind, record.id, head])
      const recovery: SyncRecord = {
        kind: 'recovery', id,
        heads: [{ version: {}, value: { kind: record.kind, id: record.id, value: head.value } }],
      }
      const key = recordKey(recovery)
      records.set(key, { ...recovery, heads: mergeHeads([...(records.get(key)?.heads ?? []), ...recovery.heads]) })
    }
  }
  return { records: [...records.values()].sort((a, b) => recordKey(a) < recordKey(b) ? -1 : 1) }
}

export function writeRecord(record: SyncRecord, value: unknown | null, replica: string): SyncRecord {
  return {
    ...record,
    heads: [{ version: advanceVersion(mergeVersions(...record.heads.map((h) => h.version)), replica), value }],
  }
}
