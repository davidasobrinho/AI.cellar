import { useState } from 'react'
import { Pencil, Plus, Trash2, Wine as WineIcon } from 'lucide-react'
import { BAND_LABELS, euros, priceBand } from '../lib/price'
import { STATUS_DESCRIPTION, drinkingWindow } from '../lib/windows'
import type { Bottle, LabelDetails } from '../types'
import { styleStructure } from '../lib/structure'
import { starsOf } from '../lib/taste'
import { Stars, TagPicker } from './Journal'
import { StructureBars } from './PalateGraph'
import { StatusBadge, Sticker, WindowBar } from './status'
import { Button, Field, SectionTitle, SheetHeader, cn } from './ui'
import { locale, t } from '../lib/i18n'

interface Props {
  bottle: Bottle
  cellarName: string
  onChange: (bottle: Bottle) => void
  onEdit: () => void
  onDelete: () => void
  // A cellar a friend shares to look at only.
  readOnly?: boolean
}

const YEAR = new Date().getFullYear()

export function WineDetail({ bottle, cellarName, onChange, onEdit, onDelete, readOnly = false }: Props) {
  const [stars, setStars] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const w = drinkingWindow(bottle)
  const band = priceBand(bottle.priceToday)
  const start = w.dates ? Math.min(w.dates.drinkFrom, YEAR) - 2 : 0
  const end = w.dates ? Math.max(w.dates.drinkUntil, YEAR) + 2 : 0

  const open = () => {
    onChange({
      ...bottle,
      quantity: bottle.quantity - 1,
      openings: [{ date: new Date().toISOString(), stars, rating: null, note, tags }, ...bottle.openings],
    })
    setStars(null)
    setNote('')
    setTags([])
  }
  const undo = () => onChange({ ...bottle, quantity: bottle.quantity + 1, openings: bottle.openings.slice(1) })

  return (
    <>
      <SheetHeader
        eyebrow={[bottle.producer, t(bottle.region)].filter(Boolean).join(' · ')}
        title={[bottle.name, bottle.vintage].filter(Boolean).join(' ')}
      >
        {[t(bottle.type), bottle.grapes].filter(Boolean).join(' · ')}
      </SheetHeader>

      <section className="flex flex-col gap-5 border-b p-6">
        <div className="flex items-center justify-between">
          <SectionTitle>{t('Drinking window')}</SectionTitle>
          <StatusBadge status={w.status} />
        </div>

        <div className="border-l-2 border-primary bg-muted/70 p-4">
          <p className="text-lg leading-snug">{w.hint}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t(STATUS_DESCRIPTION[w.status])}</p>
        </div>

        {w.dates && (
          <>
            <div className="flex flex-col gap-2">
              <WindowBar dates={w.dates} start={start} end={end} className="h-3" />
              <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
                <span>{start}</span>
                <span className="font-normal text-foreground">{t('Today · {year}', { year: YEAR })}</span>
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
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{t(label)}</dt>
                  <dd className="text-sm font-normal tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          {w.source === 'This wine'
            ? t('An estimate for this wine and vintage. It assumes good storage.')
            : t('An estimate from the style of the wine, not this producer or year. It assumes good storage.')}
        </p>
      </section>

      <section className="flex flex-col gap-4 border-b p-6">
        <SectionTitle>{t('Structure')}</SectionTitle>
        <StructureBars structure={bottle.structure ?? styleStructure(bottle)} />
        <p className="text-xs text-muted-foreground">
          {t(bottle.structure ? 'Estimated for this wine.' : 'Estimated from its type, region and level, not this producer.')}
        </p>
      </section>

      {bottle.label && <LabelSection bottle={bottle} label={bottle.label} />}

      <section className="flex flex-col gap-4 border-b p-6">
        <SectionTitle>{t('In your cellar')}</SectionTitle>
        <div className="flex flex-col">
          <span className="font-serif text-4xl font-light tabular-nums">
            {bottle.quantity}{' '}
            <span className="text-base font-normal text-muted-foreground">{t(bottle.quantity === 1 ? 'bottle' : 'bottles')}</span>
          </span>
          <span className="text-sm text-muted-foreground">{[cellarName, bottle.location].filter(Boolean).join(' · ')}</span>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <Price term={t('Price today')} value={bottle.priceToday} />
          <Price term={t('Price paid')} value={bottle.pricePaid} />
          <Price term={t('Total value')} value={bottle.priceToday === null ? null : bottle.priceToday * bottle.quantity} />
        </dl>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sticker price={bottle.priceToday} />
          {band ? t('{band} sticker', { band: BAND_LABELS[band] }) : t('No price yet, so no sticker')}
        </p>
        {bottle.notes && <p className="border border-dashed p-3 text-sm text-muted-foreground">{bottle.notes}</p>}
        {!readOnly && (
          <Button variant="outline" className="self-start" onClick={() => onChange({ ...bottle, quantity: bottle.quantity + 1 })}>
            <Plus aria-hidden="true" />
            {t('Add one more bottle')}
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-4 border-b p-6">
        <SectionTitle>{t(readOnly ? 'Opened' : 'Open a bottle')}</SectionTitle>
        {readOnly ? (
          <p className="text-sm text-muted-foreground">{t('This cellar is shared with you to look at. Only its owners can open or change bottles.')}</p>
        ) : (
          <>
            <Stars value={stars} onChange={(n) => setStars(stars === n ? null : n)} />
            <TagPicker value={tags} onChange={setTags} />
            <Field label={t('Occasion, food, what you thought')} value={note} onChange={setNote} />
            <Button className="h-11" onClick={open} disabled={bottle.quantity === 0}>
              <WineIcon aria-hidden="true" />
              {t('Open a bottle')}
            </Button>
          </>
        )}

        {bottle.openings.length > 0 && (
          <ul className="flex flex-col divide-y border-y text-sm">
            {bottle.openings.map((o, i) => (
              <li key={o.date} className="flex items-baseline justify-between gap-3 py-2">
                <span>
                  <span className="tabular-nums text-muted-foreground">{new Date(o.date).toLocaleDateString(locale)}</span>
                  {starsOf(o) !== null && ` · ${starsOf(o)}★`}
                  {o.tags && o.tags.length > 0 && ` · ${o.tags.map((tag) => t(tag)).join(', ')}`}
                  {o.note && ` · ${o.note}`}
                </span>
                {i === 0 && !readOnly && (
                  <button type="button" onClick={undo} className="shrink-0 text-xs text-primary underline underline-offset-4">
                    {t('Undo')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={cn('mt-auto flex justify-between gap-2 p-6', readOnly && 'hidden')}>
        <Button
          variant="danger"
          onClick={() => window.confirm(t('Remove {name} from the cellar?', { name: bottle.name })) && onDelete()}
        >
          <Trash2 aria-hidden="true" />
          {t('Remove')}
        </Button>
        <Button variant="outline" onClick={onEdit}>
          <Pencil aria-hidden="true" />
          {t('Edit')}
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
        <SectionTitle>{t('Label')}</SectionTitle>
      </div>

      <div className="flex flex-col items-center gap-1 border border-foreground/80 px-4 py-6 text-center outline outline-1 outline-offset-4 outline-border">
        <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{bottle.producer}</span>
        <span className="sb-title text-xl leading-tight text-balance">{bottle.name}</span>
        <span className="text-sm tabular-nums">{bottle.vintage}</span>
        <span className="mt-2 text-[11px] uppercase tracking-widest text-primary">
          {[label.designation, label.classification].filter(Boolean).join(' · ')}
        </span>
      </div>

      <div className="grid grid-cols-2 border-y">
        {[
          ['Serve at', label.serveAt || '–'],
          ['Decant', label.decant || t('Not needed')],
        ].map(([term, value]) => (
          <div key={term} className="flex flex-col gap-1 py-3 first:border-r first:pr-3 last:pl-3">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t(term)}</span>
            <span className="text-sm font-normal">{value}</span>
          </div>
        ))}
      </div>

      <SpecList title={t('Front label')} items={front} />
      <SpecList title={t('Back label')} items={back} />

      {label.backLabel && (
        <figure className="flex flex-col gap-2">
          <figcaption className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('From the back label')}</figcaption>
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
            <dt className="shrink-0 text-muted-foreground">{t(term)}</dt>
            <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/30" aria-hidden="true" />
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
