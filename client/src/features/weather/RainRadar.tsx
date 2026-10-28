import { useState, useEffect, useMemo, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Play, Pause, RotateCw } from 'lucide-react'
import { useRainRadar } from './useRainRadar'
import { useStore } from '../../store/useStore'
import { Button } from '../../components/ui/Button'

const RADAR_SIZE = 256
const FRAME_INTERVAL_MS = 800
const INITIAL_ZOOM = 7
const BASEMAP_URL = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
const LOCATION_PIN_HTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.8));">
    <circle cx="4" cy="4" r="3.5" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>
  </svg>
`

function frameTime(time: number): string {
  return new Date(time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function RainRadar({ onChangeLocation }: { onChangeLocation: () => void }) {
  const coords = useStore((state) => state.coords)
  const resource = useRainRadar(!!coords)
  const radar = resource.data
  const frames = useMemo(() => radar?.frames ?? [], [radar])
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const radarLayerRef = useRef<L.TileLayer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!coords || !radar || !container) return
    const map = L.map(container, {
      center: [coords.lat, coords.lon], zoom: INITIAL_ZOOM,
      minZoom: 3, maxZoom: 12, zoomControl: true, scrollWheelZoom: false,
    })
    mapRef.current = map
    L.tileLayer(BASEMAP_URL, { attribution: BASEMAP_ATTRIBUTION, maxZoom: 12 }).addTo(map)
    const pinIcon = L.divIcon({ className: '', html: LOCATION_PIN_HTML, iconSize: [8, 8], iconAnchor: [4, 4] })
    L.marker([coords.lat, coords.lon], { icon: pinIcon, zIndexOffset: 1000 }).addTo(map)

    let resizeFrame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        // Reuse the same map when CSS moves the dock between columns/rows.
        const center = map.getCenter()
        const zoom = map.getZoom()
        map.invalidateSize({ pan: false })
        map.setView(center, zoom, { animate: false })
      })
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(resizeFrame)
      map.remove()
      mapRef.current = null
      radarLayerRef.current = null
    }
  }, [coords, radar])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !radar || !frames.length) return
    const frame = frames[frameIndex % frames.length]
    const url = `${radar.host}${frame.path}/${RADAR_SIZE}/{z}/{x}/{y}/2/1_1.png`
    if (radarLayerRef.current) radarLayerRef.current.setUrl(url)
    else radarLayerRef.current = L.tileLayer(url, { maxZoom: 12, maxNativeZoom: 7, opacity: 0.85 }).addTo(map)
  }, [frameIndex, radar, frames, coords])

  useEffect(() => {
    if (!playing || frames.length < 2) return
    const timer = setInterval(() => setFrameIndex((index) => (index + 1) % frames.length), FRAME_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [playing, frames])

  if (!coords) return (
    <div className="space-y-3 py-4 text-sm text-slate-400">
      <p>Choose a location to see the rain radar.</p>
      <Button variant="secondary" onClick={onChangeLocation}>Set radar location</Button>
    </div>
  )
  if (!radar || !frames.length) return (
    <div className="space-y-3 py-8 text-center text-sm text-slate-400">
      <p role="status">{resource.status === 'error' ? 'Radar could not be loaded.' : 'Loading radar…'}</p>
      {resource.status === 'error' && <Button variant="secondary" onClick={resource.retry}><RotateCw className="h-4 w-4" />Retry radar</Button>}
    </div>
  )

  const index = frameIndex % frames.length
  const time = frameTime(frames[index].time)
  return (
    <div className="min-w-0 space-y-3">
      <div role="region" aria-label="Rain radar map" className="radar-map relative z-0 overflow-hidden rounded-lg bg-slate-950">
        <div ref={containerRef} className="h-56 w-full min-[1440px]:h-72" />
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause radar animation' : 'Play radar animation'}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="min-w-0"><p className="text-sm text-slate-300">{time}</p><p className="text-xs text-slate-500">Frame {index + 1} of {frames.length}</p></div>
      </div>
      <input type="range" min={0} max={frames.length - 1} value={index} aria-label="Radar frame" aria-valuetext={`${time}, frame ${index + 1} of ${frames.length}`}
        onChange={(event) => { setFrameIndex(Number(event.target.value)); setPlaying(false) }} className="radar-frame-slider min-h-11 w-full" />
    </div>
  )
}
