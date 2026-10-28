import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { addMonths, getActiveQuestsForDate, getMonthMatrix, getTodayLocal, parseDate } from '../../utils/dateUtils'
import { MonthGrid } from './MonthGrid'
import { useCalendarKeyboardNav } from './useCalendarKeyboardNav'
import { Button } from '../../components/ui/Button'

const INITIAL_MONTHS = 7
const MAX_MONTHS = 13
const BUFFER_MONTHS = 3

const monthStart = (date: string) => `${date.slice(0, 7)}-01`
const initialRange = (selection: string, center = selection) => ({
  selection,
  start: addMonths(monthStart(center), -BUFFER_MONTHS),
  count: INITIAL_MONTHS,
})

export function CalendarColumn({ onSelect }: { onSelect?: () => void }) {
  const quests = useStore((s) => s.quests)
  const completions = useStore((s) => s.completions)
  const selectedDate = useStore((s) => s.selectedDate)
  const setSelectedDate = useStore((s) => s.setSelectedDate)
  const selectionMonth = monthStart(selectedDate)
  const [window, setWindow] = useState(() => initialRange(selectionMonth))
  const [scrollRequest, setScrollRequest] = useState(0)
  const range = window.selection === selectionMonth ? window : initialRange(selectionMonth)
  const scroller = useRef<HTMLDivElement>(null)
  const viewedMonth = useRef(selectionMonth)
  const previousSelection = useRef(selectedDate)
  const target = useRef<{ date: string; force: boolean } | null>({ date: selectedDate, force: true })
  const anchor = useRef<{ month: string; offset: number } | null>(null)
  const extending = useRef(false)

  const months = useMemo(() => Array.from({ length: range.count }, (_, index) =>
    addMonths(range.start, index),
  ), [range.start, range.count])

  // Calculate each actual day once; adjacent grids don't duplicate padding-day work.
  const activeDates = useMemo(() => {
    const dates = new Set<string>()
    for (const month of months) {
      const date = parseDate(month)
      for (const cell of getMonthMatrix(date.getFullYear(), date.getMonth()).flat()) {
        if (cell.isCurrentMonth && getActiveQuestsForDate(quests, cell.date, completions).length) {
          dates.add(cell.date)
        }
      }
    }
    return dates
  }, [months, quests, completions])

  const navigate = useCallback((date: string, force = true) => {
    target.current = { date, force }
    setWindow((previous) => {
      const current = previous.selection === selectionMonth ? previous : initialRange(selectionMonth)
      const month = monthStart(date)
      if (month < current.start || month > addMonths(current.start, current.count - 1)) {
        return initialRange(selectionMonth, month)
      }
      return current
    })
    setScrollRequest((request) => request + 1)
  }, [selectionMonth])

  const navigateFocus = useCallback((date: string) => navigate(date, false), [navigate])

  function select(date: string) {
    setSelectedDate(date)
    onSelect?.()
  }

  const { focusedDate, handleKeyDown, setFocusedDate } = useCalendarKeyboardNav(
    selectedDate, select, navigateFocus,
  )

  useLayoutEffect(() => {
    if (previousSelection.current !== selectedDate) {
      previousSelection.current = selectedDate
      target.current = { date: selectedDate, force: false }
    }

    function position() {
      const container = scroller.current
      if (!container?.clientHeight) return
      if (anchor.current) {
        const node = container.querySelector<HTMLElement>(`[data-calendar-month="${anchor.current.month}"]`)
        if (node) container.scrollTop = node.offsetTop - anchor.current.offset
        anchor.current = null
        extending.current = false
      }
      if (target.current) {
        const month = monthStart(target.current.date)
        const node = container.querySelector<HTMLElement>(`[data-calendar-month="${month}"]`)
        if (!node) return
        const fullyVisible = node.offsetTop >= container.scrollTop &&
          node.offsetTop + node.offsetHeight <= container.scrollTop + container.clientHeight
        if (target.current.force || !fullyVisible) {
          container.scrollTop = node.offsetTop - Math.max(0, (container.clientHeight - node.offsetHeight) / 2)
        }
        viewedMonth.current = month
        target.current = null
      }
    }

    if (scroller.current?.clientHeight) {
      position()
    } else {
      // Defer only the initial hidden-dialog measurement. An unconditional
      // second pass can consume an anchor before its new months have rendered.
      const frame = requestAnimationFrame(position)
      return () => cancelAnimationFrame(frame)
    }
  }, [range.start, range.count, selectedDate, scrollRequest])

  function handleScroll() {
    const container = scroller.current
    if (!container || !container.clientHeight || target.current || extending.current) return
    const nodes = [...container.querySelectorAll<HTMLElement>('[data-calendar-month]')]
    const center = container.scrollTop + container.clientHeight / 2
    const centered = nodes.find((node) => node.offsetTop + node.offsetHeight > center)
    if (centered?.dataset.calendarMonth) viewedMonth.current = centered.dataset.calendarMonth

    const nearTop = container.scrollTop < 120
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120
    if ((!nearTop && !nearBottom) || container.scrollHeight <= container.clientHeight) return

    const visible = nodes.find((node) => node.offsetTop + node.offsetHeight > container.scrollTop)
    if (!visible?.dataset.calendarMonth) return
    anchor.current = {
      month: visible.dataset.calendarMonth,
      offset: visible.offsetTop - container.scrollTop,
    }
    extending.current = true
    // Keep a bounded buffer and anchor a surviving visible month when trimming.
    setWindow({
      selection: selectionMonth,
      start: nearTop ? addMonths(range.start, -BUFFER_MONTHS)
        : addMonths(range.start, Math.max(0, range.count + BUFFER_MONTHS - MAX_MONTHS)),
      count: Math.min(MAX_MONTHS, range.count + BUFFER_MONTHS),
    })
  }

  return (
    <div onKeyDown={handleKeyDown} className={`flex min-w-0 flex-col ${onSelect ? '' : 'h-full min-h-0'}`}>
      <div className="mb-3 flex shrink-0 items-center justify-between gap-1">
        <Button variant="icon" aria-label="Previous month" onClick={() => { const date = addMonths(viewedMonth.current, -1); setFocusedDate(date); navigate(date) }}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={() => { const today = getTodayLocal(); setFocusedDate(today); navigate(today); select(today) }}>Today</Button>
        <Button variant="icon" aria-label="Next month" onClick={() => { const date = addMonths(viewedMonth.current, 1); setFocusedDate(date); navigate(date) }}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div
        ref={scroller}
        role="region"
        aria-label="Scrollable calendar"
        data-calendar-scroll
        onScroll={handleScroll}
        className={`relative overflow-y-auto overscroll-contain [overflow-anchor:none] ${onSelect ? 'h-[min(52dvh,480px)]' : 'min-h-0 flex-1'}`}
      >
        {months.map((month) => {
          const date = parseDate(month)
          const selected = month === selectionMonth
          return (
            <div key={month} data-calendar-month={month} className={`mb-3 rounded-xl px-1 py-2 transition-opacity ${selected ? 'bg-slate-800/50' : 'opacity-70 hover:opacity-100 focus-within:opacity-100'}`}>
              <MonthGrid
                year={date.getFullYear()}
                month={date.getMonth()}
                selectedDate={selectedDate}
                onSelectDate={(value) => { setFocusedDate(value); select(value) }}
                today={getTodayLocal()}
                quests={quests}
                completions={completions}
                focusedDate={focusedDate}
                onCellFocus={setFocusedDate}
                activeDates={activeDates}
                showOutsideDays={false}
              />
            </div>
          )
        })}
      </div>
      {onSelect && <p className="mt-3 text-xs text-slate-500">Scroll to browse months. Select a day to open it.</p>}
    </div>
  )
}
