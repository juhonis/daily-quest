import { AppShell } from './components/layout/AppShell'
import { useEffect, useState } from 'react'
import { SyncModal } from './features/sync/SyncModal'
import { AppUpdateNotice } from './components/layout/AppUpdateNotice'

const joinCode = () => /^#sync=([A-Z2-9]{8})$/.exec(location.hash)?.[1] ?? null

export default function App() {
  const [code, setCode] = useState(joinCode)
  useEffect(() => {
    const consumeLink = () => {
      const next = joinCode()
      if (next) {
        setCode(next)
        history.replaceState(history.state, '', location.pathname + location.search)
      }
    }
    if (joinCode()) history.replaceState(history.state, '', location.pathname + location.search)
    window.addEventListener('hashchange', consumeLink)
    return () => window.removeEventListener('hashchange', consumeLink)
  }, [])
  return <><AppShell />{code && <SyncModal initialCode={code} onClose={() => setCode(null)} />}<AppUpdateNotice /></>
}
