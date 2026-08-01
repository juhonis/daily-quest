import { format, addDays as dfAddDays, startOfWeek as dfStartOfWeek, differenceInDays as dfDiffDays } from 'date-fns'
import type { Quest, CompletionRecord } from '../types'

export const WEEK_STARTS_ON = 1

function toDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayLocal(): string {
  return toDateString(new Date())
}

export function parseDate(s: string): Date {
  const [year, month, day] = s.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatForDisplay(s: string): string {
  return format(parseDate(s), 'MMM d, yyyy')
}

export function formatMonthYear(s: string): string {
  return format(parseDate(s), 'MMMM yyyy')
}

export function addDays(s: string, n: number): string {
  return toDateString(dfAddDays(parseDate(s), n))
}

export function isSameDay(a: string, b: string): boolean {
  return a === b
}

export function isBefore(a: string, b: string): boolean {
  return a < b
}

export function isAfter(a: string, b: string): boolean {
  return a > b
}

export function diffDays(a: string, b: string): number {
  return dfDiffDays(parseDate(a), parseDate(b))
}

export function getStartOfWeek(s: string, weekStartsOn: number = WEEK_STARTS_ON): string {
  return toDateString(dfStartOfWeek(parseDate(s), { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 }))
}

export function getWeekdayLabels(weekStartsOn: number = WEEK_STARTS_ON): string[] {
  if (weekStartsOn === 0) return ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return ['M', 'T', 'W', 'T', 'F', 'S', 'S']
}

export function getMonthMatrix(
  year: number,
  month: number,
  weekStartsOn: number = WEEK_STARTS_ON,
): { date: string; isCurrentMonth: boolean }[][] {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let paddingFromPrev = firstDay.getDay() - weekStartsOn
  if (paddingFromPrev < 0) paddingFromPrev += 7

  const cells: { date: string; isCurrentMonth: boolean }[] = []

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = paddingFromPrev - 1; i >= 0; i--) {
    cells.push({
      date: toDateString(new Date(year, month - 1, prevMonthLastDay - i)),
      isCurrentMonth: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: toDateString(new Date(year, month, day)),
      isCurrentMonth: true,
    })
  }

  const remaining = cells.length % 7
  if (remaining > 0) {
    for (let day = 1; day <= 7 - remaining; day++) {
      cells.push({
        date: toDateString(new Date(year, month + 1, day)),
        isCurrentMonth: false,
      })
    }
  }

  const rows: { date: string; isCurrentMonth: boolean }[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }
  return rows
}

export function repeatDescription(quest: Quest): string | null {
  switch (quest.repeat) {
    case 'none':
      return null
    case 'daily':
      return 'Daily'
    case 'weekly': {
      const day = parseDate(quest.targetDate).toLocaleDateString('en-US', { weekday: 'long' })
      return `Weekly on ${day}`
    }
    case 'monthly': {
      const dayOfMonth = parseDate(quest.targetDate).getDate()
      return `Monthly on day ${dayOfMonth}`
    }
    case 'custom': {
      if (!quest.repeatConfig) return null
      const { interval, unit } = quest.repeatConfig
      const unitLabel = unit + (interval > 1 ? 's' : '')
      return `Every ${interval} ${unitLabel}`
    }
  }
}

export function hasCompletionOnDate(completions: CompletionRecord[], questId: string, date: string): boolean {
  return completions.some((c) => c.questId === questId && c.completedOn === date)
}

export function hasCompletionBetween(completions: CompletionRecord[], questId: string, from: string, to: string): boolean {
  return completions.some((c) => c.questId === questId && c.completedOn >= from && c.completedOn <= to)
}

export function getLastCompletionDate(completions: CompletionRecord[], questId: string, beforeOrOn: string): string | null {
  const matching = completions.filter((c) => c.questId === questId && c.completedOn <= beforeOrOn)
  if (matching.length === 0) return null
  return matching.reduce((latest, c) => (c.completedOn > latest.completedOn ? c : latest)).completedOn
}

export function doesRepeatRuleMatch(quest: Quest, date: string): boolean {
  if (quest.targetDate > date) return false

  switch (quest.repeat) {
    case 'none':
      return quest.targetDate === date
    case 'daily':
      return true
    case 'weekly': {
      const targetDay = parseDate(quest.targetDate).getDay()
      const currentDay = parseDate(date).getDay()
      return targetDay === currentDay
    }
    case 'monthly': {
      const targetDayOfMonth = parseDate(quest.targetDate).getDate()
      return parseDate(date).getDate() === targetDayOfMonth
    }
    case 'custom': {
      if (!quest.repeatConfig) return false
      const { interval, unit } = quest.repeatConfig
      const diff = diffDays(date, quest.targetDate)
      if (diff < 0) return false

      switch (unit) {
        case 'day':
          return diff % interval === 0
        case 'week':
          return diff % (interval * 7) === 0
        case 'month': {
          const targetParts = quest.targetDate.split('-').map(Number)
          const dateParts = date.split('-').map(Number)
          const monthDiff = (dateParts[0] - targetParts[0]) * 12 + (dateParts[1] - targetParts[1])
          return monthDiff % interval === 0 && targetParts[2] === dateParts[2]
        }
      }
    }
  }
}

export function isQuestActiveOnDate(quest: Quest, date: string, completions: CompletionRecord[]): boolean {
  if (quest.status !== 'active') return false
  if (quest.targetDate > date) return false
  if (hasCompletionOnDate(completions, quest.id, date)) return false

  const repeatMatches = doesRepeatRuleMatch(quest, date)
  const isRollover = quest.rollover && !hasCompletionBetween(completions, quest.id, quest.targetDate, date)

  if (!repeatMatches && !isRollover) return false

  if (quest.maxRolloverDays != null) {
    const lastCompletion = getLastCompletionDate(completions, quest.id, date)
    const referenceDate = lastCompletion ?? quest.targetDate
    if (diffDays(date, referenceDate) > quest.maxRolloverDays) return false
  }

  return true
}

export function getActiveQuestsForDate(quests: Quest[], date: string, completions: CompletionRecord[]): Quest[] {
  return quests.filter((q) => isQuestActiveOnDate(q, date, completions))
}

export function getFinishedQuestsForDate(quests: Quest[], date: string, completions: CompletionRecord[]): Quest[] {
  const questIdsWithCompletion = completions
    .filter((c) => c.completedOn === date)
    .map((c) => c.questId)
  return quests.filter((q) => questIdsWithCompletion.includes(q.id))
}

export function groupQuestsByActivityReason(
  quests: Quest[],
  date: string,
  completions: CompletionRecord[],
): { rollover: Quest[]; todays: Quest[]; repeating: Quest[] } {
  const active = getActiveQuestsForDate(quests, date, completions)

  const rollover = active.filter((q) => q.rollover && q.targetDate < date)
  const remaining = active.filter((q) => !rollover.includes(q))

  const todays = remaining.filter((q) => q.targetDate === date)
  const repeating = remaining.filter((q) => !todays.includes(q))

  return { rollover, todays, repeating }
}
