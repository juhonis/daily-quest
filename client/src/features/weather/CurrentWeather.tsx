import { useState, useEffect, lazy, Suspense } from 'react'
import { Settings, Radar } from 'lucide-react'
import { format } from 'date-fns'
import { useWeather } from './useWeather'
import { useStore } from '../../store/useStore'
import { LocationPicker } from './LocationPicker'
import { WeatherIcon } from './weatherIcons'

const RainRadar = lazy(() =>
  import('./RainRadar').then(m => ({ default: m.RainRadar }))
)

function RadarFallback() {
  return (
    <div className="glass-panel rounded-xl p-3 w-[340px] flex flex-col gap-1">
      <span className="text-xs text-slate-500">Radar</span>
      <span className="text-xs text-slate-500">Loading...</span>
    </div>
  )
}

function rainLabel(rainMm: number): string | null {
  if (rainMm <= 0) return null
  if (rainMm < 0.5) return '0.1'
  if (rainMm < 1.5) return '0.5'
  return `${Math.round(rainMm)}`
}

export function CurrentWeather() {
  const locationName = useStore(s => s.locationName)
  const coords = useStore(s => s.coords)
  const lat = coords?.lat ?? 0
  const lon = coords?.lon ?? 0

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const weather = useWeather(lat, lon, coords ? todayStr : '')

  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showRadar, setShowRadar] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  function openLocationPicker() {
    setShowRadar(false)
    setShowLocationPicker(true)
  }

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
      <div className="h-36 glass-panel rounded-xl p-3 min-w-[140px] min-h-[104px] flex flex-col gap-1">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </h2>
          <div className="flex items-center gap-1 -mt-0.5">
            <button
              onClick={() => setShowRadar(s => !s)}
              className={`transition-colors ${
                showRadar ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              aria-label={showRadar ? 'Hide radar' : 'Show radar'}
            >
              <Radar className="w-3 h-3" />
            </button>
            <button
              onClick={openLocationPicker}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Change location"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        </div>
        {currentWeather && (
          <div className="flex items-center gap-1">
            <WeatherIcon code={currentWeather.weathercode} />
            <span className="text-lg">{Math.round(currentWeather.temperature)}°C</span>
          </div>
        )}
        <div className="min-h-[16px] flex items-center gap-2">
          {locationName && (
            <span className="text-xs text-slate-500">{locationName}</span>
          )}
          {currentWeather && weather.hourly.rain?.[0] != null && rainLabel(weather.hourly.rain[0]) && (
            <span className="text-[10px] text-blue-400">{rainLabel(weather.hourly.rain[0])}mm</span>
          )}
        </div>
      </div>
      {showRadar && (
        <Suspense fallback={<RadarFallback />}>
          <RainRadar onClose={() => setShowRadar(false)} />
        </Suspense>
      )}
      {showLocationPicker && (
        <LocationPicker onClose={() => setShowLocationPicker(false)} />
      )}
    </div>
  )
}
