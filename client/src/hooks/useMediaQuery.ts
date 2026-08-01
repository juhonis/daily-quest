import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    useCallback(
      (callback) => {
        const mql = window.matchMedia(query)
        mql.addEventListener('change', callback)
        return () => mql.removeEventListener('change', callback)
      },
      [query],
    ),
    () => window.matchMedia(query).matches,
  )
}
