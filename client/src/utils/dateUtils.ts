export function getTodayLocal(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isQuestActiveOnDate(
  _quest: import('../types').Quest,
  _date: string,
  _completions: import('../types').CompletionRecord[],
): boolean {
  // TODO: implement in Phase 2
  return false
}

export function formatForDisplay(dateStr: string): string {
  // TODO: implement in Phase 2
  return dateStr
}

export function hasCompletionBetween(
  _questId: string,
  _from: string,
  _to: string,
  _completions: import('../types').CompletionRecord[],
): boolean {
  // TODO: implement in Phase 2
  return false
}

export function isToday(dateStr: string): boolean {
  return dateStr === getTodayLocal()
}

export function getStartOfWeek(_dateStr: string): string {
  // TODO: implement in Phase 2
  return ''
}
