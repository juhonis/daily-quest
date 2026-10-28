import { useCallback, useEffect, useState } from 'react'

export interface RainRadarFrame {
  time: number
  path: string
}

interface RainRadarData {
  host: string
  frames: RainRadarFrame[]
}

function parseRadar(value: unknown): RainRadarData {
  if (!value || typeof value !== 'object') throw new Error('Missing radar data.')
  const raw = value as { host?: unknown; radar?: { past?: unknown } }
  if (typeof raw.host !== 'string' || !/^https:\/\//.test(raw.host) ||
      !Array.isArray(raw.radar?.past) || !raw.radar.past.length) {
    throw new Error('Incomplete radar data.')
  }
  const frames = raw.radar.past.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid radar frame.')
    const frame = value as RainRadarFrame
    if (!Number.isFinite(frame.time) || typeof frame.path !== 'string' || !frame.path.startsWith('/')) {
      throw new Error('Invalid radar frame.')
    }
    return { time: frame.time, path: frame.path }
  })
  return { host: raw.host, frames }
}

export function useRainRadar(enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; data: RainRadarData | null } | null>(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Radar request failed.')
        return parseRadar(await response.json())
      })
      .then((data) => { if (!controller.signal.aborted) setResult({ attempt, data }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ attempt, data: null }) })
    return () => controller.abort()
  }, [enabled, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  if (!enabled) return { data: null, status: 'idle' as const, retry }
  if (!result || result.attempt !== attempt) return { data: null, status: 'loading' as const, retry }
  return { data: result.data, status: result.data ? 'ready' as const : 'error' as const, retry }
}
