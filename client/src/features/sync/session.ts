import { useStore } from '../../store/useStore'
import { ensureSync } from '../../utils/sync/state'
import { canonical, primary, recordKey, type SyncData } from '../../utils/sync/records'
import { digest, exchange } from '../../utils/sync/protocol'

export interface SyncStatus {
  role: 'host' | 'guest'
  code: string
  expires: number
  message: string
  verification?: string
  canApprove?: boolean
  complete?: boolean
  pending?: boolean
  error?: string
  summary?: string
}
export interface SyncSession { approve: () => void; cancel: () => void }

async function post(path: string, signal: AbortSignal) {
  const response = await fetch(`/api/sync/${path}`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json' } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error ?? 'Pairing service unavailable. Check the Cloudflare setup.')
  if (typeof body.token !== 'string' || typeof body.expires !== 'number') throw new Error('Invalid pairing response. Check the Cloudflare setup.')
  return body as { token: string; expires: number; code?: string }
}

function summary(before: SyncData, after: SyncData): string {
  const old = new Map(before.records.map((r) => [recordKey(r), primary(r).value]))
  let added = 0, updated = 0, deleted = 0, conflicts = 0
  for (const record of after.records) {
    const value = primary(record).value
    if (record.kind === 'recovery') { if (value !== null) conflicts++; continue }
    const previous = old.get(recordKey(record)) ?? null
    if (canonical(previous) === canonical(value)) continue
    if (value === null) deleted++
    else if (previous === null) added++
    else updated++
  }
  return `${added} added · ${updated} updated · ${deleted} deleted · ${conflicts} recovery items`
}

async function acquireLock(): Promise<() => void> {
  if (!navigator.locks) throw new Error('This browser cannot coordinate sync tabs. Please use a current browser.')
  return new Promise((resolve, reject) => {
    void navigator.locks.request('daily-quest-peer-sync', { ifAvailable: true }, async (lock) => {
      if (!lock) { reject(new Error('Another tab is already syncing. Close its sync session first.')); return }
      await new Promise<void>((release) => resolve(release))
    }).catch(reject)
  })
}

export async function startSession(
  role: 'host' | 'guest',
  code: string,
  update: (status: SyncStatus) => void,
  signal: AbortSignal,
): Promise<SyncSession> {
  if (!window.isSecureContext || typeof RTCPeerConnection === 'undefined') throw new Error('Device sync needs HTTPS and a browser supporting WebRTC.')
  if (!navigator.onLine) throw new Error('Connect to the internet to pair devices.')
  const release = await acquireLock()
  const controller = new AbortController()
  let pc: RTCPeerConnection | undefined
  let socket: WebSocket | undefined
  let channel: RTCDataChannel | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let ended = false
  let exchanging = false
  let pending = false
  let verified = false
  let finished = false
  let state: SyncStatus = { role, code, expires: 0, message: 'Creating pairing session…' }
  const notify = (patch: Partial<SyncStatus>) => { state = { ...state, ...patch }; update(state) }
  const cleanup = () => {
    if (ended) return
    ended = true
    clearTimeout(timer)
    controller.abort()
    socket?.close()
    channel?.close()
    pc?.close()
    signal.removeEventListener('abort', abort)
    release()
  }
  const fail = (error: unknown) => {
    if (ended) return
    notify({ canApprove: false, error: error instanceof Error ? error.message : 'Sync failed. Retry to finish combining changes.', message: 'Sync incomplete' })
    cleanup()
  }
  const abort = () => cleanup()
  signal.addEventListener('abort', abort, { once: true })
  try {
    signal.throwIfAborted()
    const pairing = await post(role === 'host' ? 'create' : `join/${code}`, controller.signal)
    signal.throwIfAborted()
    code = pairing.code ?? code
    if (!/^[A-Z2-9]{8}$/.test(code)) throw new Error('Invalid pairing code.')
    notify({ code, expires: pairing.expires, message: role === 'host' ? 'Waiting for the other device…' : 'Connecting to the other device…' })
    timer = setTimeout(() => fail(new Error('Session expired. Start a new sync.')), Math.max(1, pairing.expires - Date.now()))
    pc = new RTCPeerConnection({ iceServers: [] })
    const peer = pc
    const url = new URL(`/api/sync/socket/${code}`, location.origin)
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    url.searchParams.set('role', role)
    url.searchParams.set('token', pairing.token)
    socket = new WebSocket(url)
    const ws = socket
    const send = (value: unknown) => {
      if (ws.readyState !== WebSocket.OPEN) throw new Error('Pairing connection closed. Start a new sync.')
      ws.send(JSON.stringify(value))
    }
    const read = () => ensureSync(useStore.getState())
    const before = read()
    const earlyMessages: string[] = []
    const bufferMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string' || event.data.length > 64000 || earlyMessages.length >= 1000) { fail(new Error('Invalid early sync data.')); return }
      earlyMessages.push(event.data)
    }
    const apply = (data: SyncData) => {
      useStore.getState().applySync(data)
      // Zustand updates memory before persistence; explicitly verify the stored result.
      const persisted = JSON.parse(localStorage.getItem('daily-quest-store') ?? 'null')
      if (canonical(persisted?.state?.sync) !== canonical(useStore.getState().sync)) throw new Error('Changes could not be saved locally. Free browser storage and retry.')
    }
    const connectChannel = (dataChannel: RTCDataChannel) => {
      channel = dataChannel
      dataChannel.addEventListener('message', bufferMessage)
      dataChannel.onopen = () => {
        void (async () => {
          const fingerprints = [peer.localDescription?.sdp, peer.remoteDescription?.sdp]
            .flatMap((sdp) => sdp?.match(/^a=fingerprint:[^\r\n]+/gm) ?? [])
          if (fingerprints.length < 2) throw new Error('Could not verify peer identity.')
          const verification = (await digest([...new Set(fingerprints)].sort().join('\n'))).slice(0, 12).match(/.{4}/g)!.join(' ')
          verified = true
          notify({ verification, canApprove: false, message: 'Waiting for peer verification…' })
          send({ type: 'verified' })
        })().catch(fail)
      }
      dataChannel.onclose = () => { if (!finished && !ended) fail(new Error('Direct connection interrupted. Retry to finish syncing.')) }
      dataChannel.onerror = () => fail(new Error('Direct connection failed. Check Wi-Fi isolation or firewall settings.'))
    }
    peer.ondatachannel = (event) => connectChannel(event.channel)
    peer.onicecandidate = (event) => { if (event.candidate && !ended) { try { send({ type: 'signal', signal: { type: 'candidate', candidate: event.candidate.toJSON() } }) } catch (error) { fail(error) } } }
    peer.onconnectionstatechange = () => { if (peer.connectionState === 'failed') fail(new Error('Could not connect directly. Use the same non-guest Wi-Fi and check firewall settings.')) }
    const candidates: RTCIceCandidateInit[] = []
    let queue = Promise.resolve()
    ws.onmessage = (event) => {
      queue = queue.then(async () => {
        if (ended) return
        if (typeof event.data !== 'string' || event.data.length > 24000) throw new Error('Invalid pairing message.')
        const message = JSON.parse(event.data)
        if (message.type === 'ready' && role === 'host') {
          notify({ message: 'Establishing a direct connection…' })
          connectChannel(peer.createDataChannel('daily-quest-sync', { ordered: true }))
          await peer.setLocalDescription(await peer.createOffer())
          send({ type: 'signal', signal: peer.localDescription!.toJSON() })
        } else if (message.type === 'signal') {
          const description = message.signal
          if (description.type === 'candidate') {
            if (peer.remoteDescription) await peer.addIceCandidate(description.candidate)
            else candidates.push(description.candidate)
          } else if ((role === 'guest' && description.type === 'offer') || (role === 'host' && description.type === 'answer')) {
            await peer.setRemoteDescription(description)
            for (const candidate of candidates.splice(0)) await peer.addIceCandidate(candidate)
            if (role === 'guest') {
              await peer.setLocalDescription(await peer.createAnswer())
              send({ type: 'signal', signal: peer.localDescription!.toJSON() })
            }
          } else throw new Error('Unexpected peer description.')
        } else if (message.type === 'verification-ready') {
          notify({ canApprove: role === 'host', message: role === 'host' ? 'Compare the verification code on both devices, then confirm.' : 'Compare the verification code, then confirm on the starting device.' })
        } else if (message.type === 'approved') {
          if (!verified || !channel || channel.readyState !== 'open' || exchanging) throw new Error('Peer approved before verification completed.')
          exchanging = true
          channel.removeEventListener('message', bufferMessage)
          notify({ canApprove: false, message: 'Exchanging changes…' })
          // Do not block signaling while waiting for transfer completion.
          void exchange(channel, read, apply, controller.signal, (message) => notify({ message }), earlyMessages).then((result) => {
            if (ended) return
            pending = result.pending
            finished = true
            notify({ message: 'Saved locally. Waiting for the other device…', summary: summary(before, read()) })
            send({ type: 'finished' })
          }).catch(fail)
        } else if (message.type === 'complete') {
          if (!finished) throw new Error('Unexpected completion acknowledgement.')
          notify({ complete: true, pending, message: pending ? 'Sync complete. New edits remain—sync again to send them.' : 'Sync complete' })
          cleanup()
        }
      }).catch(fail)
    }
    ws.onerror = () => fail(new Error('Pairing service unavailable. Check the connection and Cloudflare deployment.'))
    ws.onclose = () => { if (!ended) fail(new Error('Pairing session closed or expired. Retry if sync was incomplete.')) }
    return {
      approve: () => { if (verified && !exchanging && role === 'host') { try { send({ type: 'approve' }); notify({ canApprove: false }) } catch (error) { fail(error) } } },
      cancel: cleanup,
    }
  } catch (error) { cleanup(); throw error }
}
