import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from './createId'

describe('createId', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('uses the native UUID API when available', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'native-id' })
    expect(createId()).toBe('native-id')
  })
  it('creates distinct v4 UUIDs using secure bytes when randomUUID is unavailable', () => {
    const secure = crypto.getRandomValues.bind(crypto)
    vi.stubGlobal('crypto', { getRandomValues: secure })
    const ids = Array.from({ length: 100 }, createId)
    expect(new Set(ids).size).toBe(100)
    for (const id of ids) expect(id).toMatch(/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/)
  })
})
