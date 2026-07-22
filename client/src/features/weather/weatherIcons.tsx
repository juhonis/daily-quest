import type { ReactNode } from 'react'
import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudRainWind, CloudSnow, Snowflake, CloudLightning, CloudHail } from 'lucide-react'

export function getWeatherIcon(code: number): ReactNode {
  if (code === 0) return <Sun className="text-yellow-400" />
  if (code === 1 || code === 2) return <CloudSun className="text-yellow-400" />
  if (code === 3) return <Cloud className="text-gray-300" />
  if (code >= 45 && code <= 48) return <CloudFog className="text-gray-400" />
  if (code === 51 || code === 53) return <CloudDrizzle className="text-blue-300" />
  if (code === 55) return <CloudRain className="text-blue-400" />
  if (code === 56 || code === 57) return <CloudDrizzle className="text-blue-200" />
  if (code === 61) return <CloudDrizzle className="text-blue-400" />
  if (code === 63) return <CloudRain className="text-blue-400" />
  if (code === 65) return <CloudRainWind className="text-blue-500" />
  if (code === 66 || code === 67) return <CloudRainWind className="text-blue-200" />
  if (code === 71 || code === 77) return <Snowflake className="text-blue-200" />
  if (code === 73 || code === 75 || code === 85 || code === 86) return <CloudSnow className="text-blue-200" />
  if (code === 80) return <CloudDrizzle className="text-blue-300" />
  if (code === 81) return <CloudRain className="text-blue-400" />
  if (code === 82) return <CloudRainWind className="text-blue-500" />
  if (code === 95) return <CloudLightning className="text-purple-400" />
  if (code >= 96 && code <= 99) return <CloudHail className="text-purple-400" />
  return <Sun className="text-yellow-400" />
}

export function getRainLabel(rainMm: number): string | null {
  if (rainMm <= 0) return null
  if (rainMm < 0.5) return '0.1'
  if (rainMm < 1.5) return '0.5'
  return `${Math.round(rainMm)}`
}
