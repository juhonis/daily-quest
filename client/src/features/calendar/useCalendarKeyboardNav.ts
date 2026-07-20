import { useCallback, useState } from 'react'
import { addDays, parseDate } from '../../utils/dateUtils'

interface UseCalendarKeyboardNavReturn {
  focusedDate: string
  handleKeyDown: (e: React.KeyboardEvent) => void
  setFocusedDate: (date: string) => void
}

export function useCalendarKeyboardNav(
  initialDate: string,
  onSelect: (date: string) => void,
): UseCalendarKeyboardNavReturn {
  const [focusedDate, setFocusedDate] = useState(initialDate)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(focusedDate)
        return
      }

      let nextDate: string | null = null

      switch (e.key) {
        case 'ArrowLeft':
          nextDate = addDays(focusedDate, -1)
          break
        case 'ArrowRight':
          nextDate = addDays(focusedDate, 1)
          break
        case 'ArrowUp':
          nextDate = addDays(focusedDate, -7)
          break
        case 'ArrowDown':
          nextDate = addDays(focusedDate, 7)
          break
        case 'Home': {
          const d = parseDate(focusedDate)
          const day = d.getDay()
          nextDate = addDays(focusedDate, day === 0 ? -6 : 1 - day)
          break
        }
        case 'End': {
          const d = parseDate(focusedDate)
          const day = d.getDay()
          nextDate = addDays(focusedDate, day === 0 ? 0 : 7 - day)
          break
        }
        case 'PageUp':
          nextDate = addDays(focusedDate, -30)
          break
        case 'PageDown':
          nextDate = addDays(focusedDate, 30)
          break
      }

      if (nextDate) {
        e.preventDefault()
        setFocusedDate(nextDate)
      }
    },
    [focusedDate, onSelect],
  )

  return { focusedDate, handleKeyDown, setFocusedDate }
}
