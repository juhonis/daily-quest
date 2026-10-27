import { DurableObject } from 'cloudflare:workers'

interface Env { ROOMS: DurableObjectNamespace<PairingRoom>; ALLOWED_ORIGINS: string }
interface Room { host: string; guest?: string; expires: number; approved: boolean; finished: string[] }
const TTL = 5 * 60 * 1000
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
const error = (message: string, status = 400) => json({ error: message }, status)

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin')
    if (!origin || !env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).includes(origin)) return error('Origin not allowed.', 403)
    const url = new URL(request.url)
    const route = url.pathname.replace(/^\/api\/sync/, '')
    if (request.method !== 'POST' && request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return error('Method not allowed.', 405)
    const ip = request.headers.get('CF-Connecting-IP') ?? 'local'
    const limit = env.ROOMS.get(env.ROOMS.idFromName(`limit:${ip}`))
    const allowed = await limit.fetch('https://internal/limit')
    if (!allowed.ok) return error('Too many pairing attempts. Try again in ten minutes.', 429)
    if (route === '/create' && request.method === 'POST') {
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = [...crypto.getRandomValues(new Uint8Array(8))].map((n) => alphabet[n % alphabet.length]).join('')
        const room = env.ROOMS.get(env.ROOMS.idFromName(`room:${code}`))
        const result = await room.fetch('https://internal/create', { method: 'POST' })
        if (result.ok) return json({ ...await result.json() as object, code })
      }
      return error('Could not create a pairing session. Retry.', 503)
    }
    const match = /^\/(join|socket)\/([A-Z2-9]{8})$/.exec(route)
    if (!match) return error('Pairing endpoint not found.', 404)
    if (match[1] === 'join' && request.method !== 'POST') return error('Method not allowed.', 405)
    const room = env.ROOMS.get(env.ROOMS.idFromName(`room:${match[2]}`))
    url.pathname = `/${match[1]}`
    return room.fetch(new Request(url, request))
  },
} satisfies ExportedHandler<Env>

export class PairingRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    // Serialize read-modify-write operations even when storage awaits yield.
    return this.ctx.blockConcurrencyWhile(async () => {
      const url = new URL(request.url)
      if (url.pathname === '/limit') {
        const now = Date.now()
        const entry = await this.ctx.storage.get<{ start: number; count: number }>('limit')
        const next = entry && now - entry.start < 600000 ? { ...entry, count: entry.count + 1 } : { start: now, count: 1 }
        await this.ctx.storage.put('limit', next)
        await this.ctx.storage.setAlarm(next.start + 600000)
        return new Response(null, { status: next.count > 30 ? 429 : 204 })
      }
      const room = await this.ctx.storage.get<Room>('room')
      if (url.pathname === '/create') {
        if (room && room.expires > Date.now()) return error('Session already exists.', 409)
        const created: Room = { host: crypto.randomUUID(), expires: Date.now() + TTL, approved: false, finished: [] }
        await this.ctx.storage.put('room', created)
        await this.ctx.storage.setAlarm(created.expires)
        return json({ token: created.host, expires: created.expires })
      }
      if (!room || room.expires <= Date.now()) return error('Code not found or expired. Start a new sync.', 404)
      if (url.pathname === '/join') {
        if (room.guest) return error('This code has already been used. Start a new sync.', 409)
        room.guest = crypto.randomUUID()
        await this.ctx.storage.put('room', room)
        return json({ token: room.guest, expires: room.expires })
      }
      if (url.pathname !== '/socket' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return error('Expected WebSocket upgrade.', 426)
      const role = url.searchParams.get('role')
      const token = url.searchParams.get('token')
      if ((role !== 'host' && role !== 'guest') || !token || token !== room[role]) return error('Invalid session credentials.', 403)
      if (this.ctx.getWebSockets(role).length) return error('Device already connected.', 409)
      const pair = new WebSocketPair()
      const client = pair[0], server = pair[1]
      this.ctx.acceptWebSocket(server, [role])
      server.serializeAttachment({ role, count: 0 })
      if (this.ctx.getWebSockets().length === 2) this.broadcast({ type: 'ready' })
      return new Response(null, { status: 101, webSocket: client })
    })
  }

  private broadcast(value: unknown) {
    const text = JSON.stringify(value)
    for (const socket of this.ctx.getWebSockets()) socket.send(text)
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    await this.ctx.blockConcurrencyWhile(async () => {
      const room = await this.ctx.storage.get<Room>('room')
      const peer = socket.deserializeAttachment() as { role: 'host' | 'guest'; count: number }
      if (!room || room.expires <= Date.now() || typeof raw !== 'string' || raw.length > 24000 || ++peer.count > 150) { socket.close(1008, 'Invalid or expired session'); return }
      socket.serializeAttachment(peer)
      try {
        const message = JSON.parse(raw)
        if (message.type === 'approve' && peer.role === 'host' && this.ctx.getWebSockets().length === 2 && !room.approved) {
          room.approved = true
          await this.ctx.storage.put('room', room)
          this.broadcast({ type: 'approved' })
        } else if (message.type === 'finished' && room.approved) {
          room.finished = [...new Set([...room.finished, peer.role])]
          await this.ctx.storage.put('room', room)
          if (room.finished.length === 2) this.broadcast({ type: 'complete' })
        } else if (message.type === 'signal') {
          const signal = message.signal
          const validDescription = signal && ['offer', 'answer'].includes(signal.type) && typeof signal.sdp === 'string'
          const validCandidate = signal && signal.type === 'candidate' && signal.candidate && typeof signal.candidate.candidate === 'string'
          if (!validDescription && !validCandidate) throw new Error('Invalid signaling message')
          for (const other of this.ctx.getWebSockets()) if (other !== socket) other.send(raw)
        } else throw new Error('Unexpected message')
      } catch { socket.close(1008, 'Invalid signaling message') }
    })
  }

  async webSocketClose(socket: WebSocket, code: number) {
    socket.close(code === 1006 ? 1000 : code)
    for (const other of this.ctx.getWebSockets()) if (other !== socket) other.close(1000, 'Peer disconnected; retry if sync was incomplete')
    await this.ctx.storage.deleteAll()
  }

  async alarm() {
    for (const socket of this.ctx.getWebSockets()) socket.close(1000, 'Session expired')
    await this.ctx.storage.deleteAll()
  }
}
