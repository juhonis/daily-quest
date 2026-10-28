import { useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
  footer?: ReactNode
  initialFocusRef?: RefObject<HTMLElement | null>
}

let openDialogs = 0
let previousOverflow = ''

export function Modal({ isOpen, onClose, title, children, className, footer, initialFocusRef }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const backdropPressed = useRef(false)
  const titleId = useId()

  useLayoutEffect(() => {
    if (!isOpen || !dialogRef.current) return
    const dialog = dialogRef.current
    const previousFocus = document.activeElement as HTMLElement | null
    if (openDialogs++ === 0) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    // Native modal dialogs handle top-layer stacking, background inertness,
    // and keyboard focus containment, including nested settings dialogs.
    dialog.showModal()
    if (initialFocusRef?.current && !initialFocusRef.current.matches(':disabled')) {
      initialFocusRef.current.focus({ preventScroll: true })
    }
    let resizeFrame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        const body = bodyRef.current
        const active = document.activeElement as HTMLElement | null
        if (!body || !active || !body.contains(active) || !['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return
        const bounds = body.getBoundingClientRect()
        const field = active.getBoundingClientRect()
        if (field.bottom > bounds.bottom - 8) body.scrollTop += field.bottom - bounds.bottom + 8
        else if (field.top < bounds.top + 8) body.scrollTop -= bounds.top - field.top + 8
      })
    })
    if (bodyRef.current) observer.observe(bodyRef.current)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(resizeFrame)
      dialog.close()
      if (--openDialogs === 0) document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [isOpen, initialFocusRef])

  if (!isOpen) return null

  function outside(event: React.MouseEvent<HTMLDialogElement> | React.PointerEvent<HTMLDialogElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose() }}
      onPointerDown={(event) => { backdropPressed.current = event.target === event.currentTarget && outside(event) }}
      onClick={(event) => { if (backdropPressed.current && event.target === event.currentTarget && outside(event)) onClose() }}
      className={cn('app-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-0 text-slate-200 shadow-2xl open:flex', className)}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-6">
        <h2 id={titleId} className="min-w-0 break-words text-lg font-semibold text-white">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </header>
      <div ref={bodyRef} className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      {footer && <footer className="shrink-0 border-t border-slate-800 bg-slate-900 px-4 py-3 sm:px-6">{footer}</footer>}
    </dialog>,
    document.body,
  )
}
