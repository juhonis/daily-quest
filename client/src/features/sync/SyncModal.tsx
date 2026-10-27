import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { startSession, type SyncSession, type SyncStatus } from './session'

export function SyncModal({ onClose, initialCode = '' }: { onClose: () => void; initialCode?: string }) {
  const [code, setCode] = useState(initialCode)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const session = useRef<SyncSession | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => { controller.current?.abort(); session.current?.cancel() }, [])

  function cancel() {
    controller.current?.abort()
    session.current?.cancel()
    session.current = null
    setStatus(null)
    setBusy(false)
  }

  async function begin(role: 'host' | 'guest') {
    if (busy) return
    setError('')
    setStatus(null)
    setBusy(true)
    const abort = new AbortController()
    controller.current = abort
    try {
      session.current = await startSession(role, code, (next) => {
        if (!abort.signal.aborted) {
          setStatus(next)
          if (next.complete || next.error) setBusy(false)
        }
      }, abort.signal)
    } catch (e) {
      if (!abort.signal.aborted) { setError(e instanceof Error ? e.message : 'Could not start sync.'); setBusy(false) }
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Sync devices">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Open Daily Quest on both devices. Pair over the internet, then combine notes and quests directly between browsers. Keep both apps open until sync finishes.
        </p>
        {!busy && !status?.complete && (
          <div className="space-y-4">
            <Button onClick={() => void begin('host')}>Start sync</Button>
            <div className="border-t border-slate-700 pt-4 space-y-2">
              <label htmlFor="sync-code" className="block text-sm text-slate-300">Or enter the code from your other device</label>
              <div className="flex gap-2">
                <input id="sync-code" value={code} maxLength={8} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                  onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))}
                  className="min-w-0 flex-1 rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 font-mono tracking-widest text-slate-100"
                  placeholder="ABCDEFGH" />
                <Button variant="secondary" disabled={!/^[A-Z2-9]{8}$/.test(code)} onClick={() => void begin('guest')}>Join sync</Button>
              </div>
            </div>
          </div>
        )}
        {busy && !status && <p role="status" className="text-sm text-slate-300">Starting pairing…</p>}
        {status && (
          <div className="space-y-3">
            {busy && status.role === 'host' && !status.verification && (
              <div className="flex flex-col items-center gap-3 rounded-lg bg-slate-800 p-4">
                <p className="text-xs text-slate-400">Enter this code on the other device, or scan the QR link</p>
                <p className="font-mono text-2xl tracking-widest text-slate-100 select-all">{status.code}</p>
                <QRCodeSVG value={`${location.origin}/#sync=${status.code}`} size={176} marginSize={3} title="Open Daily Quest and join this sync" />
                <p className="text-xs text-slate-400">Expires at {new Date(status.expires).toLocaleTimeString()}</p>
              </div>
            )}
            <p role="status" aria-live="polite" className="text-sm text-slate-200">{status.message}</p>
            {status.verification && !status.complete && !status.error && (
              <div className="rounded-lg border border-slate-600 p-3 space-y-2">
                <p className="text-xs text-slate-400">Both devices must show the same verification code. Cancel if they differ.</p>
                <p className="font-mono text-lg text-slate-100 select-all">{status.verification}</p>
                {status.canApprove && <Button onClick={() => session.current?.approve()}>Codes match — sync</Button>}
              </div>
            )}
            {status.summary && <p className="text-xs text-slate-400">{status.summary}</p>}
            {status.complete && <p className="text-xs text-slate-400">Preserved alternate versions are available under Settings → Sync recovery.</p>}
            {status.error && <p role="alert" className="text-sm text-red-300">{status.error}</p>}
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <div className="flex justify-end">
          {busy ? <Button variant="secondary" onClick={cancel}>Cancel sync</Button> : <Button variant="secondary" onClick={onClose}>Done</Button>}
        </div>
      </div>
    </Modal>
  )
}
