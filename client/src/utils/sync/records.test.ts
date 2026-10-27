import { describe, expect, it } from 'vitest'
import { mergeRecords, primary, writeRecord, type SyncData, type SyncRecord } from './records'

const note = (value: unknown, version = {}): SyncRecord => ({ kind: 'notes', id: 'n', heads: [{ value, version }] })
const data = (...records: SyncRecord[]): SyncData => ({ records })

describe('record merging', () => {
  it('converges regardless of peer order and repeated syncs', () => {
    const a = data(note('laptop', { a: 1 }))
    const b = data(note('desktop', { b: 1 }))
    const merged = mergeRecords(a, b)
    expect(mergeRecords(b, a)).toEqual(merged)
    expect(mergeRecords(merged, a, b)).toEqual(merged)
    expect(merged.records.filter((r) => r.kind === 'recovery')).toHaveLength(1)
  })

  it('uses causal succession rather than clocks', () => {
    const old = note('old', { a: 1 })
    const updated = writeRecord(old, 'new', 'b')
    expect(primary(mergeRecords(data(old, updated)).records[0]).value).toBe('new')
  })

  it('keeps concurrent deletion and recovers edited content', () => {
    const merged = mergeRecords(data(note(null, { a: 1 })), data(note('edit', { b: 1 })))
    expect(primary(merged.records.find((r) => r.kind === 'notes')!).value).toBeNull()
    expect(merged.records.some((r) => r.kind === 'recovery')).toBe(true)
  })

  it('does not resurrect dismissed recoveries', () => {
    const merged = mergeRecords(data(note('a', { a: 1 }), note('b', { b: 1 })))
    const recovery = merged.records.find((r) => r.kind === 'recovery')!
    const dismissed = data(writeRecord(recovery, null, 'a'))
    expect(primary(mergeRecords(merged, dismissed).records.find((r) => r.kind === 'recovery')!).value).toBeNull()
  })

  it('preserves differing legacy content but deduplicates identical content', () => {
    expect(mergeRecords(data(note('same'), note('same'))).records).toHaveLength(1)
    expect(mergeRecords(data(note('a'), note('b'))).records).toHaveLength(2)
  })

  it('syncs transitively through a third device', () => {
    const a = data(note('a', { a: 1 }))
    const b = data(note('b', { b: 1 }))
    const c = data(note('c', { c: 1 }))
    expect(mergeRecords(mergeRecords(a, b), c)).toEqual(mergeRecords(a, mergeRecords(b, c)))
  })
})
