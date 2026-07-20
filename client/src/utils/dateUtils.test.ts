import { describe, it, expect } from 'vitest'
import { getTodayLocal } from './dateUtils'

describe('dateUtils', () => {
  it('getTodayLocal returns YYYY-MM-DD format', () => {
    const today = getTodayLocal()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it.todo('isQuestActiveOnDate')
  it.todo('getTodayLocal returns local calendar day')
  it.todo('isToday')
})
