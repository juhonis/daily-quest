### 1. The API: Open-Meteo
Use **[Open-Meteo](https://open-meteo.com/)**.
* **Why?** Completely free for non-commercial use, requires **no API key**, handles both historical data (past dates) and forecasts (up to 16 days ahead). Exactly what this calendar app needs.

### 2. Handling the "Selected Date"
No API can give hourly weather for 6 months from now.
* **If `selectedDate` is today:** Live clock + current temp + next 24 hours.
* **If `selectedDate` is within next 14 days:** Forecast data.
* **If `selectedDate` is in the past:** Historical data.
* **If `selectedDate` is too far in future:** Placeholder — *"Forecast unavailable for this date."*

### 3. Types
Add a `WeatherData` interface in `src/types/index.ts` alongside the existing types:
```typescript
export interface WeatherCoords {
  lat: number
  lon: number
}

export interface WeatherData {
  hourly: {
    time: string[]
    temperature_2m: number[]
    weathercode: number[]
  }
}
```

### 4. Implementation Steps

#### Step 1: Get the User's Location (Hook)
Create `src/hooks/useGeolocation.ts` (project keeps custom hooks in `src/hooks/`, not `utils`). Store coords in the Zustand store (via `useStore`) instead of raw `localStorage` for consistency.

```typescript
// src/hooks/useGeolocation.ts
import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export function useGeolocation() {
  const coords = useStore(s => s.coords)
  const setCoords = useStore(s => s.setCoords)

  useEffect(() => {
    if (coords) return

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ lat: position.coords.latitude, lon: position.coords.longitude })
        },
        () => {
          // Silently fail — weather is non-critical
        }
      )
    }
  }, [coords, setCoords])

  return coords
}
```

#### Step 2: Fetch Weather based on `selectedDate`
Create `src/features/weather/useWeather.ts`. Open-Meteo expects `YYYY-MM-DD` format (already what `selectedDate` uses).

```typescript
// src/features/weather/useWeather.ts
import { useEffect, useState } from 'react'
import type { WeatherData } from '../../types'

export function useWeather(lat: number, lon: number, dateString: string) {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    async function fetchWeather() {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&start_date=${dateString}&end_date=${dateString}&timezone=auto`

      try {
        const res = await fetch(url)
        const data: WeatherData = await res.json()
        setWeather(data)
      } catch {
        // Weather fetch failed gracefully
      }
    }
    fetchWeather()
  }, [lat, lon, dateString])

  return weather
}
```

#### Step 3: UI — Weather Icon Mapper
```tsx
import { Sun, Cloud, CloudRain, Snowflake, CloudFog, CloudLightning } from 'lucide-react'

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun className="text-yellow-400" />
  if (code >= 1 && code <= 3) return <Cloud className="text-gray-300" />
  if (code >= 45 && code <= 48) return <CloudFog className="text-gray-400" />
  if (code >= 51 && code <= 67) return <CloudRain className="text-blue-400" />
  if (code >= 71 && code <= 77) return <Snowflake className="text-blue-200" />
  if (code >= 95 && code <= 99) return <CloudLightning className="text-purple-400" />
  return <Sun className="text-yellow-400" />
}
```

#### Step 4: Weather Widget Component
Create `src/features/weather/WeatherWidget.tsx`. Only show the live clock when `selectedDate` is today.

```tsx
// src/features/weather/WeatherWidget.tsx
import { useState, useEffect } from 'react'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useWeather } from './useWeather'
import { useStore } from '../../store/useStore'
import { format, addDays } from 'date-fns'

export function WeatherWidget() {
  const selectedDate = useStore(s => s.selectedDate)
  const coords = useGeolocation()
  const weather = coords ? useWeather(coords.lat, coords.lon, selectedDate) : null

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
        {selectedDate > maxForecastDate ? 'Forecast unavailable for this date.' : 'Loading weather...'}
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
```

### 5. Wiring it Up

Replace the `Weather placeholder` div in `src/features/quests/QuestsColumn.tsx` with `<WeatherWidget />`.

### 6. CSS

Add to `src/index.css`:
```css
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

### 7. Store Changes

Add to the Zustand store (`src/store/useStore.ts`):
```typescript
coords: WeatherCoords | null
setCoords: (coords: WeatherCoords) => void
```

Add `WeatherCoords` import from `../types` and persist `coords` alongside existing state.
