import { describe, expect, it } from 'vitest'
import { encodeTransfer, TransferReceiver } from './protocol'

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
})
