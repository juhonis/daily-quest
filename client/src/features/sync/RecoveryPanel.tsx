import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useStore } from '../../store/useStore'
import { primary, type Recovery } from '../../utils/sync/records'

export function RecoveryPanel() {
  const sync = useStore((state) => state.sync)
  const resolve = useStore((state) => state.resolveRecovery)
  const [error, setError] = useState('')
  const recoveries = sync.records.filter((record) => record.kind === 'recovery' && primary(record).value !== null)
  if (!recoveries.length) return null

  function handle(id: string, restore: boolean) {
    try { resolve(id, restore); setError('') }
    catch { setError('Could not save the recovery action. Check available browser storage and retry.') }
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sync recovery ({recoveries.length})</h3>
      <p className="text-xs text-slate-400">Alternate edits preserved during sync. Restoring replaces the current item with this version. Dismissing removes this recovery item on future syncs.</p>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {recoveries.map((record) => {
          const recovery = primary(record).value as Recovery
          const value = recovery.value as { title?: string; content?: string; description?: string }
          return (
            <details key={record.id} className="rounded-lg border border-slate-700 p-3 text-sm text-slate-300">
              <summary className="cursor-pointer break-words">{value.title || 'Untitled'} <span className="text-xs text-slate-500">({recovery.kind})</span></summary>
              <pre className="my-3 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs">{value.content ?? value.description ?? JSON.stringify(value, null, 2)}</pre>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handle(record.id, true)}>Restore version</Button>
                <Button variant="ghost" onClick={() => handle(record.id, false)}>Dismiss</Button>
              </div>
            </details>
          )
        })}
      </div>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </section>
  )
}
