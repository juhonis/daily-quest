import { useState, useEffect } from 'react'
import { Sun, Cloud, CloudRain, Snowflake, CloudFog, CloudLightning, Settings } from 'lucide-react'
import { format } from 'date-fns'
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

export function CurrentWeather() {
  const locationName = useStore(s => s.locationName)
  const coords = useGeolocation()
  const lat = coords?.lat ?? 0
  const lon = coords?.lon ?? 0

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const weather = useWeather(lat, lon, coords ? todayStr : '')

  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  if (!coords) {
    return (
      <div className="relative">
        <div className="glass-panel rounded-xl p-3 min-w-[140px] min-h-[104px] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Weather</span>
            <button
              onClick={() => setShowLocationPicker(true)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Set location"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={() => setShowLocationPicker(true)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors self-start"
          >
            Set location
          </button>
        </div>
        {showLocationPicker && (
          <LocationPicker onClose={() => setShowLocationPicker(false)} />
        )}
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="relative">
        <div className="glass-panel rounded-xl p-3 min-w-[140px] min-h-[104px] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            {locationName && <span className="text-xs text-slate-500">{locationName}</span>}
            <button
              onClick={() => setShowLocationPicker(true)}
              className="text-slate-500 hover:text-slate-300 transition-colors ml-auto"
              aria-label="Change location"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
          <span className="text-xs text-slate-500">Loading...</span>
        </div>
        {showLocationPicker && (
          <LocationPicker onClose={() => setShowLocationPicker(false)} />
        )}
      </div>
    )
  }

  const currentWeather = weather.current_weather

  return (
    <div className="relative">
      <div className="glass-panel rounded-xl p-3 min-w-[140px] min-h-[104px] flex flex-col gap-1">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </h2>
          <button
            onClick={() => setShowLocationPicker(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors -mt-0.5"
            aria-label="Change location"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>
        {currentWeather && (
          <div className="flex items-center gap-1">
            {getWeatherIcon(currentWeather.weathercode)}
            <span className="text-lg">{Math.round(currentWeather.temperature)}°C</span>
          </div>
        )}
        <div className="min-h-[16px]">
          {locationName && (
            <span className="text-xs text-slate-500">{locationName}</span>
          )}
        </div>
      </div>
      {showLocationPicker && (
        <LocationPicker onClose={() => setShowLocationPicker(false)} />
      )}
    </div>
  )
}
