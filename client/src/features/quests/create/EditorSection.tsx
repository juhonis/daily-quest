import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export function EditorSection({ title, summary, defaultOpen = false, open, onOpenChange, children }: {
  title: string
  summary?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  const [localOpen, setLocalOpen] = useState(defaultOpen)
  const id = useId()
  const expanded = open ?? localOpen
  return (
    <section className="rounded-xl border border-slate-800">
      <h3><button type="button" onClick={() => { if (onOpenChange) onOpenChange(!expanded); else setLocalOpen(!expanded) }} aria-expanded={expanded} aria-controls={id} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left">
        <span className="text-sm font-medium text-slate-300">{title}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-slate-500"><span className="truncate">{summary}</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} /></span>
      </button></h3>
      <div id={id} hidden={!expanded} className="space-y-3 border-t border-slate-800 p-3">{children}</div>
    </section>
  )
}
