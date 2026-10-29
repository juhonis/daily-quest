import { registerSW } from 'virtual:pwa-register'

const listeners = new Set<() => void>()
let ready = false
let registered = false
let update: ((reloadPage?: boolean) => Promise<void>) | undefined

export function startPwaRegistration() {
  if (registered || !('serviceWorker' in navigator)) return
  registered = true
  update = registerSW({
    immediate: true,
    onNeedRefresh() { ready = true; for (const listener of listeners) listener() },
  })
}

export const updateReady = () => ready
export function subscribeUpdates(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
export async function applyAppUpdate() { await update?.(true) }
