import { useCallback, useState } from 'react'
import { addDays, addMonths, parseDate } from '../../utils/dateUtils'

interface UseCalendarKeyboardNavReturn {
  focusedDate: string
  handleKeyDown: (e: React.KeyboardEvent) => void
  setFocusedDate: (date: string) => void
}

export function useCalendarKeyboardNav(
  initialDate: string,
  onSelect: (date: string) => void,
  onNavigate?: (date: string) => void,
): UseCalendarKeyboardNavReturn {
  const [focus, setFocus] = useState({ selection: initialDate, date: initialDate })
  const focusedDate = focus.selection === initialDate ? focus.date : initialDate
  const setFocusedDate = useCallback((date: string) => setFocus({ selection: initialDate, date }), [initialDate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentDate = (e.target as HTMLElement).dataset.date
      if (!currentDate) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(currentDate)
        return
      }

      let nextDate: string | null = null

      switch (e.key) {
        case 'ArrowLeft':
          nextDate = addDays(currentDate, -1)
          break
        case 'ArrowRight':
          nextDate = addDays(currentDate, 1)
          break
        case 'ArrowUp':
          nextDate = addDays(currentDate, -7)
          break
        case 'ArrowDown':
          nextDate = addDays(currentDate, 7)
          break
        case 'Home': {
          const d = parseDate(currentDate)
          const day = d.getDay()
          nextDate = addDays(currentDate, day === 0 ? -6 : 1 - day)
          break
        }
        case 'End': {
          const d = parseDate(currentDate)
          const day = d.getDay()
          nextDate = addDays(currentDate, day === 0 ? 0 : 7 - day)
          break
        }
        case 'PageUp':
          nextDate = addMonths(currentDate, -1)
          break
        case 'PageDown':
          nextDate = addMonths(currentDate, 1)
          break
      }

      if (nextDate) {
        e.preventDefault()
        setFocusedDate(nextDate)
        onNavigate?.(nextDate)
        const container = e.currentTarget
        requestAnimationFrame(() => container.querySelector<HTMLElement>(`[data-date="${nextDate}"]`)?.focus({ preventScroll: true }))
      }
    },
    [onNavigate, onSelect, setFocusedDate],
  )

  return { focusedDate, handleKeyDown, setFocusedDate }
}
