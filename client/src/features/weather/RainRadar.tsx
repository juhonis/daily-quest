import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Play, Pause, Settings, X } from 'lucide-react'
import { useRainRadar } from './useRainRadar'
import { useStore } from '../../store/useStore'
import { LocationPicker } from './LocationPicker'

const RADAR_SIZE = 256
const RADAR_COLOR = 2
const RADAR_SMOOTH = 1
const RADAR_SNOW = 1
const FRAME_INTERVAL_MS = 800
const INITIAL_ZOOM = 7
const MIN_ZOOM = 3
const MAX_ZOOM = 12
const RADAR_MAX_NATIVE_ZOOM = 7
const RADAR_OPACITY = 0.85

const BASEMAP_URL = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

const LOCATION_PIN_HTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.8));">
    <circle cx="4" cy="4" r="3.5" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>
  </svg>
`

function radarLayerUrl(host: string, path: string): string {
  return `${host}${path}/${RADAR_SIZE}/{z}/{x}/{y}/${RADAR_COLOR}/${RADAR_SMOOTH}_${RADAR_SNOW}.png`
}

function frameTime(frameTimeSec: number): string {
  return new Date(frameTimeSec * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PopupShell({ onClose, children }: { onClose?: () => void; children: ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full mt-2 z-50">{children}</div>
    </>
  )
}

interface RainRadarProps {
  onClose?: () => void
}

export function RainRadar({ onClose }: RainRadarProps) {
  const coords = useStore(s => s.coords)
  const radar = useRainRadar()

  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(true)

  const frames = useMemo(() => radar?.frames ?? [], [radar])

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const radarLayerRef = useRef<L.TileLayer | null>(null)

  useEffect(() => {
    const container = mapContainerRef.current
    if (!coords || !radar || !container) return

    const map = L.map(container, {
      center: [coords.lat, coords.lon],
      zoom: INITIAL_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomControl: true,
      scrollWheelZoom: false,
    })
    mapRef.current = map

    L.tileLayer(BASEMAP_URL, {
      attribution: BASEMAP_ATTRIBUTION,
      maxZoom: MAX_ZOOM,
    }).addTo(map)

    const pinIcon = L.divIcon({
      className: '',
      html: LOCATION_PIN_HTML,
      iconSize: [8, 8],
      iconAnchor: [4, 4],
    })
    L.marker([coords.lat, coords.lon], { icon: pinIcon, zIndexOffset: 1000 }).addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      radarLayerRef.current = null
    }
  }, [coords, radar])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !radar || frames.length === 0) return

    const frame = frames[frameIndex % frames.length]
    const url = radarLayerUrl(radar.host, frame.path)

    const layer = radarLayerRef.current
    if (layer) {
      layer.setUrl(url)
    } else {
      radarLayerRef.current = L.tileLayer(url, {
        maxZoom: MAX_ZOOM,
        maxNativeZoom: RADAR_MAX_NATIVE_ZOOM,
        opacity: RADAR_OPACITY,
      }).addTo(map)
    }
  }, [frameIndex, radar, frames, coords])

  useEffect(() => {
    if (!playing || frames.length < 2) return
    const id = setInterval(() => {
      setFrameIndex(i => (i + 1) % frames.length)
    }, FRAME_INTERVAL_MS)
    return () => clearInterval(id)
  }, [playing, frames])

  if (!coords) {
    return (
      <PopupShell onClose={onClose}>
        <div className="glass-panel rounded-xl p-3 w-[340px] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Radar</span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Close radar"
              >
                <X className="w-3 h-3" />
              </button>
            )}
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
      </PopupShell>
    )
  }

  if (!radar || frames.length === 0) {
    return (
      <PopupShell onClose={onClose}>
        <div className="glass-panel rounded-xl p-3 w-[340px] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Radar</span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Close radar"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500">Loading...</span>
        </div>
      </PopupShell>
    )
  }

  const frame = frames[frameIndex % frames.length]

  return (
    <PopupShell onClose={onClose}>
      <div className="glass-panel rounded-xl p-3 flex flex-col gap-2 w-[340px]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Radar</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">{frameTime(frame.time)}</span>
            <button
              onClick={() => setPlaying(p => !p)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={playing ? 'Pause radar animation' : 'Play radar animation'}
            >
              {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setShowLocationPicker(true)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Change location"
            >
              <Settings className="w-3 h-3" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Close radar"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="relative z-0 radar-map rounded-lg overflow-hidden bg-slate-900">
          <div ref={mapContainerRef} className="h-72 w-full" />
        </div>
        <div className="flex items-center justify-center gap-1">
          {frames.map((f, i) =>
            i === frameIndex ? (
              <span key={f.time} className="text-[10px] text-blue-400 leading-none">
                {frameTime(f.time)}
              </span>
            ) : (
              <button
                key={f.time}
                onClick={() => { setFrameIndex(i); setPlaying(false) }}
                className="w-1.5 h-1.5 rounded-full bg-slate-600 hover:bg-slate-400 transition-colors"
                aria-label={`Show radar frame ${frameTime(f.time)}`}
              />
            )
          )}
        </div>
      </div>
      {showLocationPicker && (
        <LocationPicker onClose={() => setShowLocationPicker(false)} />
      )}
    </PopupShell>
  )
}
