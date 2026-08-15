import { useState, useLayoutEffect, useEffect, useMemo, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { getTodayLocal, parseDate, addMonths } from '../../utils/dateUtils'
import { MonthGrid } from './MonthGrid'
import { useCalendarKeyboardNav } from './useCalendarKeyboardNav'

const MONTH_OFFSETS = 12
const WHEEL_THRESHOLD = 40

export function CalendarColumn() {
  const quests = useStore((s) => s.quests)
  const completions = useStore((s) => s.completions)
  const selectedDate = useStore((s) => s.selectedDate)
  const setSelectedDate = useStore((s) => s.setSelectedDate)

  const today = getTodayLocal()

  const [viewedDate, setViewedDate] = useState(selectedDate)

  const viewedMonthDate = useMemo(() => {
    const d = parseDate(viewedDate)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }, [viewedDate])

  const months = useMemo(() => {
    const result: { year: number; month: number }[] = []
    for (let i = -MONTH_OFFSETS; i <= MONTH_OFFSETS; i++) {
      const d = new Date(viewedMonthDate.getFullYear(), viewedMonthDate.getMonth() + i, 1)
      result.push({ year: d.getFullYear(), month: d.getMonth() })
    }
    return result
  }, [viewedMonthDate])

  const containerRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)

  const { focusedDate, handleKeyDown, setFocusedDate } = useCalendarKeyboardNav(
    selectedDate,
    setSelectedDate,
  )

  useLayoutEffect(() => {
    const container = containerRef.current
    const center = centerRef.current
    if (!container || !center) return
    const target = center.offsetTop - (container.clientHeight - center.offsetHeight) / 2
    container.scrollTop = target
  }, [viewedMonthDate])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let accumulator = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      let delta = e.deltaY
      if (e.deltaMode === 1) delta *= 16
      else if (e.deltaMode === 2) delta *= container.clientHeight
      accumulator += delta
      if (Math.abs(accumulator) < WHEEL_THRESHOLD) return
      const dir = Math.sign(accumulator)
      accumulator = 0
      setViewedDate((prev) => addMonths(prev, dir))
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [setViewedDate])

  return (
    <div
      ref={containerRef}
      className="p-3 overflow-y-auto max-h-screen"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <button
        onClick={() => {
          setSelectedDate(today)
          setViewedDate(today)
        }}
        className="w-full mb-3 rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-sm font-medium text-slate-300 transition-colors"
      >
        Today
      </button>
      {months.map((m) => {
        const isCentered = m.month === viewedMonthDate.getMonth() && m.year === viewedMonthDate.getFullYear()
        return (
          <div
            key={`${m.year}-${m.month}`}
            ref={isCentered ? centerRef : undefined}
          >
            <MonthGrid
              year={m.year}
              month={m.month}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date)
                setFocusedDate(date)
                setViewedDate(date)
              }}
              today={today}
              quests={quests}
              completions={completions}
              focusedDate={focusedDate}
              onCellFocus={setFocusedDate}
              highlight={isCentered}
            />
          </div>
        )
      })}
    </div>
  )
}
