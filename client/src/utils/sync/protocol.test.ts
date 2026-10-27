import { describe, expect, it } from 'vitest'
import { encodeTransfer, exchange, TransferReceiver } from './protocol'
import { mergeRecords, type SyncData } from './records'

const data = { records: [{ kind: 'tagColors' as const, id: 'tag', heads: [{ version: { a: 1 }, value: '#abcdef' }] }] }

describe('sync transfers', () => {
  it('roundtrips checksummed chunks', async () => {
    const receiver = new TransferReceiver(1)
    let result
    for (const frame of await encodeTransfer(data, 1)) result = await receiver.receive(frame)
    expect(result?.data).toEqual(data)
  })
  it('rejects incomplete, corrupted and incompatible transfers', async () => {
    const frames = await encodeTransfer(data, 1)
    const incomplete = new TransferReceiver(1)
    await incomplete.receive(frames[0])
    await expect(incomplete.receive(frames[2])).rejects.toThrow('Incomplete')
    const corrupt = new TransferReceiver(1)
    await corrupt.receive(frames[0])
    await corrupt.receive(frames[1].replace('#abcdef', '#ffffff'))
    await expect(corrupt.receive(frames[2])).rejects.toThrow('checksum')
    await expect(new TransferReceiver(1).receive(frames[0].replace('"protocol":1', '"protocol":99'))).rejects.toThrow('Unsupported')
    await expect(new TransferReceiver(2).receive(frames[0])).rejects.toThrow('round')
  })

  it('exchanges and acknowledges two rounds on both peers', async () => {
    class Channel extends EventTarget {
      bufferedAmount = 0
      readyState = 'open'
      peer!: Channel
      send(value: string) { queueMicrotask(() => this.peer.dispatchEvent(new MessageEvent('message', { data: value }))) }
    }
    const a = new Channel(), b = new Channel()
    a.peer = b; b.peer = a
    let left: SyncData = data
    let right: SyncData = { records: [{ kind: 'tagColors', id: 'other', heads: [{ version: { b: 1 }, value: '#ffffff' }] }] }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    try {
      const results = await Promise.all([
        exchange(a as unknown as RTCDataChannel, () => left, (incoming) => { left = mergeRecords(left, incoming) }, controller.signal, () => {}),
        exchange(b as unknown as RTCDataChannel, () => right, (incoming) => { right = mergeRecords(right, incoming) }, controller.signal, () => {}),
      ])
      expect(left).toEqual(right)
      expect(left.records).toHaveLength(2)
      expect(results).toEqual([{ pending: false }, { pending: false }])
    } finally { clearTimeout(timeout) }
  })
})
