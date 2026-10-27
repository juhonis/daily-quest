import { parseSyncData, MAX_SYNC_BYTES } from './validation'
import { canonical, mergeRecords, type SyncData } from './records'

export const PROTOCOL_VERSION = 1
const CHUNK_SIZE = 12000
export const MAX_FRAME_SIZE = 64000

export async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function encodeTransfer(data: SyncData, round: number): Promise<string[]> {
  const text = canonical(parseSyncData(data))
  const chunks = Math.ceil(text.length / CHUNK_SIZE)
  const hash = await digest(text)
  return [
    JSON.stringify({ type: 'start', protocol: PROTOCOL_VERSION, round, chunks, hash }),
    ...Array.from({ length: chunks }, (_, index) => JSON.stringify({ type: 'chunk', round, index, text: text.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE) })),
    JSON.stringify({ type: 'end', round }),
  ]
}

export class TransferReceiver {
  private parts: string[] = []
  private expected = 0
  private bytes = 0
  private hash = ''
  private started = false
  private ended = false

  private round: number
  constructor(round: number) { this.round = round }

  async receive(raw: string): Promise<{ data: SyncData; hash: string } | undefined> {
    if (raw.length > MAX_FRAME_SIZE) throw new Error('Sync message too large.')
    const frame = JSON.parse(raw)
    if (!frame || frame.round !== this.round) throw new Error('Unexpected sync round.')
    if (frame.type === 'start') {
      if (this.started || frame.protocol !== PROTOCOL_VERSION) throw new Error('Unsupported or repeated sync handshake. Update both apps.')
      if (!Number.isInteger(frame.chunks) || frame.chunks < 1 || frame.chunks > Math.ceil(MAX_SYNC_BYTES / CHUNK_SIZE)) throw new Error('Invalid sync size.')
      if (typeof frame.hash !== 'string' || !/^[a-f0-9]{64}$/.test(frame.hash)) throw new Error('Invalid sync checksum.')
      this.started = true
      this.expected = frame.chunks
      this.hash = frame.hash
    } else if (frame.type === 'chunk') {
      if (!this.started || this.ended || frame.index !== this.parts.length || this.parts.length >= this.expected || typeof frame.text !== 'string' || frame.text.length > CHUNK_SIZE) throw new Error('Invalid sync chunk.')
      this.bytes += new TextEncoder().encode(frame.text).length
      if (this.bytes > MAX_SYNC_BYTES) throw new Error('Sync exceeds the 8 MiB limit.')
      this.parts.push(frame.text)
    } else if (frame.type === 'end') {
      if (!this.started || this.ended || this.parts.length !== this.expected) throw new Error('Incomplete sync transfer.')
      this.ended = true
      const text = this.parts.join('')
      if (await digest(text) !== this.hash) throw new Error('Sync checksum mismatch.')
      return { data: parseSyncData(JSON.parse(text)), hash: this.hash }
    } else throw new Error('Unknown sync message.')
  }
}

async function send(channel: RTCDataChannel, frame: string, signal: AbortSignal) {
  while (channel.bufferedAmount > 128 * 1024) {
    signal.throwIfAborted()
    if (channel.readyState !== 'open') throw new Error('Connection closed during transfer.')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  signal.throwIfAborted()
  if (channel.readyState !== 'open') throw new Error('Connection closed during transfer.')
  channel.send(frame)
}

// Both sides run two rounds. The second catches edits made during the first.
export async function exchange(
  channel: RTCDataChannel,
  read: () => SyncData,
  apply: (data: SyncData) => void,
  signal: AbortSignal,
  progress: (message: string) => void,
  initialMessages: string[] = [],
): Promise<{ pending: boolean }> {
  let finalSnapshot = ''
  // Install one listener before any asynchronous hashing/sending begins.
  const inbox: string[] = [...initialMessages]
  let wake: (() => void) | undefined
  let closed = false
  const onMessage = (event: MessageEvent) => {
    if (typeof event.data !== 'string' || event.data.length > MAX_FRAME_SIZE || inbox.length > 1000) {
      closed = true
    } else inbox.push(event.data)
    wake?.()
  }
  const onClose = () => { closed = true; wake?.() }
  channel.addEventListener('message', onMessage)
  channel.addEventListener('close', onClose)
  signal.addEventListener('abort', onClose)
  try {
    for (let round = 1; round <= 2; round++) {
      signal.throwIfAborted()
      progress(round === 1 ? 'Exchanging changes…' : 'Checking for changes made during sync…')
      const sentSnapshot = read()
      const frames = await encodeTransfer(sentSnapshot, round)
      const outgoingHash = JSON.parse(frames[0]).hash as string
      const sending = (async () => { for (const frame of frames) await send(channel, frame, signal) })()
      // Observe rejection immediately while the receiver is awaiting messages.
      let sendError: unknown
      void sending.catch((error) => { sendError = error; onClose() })
      const receiver = new TransferReceiver(round)
      let applied = false
      let acknowledged = false
      while (!applied || !acknowledged) {
        signal.throwIfAborted()
        if (closed) throw sendError ?? new Error('Sync interrupted. Retry to finish combining changes.')
        if (!inbox.length) { await new Promise<void>((resolve) => { wake = resolve }); wake = undefined; continue }
        const raw = inbox.shift()!
        const frame = JSON.parse(raw)
        if (frame.type === 'ack') {
          if (frame.round !== round || frame.hash !== outgoingHash || acknowledged) throw new Error('Invalid sync acknowledgement.')
          acknowledged = true
        } else {
          const result = await receiver.receive(raw)
          if (result) {
            apply(result.data)
            finalSnapshot = canonical(mergeRecords(sentSnapshot, result.data))
            applied = true
            await send(channel, JSON.stringify({ type: 'ack', round, hash: result.hash }), signal)
          }
        }
      }
      await sending
    }
    return { pending: canonical(read()) !== finalSnapshot }
  } finally {
    channel.removeEventListener('message', onMessage)
    channel.removeEventListener('close', onClose)
    signal.removeEventListener('abort', onClose)
  }
}
