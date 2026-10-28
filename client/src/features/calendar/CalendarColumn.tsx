import { useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { addMonths, getTodayLocal, parseDate } from '../../utils/dateUtils'
import { MonthGrid } from './MonthGrid'
import { useCalendarKeyboardNav } from './useCalendarKeyboardNav'
import { Button } from '../../components/ui/Button'

export function CalendarColumn({ onSelect }: { onSelect?: () => void }) {
  const quests = useStore((s) => s.quests)
  const completions = useStore((s) => s.completions)
  const selectedDate = useStore((s) => s.selectedDate)
  const setSelectedDate = useStore((s) => s.setSelectedDate)
  const [browse, setBrowse] = useState({ selection: selectedDate, date: selectedDate })
  const viewedDate = browse.selection === selectedDate ? browse.date : selectedDate
  const viewed = parseDate(viewedDate)
  const navigate = useCallback((date: string) => setBrowse({ selection: selectedDate, date }), [selectedDate])

  function select(date: string) {
    setSelectedDate(date)
    setBrowse({ selection: date, date })
    onSelect?.()
  }

  const { focusedDate, handleKeyDown, setFocusedDate } = useCalendarKeyboardNav(selectedDate, select, navigate)
  const visibleFocus = focusedDate.slice(0, 7) === viewedDate.slice(0, 7) ? focusedDate : `${viewedDate.slice(0, 7)}-01`

  return (
    <div onKeyDown={handleKeyDown} className="min-w-0">
      <div className="mb-4 flex items-center justify-between gap-1">
        <Button variant="icon" aria-label="Previous month" onClick={() => navigate(addMonths(viewedDate, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={() => select(getTodayLocal())}>Today</Button>
        <Button variant="icon" aria-label="Next month" onClick={() => navigate(addMonths(viewedDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <MonthGrid year={viewed.getFullYear()} month={viewed.getMonth()} selectedDate={selectedDate} onSelectDate={(date) => { setFocusedDate(date); select(date) }} today={getTodayLocal()} quests={quests} completions={completions} focusedDate={visibleFocus} onCellFocus={setFocusedDate} />
      <p className="mt-4 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">Pick a day to plan ahead or look back.</p>
    </div>
  )
}
