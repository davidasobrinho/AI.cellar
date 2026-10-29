import type { ComponentProps } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { BAND_LABELS, cellarValue, priceBand } from '../lib/price'
import type { PriceBand } from '../lib/price'
import { STATUS_ORDER, closingFirst, drinkingWindow } from '../lib/windows'
import type { WindowStatus } from '../lib/windows'
import type { Bottle } from '../types'
import { STATUS_BG, StatusBadge, Sticker, WindowBar } from './status'
import { cn } from './ui'
import { t } from '../lib/i18n'

const YEAR = new Date().getFullYear()
const wholeEuros = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

type Select = (bottle: Bottle) => void

interface SummaryProps {
  bottles: Bottle[]
  activeStatus: WindowStatus | null
  onStatusChange: (status: WindowStatus | null) => void
}

export function CellarSummary({ bottles, activeStatus, onStatusChange }: SummaryProps) {
  const value = cellarValue(bottles)
  const count = (of: Bottle[]) => of.reduce((sum, b) => sum + b.quantity, 0)
  const counts = STATUS_ORDER.map((status) => ({
    status,
    n: count(bottles.filter((b) => drinkingWindow(b).status === status)),
  })).filter(({ n }) => n > 0)
  const bands = (Object.keys(BAND_LABELS) as PriceBand[]).map((band) => ({
    band,
    n: count(bottles.filter((b) => priceBand(b.priceToday) === band)),
  }))

  return (
    <section aria-label="Cellar overview" className="flex flex-col gap-8">
      <dl className="grid grid-cols-3 divide-x border-y">
        <Stat label={t('Bottles')} value={value.bottles.toString()} />
        <Stat label={t('Wines')} value={bottles.length.toString()} />
        <Stat
          label={t('Est. value')}
          value={wholeEuros.format(value.total)}
          note={value.pricedBottles < value.bottles ? t('{n} without price', { n: value.bottles - value.pricedBottles }) : undefined}
        />
      </dl>

      {value.bottles > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex h-2 w-full overflow-hidden bg-muted" aria-hidden="true">
            {counts.map(({ status, n }) => (
              <div
                key={status}
                className={cn(
                  STATUS_BG[status],
                  'h-full transition-opacity',
                  activeStatus && activeStatus !== status && 'opacity-20',
                )}
                style={{ width: `${(n / value.bottles) * 100}%` }}
              />
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by drinking status">
            <FilterChip active={activeStatus === null} onClick={() => onStatusChange(null)}>
              {t('All')}
            </FilterChip>
            {counts.map(({ status, n }) => (
              <FilterChip
                key={status}
                active={activeStatus === status}
                onClick={() => onStatusChange(activeStatus === status ? null : status)}
              >
                <span className={cn('size-1.5', STATUS_BG[status])} aria-hidden="true" />
                {t(status)}
                <span className="tabular-nums text-muted-foreground">{n}</span>
              </FilterChip>
            ))}
          </div>

          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {bands.map(({ band, n }) => (
              <li key={band} className="flex items-center gap-2">
                <Sticker price={band === 'green' ? 0 : band === 'blue' ? 10 : 31} />
                {BAND_LABELS[band]}
                <span className="tabular-nums text-foreground">{n}</span>
              </li>
            ))}
            {value.average !== null && (
              <li>
                {t('Average bottle')} <span className="tabular-nums text-foreground">{wholeEuros.format(value.average)}</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="font-serif text-4xl font-light leading-none tabular-nums md:text-5xl">{value}</dd>
      {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
    </div>
  )
}

function FilterChip({ active, children, ...props }: ComponentProps<'button'> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors',
        active
          ? 'border-foreground bg-foreground font-normal text-background [&_.text-muted-foreground]:text-background/60'
          : 'border-border bg-background hover:border-foreground/40',
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const title = (b: Bottle) => (
  <>
    {b.name} {b.vintage && <span className="text-muted-foreground">{b.vintage}</span>}
  </>
)

export function DontMiss({ bottles, onSelect }: { bottles: Bottle[]; onSelect: Select }) {
  const urgent = closingFirst(bottles)
  if (urgent.length === 0) return null

  return (
    <section aria-labelledby="dont-miss" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="dont-miss" className="sb-title text-xl">
          {t("Don't miss these")}
        </h2>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t('Closing windows first')}</p>
      </div>
      <ul className="grid gap-px border bg-border sm:grid-cols-3">
        {urgent.map((b) => {
          const w = drinkingWindow(b)
          return (
            <li key={b.id} className="bg-background">
              <button
                type="button"
                onClick={() => onSelect(b)}
                className="group flex h-full w-full flex-col gap-5 p-5 text-left transition-colors hover:bg-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge status={w.status} />
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{b.producer}</span>
                  <span className="sb-title text-[15px] leading-snug text-pretty">{title(b)}</span>
                </div>
                <span className="mt-auto text-sm text-muted-foreground">{w.hint}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const TYPE_DOT = (b: Bottle) =>
  b.type === 'Red'
    ? 'bg-status-peak'
    : b.type === 'White' || b.type === 'Rosé'
      ? 'bg-cork/60'
      : b.type === 'Sparkling'
        ? 'bg-cork/30'
        : 'bg-foreground'

const EMPTY = <p className="py-16 text-center text-sm text-muted-foreground">{t('No bottles here yet.')}</p>

export function WineList({ bottles, onSelect }: { bottles: Bottle[]; onSelect: Select }) {
  if (bottles.length === 0) return EMPTY

  return (
    <ul className="flex flex-col divide-y border-y">
      {bottles.map((b) => {
        const w = drinkingWindow(b)
        return (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onSelect(b)}
              className={cn(
                'grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 px-2 py-5 text-left transition-colors hover:bg-accent md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_4rem] md:px-3',
                b.quantity === 0 && 'opacity-50',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn('size-2.5 shrink-0', TYPE_DOT(b))} aria-hidden="true" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate sb-title text-[15px]">{title(b)}</span>
                  <span className="truncate text-xs uppercase tracking-wider text-muted-foreground">
                    {[b.producer, t(b.region), t(b.type)].filter(Boolean).join(' · ')}
                  </span>
                </div>
              </div>

              <span className="flex items-center justify-end gap-2 text-sm tabular-nums md:order-last">
                <Sticker price={b.priceToday} />
                {b.quantity}
                <span className="sr-only"> {t('bottles')}</span>
                <span className="text-muted-foreground" aria-hidden="true">
                  ×
                </span>
              </span>

              <div className="col-span-2 flex flex-col gap-1.5 md:col-span-1">
                {w.dates && (
                  <>
                    <WindowBar
                      dates={w.dates}
                      start={Math.min(w.dates.drinkFrom, YEAR) - 1}
                      end={Math.max(w.dates.drinkUntil, YEAR) + 1}
                    />
                    <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
                      <span>{w.dates.drinkFrom}</span>
                      <span>{w.dates.drinkUntil}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="col-span-2 flex items-center justify-between gap-2 md:col-span-1 md:flex-col md:items-start md:gap-0.5">
                <StatusBadge status={w.status} />
                <span className="text-xs text-muted-foreground md:hidden">{w.hint}</span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

const START = YEAR - 6
const END = YEAR + 24
const TICKS = Array.from({ length: 7 }, (_, i) => START + i * 5)

// Every wine's window on one shared line of years. Wines without dates are left out.
export function TimelineView({ bottles, onSelect }: { bottles: Bottle[]; onSelect: Select }) {
  const dated = bottles
    .map((b) => ({ b, w: drinkingWindow(b) }))
    .filter(({ w }) => w.dates)
    .sort((x, y) => x.w.dates!.peakFrom - y.w.dates!.peakFrom)
  if (dated.length === 0) return EMPTY
  const pct = (year: number) => `${((year - START) / (END - START)) * 100}%`

  return (
    <div className="overflow-x-auto border-y">
      <div className="min-w-[720px] px-5 py-4">
        <div className="grid grid-cols-[14rem_1fr] gap-6 pb-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{t('Wine')}</span>
          <div className="relative h-4 text-[11px] tabular-nums text-muted-foreground">
            {TICKS.map((year) => (
              <span
                key={year}
                className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                style={{ left: pct(year) }}
              >
                {year}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 grid w-full grid-cols-[14rem_1fr] gap-6"
            aria-hidden="true"
          >
            <span />
            <div className="relative">
              <div className="absolute inset-y-0 w-px bg-foreground/80" style={{ left: pct(YEAR + 0.5) }}>
                <span className="absolute -top-0.5 left-1.5 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
                  Today
                </span>
              </div>
            </div>
          </div>

          <ul className="flex flex-col">
            {dated.map(({ b, w }) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelect(b)}
                  className="grid w-full grid-cols-[14rem_1fr] items-center gap-6 rounded-md py-2.5 text-left transition-colors hover:bg-accent/60"
                >
                  <div className="flex min-w-0 flex-col gap-0.5 pl-1">
                    <span className="truncate sb-title text-sm">{title(b)}</span>
                    <StatusBadge status={w.status} />
                  </div>
                  <WindowBar dates={w.dates!} start={START} end={END} showToday={false} className="h-2.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
