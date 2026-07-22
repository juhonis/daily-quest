import { useEffect, useRef } from 'react'
import { Sun, Cloud, CloudRain, Snowflake, CloudFog, CloudLightning } from 'lucide-react'
import { format } from 'date-fns'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useWeather } from './useWeather'
import { useStore } from '../../store/useStore'

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun className="text-yellow-400" />
  if (code >= 1 && code <= 3) return <Cloud className="text-gray-300" />
  if (code >= 45 && code <= 48) return <CloudFog className="text-gray-400" />
  if (code >= 51 && code <= 67) return <CloudRain className="text-blue-400" />
  if (code >= 71 && code <= 77) return <Snowflake className="text-blue-200" />
  if (code >= 95 && code <= 99) return <CloudLightning className="text-purple-400" />
  return <Sun className="text-yellow-400" />
}

export function WeatherCarousel() {
  const selectedDate = useStore(s => s.selectedDate)
  const coords = useGeolocation()
  const lat = coords?.lat ?? 0
  const lon = coords?.lon ?? 0

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const isToday = selectedDate === todayStr

  const weather = useWeather(lat, lon, coords ? selectedDate : '')
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isToday || !weather || !carouselRef.current) return

    const currentHour = new Date().getHours()
    const hourIndex = weather.hourly.time.findIndex(
      t => new Date(t).getHours() === currentHour
    )
    if (hourIndex === -1) return

    const child = carouselRef.current.children[hourIndex] as HTMLElement | undefined
    child?.scrollIntoView({ inline: 'center', behavior: 'auto' })
  }, [isToday, weather])

  if (!coords || !weather) {
    return (
      <div className="glass-panel rounded-xl p-4 flex items-center justify-center h-full min-h-[104px]">
        <span className="text-sm text-slate-500">
          {!coords ? 'Set location to see weather' : 'Loading weather...'}
        </span>
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
                {getWeatherIcon(weather.hourly.weathercode[index])}
              </div>
              <span className="font-semibold">
                {Math.round(weather.hourly.temperature_2m[index])}°
              </span>
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
