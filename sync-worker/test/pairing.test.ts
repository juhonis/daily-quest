import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import worker from '../src/index'

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
})
