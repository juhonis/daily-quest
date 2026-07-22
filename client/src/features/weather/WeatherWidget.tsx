import { useState, useEffect } from 'react'
import { Sun, Cloud, CloudRain, Snowflake, CloudFog, CloudLightning } from 'lucide-react'
import { format, addDays } from 'date-fns'
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

export function WeatherWidget() {
  const selectedDate = useStore(s => s.selectedDate)
  const coords = useGeolocation()
  const lat = coords?.lat ?? 0
  const lon = coords?.lon ?? 0
  const date = coords ? selectedDate : ''
  const weather = useWeather(lat, lon, date)

  const [now, setNow] = useState(new Date())
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')
  const maxForecastDate = format(addDays(new Date(), 14), 'yyyy-MM-dd')

  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [isToday])

  if (!coords) return null

  if (!weather) {
    return (
      <div className="flex items-center justify-center h-20 text-sm text-slate-500">
        {selectedDate > maxForecastDate
          ? 'Forecast unavailable for this date.'
          : 'Loading weather...'}
      </div>
    )
  }

  const noonIndex = weather.hourly.time.findIndex(
    t => t.endsWith('T12:00')
  )

  return (
    <div className="glass-panel p-4 mb-6 flex flex-col gap-4 rounded-xl">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          {isToday ? (
            <h2 className="text-3xl font-bold">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h2>
          ) : (
            <p className="text-sm opacity-70">{format(new Date(selectedDate), 'EEEE, MMM d')}</p>
          )}
        </div>
        {noonIndex !== -1 && (
          <div className="flex items-center gap-2 text-2xl">
            {getWeatherIcon(weather.hourly.weathercode[noonIndex])}
            <span>{Math.round(weather.hourly.temperature_2m[noonIndex])}°C</span>
          </div>
        )}
      </div>

      <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar snap-x">
        {weather.hourly.time.map((timeString, index) => {
          const date = new Date(timeString)
          return (
            <div key={timeString} className="flex flex-col items-center min-w-[60px] snap-start">
              <span className="text-xs opacity-70">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="my-2">
                {getWeatherIcon(weather.hourly.weathercode[index])}
              </div>
              <span className="font-semibold">
                {Math.round(weather.hourly.temperature_2m[index])}°
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
