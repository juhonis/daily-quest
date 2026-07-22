import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export function useGeolocation() {
  const coords = useStore(s => s.coords)
  const setCoords = useStore(s => s.setCoords)

  useEffect(() => {
    if (coords) return

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ lat: position.coords.latitude, lon: position.coords.longitude })
        },
        () => {
          // Silently fail — weather is non-critical
        }
      )
    }
  }, [coords, setCoords])

  return coords
}
