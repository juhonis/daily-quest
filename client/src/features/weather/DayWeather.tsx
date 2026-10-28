import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { CloudSun, MapPin, Radar, RotateCw, Settings } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { addDays, getTodayLocal } from '../../utils/dateUtils'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LocationPicker } from './LocationPicker'
import { WeatherIcon } from './weatherIcons'
import { useWeatherResource, type WeatherResource } from './useWeather'

const RainRadar = lazy(() => import('./RainRadar').then((module) => ({ default: module.RainRadar })))

function HourlyForecast({ resource, selectedDate, currentHour, available, hasLocation }: {
  resource: WeatherResource
  selectedDate: string
  currentHour: string | undefined
  available: boolean
  hasLocation: boolean
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const hourly = resource.data?.hourly

  useLayoutEffect(() => {
    const container = scroller.current
    if (!container || !hourly || !currentHour) return
    const index = hourly.time.findIndex((time) => time.startsWith(currentHour))
    if (index < 0) return
    const align = () => {
      const child = container.children[index] as HTMLElement | undefined
      if (child && container.clientWidth) {
        // Move only this strip; scrollIntoView can unexpectedly scroll the page.
        container.scrollLeft = child.offsetLeft - (container.clientWidth - child.offsetWidth) / 2
      }
    }
    align()
    const observer = new ResizeObserver(align)
    observer.observe(container)
    return () => observer.disconnect()
  }, [hourly, currentHour])

  let message = ''
  if (!hasLocation) message = 'Set a location to see the forecast.'
  else if (!available) message = 'Forecast unavailable for this date.'
  else if (resource.status === 'error') message = 'Forecast could not be loaded.'
  else if (!hourly) message = 'Loading forecast…'

  return (
    <div className="day-forecast min-w-0" role="group" aria-label="Hourly forecast">
      <p className="mb-2 text-xs font-medium text-slate-500">Hourly · {selectedDate}</p>
      {message ? <div className="flex min-h-20 items-center gap-2 text-xs leading-relaxed text-slate-400">
        <p role="status">{message}</p>
        {available && hasLocation && resource.status === 'error' && <Button variant="ghost" onClick={resource.retry} aria-label="Retry forecast"><RotateCw className="h-4 w-4" /></Button>}
      </div> : <div ref={scroller} tabIndex={0} aria-label="Scroll hourly forecast" className="relative flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
        {hourly!.time.map((time, index) => {
          const isCurrent = !!currentHour && time.startsWith(currentHour)
          const rain = hourly!.rain?.[index] ?? 0
          return (
            <div key={time} aria-current={isCurrent ? 'time' : undefined} className={`flex w-14 shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 ${isCurrent ? 'bg-blue-500/10 text-slate-200' : 'text-slate-400'}`}>
              <span className="text-[11px]">{time.slice(11, 16)}</span>
              <WeatherIcon code={hourly!.weathercode[index]} />
              <span className="text-sm font-medium">{Math.round(hourly!.temperature_2m[index])}°</span>
              {rain > 0 && <span className="text-[10px] text-blue-400">{rain.toFixed(1)} mm</span>}
            </div>
          )
        })}
      </div>}
    </div>
  )
}

export function DayWeather({ children }: { children: ReactNode }) {
  const coords = useStore((state) => state.coords)
  const locationName = useStore((state) => state.locationName)
  const selectedDate = useStore((state) => state.selectedDate)
  const [now, setNow] = useState(() => new Date())
  const [locationOpen, setLocationOpen] = useState(false)
  const [radarOpen, setRadarOpen] = useState(false)
  const today = getTodayLocal()
  const available = selectedDate >= addDays(today, -92) && selectedDate <= addDays(today, 16)
  const current = useWeatherResource(coords?.lat ?? 0, coords?.lon ?? 0, coords ? today : '')
  // Today's current conditions and hourly strip share one request and state.
  const otherDay = useWeatherResource(coords?.lat ?? 0, coords?.lon ?? 0,
    coords && available && selectedDate !== today ? selectedDate : '')
  const forecast = selectedDate === today ? current : otherDay
  const conditions = current.data?.current_weather
  const fullLocation = locationName || 'Your location'
  const shortLocation = locationName.split(',')[0].trim() || fullLocation

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section aria-label="Weather" className="day-overview-layout min-w-0">
      <div className="min-w-0" role="group" aria-label="Day summary">
        {children}
        <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1" role="group" aria-label="Current weather">
          <div className="min-w-0 flex-1 basis-36">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {selectedDate !== today && <span className="text-xs font-medium text-slate-400">Now</span>}
              {!coords ? <CloudSun className="h-5 w-5 text-slate-500" />
                : conditions ? <><WeatherIcon code={conditions.weathercode} /><span className="text-lg font-semibold tracking-tight text-slate-200">{Math.round(conditions.temperature)}°C</span></>
                : <p role="status" className="text-xs text-slate-400">{current.status === 'error' || current.status === 'ready' ? 'Current conditions unavailable.' : 'Loading weather…'}</p>}
              <span aria-hidden="true" className="text-slate-600">·</span>
              <time className="text-sm text-slate-400" dateTime={now.toISOString()}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
            {coords && <p className="mt-1 truncate text-xs text-slate-400" title={fullLocation} aria-label={fullLocation}>{shortLocation}</p>}
          </div>
          {!coords ? <Button variant="ghost" onClick={() => setLocationOpen(true)} className="text-blue-400"><MapPin className="h-4 w-4" />Set location</Button>
            : <div className="flex flex-wrap items-center gap-1">
              <Button variant="icon" onClick={() => setLocationOpen(true)} aria-label="Change weather location"><Settings className="h-4 w-4" /></Button>
              <Button variant="icon" onClick={() => setRadarOpen(true)} aria-label="Show radar"><Radar className="h-4 w-4" /></Button>
              {current.status === 'error' && <Button variant="icon" onClick={current.retry} aria-label="Retry current weather"><RotateCw className="h-4 w-4" /></Button>}
            </div>}
        </div>
      </div>
      <HourlyForecast resource={forecast} selectedDate={selectedDate} currentHour={selectedDate === today ? conditions?.time.slice(0, 13) : undefined} available={available} hasLocation={!!coords} />
      {locationOpen && <LocationPicker onClose={() => setLocationOpen(false)} />}
      {radarOpen && <Suspense fallback={<Modal isOpen onClose={() => setRadarOpen(false)} title="Rain radar"><p className="text-sm text-slate-400">Loading radar…</p></Modal>}><RainRadar onClose={() => setRadarOpen(false)} /></Suspense>}
    </section>
  )
}
