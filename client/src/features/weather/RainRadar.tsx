import { useState, useEffect, useMemo } from 'react'
import { Play, Pause, Settings } from 'lucide-react'
import { useRainRadar } from './useRainRadar'
import { useStore } from '../../store/useStore'
import { LocationPicker } from './LocationPicker'

const RADAR_ZOOM = 7
const RADAR_SIZE = 512
const RADAR_COLOR = 2
const RADAR_SMOOTH = 1
const RADAR_SNOW = 1
const FRAME_INTERVAL_MS = 800

function tileUrl(host: string, path: string, lat: number, lon: number): string {
  return `${host}${path}/${RADAR_SIZE}/${RADAR_ZOOM}/${lat}/${lon}/${RADAR_COLOR}/${RADAR_SMOOTH}_${RADAR_SNOW}.png`
}

function frameTime(frameTimeSec: number): string {
  return new Date(frameTimeSec * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RainRadar() {
  const coords = useStore(s => s.coords)
  const radar = useRainRadar()

  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(true)

  const frames = useMemo(() => radar?.frames ?? [], [radar])

  useEffect(() => {
    if (!playing || frames.length < 2) return
    const id = setInterval(() => {
      setFrameIndex(i => (i + 1) % frames.length)
    }, FRAME_INTERVAL_MS)
    return () => clearInterval(id)
  }, [playing, frames])

  useEffect(() => {
    if (!radar || frameIndex >= frames.length - 1) return
    const next = frames[frameIndex + 1]
    const img = new Image()
    img.src = tileUrl(radar.host, next.path, coords?.lat ?? 0, coords?.lon ?? 0)
  }, [radar, frameIndex, frames, coords])

  if (!coords) {
    return (
      <div className="relative">
        <div className="glass-panel rounded-xl p-3 min-w-[140px] min-h-[104px] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Radar</span>
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

  if (!radar || frames.length === 0) {
    return (
      <div className="relative">
        <div className="glass-panel rounded-xl p-3 min-w-[140px] min-h-[104px] flex flex-col gap-1">
          <span className="text-xs text-slate-500">Radar</span>
          <span className="text-xs text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  const frame = frames[Math.min(frameIndex, frames.length - 1)]
  const src = tileUrl(radar.host, frame.path, coords.lat, coords.lon)

  return (
    <div className="glass-panel rounded-xl p-3 flex flex-col gap-2 w-[256px]">
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
        </div>
      </div>
      <img
        src={src}
        alt={`Radar precipitation ${frameTime(frame.time)}`}
        className="w-60 h-60 rounded-lg object-cover bg-slate-900/60"
        draggable={false}
      />
      <div className="flex items-center justify-center gap-1">
        {frames.map((f, i) => (
          <button
            key={f.time}
            onClick={() => { setFrameIndex(i); setPlaying(false) }}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === frameIndex ? 'bg-blue-400' : 'bg-slate-600 hover:bg-slate-400'
            }`}
            aria-label={`Show radar frame ${frameTime(f.time)}`}
          />
        ))}
      </div>
    </div>
  )
}
