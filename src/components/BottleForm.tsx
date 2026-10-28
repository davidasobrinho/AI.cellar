import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { resizeToDataUrl } from '../lib/ai'
import { scanEnabled, scanLabel } from '../lib/scan'
import { newId } from '../lib/store'
import { styleWindow } from '../lib/windows'
import { REGIONS, TIERS, WINE_TYPES } from '../types'
import type { Bottle, Cellar, DrinkWindow } from '../types'
import { Button, Field, SectionTitle, SelectField, SheetHeader, cn } from './ui'
import { t } from '../lib/i18n'

interface Props {
  bottle: Bottle | null
  cellars: Cellar[]
  defaultCellarId: string
  onSave: (bottle: Bottle) => void
}

const WINDOW_FIELDS: [keyof DrinkWindow, string][] = [
  ['drinkFrom', 'From'],
  ['peakFrom', 'Peak'],
  ['peakTo', 'to'],
  ['drinkUntil', 'Until'],
]

const numberOrNull = (value: string): number | null => {
  const n = Number(value.replace(',', '.'))
  return value.trim() === '' || Number.isNaN(n) ? null : n
}

export function BottleForm({ bottle, cellars, defaultCellarId, onSave }: Props) {
  const [draft, setDraft] = useState<Bottle>(
    () =>
      bottle ?? {
        id: newId(),
        cellarId: defaultCellarId,
        producer: '',
        name: '',
        vintage: null,
        type: 'Red',
        region: 'Douro',
        tier: 'Everyday',
        quantity: 1,
        priceToday: null,
        pricePaid: null,
        location: '',
        notes: '',
        openings: [],
        addedAt: new Date().toISOString(),
        grapes: '',
        window: null,
        label: null,
      },
  )
  // The four years as typed. Left empty, the window is estimated from the style.
  const [years, setYears] = useState<Record<keyof DrinkWindow, string>>(() => ({
    drinkFrom: `${bottle?.window?.drinkFrom ?? ''}`,
    peakFrom: `${bottle?.window?.peakFrom ?? ''}`,
    peakTo: `${bottle?.window?.peakTo ?? ''}`,
    drinkUntil: `${bottle?.window?.drinkUntil ?? ''}`,
  }))
  const [photos, setPhotos] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof Bottle>(key: K, value: Bottle[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const isStill = draft.type === 'Red' || draft.type === 'White'
  const estimate = styleWindow(draft)

  const addPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 2 - photos.length)
    e.target.value = ''
    try {
      const urls = await Promise.all(files.map(resizeToDataUrl))
      setPhotos((prev) => [...prev, ...urls].slice(0, 2))
      setError(null)
    } catch {
      setError(t('That file could not be opened as an image.'))
    }
  }

  const scan = async () => {
    setScanning(true)
    setError(null)
    try {
      const read = await scanLabel(photos)
      setDraft((d) => ({ ...d, ...read }))
      setYears({
        drinkFrom: `${read.window?.drinkFrom ?? ''}`,
        peakFrom: `${read.window?.peakFrom ?? ''}`,
        peakTo: `${read.window?.peakTo ?? ''}`,
        drinkUntil: `${read.window?.drinkUntil ?? ''}`,
      })
      setScanned(true)
    } catch (e) {
      setError(t('The label could not be read. {why}', { why: e instanceof Error ? e.message : '' }))
    } finally {
      setScanning(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const typed = WINDOW_FIELDS.map(([key]) => numberOrNull(years[key]))
    const complete = typed.every((y) => y !== null)
    if (!complete && typed.some((y) => y !== null)) {
      setError(t('Fill in all four years of the drinking window, or leave them all empty.'))
      return
    }
    const [drinkFrom, peakFrom, peakTo, drinkUntil] = typed as number[]
    onSave({ ...draft, window: complete ? { drinkFrom, peakFrom, peakTo, drinkUntil } : null })
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      <SheetHeader eyebrow={bottle ? 'Editar garrafa' : 'Nova garrafa'} title={t(bottle ? 'Edit bottle' : 'Add a bottle')}>
        {scanEnabled && t('Photograph the front and back label, and the details are filled in for you to check.')}
      </SheetHeader>

      {scanEnabled && (
        <section className="flex flex-col gap-4 border-b p-6">
          <SectionTitle>{t('Label photos')}</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((i) =>
              photos[i] ? (
                <div key={i} className="relative aspect-[3/4] overflow-hidden border bg-muted">
                  <img src={photos[i]} alt={t(i === 0 ? 'Front label' : 'Back label')} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{t('Remove photo')}</span>
                  </button>
                </div>
              ) : (
                <PhotoSlot key={i} label={t(i === 0 ? 'Front label' : 'Back label')} onChange={addPhotos} disabled={i > photos.length} />
              ),
            )}
          </div>
          <Button onClick={scan} disabled={photos.length === 0 || scanning} className="h-11 tracking-wide">
            {scanning ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Camera aria-hidden="true" />}
            {t(scanning ? 'Reading label…' : scanned ? 'Read again' : 'Read label')}
          </Button>
          {scanned && !error && (
            <p className="border-l-2 border-primary bg-muted/70 p-3 text-sm text-muted-foreground">
              {t('Label read. The drinking window and serving notes are estimates. Check everything before saving.')}
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-4 border-b p-6">
        <SectionTitle>{t('Wine')}</SectionTitle>
        <Field label={t('Producer')} value={draft.producer} onChange={(v) => set('producer', v)} />
        <Field label={t('Name')} value={draft.name} onChange={(v) => set('name', v)} required />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t('Vintage')}
            inputMode="numeric"
            placeholder={t('No vintage')}
            value={draft.vintage ?? ''}
            onChange={(v) => set('vintage', numberOrNull(v))}
          />
          <SelectField label={t('Type')} value={draft.type} options={WINE_TYPES} onChange={(v) => set('type', v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label={t('Region')} value={draft.region} options={REGIONS} onChange={(v) => set('region', v)} />
          {isStill && <SelectField label={t('Level')} value={draft.tier} options={TIERS} onChange={(v) => set('tier', v)} />}
        </div>
        <Field label={t('Grapes')} value={draft.grapes ?? ''} onChange={(v) => set('grapes', v)} />
      </section>

      <section className="flex flex-col gap-4 border-b p-6">
        <SectionTitle>{t('Drinking window')}</SectionTitle>
        <div className="grid grid-cols-4 gap-3">
          {WINDOW_FIELDS.map(([key, label]) => (
            <Field
              key={key}
              label={t(label)}
              inputMode="numeric"
              placeholder={estimate ? `${estimate[key]}` : ''}
              value={years[key]}
              onChange={(v) => setYears((y) => ({ ...y, [key]: v }))}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('Leave empty to use an estimate from the style of the wine')}{estimate ? t(', shown in grey') : ''}.
        </p>
      </section>

      <section className="flex flex-col gap-4 p-6">
        <SectionTitle>{t('In your cellar')}</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Field
            label={t('Bottles')}
            type="number"
            min={0}
            value={draft.quantity}
            onChange={(v) => set('quantity', Math.max(0, Number(v)))}
          />
          <Field
            label={t('Price today (€)')}
            inputMode="decimal"
            value={draft.priceToday ?? ''}
            onChange={(v) => set('priceToday', numberOrNull(v))}
          />
          <Field
            label={t('Price paid (€)')}
            inputMode="decimal"
            value={draft.pricePaid ?? ''}
            onChange={(v) => set('pricePaid', numberOrNull(v))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label={t('Cellar')}
            value={draft.cellarId}
            options={cellars.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => set('cellarId', v)}
          />
          <Field label={t('Location')} placeholder="Rack B · Row 3" value={draft.location} onChange={(v) => set('location', v)} />
        </div>
        <Field label={t('Notes')} value={draft.notes} onChange={(v) => set('notes', v)} />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-2 h-11 tracking-wide">
          {t(bottle ? 'Save changes' : 'Add to cave')}
        </Button>
      </section>
    </form>
  )
}

function PhotoSlot({
  label,
  onChange,
  disabled,
}: {
  label: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  disabled: boolean
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-foreground',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      <Camera className="size-5" aria-hidden="true" />
      <span className="text-[10px] uppercase tracking-[0.2em]">{label}</span>
      <input id={id} type="file" accept="image/*" capture="environment" disabled={disabled} onChange={onChange} className="sr-only" />
    </label>
  )
}
