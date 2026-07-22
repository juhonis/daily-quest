import { useState, useEffect } from 'react'
import { Sun, Cloud, CloudRain, Snowflake, CloudFog, CloudLightning, Settings } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useWeather } from './useWeather'
import { useStore } from '../../store/useStore'
import { LocationPicker } from './LocationPicker'

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
  const locationName = useStore(s => s.locationName)
  const coords = useGeolocation()
  const lat = coords?.lat ?? 0
  const lon = coords?.lon ?? 0
  const date = coords ? selectedDate : ''
  const weather = useWeather(lat, lon, date)

  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [now, setNow] = useState(new Date())
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')
  const maxForecastDate = format(addDays(new Date(), 14), 'yyyy-MM-dd')

  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [isToday])

  if (!coords) {
    return (
      <div className="glass-panel p-4 mb-6 flex flex-col gap-2 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Weather</span>
          <button
            onClick={() => setShowLocationPicker(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Set location"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setShowLocationPicker(true)}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors self-start"
        >
          Set location
        </button>
        {showLocationPicker && (
          <LocationPicker isOpen={showLocationPicker} onClose={() => setShowLocationPicker(false)} />
        )}
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="glass-panel p-4 mb-6 flex flex-col gap-2 rounded-xl">
        <div className="flex items-center justify-between">
          {locationName && (
            <span className="text-xs text-slate-500">{locationName}</span>
          )}
          <button
            onClick={() => setShowLocationPicker(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors ml-auto"
            aria-label="Change location"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-center h-12 text-sm text-slate-500">
          {selectedDate > maxForecastDate
            ? 'Forecast unavailable for this date.'
            : 'Loading weather...'}
        </div>
        {showLocationPicker && (
          <LocationPicker isOpen={showLocationPicker} onClose={() => setShowLocationPicker(false)} />
        )}
      </div>
    )
  }

  const noonIndex = weather.hourly.time.findIndex(t => t.endsWith('T12:00'))

  return (
    <div className="glass-panel p-4 mb-6 flex flex-col gap-4 rounded-xl">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          {isToday ? (
            <h2 className="text-3xl font-bold">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h2>
          ) : (
            <p className="text-sm opacity-70">
              {format(new Date(selectedDate), 'EEEE, MMM d')}
            </p>
          )}
          <div className="flex items-center gap-1.5">
            {locationName && (
              <span className="text-xs opacity-70">{locationName}</span>
            )}
            <button
              onClick={() => setShowLocationPicker(true)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Change location"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
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

      {showLocationPicker && (
        <LocationPicker isOpen={showLocationPicker} onClose={() => setShowLocationPicker(false)} />
      )}
    </div>
  )
}
