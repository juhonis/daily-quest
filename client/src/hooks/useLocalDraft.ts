import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export function useLocalDraft<T>(key: string, draft: T | null, blocked: boolean, write: (key: string, draft: T | null) => boolean) {
  const [saved, setSaved] = useState<{ draft: T | null; ok: boolean } | null>(null)
  const finished = useRef(false)
  const latest = useRef<T | null>(null)
  useLayoutEffect(() => { latest.current = draft }, [draft])

  const flush = useCallback(() => {
    if (finished.current || blocked) return true
    const ok = write(key, latest.current)
    setSaved({ draft: latest.current, ok })
    return ok
  }, [key, blocked, write])

  useEffect(() => {
    if (blocked) return
    const timer = setTimeout(flush, 300)
    return () => clearTimeout(timer)
  }, [draft, blocked, flush])

  useEffect(() => {
    const save = () => { if (!finished.current && !blocked) write(key, latest.current) }
    const visibility = () => { if (document.visibilityState === 'hidden') save() }
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [key, blocked, write])

  function clear() { finished.current = true; write(key, null) }
  const status = saved?.ok === false ? 'error' : saved?.draft === draft && draft ? 'saved' : 'idle'
  return { status, flush, clear }
}
