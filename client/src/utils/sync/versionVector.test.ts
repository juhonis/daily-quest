import { describe, expect, it } from 'vitest'
import {
  compareVersions,
  advanceVersion,
  mergeVersions,
  type VersionRelation,
  type VersionVector,
} from './versionVector'

interface ComparisonCase {
  name: string
  left: VersionVector
  right: VersionVector
  expected: VersionRelation
}

const cases: ComparisonCase[] = [
  {
    name: 'empty vectors are equal',
    left: {},
    right: {},
    expected: 'equal',
  },
  {
    name: 'matching counters are equal',
    left: { a: 1 },
    right: { a: 1 },
    expected: 'equal',
  },
  {
    name: 'a smaller counter is before',
    left: { a: 1 },
    right: { a: 2 },
    expected: 'before',
  },
  {
    name: 'a larger counter is after',
    left: { a: 2 },
    right: { a: 1 },
    expected: 'after',
  },
  {
    name: 'a missing replica counter counts as zero',
    left: { a: 1 },
    right: { a: 1, b: 1 },
    expected: 'before',
  },
  {
    name: 'independent edits to a shared version are concurrent',
    left: { a: 2 },
    right: { a: 1, b: 1 },
    expected: 'concurrent',
  },
  {
    name: 'changes from different replicas are concurrent',
    left: { a: 1 },
    right: { b: 1 },
    expected: 'concurrent',
  },
  {
    name: 'an explicit zero equals a missing counter',
    left: {},
    right: { a: 0 },
    expected: 'equal',
  },
  {
    name: 'object key order does not affect equality',
    left: { a: 2, b: 3 },
    right: { b: 3, a: 2 },
    expected: 'equal',
  },
  {
    name: 'a version including all earlier changes is after',
    left: { a: 2, b: 3 },
    right: { a: 1, b: 2 },
    expected: 'after',
  },
  {
    name: 'replica IDs that match inherited property names work',
    left: {},
    right: { constructor: 1 },
    expected: 'before',
  },
]

const reversedRelation: Record<VersionRelation, VersionRelation> = {
  equal: 'equal',
  before: 'after',
  after: 'before',
  concurrent: 'concurrent',
}

describe('version operations', () => {
  it('combines known history without modifying inputs', () => {
    const a = Object.freeze({ a: 2, b: 1 })
    const b = Object.freeze({ a: 1, c: 3 })
    const merged = mergeVersions(a, b)
    expect(merged).toEqual({ a: 2, b: 1, c: 3 })
    expect(mergeVersions(b, a)).toEqual(merged)
    expect(mergeVersions(merged, a)).toEqual(merged)
  })

  it('advances only the local replica', () => {
    const version = Object.freeze({ a: 2 })
    expect(advanceVersion(version, 'b')).toEqual({ a: 2, b: 1 })
    expect(compareVersions(advanceVersion(version, 'a'), version)).toBe('after')
  })

  it('handles inherited names as ordinary replica IDs', () => {
    expect(advanceVersion({}, 'constructor')).toEqual({ constructor: 1 })
    expect(mergeVersions({ ['__proto__']: 2 })).toEqual({ ['__proto__']: 2 })
  })

  it('rejects exhausted counters and empty IDs', () => {
    expect(() => advanceVersion({ a: Number.MAX_SAFE_INTEGER }, 'a')).toThrow()
    expect(() => advanceVersion({}, '')).toThrow()
  })
})

describe('compareVersions', () => {
  it.each(cases)('$name', ({ left, right, expected }) => {
    expect(compareVersions(left, right)).toBe(expected)
  })

  it.each(cases)(
    'reverses the relation correctly: $name',
    ({ left, right, expected }) => {
      expect(compareVersions(right, left)).toBe(reversedRelation[expected])
    },
  )

  it('does not modify either input', () => {
    const left = Object.freeze({ a: 2 })
    const right = Object.freeze({ a: 1, b: 1 })

    expect(compareVersions(left, right)).toBe('concurrent')
    expect(left).toEqual({ a: 2 })
    expect(right).toEqual({ a: 1, b: 1 })
  })
})
