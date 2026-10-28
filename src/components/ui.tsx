import { useEffect } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { X } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { t } from '../lib/i18n'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const BUTTON = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border-border bg-background hover:bg-muted',
  ghost: 'hover:bg-muted',
  danger: 'text-destructive hover:bg-destructive/10',
}

export function Button({
  variant = 'default',
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof BUTTON }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 text-sm whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
        BUTTON[variant],
        className,
      )}
      {...props}
    />
  )
}

// A panel that slides over the page from the right, full width on a phone.
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex w-full flex-col overflow-y-auto bg-background shadow-xl sm:max-w-md"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">{t('Close')}</span>
        </button>
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-2 border-b p-6 pr-14">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{eyebrow}</span>
      <h2 className="font-serif text-3xl font-light leading-tight text-balance">{title}</h2>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
    </header>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-[11px] font-normal uppercase tracking-[0.25em]">{children}</h3>
}

const LABEL = 'text-[10px] uppercase tracking-[0.2em] text-muted-foreground'
const INPUT =
  'h-10 min-w-0 border-b border-input bg-transparent text-sm tabular-nums outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary'

export function Field({
  label,
  onChange,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'onChange'> & { label: string; onChange: (value: string) => void }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className={LABEL}>{label}</span>
      <input className={INPUT} onChange={(e) => onChange(e.target.value)} {...props} />
    </label>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly (T | { value: T; label: string })[]
  onChange: (value: T) => void
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <select className={INPUT} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => {
          const option = typeof o === 'string' ? { value: o, label: t(o) } : o
          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}
