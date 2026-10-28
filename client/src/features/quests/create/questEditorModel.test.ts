import { describe, expect, it } from 'vitest'
import type { Quest } from '../../../types'
import { getActiveQuestsForDate } from '../../../utils/dateUtils'
import { buildPreset, buildQuest, editorValues, externalLinkError, scheduleSummary, validateEditor } from './questEditorModel'

const date = '2026-10-28'
const now = '2026-10-28T12:00:00.000Z'
const quest: Quest = {
  id: 'original', title: 'Existing quest', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: now,
  targetDate: date, status: 'active', repeat: 'weekly', rollover: true, archivedAt: null,
  externalUrl: 'https://example.com', icon: 'book', xp: 10, maxRolloverDays: 8, sortOrder: 3,
  subQuests: [{ id: 'done', title: 'Completed step', isCompleted: true }], tags: ['Work'],
}

describe('quest editor model', () => {
  it('creates a one-off quest without implicitly carrying it forward', () => {
    const values = { ...editorValues(undefined, date), title: ' New quest ' }
    const result = buildQuest(values, undefined, now, 'new-id', () => 'step')
    expect(result).toMatchObject({ id: 'new-id', title: 'New quest', targetDate: date, status: 'active', repeat: 'none', rollover: false, createdAt: now })
    expect(scheduleSummary(values)).toContain('Once on')
  })

  it('preserves identity, hidden metadata and completed steps while editing', () => {
    const original = { ...quest, futureMetadata: 'keep me' }
    const values = { ...editorValues(original, date), title: 'Updated', subQuests: [{ id: 'done', title: 'Renamed step' }], tags: [' Work ', 'Work'] }
    const result = buildQuest(values, original, now, 'unused-id', () => 'unused-step')
    expect(result).toMatchObject({ id: quest.id, createdAt: quest.createdAt, icon: 'book', maxRolloverDays: 8, sortOrder: 3, futureMetadata: 'keep me', xp: 10, externalUrl: quest.externalUrl, tags: ['Work'] })
    expect(result.subQuests).toEqual([{ id: 'done', title: 'Renamed step', isCompleted: true }])
  })

  it('parks a quest outside the calendar and can schedule it again', () => {
    const values = { ...editorValues(quest, date), status: 'inactive' as const }
    const parked = buildQuest(values, quest, now, 'unused', () => 'step')
    expect(parked.targetDate).toBe('')
    expect(getActiveQuestsForDate([parked], date, [])).toEqual([])
    expect(scheduleSummary(values)).toContain('Parked in the Library')
    const scheduled = buildQuest({ ...editorValues(parked, date), status: 'active' }, parked, now, 'unused', () => 'step')
    expect(scheduled).toMatchObject({ id: quest.id, status: 'active', targetDate: date })
    expect(getActiveQuestsForDate([scheduled], date, [])).toHaveLength(1)
  })

  it('keeps archived scheduling intact even if supplied form fields differ', () => {
    const archived = { ...quest, status: 'inactive' as const, archivedAt: '2026-10-20' }
    const values = { ...editorValues(archived, date), targetDate: '', repeat: 'none' as const, rollover: false, status: 'active' as const }
    const result = buildQuest(values, archived, now, 'unused', () => 'step')
    expect(result).toMatchObject({ status: 'inactive', archivedAt: archived.archivedAt, targetDate: date, repeat: 'weekly', rollover: true })
  })

  it('includes an unfinished step field on save and builds a custom schedule', () => {
    const values = { ...editorValues(quest, date), repeat: 'custom' as const, repeatInterval: '3', repeatUnit: 'day' as const, pendingStep: ' One more step ' }
    const result = buildQuest(values, quest, now, 'unused', () => 'pending')
    expect(result.repeatConfig).toEqual({ interval: 3, unit: 'day' })
    expect(result.subQuests[1]).toEqual({ id: 'pending', title: 'One more step', isCompleted: false })
  })

  it('rejects impossible dates, unsafe links, invalid intervals and XP', () => {
    const values = { ...editorValues(undefined, date), title: 'Quest', targetDate: '2026-02-30', repeat: 'custom' as const, repeatInterval: '1.5', externalUrl: 'javascript:alert(1)', xp: '-1' }
    expect(Object.keys(validateEditor(values)).sort()).toEqual(['externalUrl', 'repeatInterval', 'targetDate', 'xp'])
    expect(() => buildQuest(values, undefined, now, 'new', () => 'step')).toThrow()
    expect(validateEditor({ ...values, status: 'inactive', externalUrl: '', xp: '0' })).toEqual({})
    expect(buildQuest({ ...values, status: 'inactive', externalUrl: '', xp: '0' }, undefined, now, 'new', () => 'step').repeatConfig).toEqual({ interval: 1, unit: 'day' })
  })

  it('requires full link syntax and normalizes protocol case for backup compatibility', () => {
    expect(externalLinkError('http:/example.com')).toBeTruthy()
    const values = { ...editorValues(undefined, date), title: 'Link', externalUrl: ' HTTPS://example.com/path ' }
    expect(validateEditor(values)).toEqual({})
    expect(buildQuest(values, undefined, now, 'link', () => 'step').externalUrl).toBe('https://example.com/path')
  })

  it('saves only reusable preset fields, not the current schedule', () => {
    expect(buildPreset(quest, 'preset')).toEqual({ id: 'preset', title: quest.title, externalUrl: quest.externalUrl, icon: quest.icon, isUserDefined: true, updatedAt: quest.updatedAt })
  })
})
