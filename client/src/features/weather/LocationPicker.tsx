import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { Crosshair, Search, X } from 'lucide-react'

interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country: string
  admin1?: string
}

interface LocationPickerProps {
  onClose: () => void
}

export function LocationPicker({ onClose }: LocationPickerProps) {
  const storeCoords = useStore(s => s.coords)
  const setCoords = useStore(s => s.setCoords)
  const storeMode = useStore(s => s.locationMode)
  const setLocationMode = useStore(s => s.setLocationMode)
  const setLocationName = useStore(s => s.setLocationName)

  const [mode, setMode] = useState<'auto' | 'manual'>(storeMode)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [autoStatus, setAutoStatus] = useState<'idle' | 'requesting' | 'error' | 'success'>(storeCoords && storeMode === 'auto' ? 'success' : 'idle')

  useEffect(() => {
    if (!query.trim() || mode !== 'manual') return

    let cancelled = false
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
        )
        const data = await res.json()
        if (!cancelled) setResults(data.results ?? [])
      } catch {
        if (!cancelled) setResults([])
      }
    }, 300)

    return () => { cancelled = true; clearTimeout(id) }
  }, [query, mode])

  function handleRequestAuto() {
    if (!('geolocation' in navigator)) {
      setAutoStatus('error')
      return
    }

    setAutoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude })
        setLocationMode('auto')
        setLocationName('')
        setAutoStatus('success')
        onClose()
      },
      () => {
        setAutoStatus('error')
      }
    )
  }

  function handleSelectCity(city: GeocodingResult) {
    setCoords({ lat: city.latitude, lon: city.longitude })
    setLocationMode('manual')
    const name = city.admin1
      ? `${city.name}, ${city.admin1}, ${city.country}`
      : `${city.name}, ${city.country}`
    setLocationName(name)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full mt-2 z-50 w-[480px] max-h-[70vh] overflow-y-auto glass-panel rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Set Location</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('auto')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'auto'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Crosshair className="w-4 h-4 inline mr-1.5" />
            Auto
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Search className="w-4 h-4 inline mr-1.5" />
            Search City
          </button>
        </div>

        {mode === 'auto' && (
          <div className="text-sm">
            {autoStatus === 'success' && (
              <p className="text-green-400 mb-3">Location set automatically.</p>
            )}
            <button
              onClick={handleRequestAuto}
              disabled={autoStatus === 'requesting'}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {autoStatus === 'requesting'
                ? 'Requesting...'
                : autoStatus === 'error'
                  ? 'Retry'
                  : 'Use My Location'}
            </button>
            {autoStatus === 'error' && (
              <p className="text-red-400 mt-2">
                Location access denied. Try manual search instead.
              </p>
            )}
          </div>
        )}

        {mode === 'manual' && (
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a city..."
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-colors"
            />
            {query.trim() && (
              <div className="mt-2 max-h-48 overflow-y-auto">
                {results.length > 0 ? results.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleSelectCity(city)}
                    className="w-full text-left px-3 py-2 rounded text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    {city.name}
                    {city.admin1 ? `, ${city.admin1}` : ''}
                    {`, ${city.country}`}
                  </button>
                )) : (
                  <p className="text-xs text-slate-500 px-3 py-2">No cities found.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
