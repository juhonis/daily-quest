import { useEffect, useState } from 'react'
import type { WeatherData } from '../../types'

export function useWeather(lat: number, lon: number, dateString: string) {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    if (!dateString) return

    let cancelled = false

    async function fetchWeather() {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode,rain&start_date=${dateString}&end_date=${dateString}&timezone=auto`

      try {
        const res = await fetch(url)
        if (!res.ok) {
          if (!cancelled) setWeather(null)
          return
        }
        const data = await res.json()
        if (data.error) {
          if (!cancelled) setWeather(null)
          return
        }
        if (!cancelled) setWeather(data as WeatherData)
      } catch {
        // Weather fetch failed gracefully
      }
    }

    fetchWeather()
    return () => { cancelled = true }
  }, [lat, lon, dateString])

  return weather
}
