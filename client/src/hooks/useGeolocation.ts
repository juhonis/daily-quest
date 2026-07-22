import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export function useGeolocation() {
  const coords = useStore(s => s.coords)
  const setCoords = useStore(s => s.setCoords)
  const locationMode = useStore(s => s.locationMode)

  useEffect(() => {
    if (locationMode !== 'auto') return
    if (coords) return

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ lat: position.coords.latitude, lon: position.coords.longitude })
        },
        () => {}
      )
    }
  }, [coords, setCoords, locationMode])

  return coords
}
