import { useId } from 'react'

interface CheckboxProps {
  checked: boolean
  onChange: () => void
  label: string
  id?: string
  ariaLabel?: string
}

export function Checkbox({ checked, onChange, label, id, ariaLabel }: CheckboxProps) {
  const generatedId = useId()
  const checkboxId = id ?? generatedId
  return (
    <label htmlFor={checkboxId} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 cursor-pointer select-none">
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className="h-4 w-4 accent-blue-600 focus:ring-2 focus:ring-blue-500"
      />
      {label && <span className="text-sm text-slate-200">{label}</span>}
    </label>
  )
}
