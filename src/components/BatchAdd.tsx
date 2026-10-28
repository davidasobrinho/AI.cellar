import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { resizeToDataUrl } from '../lib/ai'
import { t } from '../lib/i18n'
import { scanShelf } from '../lib/scan'
import type { ShelfWine } from '../lib/scan'
import { newId } from '../lib/store'
import { REGIONS, WINE_TYPES } from '../types'
import type { Bottle, Cellar } from '../types'
import { Button, Field, SelectField, SheetHeader } from './ui'

interface Found extends ShelfWine {
  key: string
  include: boolean
}

interface Props {
  cellars: Cellar[]
  defaultCellarId: string
  onAdd: (bottles: Bottle[], cellarId: string) => void
}

// Cataloguing many bottles fast: one photo of several bottles, one AI request,
// a quick check, and all of them go into a cellar together.
export function BatchAdd({ cellars, defaultCellarId, onAdd }: Props) {
  const [found, setFound] = useState<Found[]>([])
  const [cellarId, setCellarId] = useState(defaultCellarId)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoId = useId()

  const read = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setReading(true)
    setError(null)
    try {
      const wines = await scanShelf(await resizeToDataUrl(file))
      if (wines.length === 0) setError(t('No label could be read. Try closer, with more light.'))
      setFound((prev) => [...prev, ...wines.map((w) => ({ ...w, key: newId(), include: true }))])
    } catch (err) {
      setError(t('The label could not be read. {why}', { why: err instanceof Error ? err.message : '' }))
    } finally {
      setReading(false)
    }
  }

  const update = (key: string, change: Partial<Found>) => setFound((all) => all.map((f) => (f.key === key ? { ...f, ...change } : f)))
  const chosen = found.filter((f) => f.include && f.name.trim())

  const add = () =>
    onAdd(
      chosen.map(({ count, ...w }) => ({
        ...w,
        id: newId(),
        cellarId,
        quantity: count,
        priceToday: null,
        pricePaid: null,
        location: '',
        openings: [],
        addedAt: new Date().toISOString(),
        label: null,
      })),
      cellarId,
    )

  return (
    <div className="flex flex-col">
      <SheetHeader eyebrow={t('Quick add')} title={t('Several bottles at once')}>
        {t('Line up 4 to 6 bottles with the front labels facing the camera, in good light. Each photo is one AI request for all of them.')}
      </SheetHeader>

      <section className="flex flex-col gap-4 border-b p-6">
        <label
          htmlFor={photoId}
          className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary text-sm text-primary-foreground"
        >
          {reading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}
          {reading ? t('Reading the bottles…') : found.length ? t('Another photo') : t('Take a photo')}
          <input id={photoId} type="file" accept="image/*" capture="environment" onChange={read} disabled={reading} className="sr-only" />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </section>

      {found.length > 0 && (
        <section className="flex flex-col gap-4 p-6">
          <p className="text-sm text-muted-foreground">{t('Check each wine, untick any mistakes, then add them all.')}</p>
          <ul className="flex flex-col divide-y border-y">
            {found.map((f) => (
              <li key={f.key} className="flex gap-3 py-4">
                <input
                  type="checkbox"
                  checked={f.include}
                  onChange={(e) => update(f.key, { include: e.target.checked })}
                  className="mt-6 size-4 shrink-0 accent-primary"
                  aria-label={f.name}
                />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                  <Field label={t('Producer')} value={f.producer} onChange={(producer) => update(f.key, { producer })} />
                  <Field label={t('Name')} value={f.name} onChange={(name) => update(f.key, { name })} />
                  <Field
                    label={t('Vintage')}
                    inputMode="numeric"
                    value={f.vintage ?? ''}
                    onChange={(v) => update(f.key, { vintage: v.trim() ? Number(v) || null : null })}
                  />
                  <Field
                    label={t('Bottles')}
                    type="number"
                    min={1}
                    value={f.count}
                    onChange={(v) => update(f.key, { count: Math.max(1, Number(v) || 1) })}
                  />
                  <SelectField label={t('Type')} value={f.type} options={WINE_TYPES} onChange={(type) => update(f.key, { type })} />
                  <SelectField label={t('Region')} value={f.region} options={REGIONS} onChange={(region) => update(f.key, { region })} />
                </div>
              </li>
            ))}
          </ul>
          <SelectField
            label={t('Cellar')}
            value={cellarId}
            options={cellars.map((c) => ({ value: c.id, label: t(c.name) }))}
            onChange={setCellarId}
          />
          <Button className="h-11 tracking-wide" disabled={chosen.length === 0} onClick={add}>
            {t('Add {n} wines to {cellar}', { n: chosen.length, cellar: t(cellars.find((c) => c.id === cellarId)?.name ?? '') })}
          </Button>
        </section>
      )}
    </div>
  )
}
