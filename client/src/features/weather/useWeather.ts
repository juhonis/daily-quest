import { useCallback, useEffect, useState } from 'react'
import type { WeatherData } from '../../types'

const CACHE_TIME = 10 * 60 * 1000
const requests = new Map<string, { time: number; promise: Promise<WeatherData> }>()

export interface WeatherResource {
  data: WeatherData | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  retry: () => void
}

function validWeather(value: unknown): value is WeatherData {
  if (!value || typeof value !== 'object') return false
  const weather = value as WeatherData
  const hourly = weather.hourly
  if (!hourly || !Array.isArray(hourly.time) || hourly.time.length === 0 ||
      !hourly.time.every((time) => typeof time === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(time))) return false
  for (const values of [hourly.temperature_2m, hourly.weathercode, ...(hourly.rain ? [hourly.rain] : [])]) {
    if (!Array.isArray(values) || values.length !== hourly.time.length || !values.every(Number.isFinite)) return false
  }
  const current = weather.current_weather
  return !current || (Number.isFinite(current.temperature) && Number.isFinite(current.weathercode) && typeof current.time === 'string')
}

function requestWeather(key: string, lat: number, lon: number, date: string): Promise<WeatherData> {
  const cached = requests.get(key)
  if (cached && Date.now() - cached.time < CACHE_TIME) return cached.promise
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode,rain&start_date=${date}&end_date=${date}&timezone=auto`
  const promise = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error('Weather request failed.')
    const data: unknown = await response.json()
    if (!validWeather(data)) throw new Error('Weather response was incomplete.')
    return data
  }).catch((error) => {
    if (requests.get(key)?.promise === promise) requests.delete(key)
    throw error
  })
  requests.set(key, { time: Date.now(), promise })
  if (requests.size > 32) requests.delete(requests.keys().next().value!)
  return promise
}

export function useWeatherResource(lat: number, lon: number, date: string): WeatherResource {
  const key = date ? JSON.stringify([lat, lon, date]) : ''
  const [result, setResult] = useState<{ key: string; data: WeatherData | null; status: 'ready' | 'error' } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!key) return
    let active = true
    function load() {
      void requestWeather(key, lat, lon, date).then(
        (data) => { if (active) setResult({ key, data, status: 'ready' }) },
        () => { if (active) setResult({ key, data: null, status: 'error' }) },
      )
    }
    load()
    const timer = setInterval(load, CACHE_TIME)
    return () => { active = false; clearInterval(timer) }
  }, [key, lat, lon, date, attempt])

  const retry = useCallback(() => {
    requests.delete(key)
    setResult(null)
    setAttempt((value) => value + 1)
  }, [key])

  if (!key) return { data: null, status: 'idle', retry }
  if (!result || result.key !== key) return { data: null, status: 'loading', retry }
  return { data: result.data, status: result.status, retry }
}

export function useWeather(lat: number, lon: number, date: string) {
  return useWeatherResource(lat, lon, date).data
}
