import { type ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'hover:bg-slate-700 text-slate-300',
  icon: 'hover:bg-slate-700 text-slate-300 p-1 rounded',
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
