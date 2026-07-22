import { useEffect, useRef } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useWeather } from './useWeather'
import { useStore } from '../../store/useStore'
import { WeatherIcon } from './weatherIcons'

function rainLabel(rainMm: number): string | null {
  if (rainMm <= 0) return null
  if (rainMm < 0.5) return '0.1'
  if (rainMm < 1.5) return '0.5'
  return `${Math.round(rainMm)}`
}

export function WeatherCarousel() {
  const selectedDate = useStore(s => s.selectedDate)
  const coords = useGeolocation()
  const lat = coords?.lat ?? 0
  const lon = coords?.lon ?? 0

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const isToday = selectedDate === todayStr
  const maxForecastDate = format(addDays(new Date(), 16), 'yyyy-MM-dd')
  const minPastDate = format(subDays(new Date(), 92), 'yyyy-MM-dd')

  const weather = useWeather(lat, lon, coords ? selectedDate : '')
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isToday || !weather?.hourly || !carouselRef.current) return

    const currentHour = new Date().getHours()
    const hourIndex = weather.hourly.time.findIndex(
      t => new Date(t).getHours() === currentHour
    )
    if (hourIndex === -1) return

    const child = carouselRef.current.children[hourIndex] as HTMLElement | undefined
    child?.scrollIntoView({ inline: 'center', behavior: 'auto' })
  }, [isToday, weather])

  if (!coords) {
    return (
      <div className="glass-panel rounded-xl p-4 flex items-center justify-center h-full min-h-[104px]">
        <span className="text-sm text-slate-500">Set location to see weather</span>
      </div>
    )
  }

  if (selectedDate > maxForecastDate || selectedDate < minPastDate) {
    return (
      <div className="glass-panel rounded-xl p-4 flex items-center justify-center h-full min-h-[104px]">
        <span className="text-sm text-slate-500">Forecast unavailable for this date.</span>
      </div>
    )
  }

  if (!weather?.hourly) {
    return (
      <div className="glass-panel rounded-xl p-4 flex items-center justify-center h-full min-h-[104px]">
        <span className="text-sm text-slate-500">Loading weather...</span>
      </div>
    )
  }

  const now = new Date()

  return (
    <div className="glass-panel rounded-xl p-4">
      <div ref={carouselRef} className="flex overflow-x-auto gap-4 pb-2 no-scrollbar snap-x">
        {weather.hourly.time.map((timeString, index) => {
          const date = new Date(timeString)
          const isCurrentHour = isToday && date.getHours() === now.getHours()
          const rain = weather.hourly.rain?.[index]
          const label = rain != null ? rainLabel(rain) : null
          return (
            <div
              key={timeString}
              className={`flex flex-col items-center min-w-[60px] snap-start ${
                isCurrentHour ? 'text-slate-200' : 'text-slate-400'
              }`}
            >
              <span className="text-xs opacity-70">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="my-2">
                <WeatherIcon code={weather.hourly.weathercode[index]} />
              </div>
              <span className="font-semibold">
                {Math.round(weather.hourly.temperature_2m[index])}°
              </span>
              {label && (
                <span className="text-[10px] text-blue-400 leading-none mt-0.5">{label}</span>
              )}
              <div className={`mt-1 flex items-center justify-center ${isCurrentHour ? '' : 'invisible'}`}>
                <div className="w-1 h-1 rounded-full bg-blue-400" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
