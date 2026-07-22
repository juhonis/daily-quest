import { useState, useEffect, useRef } from 'react'
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

export function WeatherWidget() {
  const selectedDate = useStore(s => s.selectedDate)
  const locationName = useStore(s => s.locationName)
  const coords = useGeolocation()
  const lat = coords?.lat ?? 0
  const lon = coords?.lon ?? 0

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const isToday = selectedDate === todayStr

  const todayWeather = useWeather(lat, lon, coords ? todayStr : '')
  const selectedWeather = useWeather(lat, lon, coords ? (isToday ? '' : selectedDate) : '')
  const carouselWeather = isToday ? todayWeather : selectedWeather
  const currentWeather = todayWeather?.current_weather

  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [now, setNow] = useState(new Date())
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isToday || !carouselWeather || !carouselRef.current) return

    const currentHour = now.getHours()
    const hourIndex = carouselWeather.hourly.time.findIndex(t => new Date(t).getHours() === currentHour)
    if (hourIndex === -1) return

    const child = carouselRef.current.children[hourIndex] as HTMLElement | undefined
    child?.scrollIntoView({ inline: 'center', behavior: 'auto' })
  }, [isToday, carouselWeather, now])

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

  if (!todayWeather) {
    return (
      <div className="glass-panel p-4 mb-6 flex flex-col gap-2 rounded-xl">
        <div className="flex items-center justify-between">
          {locationName && <span className="text-xs text-slate-500">{locationName}</span>}
          <button
            onClick={() => setShowLocationPicker(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors ml-auto"
            aria-label="Change location"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-center h-12 text-sm text-slate-500">
          Loading weather...
        </div>
        {showLocationPicker && (
          <LocationPicker isOpen={showLocationPicker} onClose={() => setShowLocationPicker(false)} />
        )}
      </div>
    )
  }

  return (
    <div className="glass-panel p-4 mb-6 flex flex-col gap-4 rounded-xl">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            {locationName ? (
              <>
                <span className="text-xs opacity-70">{locationName}</span>
                <button
                  onClick={() => setShowLocationPicker(true)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Change location"
                >
                  <Settings className="w-3 h-3" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLocationPicker(true)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Set location
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentWeather && (
            <>
              {getWeatherIcon(currentWeather.weathercode)}
              <span className="text-2xl">{Math.round(currentWeather.temperature)}°C</span>
            </>
          )}
          {locationName && (
            <button
              onClick={() => setShowLocationPicker(true)}
              className="text-slate-500 hover:text-slate-300 transition-colors ml-1"
              aria-label="Change location"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!carouselWeather ? (
        <div className="flex items-center justify-center h-12 text-sm text-slate-500">
          Loading weather...
        </div>
      ) : (
        <div ref={carouselRef} className="flex overflow-x-auto gap-4 pb-2 no-scrollbar snap-x">
          {carouselWeather.hourly.time.map((timeString, index) => {
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
                  {getWeatherIcon(carouselWeather.hourly.weathercode[index])}
                </div>
                <span className="font-semibold">
                  {Math.round(carouselWeather.hourly.temperature_2m[index])}°
                </span>
                {isCurrentHour && <div className="w-1 h-1 rounded-full bg-blue-400 mt-1" />}
              </div>
            )
          })}
        </div>
      )}

      {showLocationPicker && (
        <LocationPicker isOpen={showLocationPicker} onClose={() => setShowLocationPicker(false)} />
      )}
    </div>
  )
}
