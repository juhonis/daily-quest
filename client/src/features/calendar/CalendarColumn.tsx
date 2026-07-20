import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { getTodayLocal, parseDate } from '../../utils/dateUtils'
import { MonthGrid } from './MonthGrid'
import { useCalendarKeyboardNav } from './useCalendarKeyboardNav'

export function CalendarColumn() {
  const quests = useStore((s) => s.quests)
  const completions = useStore((s) => s.completions)
  const selectedDate = useStore((s) => s.selectedDate)
  const setSelectedDate = useStore((s) => s.setSelectedDate)

  const today = getTodayLocal()
  const todayDate = parseDate(today)

  const months = useMemo(() => {
    const result: { year: number; month: number }[] = []
    for (let i = -12; i <= 12; i++) {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth() + i, 1)
      result.push({ year: d.getFullYear(), month: d.getMonth() })
    }
    return result
  }, [todayDate])

  const { focusedDate, handleKeyDown, setFocusedDate } = useCalendarKeyboardNav(
    selectedDate,
    setSelectedDate,
  )

  return (
    <div
      className="p-3 overflow-y-auto max-h-screen"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <button
        onClick={() => setSelectedDate(today)}
        className="w-full mb-3 rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-sm font-medium text-slate-300 transition-colors"
      >
        Today
      </button>
      {months.map((m) => (
        <MonthGrid
          key={`${m.year}-${m.month}`}
          year={m.year}
          month={m.month}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date)
            setFocusedDate(date)
          }}
          today={today}
          quests={quests}
          completions={completions}
          focusedDate={focusedDate}
          onCellFocus={setFocusedDate}
        />
      ))}
    </div>
  )
}
