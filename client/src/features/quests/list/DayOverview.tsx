import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../../../store/useStore'
import { Button } from '../../../components/ui/Button'
import { addDays, getTodayLocal, parseDate } from '../../../utils/dateUtils'
import { DayWeather, type RadarToggleProps } from '../../weather/DayWeather'

export function DayOverview({ onChooseDate, ...radar }: RadarToggleProps & { onChooseDate: () => void }) {
  const selectedDate = useStore((state) => state.selectedDate)
  const setSelectedDate = useStore((state) => state.setSelectedDate)
  const isToday = selectedDate === getTodayLocal()

  return (
    <header aria-label="Day overview" className="day-overview rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <DayWeather {...radar}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {isToday ? 'Today' : format(parseDate(selectedDate), 'EEEE')}
            </h1>
            <div className="flex items-center gap-1">
              {!isToday && <Button variant="ghost" onClick={() => setSelectedDate(getTodayLocal())}>Today</Button>}
              <Button variant="icon" aria-label="Previous day" onClick={() => setSelectedDate(addDays(selectedDate, -1))}><ChevronLeft className="h-5 w-5" /></Button>
              <Button variant="icon" aria-label="Next day" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight className="h-5 w-5" /></Button>
            </div>
          </div>
          <button type="button" aria-label="Choose date" onClick={onChooseDate} className="mt-1 inline-flex min-h-11 max-w-full items-center gap-2 text-left text-sm text-slate-400 hover:text-slate-200">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{format(parseDate(selectedDate), 'EEE, d MMM')}</span>
            <span className="hidden sm:inline">{format(parseDate(selectedDate), 'EEEE, d MMMM yyyy')}</span>
          </button>
        </div>
      </DayWeather>
    </header>
  )
}
