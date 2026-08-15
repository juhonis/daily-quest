import { describe, it, expect } from 'vitest'
import {
  getTodayLocal,
  parseDate,
  formatForDisplay,
  formatMonthYear,
  addDays,
  isBefore,
  isAfter,
  diffDays,
  getStartOfWeek,
  getWeekdayLabels,
  getMonthMatrix,
  addMonths,
  hasCompletionOnDate,
  hasCompletionBetween,
  getLastCompletionDate,
  doesRepeatRuleMatch,
  isQuestActiveOnDate,
  getActiveQuestsForDate,
  getFinishedQuestsForDate,
  groupQuestsByActivityReason,
} from './dateUtils'
import type { Quest, CompletionRecord, SubQuest } from '../types'

function q(overrides: Partial<Quest> = {}): Quest {
  const base: SubQuest[] = []
  return {
    id: 'q1',
    title: 'Test Quest',
    description: undefined,
    createdAt: '2026-07-01',
    updatedAt: '2026-07-01',
    targetDate: '2026-07-20',
    repeat: 'none',
    repeatConfig: undefined,
    rollover: false,
    subQuests: base,
    externalUrl: undefined,
    icon: undefined,
    status: 'active',
    archivedAt: null,
    xp: null,
    maxRolloverDays: null,
    sortOrder: undefined,
    ...overrides,
  }
}

function cr(overrides: Partial<CompletionRecord> = {}): CompletionRecord {
  return {
    id: 'cr1',
    questId: 'q1',
    completedOn: '2026-07-20',
    updatedAt: '2026-07-01',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------
describe('getTodayLocal', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(getTodayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('parseDate', () => {
  it('parses YYYY-MM-DD to local Date', () => {
    const d = parseDate('2026-07-20')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6)
    expect(d.getDate()).toBe(20)
  })

  it('handles dates with leading zeros', () => {
    const d = parseDate('2026-01-05')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(5)
  })
})

describe('formatForDisplay', () => {
  it('formats to "MMM d, yyyy"', () => {
    expect(formatForDisplay('2026-07-20')).toBe('Jul 20, 2026')
  })

  it('formats February correctly', () => {
    expect(formatForDisplay('2026-02-03')).toBe('Feb 3, 2026')
  })
})

describe('formatMonthYear', () => {
  it('formats to "MMMM yyyy"', () => {
    expect(formatMonthYear('2026-07-20')).toBe('July 2026')
  })
})

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-07-20', 5)).toBe('2026-07-25')
  })

  it('crosses month boundary', () => {
    expect(addDays('2026-07-30', 5)).toBe('2026-08-04')
  })

  it('crosses year boundary', () => {
    expect(addDays('2026-12-28', 5)).toBe('2027-01-02')
  })

  it('subtracts days with negative n', () => {
    expect(addDays('2026-07-20', -5)).toBe('2026-07-15')
  })

  it('zero returns same day', () => {
    expect(addDays('2026-07-20', 0)).toBe('2026-07-20')
  })
})

describe('addMonths', () => {
  it('adds positive months', () => {
    expect(addMonths('2026-07-20', 2)).toBe('2026-09-20')
  })

  it('subtracts months with negative n', () => {
    expect(addMonths('2026-07-20', -2)).toBe('2026-05-20')
  })

  it('crosses year boundary', () => {
    expect(addMonths('2026-11-10', 3)).toBe('2027-02-10')
  })

  it('clamps day to end of target month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('zero returns same day', () => {
    expect(addMonths('2026-03-15', 0)).toBe('2026-03-15')
  })
})

describe('isBefore / isAfter', () => {
  it('isBefore: same dates are not before', () => {
    expect(isBefore('2026-07-20', '2026-07-20')).toBe(false)
  })

  it('isBefore: earlier date is before later', () => {
    expect(isBefore('2026-07-19', '2026-07-20')).toBe(true)
  })

  it('isAfter: later date is after earlier', () => {
    expect(isAfter('2026-07-21', '2026-07-20')).toBe(true)
  })
})

describe('diffDays', () => {
  it('positive difference', () => {
    expect(diffDays('2026-07-25', '2026-07-20')).toBe(5)
  })

  it('negative difference', () => {
    expect(diffDays('2026-07-20', '2026-07-25')).toBe(-5)
  })

  it('same day difference', () => {
    expect(diffDays('2026-07-20', '2026-07-20')).toBe(0)
  })

  it('cross month difference', () => {
    expect(diffDays('2026-08-04', '2026-07-30')).toBe(5)
  })
})

