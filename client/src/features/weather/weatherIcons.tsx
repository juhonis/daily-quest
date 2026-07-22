import type { ReactNode } from 'react'
import { Sun, CloudSun, Cloud, CloudFog, CloudLightning, Droplet, Snowflake } from 'lucide-react'

interface WeatherConfig {
  mainIcon: ReactNode
  subType: 'drop' | 'snow' | 'none'
  count: number
}

const DROP = <Droplet className="w-2.5 h-2.5 text-blue-400 fill-blue-400/40" />
const SNOW = <Snowflake className="w-2.5 h-2.5 text-blue-200" />

function getWeatherConfig(code: number): WeatherConfig {
  if (code === 0) return { mainIcon: <Sun className="text-yellow-400" />, subType: 'none', count: 0 }
  if (code === 1 || code === 2) return { mainIcon: <CloudSun className="text-yellow-400" />, subType: 'none', count: 0 }
  if (code === 3) return { mainIcon: <Cloud className="text-gray-300" />, subType: 'none', count: 0 }
  if (code >= 45 && code <= 48) return { mainIcon: <CloudFog className="text-gray-400" />, subType: 'none', count: 0 }
  if (code === 51 || code === 56 || code === 57 || code === 61) return { mainIcon: <Cloud className="text-gray-300" />, subType: 'drop', count: 1 }
  if (code === 53 || code === 66 || code === 67 || code === 80) return { mainIcon: <Cloud className="text-gray-300" />, subType: 'drop', count: 1 }
  if (code === 55 || code === 63 || code === 81) return { mainIcon: <Cloud className="text-gray-300" />, subType: 'drop', count: 2 }
  if (code === 65 || code === 82) return { mainIcon: <Cloud className="text-gray-300" />, subType: 'drop', count: 3 }
  if (code === 71 || code === 77) return { mainIcon: <Cloud className="text-gray-300" />, subType: 'snow', count: 1 }
  if (code === 73 || code === 85) return { mainIcon: <Cloud className="text-gray-300" />, subType: 'snow', count: 2 }
  if (code === 75 || code === 86) return { mainIcon: <Cloud className="text-gray-300" />, subType: 'snow', count: 3 }
  if (code === 95) return { mainIcon: <CloudLightning className="text-purple-400" />, subType: 'drop', count: 1 }
  if (code >= 96 && code <= 99) return { mainIcon: <CloudLightning className="text-purple-400" />, subType: 'drop', count: 2 }
  return { mainIcon: <Sun className="text-yellow-400" />, subType: 'none', count: 0 }
}

export function WeatherIcon({ code }: { code: number }) {
  const { mainIcon, subType, count } = getWeatherConfig(code)

  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span className="inline-flex">{mainIcon}</span>
      {subType !== 'none' && count > 0 && (
        <span className="flex gap-[1px] -mt-[3px]">
          {Array.from({ length: count }).map((_, i) => (
            <span key={i}>{subType === 'snow' ? SNOW : DROP}</span>
          ))}
        </span>
      )}
    </span>
  )
}


