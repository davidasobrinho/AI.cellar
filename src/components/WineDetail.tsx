import { useState } from 'react'
import { Pencil, Trash2, Wine as WineIcon } from 'lucide-react'
import { BAND_LABELS, euros, priceBand } from '../lib/price'
import { STATUS_DESCRIPTION, drinkingWindow } from '../lib/windows'
import { RATINGS } from '../types'
import type { Bottle, LabelDetails, Rating } from '../types'
import { StatusBadge, Sticker, WindowBar } from './status'
import { Button, Field, SectionTitle, SheetHeader, cn } from './ui'

interface Props {
  bottle: Bottle
  cellarName: string
  onChange: (bottle: Bottle) => void
  onEdit: () => void
  onDelete: () => void
}

const YEAR = new Date().getFullYear()

export function WineDetail({ bottle, cellarName, onChange, onEdit, onDelete }: Props) {
  const [rating, setRating] = useState<Rating | null>(null)
  const [note, setNote] = useState('')
  const w = drinkingWindow(bottle)
  const band = priceBand(bottle.priceToday)
  const start = w.dates ? Math.min(w.dates.drinkFrom, YEAR) - 2 : 0
  const end = w.dates ? Math.max(w.dates.drinkUntil, YEAR) + 2 : 0

  const open = () => {
    onChange({
      ...bottle,
      quantity: bottle.quantity - 1,
      openings: [{ date: new Date().toISOString(), rating, note }, ...bottle.openings],
    })
    setRating(null)
    setNote('')
  }
  const undo = () => onChange({ ...bottle, quantity: bottle.quantity + 1, openings: bottle.openings.slice(1) })

  return (
    <>
      <SheetHeader
        eyebrow={[bottle.producer, bottle.region].filter(Boolean).join(' · ')}
        title={[bottle.name, bottle.vintage].filter(Boolean).join(' ')}
      >
        {[bottle.type, bottle.grapes].filter(Boolean).join(' · ')}
      </SheetHeader>

      <section className="flex flex-col gap-5 border-b p-6">
        <div className="flex items-center justify-between">
          <SectionTitle>Drinking window</SectionTitle>
          <StatusBadge status={w.status} />
        </div>

        <div className="border-l-2 border-primary bg-muted/70 p-4">
          <p className="font-serif text-xl font-normal leading-snug">{w.hint}</p>
          <p className="mt-1 text-sm text-muted-foreground">{STATUS_DESCRIPTION[w.status]}</p>
        </div>

        {w.dates && (
          <>
            <div className="flex flex-col gap-2">
              <WindowBar dates={w.dates} start={start} end={end} className="h-3" />
              <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
                <span>{start}</span>
                <span className="font-normal text-foreground">Today · {YEAR}</span>
                <span>{end}</span>
              </div>
            </div>

            <dl className="grid grid-cols-3 divide-x border-y">
              {[
                ['Drinkable', `${w.dates.drinkFrom}`],
                ['Peak', `${w.dates.peakFrom}–${w.dates.peakTo}`],
                ['Drink by', `${w.dates.drinkUntil}`],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col items-center gap-1 py-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-normal tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          {w.source === 'This wine'
            ? 'An estimate for this wine and vintage. It assumes good storage.'
            : 'An estimate from the style of the wine, not this producer or year. It assumes good storage.'}
        </p>
      </section>

      {bottle.label && <LabelSection bottle={bottle} label={bottle.label} />}

      <section className="flex flex-col gap-4 border-b p-6">
        <SectionTitle>In your cellar</SectionTitle>
        <div className="flex flex-col">
          <span className="font-serif text-4xl font-light tabular-nums">
            {bottle.quantity}{' '}
            <span className="text-base font-normal text-muted-foreground">{bottle.quantity === 1 ? 'bottle' : 'bottles'}</span>
          </span>
          <span className="text-sm text-muted-foreground">{[cellarName, bottle.location].filter(Boolean).join(' · ')}</span>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <Price term="Price today" value={bottle.priceToday} />
          <Price term="Price paid" value={bottle.pricePaid} />
          <Price term="Total value" value={bottle.priceToday === null ? null : bottle.priceToday * bottle.quantity} />
        </dl>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sticker price={bottle.priceToday} />
          {band ? `${BAND_LABELS[band]} sticker` : 'No price yet, so no sticker'}
        </p>
        {bottle.notes && <p className="border border-dashed p-3 text-sm text-muted-foreground">{bottle.notes}</p>}
      </section>

      <section className="flex flex-col gap-4 border-b p-6">
        <SectionTitle>Open a bottle</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {RATINGS.map((r) => (
            <Button
              key={r}
              variant="outline"
              className={cn(rating === r && 'border-primary bg-accent')}
              onClick={() => setRating(rating === r ? null : r)}
            >
              {r}
            </Button>
          ))}
        </div>
        <Field label="Occasion, food, what you thought" value={note} onChange={setNote} />
        <Button className="h-11" onClick={open} disabled={bottle.quantity === 0}>
          <WineIcon aria-hidden="true" />
          Open a bottle
        </Button>

        {bottle.openings.length > 0 && (
          <ul className="flex flex-col divide-y border-y text-sm">
            {bottle.openings.map((o, i) => (
              <li key={o.date} className="flex items-baseline justify-between gap-3 py-2">
                <span>
                  <span className="tabular-nums text-muted-foreground">{new Date(o.date).toLocaleDateString('en-GB')}</span>
                  {o.rating && ` · ${o.rating}`}
                  {o.note && ` · ${o.note}`}
                </span>
                {i === 0 && (
                  <button type="button" onClick={undo} className="shrink-0 text-xs text-primary underline underline-offset-4">
                    Undo
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-auto flex justify-between gap-2 p-6">
        <Button
          variant="danger"
          onClick={() => window.confirm(`Remove ${bottle.name} from the cellar?`) && onDelete()}
        >
          <Trash2 aria-hidden="true" />
          Remove
        </Button>
        <Button variant="outline" onClick={onEdit}>
          <Pencil aria-hidden="true" />
          Edit
        </Button>
      </div>
    </>
  )
}

function Price({ term, value }: { term: string; value: number | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{term}</dt>
      <dd className="tabular-nums">{value === null ? '–' : euros(value)}</dd>
    </div>
  )
}

function LabelSection({ bottle, label }: { bottle: Bottle; label: LabelDetails }) {
  const front = [
    ['Designation', label.designation],
    ['Classification', label.classification],
    ['Sub-region', label.subRegion],
    ['Grapes', bottle.grapes ?? ''],
    ['Ageing', label.ageing],
  ]
  const back = [
    ['Alcohol', label.alcohol === null ? '' : `${label.alcohol}% vol`],
    ['Volume', label.volume],
    ['Closure', label.closure],
    ['Lot', label.lot],
    ['Bottled by', label.bottledBy],
  ]

  return (
    <section className="flex flex-col gap-5 border-b p-6">
      <div className="flex items-baseline justify-between">
        <SectionTitle>Label</SectionTitle>
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Rótulo</span>
      </div>

      <div className="flex flex-col items-center gap-1 border border-foreground/80 px-4 py-6 text-center outline outline-1 outline-offset-4 outline-border">
        <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{bottle.producer}</span>
        <span className="font-serif text-2xl font-light leading-tight text-balance">{bottle.name}</span>
        <span className="text-sm tabular-nums">{bottle.vintage}</span>
        <span className="mt-2 text-[11px] uppercase tracking-widest text-primary">
          {[label.designation, label.classification].filter(Boolean).join(' · ')}
        </span>
      </div>

      <div className="grid grid-cols-2 border-y">
        {[
          ['Serve at', label.serveAt || '–'],
          ['Decant', label.decant || 'Not needed'],
        ].map(([term, value]) => (
          <div key={term} className="flex flex-col gap-1 py-3 first:border-r first:pr-3 last:pl-3">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{term}</span>
            <span className="text-sm font-normal">{value}</span>
          </div>
        ))}
      </div>

      <SpecList title="Front label" items={front} />
      <SpecList title="Back label" items={back} />

      {label.backLabel && (
        <figure className="flex flex-col gap-2">
          <figcaption className="text-[11px] uppercase tracking-widest text-muted-foreground">From the back label</figcaption>
          <blockquote className="text-sm leading-relaxed text-pretty">&ldquo;{label.backLabel}&rdquo;</blockquote>
        </figure>
      )}
    </section>
  )
}

function SpecList({ title, items }: { title: string; items: string[][] }) {
  const shown = items.filter(([, value]) => value)
  if (shown.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[11px] uppercase tracking-widest text-muted-foreground">{title}</h4>
      <dl className="flex flex-col">
        {shown.map(([term, value]) => (
          <div key={term} className="flex items-baseline gap-2 py-1 text-sm">
            <dt className="shrink-0 text-muted-foreground">{term}</dt>
            <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/30" aria-hidden="true" />
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
