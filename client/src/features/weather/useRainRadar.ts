import { useEffect, useState } from 'react'

export interface RainRadarFrame {
  time: number
  path: string
}

interface RainRadarData {
  host: string
  frames: RainRadarFrame[]
}

export function useRainRadar() {
  const [data, setData] = useState<RainRadarData | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchRadar() {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
        if (!res.ok) {
          if (!cancelled) setData(null)
          return
        }
        const json = await res.json()
        if (json.error || !json.radar?.past?.length) {
          if (!cancelled) setData(null)
          return
        }
        if (!cancelled) {
          setData({
            host: json.host,
            frames: json.radar.past as RainRadarFrame[],
          })
        }
      } catch {
        if (!cancelled) setData(null)
      }
    }

    fetchRadar()
    return () => { cancelled = true }
  }, [])

  return data
}
