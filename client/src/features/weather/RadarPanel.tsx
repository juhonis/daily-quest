import { lazy, Suspense, useState } from 'react'
import { Radar, Settings, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Button } from '../../components/ui/Button'
import { LocationPicker } from './LocationPicker'

const RainRadar = lazy(() => import('./RainRadar').then((module) => ({ default: module.RainRadar })))

export function RadarPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [locationOpen, setLocationOpen] = useState(false)
  const location = useStore((state) => state.locationName)

  return (
    <aside id={id} aria-labelledby={`${id}-title`} className="radar-dock min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70"
      onKeyDown={(event) => {
        // Portal dialogs such as LocationPicker handle their own Escape key.
        if (event.key === 'Escape' && event.currentTarget.contains(event.target as Node)) {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Radar className="h-4 w-4 text-blue-400" />Rain radar</h2>
          {location && <p className="mt-1 truncate text-xs text-slate-500" title={location}>{location.split(',')[0]}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="icon" onClick={() => setLocationOpen(true)} aria-label="Change radar location"><Settings className="h-4 w-4" /></Button>
          <Button variant="icon" onClick={onClose} aria-label="Close radar"><X className="h-4 w-4" /></Button>
        </div>
      </header>
      <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain p-3">
        <Suspense fallback={<p role="status" className="py-8 text-center text-sm text-slate-400">Loading radar…</p>}>
          <RainRadar onChangeLocation={() => setLocationOpen(true)} />
        </Suspense>
      </div>
      {locationOpen && <LocationPicker onClose={() => setLocationOpen(false)} />}
    </aside>
  )
}
