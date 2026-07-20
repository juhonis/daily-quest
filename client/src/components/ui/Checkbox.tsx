interface CheckboxProps {
  checked: boolean
  onChange: () => void
  label: string
  id?: string
}

export function Checkbox({ checked, onChange, label, id }: CheckboxProps) {
  const checkboxId = id ?? `checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <label htmlFor={checkboxId} className="flex items-center gap-2 cursor-pointer select-none">
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-blue-600 focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm text-slate-200">{label}</span>
    </label>
  )
}
