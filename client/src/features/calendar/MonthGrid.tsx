import { getMonthMatrix, getWeekdayLabels, WEEK_STARTS_ON, formatMonthYear, isSameDay } from '../../utils/dateUtils'
import type { Quest, CompletionRecord } from '../../types'
import { getActiveQuestsForDate } from '../../utils/dateUtils'

interface MonthGridProps {
  year: number
  month: number
  selectedDate: string
  onSelectDate: (date: string) => void
  today: string
  quests: Quest[]
  completions: CompletionRecord[]
  focusedDate: string | null
  onCellFocus: (date: string) => void
}

export function MonthGrid({
  year,
  month,
  selectedDate,
  onSelectDate,
  today,
  quests,
  completions,
  focusedDate,
  onCellFocus,
}: MonthGridProps) {
  const matrix = getMonthMatrix(year, month, WEEK_STARTS_ON)
  const labels = getWeekdayLabels(WEEK_STARTS_ON)

  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-slate-400 mb-2 px-1">
        {formatMonthYear(`${year}-${String(month + 1).padStart(2, '0')}-01`)}
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-slate-500 mb-1">
        {labels.map((l, i) => (
          <div key={i} className="py-1">{l}</div>
        ))}
      </div>
      {matrix.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7">
          {row.map((cell) => {
            const hasQuest = getActiveQuestsForDate(quests, cell.date, completions).length > 0
            const isSelected = isSameDay(cell.date, selectedDate)
            const isToday = isSameDay(cell.date, today)
            return (
              <button
                key={cell.date}
                onClick={() => onSelectDate(cell.date)}
                onFocus={() => onCellFocus(cell.date)}
                tabIndex={cell.date === focusedDate ? 0 : -1}
                aria-current={isToday ? 'date' : undefined}
                aria-selected={isSelected}
                aria-label={cell.date}
                className={`
                  relative flex items-center justify-center rounded-full w-8 h-8 text-xs
                  transition-colors outline-none
                  ${!cell.isCurrentMonth ? 'text-slate-700' : ''}
                  ${isSelected ? 'bg-blue-600 text-white' : isToday ? 'text-blue-400' : 'text-slate-300'}
                  ${isSelected || isToday || hasQuest ? 'font-semibold' : ''}
                  ${!isSelected ? 'hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500' : ''}
                `}
              >
                {cell.date.split('-')[2].replace(/^0/, '')}
                {hasQuest && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
