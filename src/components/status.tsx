import { BAND_LABELS, priceBand } from '../lib/price'
import type { WindowStatus } from '../lib/windows'
import type { DrinkWindow } from '../types'
import { cn } from './ui'
import { t } from '../lib/i18n'

export const STATUS_TEXT: Record<WindowStatus, string> = {
  'Drink soon': 'text-status-soon',
  'At peak': 'text-status-peak',
  Ready: 'text-status-ready',
  'Ready any time': 'text-status-ready',
  Wait: 'text-status-wait',
  'Past best': 'text-muted-foreground',
  Unknown: 'text-muted-foreground',
}

export const STATUS_BG: Record<WindowStatus, string> = {
  'Drink soon': 'bg-status-soon',
  'At peak': 'bg-status-peak',
  Ready: 'bg-status-ready',
  'Ready any time': 'bg-status-ready',
  Wait: 'bg-status-wait',
  'Past best': 'bg-muted-foreground',
  Unknown: 'bg-border',
}

export function StatusBadge({ status, className }: { status: WindowStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] font-normal uppercase tracking-[0.2em] whitespace-nowrap',
        STATUS_TEXT[status],
        className,
      )}
    >
      <span className={cn('size-1.5', STATUS_BG[status])} aria-hidden="true" />
      {t(status)}
    </span>
  )
}

const STICKER = { green: 'bg-sticker-green', blue: 'bg-sticker-blue', red: 'bg-sticker-red' }

// The round price sticker: green below €10, blue €10 to €30, red above €30.
export function Sticker({ price, className }: { price: number | null; className?: string }) {
  const band = priceBand(price)
  return (
    <span
      title={band ? BAND_LABELS[band] : t('No price yet')}
      className={cn(
        'inline-block size-3 shrink-0 rounded-full',
        band ? STICKER[band] : 'border border-dashed border-input',
        className,
      )}
    />
  )
}

const YEAR = new Date().getFullYear()

interface WindowBarProps {
  dates: DrinkWindow
  start: number
  end: number
  showToday?: boolean
  className?: string
}

// The drinking window drawn on a line of years, with the peak in a darker colour.
export function WindowBar({ dates, start, end, showToday = true, className }: WindowBarProps) {
  const year = YEAR
  const span = end - start
  const clamp = (y: number) => Math.min(Math.max(y, start), end)
  const left = (y: number) => `${((clamp(y) - start) / span) * 100}%`
  const width = (from: number, to: number) => `${(Math.max(0, clamp(to) - clamp(from)) / span) * 100}%`

  return (
    <div
      className={cn('relative h-2 w-full bg-muted', className)}
      role="img"
      aria-label={`Drink from ${dates.drinkFrom}, peak ${dates.peakFrom} to ${dates.peakTo}, drink until ${dates.drinkUntil}`}
    >
      <div
        className="absolute inset-y-0 bg-cork/45"
        style={{ left: left(dates.drinkFrom), width: width(dates.drinkFrom, dates.drinkUntil) }}
      />
      <div
        className="absolute inset-y-0 bg-status-peak"
        style={{ left: left(dates.peakFrom), width: width(dates.peakFrom, dates.peakTo) }}
      />
      {showToday && year >= start && year <= end && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 bg-foreground"
          style={{ left: left(year + 0.5) }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
