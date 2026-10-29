import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ArrowUpRight, Camera, Loader2, X } from 'lucide-react'
import { aiEnabled, resizeToDataUrl } from '../lib/ai'
import { askSommelier } from '../lib/sommelier'
import type { Advice, Place } from '../lib/sommelier'
import type { Bottle, Profile, Tasting } from '../types'
import { Button, Field, SectionTitle, cn } from './ui'
import { t } from '../lib/i18n'

const PLACES: { id: Place; label: string; hint: string }[] = [
  { id: 'home', label: t('At home'), hint: t('Pick a bottle from my cellar') },
  { id: 'restaurant', label: t('At a restaurant'), hint: t('Read the wine list for me') },
  { id: 'shop', label: t('Buying'), hint: t('Tell me what to look for') },
]

const MAX_PAGES = 3

interface Props {
  // Bottles that can be opened: the selected cellar.
  bottles: Bottle[]
  // Every bottle the person can see, for the ratings behind their taste.
  rated: Bottle[]
  journal: Tasting[]
  profile: Profile
  // A link shared to the app from another app, such as the menu page a QR code opened.
  sharedLink?: string
  onSelect: (bottle: Bottle) => void
}

export function Sommelier({ bottles, rated, journal, profile, sharedLink, onSelect }: Props) {
  const [place, setPlace] = useState<Place>(sharedLink ? 'restaurant' : 'home')
  const [link, setLink] = useState(sharedLink ?? '')
  const [listText, setListText] = useState('')
  const [food, setFood] = useState('')
  const [occasion, setOccasion] = useState('')
  const [budget, setBudget] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [asking, setAsking] = useState(false)
  const [advice, setAdvice] = useState<Advice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const photoId = useId()

  const addPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PAGES - photos.length)
    e.target.value = ''
    try {
      const urls = await Promise.all(files.map(resizeToDataUrl))
      setPhotos((prev) => [...prev, ...urls].slice(0, MAX_PAGES))
      setError(null)
    } catch {
      setError(t('That file could not be opened as an image.'))
    }
  }

  const ask = async (e: FormEvent) => {
    e.preventDefault()
    setAsking(true)
    setError(null)
    setAdvice(null)
    try {
      setAdvice(await askSommelier({ place, food, occasion, budget, photos, link, listText }, bottles, rated, journal, profile))
    } catch (err) {
      setError(t('The sommelier could not answer. {why}', { why: err instanceof Error ? err.message : '' }))
    } finally {
      setAsking(false)
    }
  }

  const missing =
    place === 'restaurant'
      ? photos.length === 0 && !link.trim() && !listText.trim()
      : place === 'home' && !bottles.some((b) => b.quantity > 0)

  return (
    <section aria-labelledby="sommelier" className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 id="sommelier" className="sb-title text-xl">
          {t('Your sommelier')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('What to open, what to order, what to buy. For this meal and this moment.')}</p>
      </div>

      {!aiEnabled && (
        <p className="border-l-2 border-primary bg-muted/70 p-4 text-sm text-muted-foreground">
          {t('The sommelier is not switched on here. It needs the Firebase project.')}
        </p>
      )}

      <form onSubmit={ask} className="flex flex-col gap-6">
        <div className="grid gap-px border bg-border sm:grid-cols-3" role="group" aria-label={t('Where are you?')}>
          {PLACES.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={place === p.id}
              onClick={() => {
                setPlace(p.id)
                setAdvice(null)
              }}
              className={cn(
                'flex flex-col gap-1 p-4 text-left transition-colors',
                place === p.id ? 'bg-foreground text-background' : 'bg-background hover:bg-accent',
              )}
            >
              <span className="text-lg font-medium">{p.label}</span>
              <span className={cn('text-xs', place === p.id ? 'text-background/70' : 'text-muted-foreground')}>{p.hint}</span>
            </button>
          ))}
        </div>

        {place === 'restaurant' && (
          <div className="flex flex-col gap-4">
            <SectionTitle>{t('The wine list')}</SectionTitle>
            <Field
              label={t('Link to the menu')}
              type="url"
              placeholder={t('Paste the address the QR code opened')}
              value={link}
              onChange={setLink}
            />
            <p className="text-xs text-muted-foreground">
              {t('Scan the QR code with the camera, open the menu, copy its address and paste it here. On Android you can also use Share and pick Cave Sobri. Reading a link uses two AI requests instead of one.')}
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t('Or paste the list')}</span>
              <textarea
                rows={3}
                value={listText}
                onChange={(e) => setListText(e.target.value)}
                placeholder={t('Select the wine section of the menu page, copy, and paste it here')}
                className="border border-input bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary"
              />
            </label>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t('Or photograph it')}</span>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((src, i) => (
                <div key={src.slice(-24)} className="relative aspect-[3/4] overflow-hidden border bg-muted">
                  <img src={src} alt={t('Wine list page {n}', { n: i + 1 })} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">{t('Remove photo')}</span>
                  </button>
                </div>
              ))}
              {photos.length < MAX_PAGES && (
                <label
                  htmlFor={photoId}
                  className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  <Camera className="size-5" aria-hidden="true" />
                  <span className="text-[10px] uppercase tracking-[0.2em]">{t('Add page')}</span>
                  <input id={photoId} type="file" accept="image/*" capture="environment" onChange={addPhotos} className="sr-only" />
                </label>
              )}
            </div>
          </div>
        )}

        <Field label={t('What are you eating?')} placeholder={t('Roast lamb with rosemary')} value={food} onChange={setFood} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Occasion')} placeholder={t('Sunday lunch with family')} value={occasion} onChange={setOccasion} />
          {place !== 'home' && (
            <Field label={t('Budget per bottle (€)')} inputMode="decimal" value={budget} onChange={setBudget} />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('The date, the time of day and the season are taken into account. So is your palate.')}
          {place === 'home' && !bottles.some((b) => b.quantity > 0) && t(' Your cellar is empty, so there is nothing to pick from yet.')}
        </p>

        <Button type="submit" className="h-11 tracking-wide" disabled={!aiEnabled || asking || missing}>
          {asking && <Loader2 className="animate-spin" aria-hidden="true" />}
          {t(asking ? 'Thinking…' : 'Ask the sommelier')}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>

      {advice && (
        <div className="flex flex-col gap-5 border-t pt-8">
          <p className="text-lg leading-snug text-pretty">{advice.summary}</p>
          <ol className="flex flex-col divide-y border-y">
            {advice.picks.map((pick, i) => {
              const bottle = bottles.find((b) => b.id === pick.bottleId)
              return (
                <li key={`${pick.wine}-${i}`} className="flex flex-col gap-2 py-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {t(i === 0 ? 'Top pick' : 'Alternative')}
                    </span>
                    {pick.price && <span className="text-sm tabular-nums">{pick.price}</span>}
                  </div>
                  <span className="sb-title text-[15px]">{pick.wine}</span>
                  <p className="text-sm">{pick.why}</p>
                  {pick.serving && <p className="text-xs text-muted-foreground">{pick.serving}</p>}
                  {bottle && (
                    <button
                      type="button"
                      onClick={() => onSelect(bottle)}
                      className="flex items-center gap-1 self-start text-xs text-primary underline underline-offset-4"
                    >
                      {t('Open its sheet')}
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
          <p className="border-l-2 border-primary bg-muted/70 p-3 text-sm">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t('Based on your taste')}</span>
            <br />
            {advice.basedOn || t('Nothing personal yet, so this is general advice. Rate some wines in your Journal to change that.')}
          </p>
          {advice.caution && <p className="border border-dashed p-3 text-sm text-muted-foreground">{advice.caution}</p>}
          <p className="text-xs text-muted-foreground">{t('Advice from an AI model. It can be wrong, so trust your own taste.')}</p>
        </div>
      )}
    </section>
  )
}
