export interface FormatResult { text: string; newStart: number; newEnd: number }

export function applyInlineFormat(content: string, start: number, end: number, prefix: string, suffix: string, placeholder: string): FormatResult {
  const selected = content.slice(start, end)
  if (selected.length >= prefix.length + suffix.length && selected.startsWith(prefix) && selected.endsWith(suffix)) {
    const inner = selected.slice(prefix.length, -suffix.length)
    return { text: content.slice(0, start) + inner + content.slice(end), newStart: start, newEnd: start + inner.length }
  }
  if (start >= prefix.length && content.slice(start - prefix.length, start) === prefix && content.slice(end, end + suffix.length) === suffix) {
    const newStart = start - prefix.length
    return { text: content.slice(0, newStart) + selected + content.slice(end + suffix.length), newStart, newEnd: newStart + selected.length }
  }
  const inner = selected.trim() ? selected : placeholder
  return { text: content.slice(0, start) + prefix + inner + suffix + content.slice(end), newStart: start + prefix.length, newEnd: start + prefix.length + inner.length }
}

export function applyBlockFormat(content: string, start: number, end: number, prefix: string, placeholder: string): FormatResult {
  const lineStart = start === 0 ? 0 : content.lastIndexOf('\n', start - 1) + 1
  const effectiveEnd = end > start && content[end - 1] === '\n' ? end - 1 : end
  const nextBreak = content.indexOf('\n', effectiveEnd)
  const lineEnd = nextBreak < 0 ? content.length : nextBreak
  const raw = content.slice(lineStart, lineEnd)
  if (!raw.trim()) {
    return { text: content.slice(0, lineStart) + prefix + placeholder + content.slice(lineEnd), newStart: lineStart + prefix.length, newEnd: lineStart + prefix.length + placeholder.length }
  }
  const ordered = /^\d/.test(prefix)
  const list = ordered || prefix === '- '
  const lines = raw.split('\n')
  const allPrefixed = lines.filter((line) => line.trim()).every((line) => ordered ? /^\d+\.\s/.test(line) : line.startsWith(prefix))
  let number = 1
  const block = lines.map((line) => {
    if (!line.trim()) return line
    if (allPrefixed) return ordered ? line.replace(/^\d+\.\s/, '') : line.slice(prefix.length)
    const inner = list ? line.replace(/^(?:[-*+]\s|\d+\.\s)/, '') : prefix.startsWith('#') ? line.replace(/^#{1,6}\s/, '') : line
    return (ordered ? `${number++}. ` : prefix) + inner
  }).join('\n')
  return { text: content.slice(0, lineStart) + block + content.slice(lineEnd), newStart: lineStart, newEnd: lineStart + block.length }
}

export function linePrefix(content: string, cursor: number): string | null {
  const start = cursor === 0 ? 0 : content.lastIndexOf('\n', cursor - 1) + 1
  return content.slice(start).split('\n', 1)[0].match(/^(\s*(?:[-*+] |\d+\. |> |#{1,6} ))/)?.[1] ?? null
}

export function continueMarkdownList(content: string, start: number, end: number): FormatResult | null {
  const lineStart = start === 0 ? 0 : content.lastIndexOf('\n', start - 1) + 1
  const nextBreak = content.indexOf('\n', start)
  const lineEnd = nextBreak < 0 ? content.length : nextBreak
  const line = content.slice(lineStart, lineEnd)
  const match = /^(\s*)([-*+] |\d+\. |> )/.exec(line)
  if (!match || start < lineStart + match[0].length) return null
  const prefixEnd = lineStart + match[0].length
  if (!content.slice(prefixEnd, lineEnd).trim()) {
    return { text: content.slice(0, lineStart) + content.slice(prefixEnd), newStart: lineStart, newEnd: lineStart }
  }
  const number = /^(\d+)\. /.exec(match[2])
  const prefix = match[1] + (number ? `${Number(number[1]) + 1}. ` : match[2])
  const caret = start + 1 + prefix.length
  return { text: content.slice(0, start) + '\n' + prefix + content.slice(end), newStart: caret, newEnd: caret }
}
