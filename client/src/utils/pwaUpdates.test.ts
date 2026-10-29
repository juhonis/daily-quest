import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const worker = vi.hoisted(() => ({
  options: null as null | { onNeedRefresh: () => void },
  update: vi.fn(async (_reload?: boolean) => {}),
  register: vi.fn(),
}))
vi.mock('virtual:pwa-register', () => ({ registerSW: (options: { onNeedRefresh: () => void }) => {
  worker.options = options
  worker.register()
  return worker.update
} }))

describe('PWA updates', () => {
  beforeEach(() => { vi.resetModules(); worker.register.mockClear(); worker.update.mockClear(); vi.stubGlobal('navigator', { serviceWorker: {} }) })
  afterEach(() => vi.unstubAllGlobals())

  it('registers once and exposes update readiness without automatically reloading', async () => {
    const pwa = await import('./pwaUpdates')
    const listener = vi.fn()
    const unsubscribe = pwa.subscribeUpdates(listener)
    pwa.startPwaRegistration()
    pwa.startPwaRegistration()
    expect(worker.register).toHaveBeenCalledTimes(1)
    expect(pwa.updateReady()).toBe(false)
    worker.options!.onNeedRefresh()
    expect(pwa.updateReady()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(worker.update).not.toHaveBeenCalled()
    await pwa.applyAppUpdate()
    expect(worker.update).toHaveBeenCalledWith(true)
    unsubscribe()
  })

  it('does not register in browsers without service workers', async () => {
    vi.stubGlobal('navigator', {})
    const pwa = await import('./pwaUpdates')
    pwa.startPwaRegistration()
    expect(worker.register).not.toHaveBeenCalled()
  })
})
