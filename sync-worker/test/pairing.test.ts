import { env } from 'cloudflare:workers'
import { runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import worker from '../src/index'

const bindings = env as Parameters<typeof worker.fetch>[1]
async function connect(code: string, role: string, token: string) {
  const response = await worker.fetch(new Request(`https://app.example/api/sync/socket/${code}?role=${role}&token=${token}`, {
    headers: { Origin: 'https://app.example', Upgrade: 'websocket', 'CF-Connecting-IP': crypto.randomUUID() },
  }), bindings)
  expect(response.status).toBe(101)
  const socket = response.webSocket!
  socket.accept()
  return socket
}
function message(socket: WebSocket): Promise<{ type: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Missing signaling message')), 2000)
    socket.addEventListener('message', (event) => { clearTimeout(timeout); resolve(JSON.parse(event.data as string)) }, { once: true })
  })
}

const request = (path: string, origin = 'https://app.example') => worker.fetch(new Request(`https://app.example/api/sync${path}`, {
  method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': crypto.randomUUID() },
}), env as Parameters<typeof worker.fetch>[1])

describe('pairing service', () => {
  it('creates a session and atomically accepts only one guest', async () => {
    const created = await request('/create')
    expect(created.status).toBe(200)
    const room = await created.json() as { code: string; token: string; expires: number }
    expect(room.code).toMatch(/^[A-Z2-9]{8}$/)
    expect(room.expires).toBeGreaterThan(Date.now())
    const joined = await Promise.all([request(`/join/${room.code}`), request(`/join/${room.code}`)])
    expect(joined.map((r) => r.status).sort()).toEqual([200, 409])
    const guest = await joined.find((r) => r.ok)!.json() as { token: string }
    expect(guest.token).not.toBe(room.token)
  })

  it('rejects unknown rooms and foreign origins', async () => {
    expect((await request('/join/ABCDEFGH')).status).toBe(404)
    expect((await request('/create', 'https://evil.example')).status).toBe(403)
  })

  it('requires a session token for signaling', async () => {
    const room = await (await request('/create')).json() as { code: string }
    const response = await worker.fetch(new Request(`https://app.example/api/sync/socket/${room.code}?role=host&token=wrong`, {
      headers: { Origin: 'https://app.example', Upgrade: 'websocket', 'CF-Connecting-IP': crypto.randomUUID() },
    }), env as Parameters<typeof worker.fetch>[1])
    expect(response.status).toBe(403)
  })

  it('gates approval on both peers and completion on both persistence acknowledgements', async () => {
    const room = await (await request('/create')).json() as { code: string; token: string }
    const guest = await (await request(`/join/${room.code}`)).json() as { token: string }
    const hostSocket = await connect(room.code, 'host', room.token)
    const ready = message(hostSocket)
    const guestSocket = await connect(room.code, 'guest', guest.token)
    expect((await ready).type).toBe('ready')
    const verified = message(hostSocket)
    hostSocket.send(JSON.stringify({ type: 'verified' }))
    guestSocket.send(JSON.stringify({ type: 'verified' }))
    expect((await verified).type).toBe('verification-ready')
    const approved = message(hostSocket)
    hostSocket.send(JSON.stringify({ type: 'approve' }))
    expect((await approved).type).toBe('approved')
    const complete = message(hostSocket)
    hostSocket.send(JSON.stringify({ type: 'finished' }))
    guestSocket.send(JSON.stringify({ type: 'finished' }))
    expect((await complete).type).toBe('complete')
    hostSocket.close(); guestSocket.close()
  })

  it('limits guesses per IP address', async () => {
    const ip = crypto.randomUUID()
    const responses = []
    for (let i = 0; i < 31; i++) {
      responses.push(await worker.fetch(new Request('https://app.example/api/sync/join/ZZZZZZZZ', {
        method: 'POST', headers: { Origin: 'https://app.example', 'CF-Connecting-IP': ip },
      }), bindings))
    }
    expect(responses[0].status).toBe(404)
    expect(responses[30].status).toBe(429)
  })

  it('expires sessions and deletes their temporary state', async () => {
    const room = await (await request('/create')).json() as { code: string }
    const stub = bindings.ROOMS.get(bindings.ROOMS.idFromName(`room:${room.code}`))
    await runInDurableObject(stub, async (_instance, state) => {
      const stored = await state.storage.get<Record<string, unknown>>('room')
      await state.storage.put('room', { ...stored, expires: Date.now() - 1 })
    })
    expect((await request(`/join/${room.code}`)).status).toBe(404)
    await runInDurableObject(stub, async (instance, state) => {
      await instance.alarm()
      expect((await state.storage.list()).size).toBe(0)
    })
  })
})
