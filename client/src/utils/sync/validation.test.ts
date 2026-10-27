import { describe, expect, it } from 'vitest'
import { parseSyncData } from './validation'

const data = (value: unknown = '#ffffff', version: unknown = { a: 1 }) => ({ records: [{ kind: 'tagColors', id: 'tag', heads: [{ value, version }] }] })

describe('sync validation', () => {
  it('validates color revisions and tombstones', () => {
    expect(parseSyncData(data()).records).toHaveLength(1)
    expect(parseSyncData(data(null)).records[0].heads[0].value).toBeNull()
  })
  it('rejects unsafe values, invalid counters and duplicates', () => {
    expect(() => parseSyncData(data('url(evil)'))).toThrow()
    expect(() => parseSyncData(data('#ffffff', { a: -1 }))).toThrow()
    expect(() => parseSyncData(data('#ffffff', { a: 1.5 }))).toThrow()
    const valid = data()
    expect(() => parseSyncData({ records: [...valid.records, ...valid.records] })).toThrow()
  })
  it('does not add optional fields to revision content', () => {
    const value = { id: 'note', title: 'Title', content: 'Body', color: '#ffffff', createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    const raw = { records: [{ kind: 'notes', id: 'note', heads: [{ version: {}, value }] }] }
    expect(parseSyncData(raw)).toEqual(raw)
  })
})
