import { useEffect, useState, useSyncExternalStore } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { applyAppUpdate, startPwaRegistration, subscribeUpdates, updateReady } from '../../utils/pwaUpdates'
import { currentDialogCount, subscribeNavigation } from '../../utils/appNavigation'
import { Button } from '../ui/Button'

export function AppUpdateNotice() {
  const ready = useSyncExternalStore(subscribeUpdates, updateReady)
  const dialogCount = useSyncExternalStore(subscribeNavigation, currentDialogCount)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => { startPwaRegistration() }, [])
  if (!ready || dismissed || dialogCount > 0) return null
  return (
    <aside aria-label="App update" className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl sm:left-auto sm:right-6 sm:max-w-md lg:bottom-6">
      <div className="flex items-center gap-3"><p role="status" className="min-w-0 flex-1 text-sm text-slate-300">{error ? 'Could not update. Reconnect and retry.' : 'An app update is ready.'}</p><Button onClick={() => { void applyAppUpdate().catch(() => setError(true)) }}><RefreshCw className="h-4 w-4" />Reload</Button><Button variant="icon" aria-label="Dismiss update notice" onClick={() => setDismissed(true)}><X className="h-4 w-4" /></Button></div>
    </aside>
  )
}