describe('getStartOfWeek', () => {
  it('returns Monday by default (ISO)', () => {
    // 2026-07-20 is a Monday
    expect(getStartOfWeek('2026-07-20')).toBe('2026-07-20')
    // 2026-07-22 is Wednesday, Monday is 2026-07-20
    expect(getStartOfWeek('2026-07-22')).toBe('2026-07-20')
  })

  it('returns Sunday when weekStartsOn=0', () => {
    // 2026-07-19 is Sunday
    expect(getStartOfWeek('2026-07-22', 0)).toBe('2026-07-19')
  })
})

describe('getWeekdayLabels', () => {
  it('defaults to Monday start', () => {
    expect(getWeekdayLabels()).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
  })

  it('Sunday start', () => {
    expect(getWeekdayLabels(0)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S'])
  })
})

describe('getMonthMatrix', () => {
  it('returns 5 or 6 rows of 7 columns', () => {
    const matrix = getMonthMatrix(2026, 6) // July 2026
    expect(matrix.length).toBeGreaterThanOrEqual(4)
    expect(matrix.length).toBeLessThanOrEqual(6)
    matrix.forEach((row) => expect(row).toHaveLength(7))
  })

  it('marks current month cells correctly', () => {
    const matrix = getMonthMatrix(2026, 6)
    const currentMonthCells = matrix.flat().filter((c) => c.isCurrentMonth)
    expect(currentMonthCells.length).toBe(31) // July has 31 days
  })

  it('includes padding from previous month', () => {
    // July 2026 starts on Wednesday (index 3 in ISO = W)
    // So padding from June = 3 days (Mon, Tue, Wed? No...)
    // Actually: July 1 is Wednesday. Monday is ISO week start.
    // July 1 = Wednesday, so padding = 2 days: Monday, Tuesday (June 29, 30)
    const matrix = getMonthMatrix(2026, 6)
    const prevMonthCells = matrix.flat().filter((c) => !c.isCurrentMonth)
    // July 2026 starts on Wednesday (ISO weekday 3), so 2 padding days from prev
    expect(prevMonthCells.length).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// Completion queries
// ---------------------------------------------------------------------------
describe('hasCompletionOnDate', () => {
  it('finds matching completion', () => {
    expect(hasCompletionOnDate([cr()], 'q1', '2026-07-20')).toBe(true)
  })

  it('returns false when no match', () => {
    expect(hasCompletionOnDate([cr()], 'q1', '2026-07-21')).toBe(false)
  })

  it('returns false for different questId', () => {
    expect(hasCompletionOnDate([cr()], 'q2', '2026-07-20')).toBe(false)
  })
})

describe('hasCompletionBetween', () => {
  it('inclusive: matches range start', () => {
    const completions = [cr({ completedOn: '2026-07-18' })]
    expect(hasCompletionBetween(completions, 'q1', '2026-07-18', '2026-07-20')).toBe(true)
  })

  it('inclusive: matches range end', () => {
    const completions = [cr({ completedOn: '2026-07-20' })]
    expect(hasCompletionBetween(completions, 'q1', '2026-07-18', '2026-07-20')).toBe(true)
  })

  it('returns false when outside range', () => {
    const completions = [cr({ completedOn: '2026-07-17' })]
    expect(hasCompletionBetween(completions, 'q1', '2026-07-18', '2026-07-20')).toBe(false)
  })

  it('returns false when no completions', () => {
    expect(hasCompletionBetween([], 'q1', '2026-07-18', '2026-07-20')).toBe(false)
  })
})

describe('getLastCompletionDate', () => {
  it('returns the latest completion date', () => {
    const completions = [
      cr({ id: 'c1', completedOn: '2026-07-18' }),
      cr({ id: 'c2', completedOn: '2026-07-20' }),
      cr({ id: 'c3', completedOn: '2026-07-19' }),
    ]
    expect(getLastCompletionDate(completions, 'q1', '2026-07-20')).toBe('2026-07-20')
  })

  it('ignores completions after the cutoff', () => {
    const completions = [
      cr({ completedOn: '2026-07-18' }),
      cr({ completedOn: '2026-07-22' }),
    ]
    expect(getLastCompletionDate(completions, 'q1', '2026-07-20')).toBe('2026-07-18')
  })

  it('returns null when no completions', () => {
    expect(getLastCompletionDate([], 'q1', '2026-07-20')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Repeat rule matching
// ---------------------------------------------------------------------------
describe('doesRepeatRuleMatch', () => {
  it('none: matches only targetDate', () => {
    const quest = q({ repeat: 'none', targetDate: '2026-07-20' })
    expect(doesRepeatRuleMatch(quest, '2026-07-20')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-07-21')).toBe(false)
  })

  it('daily: matches every date >= targetDate', () => {
    const quest = q({ repeat: 'daily', targetDate: '2026-07-20' })
    expect(doesRepeatRuleMatch(quest, '2026-07-20')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-07-21')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-08-01')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-07-19')).toBe(false)
  })

  it('weekly: matches same weekday', () => {
    // 2026-07-20 is Monday
    const quest = q({ repeat: 'weekly', targetDate: '2026-07-20' })
    // Monday
    expect(doesRepeatRuleMatch(quest, '2026-07-20')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-07-27')).toBe(true)
    // Sunday (different weekday)
    expect(doesRepeatRuleMatch(quest, '2026-07-26')).toBe(false)
    // Before target
    expect(doesRepeatRuleMatch(quest, '2026-07-13')).toBe(false)
  })

  it('monthly: matches same day of month', () => {
    const quest = q({ repeat: 'monthly', targetDate: '2026-07-15' })
    expect(doesRepeatRuleMatch(quest, '2026-07-15')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-08-15')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-09-15')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-08-14')).toBe(false)
  })

  it('monthly: skips months where target day does not exist', () => {
    // target day = 31, Feb has no 31st
    const quest = q({ repeat: 'monthly', targetDate: '2026-01-31' })
    expect(doesRepeatRuleMatch(quest, '2026-01-31')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-02-28')).toBe(false)
    expect(doesRepeatRuleMatch(quest, '2026-03-31')).toBe(true)
  })

  it('custom: every N days', () => {
    const quest = q({
      repeat: 'custom',
      targetDate: '2026-07-01',
      repeatConfig: { interval: 3, unit: 'day' },
    })
    expect(doesRepeatRuleMatch(quest, '2026-07-01')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-07-04')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-07-07')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-07-02')).toBe(false)
  })

  it('custom: every N weeks', () => {
    const quest = q({
      repeat: 'custom',
      targetDate: '2026-07-01',
      repeatConfig: { interval: 2, unit: 'week' },
    })
    expect(doesRepeatRuleMatch(quest, '2026-07-01')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-07-15')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-07-29')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-07-22')).toBe(false)
  })

  it('custom: every N months (same day)', () => {
    const quest = q({
      repeat: 'custom',
      targetDate: '2026-01-15',
      repeatConfig: { interval: 2, unit: 'month' },
    })
    expect(doesRepeatRuleMatch(quest, '2026-01-15')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-03-15')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-05-15')).toBe(true)
    expect(doesRepeatRuleMatch(quest, '2026-04-15')).toBe(false)
  })

  it('returns false for future targetDate', () => {
    const quest = q({ repeat: 'daily', targetDate: '2026-07-25' })
    expect(doesRepeatRuleMatch(quest, '2026-07-20')).toBe(false)
  })

  it('returns false for custom without repeatConfig', () => {
    const quest = q({ repeat: 'custom', repeatConfig: undefined, targetDate: '2026-07-01' })
    expect(doesRepeatRuleMatch(quest, '2026-07-01')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Quest activity
// ---------------------------------------------------------------------------
describe('isQuestActiveOnDate', () => {
  it('inactive quest returns false', () => {
    expect(isQuestActiveOnDate(q({ status: 'inactive' }), '2026-07-20', [])).toBe(false)
  })

  it('future targetDate returns false', () => {
    expect(isQuestActiveOnDate(q({ targetDate: '2026-07-25' }), '2026-07-20', [])).toBe(false)
  })

  it('already completed on date returns false', () => {
    expect(isQuestActiveOnDate(q(), '2026-07-20', [cr()])).toBe(false)
  })

  it('none-repeat matches only targetDate', () => {
    expect(isQuestActiveOnDate(q({ repeat: 'none' }), '2026-07-20', [])).toBe(true)
    expect(isQuestActiveOnDate(q({ repeat: 'none' }), '2026-07-21', [])).toBe(false)
  })

  it('daily repeat matches every date >= target', () => {
    const quest = q({ repeat: 'daily', targetDate: '2026-07-18' })
    expect(isQuestActiveOnDate(quest, '2026-07-20', [])).toBe(true)
    expect(isQuestActiveOnDate(quest, '2026-07-18', [])).toBe(true)
  })

  it('rollover shows quest even when repeat does not match', () => {
    // weekly quest targeting Monday; we're on Wednesday; rollover should show it
    const quest = q({
      repeat: 'weekly',
      targetDate: '2026-07-20',
      rollover: true,
    })
    // Monday
    expect(isQuestActiveOnDate(quest, '2026-07-20', [])).toBe(true)
    // Wednesday — repeat doesn't match, but rollover does
    expect(isQuestActiveOnDate(quest, '2026-07-22', [])).toBe(true)
  })

  it('rollover blocked if completion exists between target and date', () => {
    const quest = q({
      repeat: 'weekly',
      targetDate: '2026-07-20',
      rollover: true,
    })
    const completions = [cr({ completedOn: '2026-07-21' })]
    // Wednesday, but already completed on Tuesday — blocked
    expect(isQuestActiveOnDate(quest, '2026-07-22', completions)).toBe(false)
  })

  it('maxRolloverDays exceeded returns false', () => {
    const quest = q({
      repeat: 'none',
      targetDate: '2026-07-15',
      rollover: true,
      maxRolloverDays: 3,
    })
    // target 15th, day 20th = 5 days gap > 3
    expect(isQuestActiveOnDate(quest, '2026-07-20', [])).toBe(false)
    // day 17th = 2 days gap <= 3
    expect(isQuestActiveOnDate(quest, '2026-07-17', [])).toBe(true)
  })

  it('maxRolloverDays null means no limit', () => {
    const quest = q({
      repeat: 'none',
      targetDate: '2026-07-01',
      rollover: true,
      maxRolloverDays: null,
    })
    // 19 day gap, no limit
    expect(isQuestActiveOnDate(quest, '2026-07-20', [])).toBe(true)
  })

  it('maxRolloverDays counts from last completion, not targetDate', () => {
    const quest = q({
      repeat: 'daily',
      targetDate: '2026-07-01',
      rollover: true,
      maxRolloverDays: 3,
    })
    const completions = [cr({ completedOn: '2026-07-18' })]
    // July 20 = 2 days since last completion <= 3
    expect(isQuestActiveOnDate(quest, '2026-07-20', completions)).toBe(true)
    // July 22 = 4 days since last completion > 3
    expect(isQuestActiveOnDate(quest, '2026-07-22', completions)).toBe(false)
  })
})

describe('getActiveQuestsForDate', () => {
  it('returns only active quests for the date', () => {
    const quests = [
      q({ id: 'q1', title: 'Active', repeat: 'none', targetDate: '2026-07-20' }),
      q({ id: 'q2', title: 'Inactive', status: 'inactive', repeat: 'none', targetDate: '2026-07-20' }),
      q({ id: 'q3', title: 'Already done', repeat: 'none', targetDate: '2026-07-20' }),
    ]
    const completions = [cr({ questId: 'q3' })]
    const active = getActiveQuestsForDate(quests, '2026-07-20', completions)
    expect(active).toHaveLength(1)
    expect(active[0].id).toBe('q1')
  })
})

describe('getFinishedQuestsForDate', () => {
  it('returns quests with a completion on that date', () => {
    const quests = [
      q({ id: 'q1', title: 'Done' }),
      q({ id: 'q2', title: 'Not done' }),
    ]
    const completions = [cr({ questId: 'q1', completedOn: '2026-07-20' })]
    const finished = getFinishedQuestsForDate(quests, '2026-07-20', completions)
    expect(finished).toHaveLength(1)
    expect(finished[0].id).toBe('q1')
  })

  it('excludes completions on other dates', () => {
    const quests = [q({ id: 'q1', title: 'Done on other day' })]
    const completions = [cr({ questId: 'q1', completedOn: '2026-07-19' })]
    expect(getFinishedQuestsForDate(quests, '2026-07-20', completions)).toHaveLength(0)
  })
})

describe('groupQuestsByActivityReason', () => {
  it('groups rollover, todays, and repeating', () => {
    const quests = [
      q({ id: 'q1', title: 'Rollover quest', repeat: 'weekly', targetDate: '2026-07-15', rollover: true }),
      q({ id: 'q2', title: 'Today specific', repeat: 'none', targetDate: '2026-07-20' }),
      q({ id: 'q3', title: 'Daily repeat', repeat: 'daily', targetDate: '2026-07-01' }),
    ]
    const groups = groupQuestsByActivityReason(quests, '2026-07-20', [])
    expect(groups.rollover).toHaveLength(1)
    expect(groups.rollover[0].id).toBe('q1')
    expect(groups.todays).toHaveLength(1)
    expect(groups.todays[0].id).toBe('q2')
    expect(groups.repeating).toHaveLength(1)
    expect(groups.repeating[0].id).toBe('q3')
  })
})
