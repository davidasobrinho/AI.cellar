import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Camera, Loader2, Pencil, Star, X } from 'lucide-react'
import { aiEnabled, resizeToDataUrl } from '../lib/ai'
import { scanLabel } from '../lib/scan'
import type { FriendJournal } from '../lib/store'
import { newId } from '../lib/store'
import { ratedWines, starsOf } from '../lib/taste'
import { REGIONS, TASTE_TAGS, WINE_TYPES } from '../types'
import type { Bottle, Journal as JournalData, Profile, Tasting } from '../types'
import { PalateSummary } from './Palate'
import { Button, Field, SectionTitle, SelectField, Sheet, SheetHeader, cn } from './ui'
import { locale, t } from '../lib/i18n'

export function Stars({ value, onChange, size = 'md' }: { value: number | null; onChange?: (stars: number) => void; size?: 'sm' | 'md' }) {
  const icon = size === 'sm' ? 'size-3.5' : 'size-7'
  return (
    <span className="inline-flex gap-0.5" aria-label={value ? t('{n} out of 5 stars', { n: value }) : t('Not rated')}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value !== null && n <= value
        const star = <Star className={cn(icon, on ? 'fill-primary text-primary' : 'text-input')} aria-hidden="true" />
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5" aria-label={t('{n} stars', { n })}>
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        )
      })}
    </span>
  )
}

export function TagPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TASTE_TAGS.map((tag) => {
        const on = value.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== tag) : [...value, tag])}
            className={cn(
              'h-8 rounded-md border px-2.5 text-xs transition-colors',
              on ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/40',
            )}
          >
            {t(tag)}
          </button>
        )
      })}
    </div>
  )
}

const blank = (): Tasting => ({
  id: newId(),
  date: new Date().toISOString(),
  wine: '',
  type: 'Red',
  region: 'Douro',
  stars: null,
  tags: [],
  note: '',
  vintage: null,
  price: null,
  place: '',
  wantToBuy: false,
  structure: null,
})

const numberOrNull = (value: string): number | null => {
  const n = Number(value.replace(',', '.'))
  return value.trim() === '' || Number.isNaN(n) ? null : n
}

export function JournalForm({ entry, onSave }: { entry: Tasting | null; onSave: (entry: Tasting) => void }) {
  const [draft, setDraft] = useState<Tasting>(() => (entry ? { ...blank(), ...entry, stars: starsOf(entry) } : blank()))
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoId = useId()
  const set = <K extends keyof Tasting>(key: K, value: Tasting[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const scan = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setScanning(true)
    setError(null)
    try {
      const read = await scanLabel([await resizeToDataUrl(file)])
      setDraft((d) => ({
        ...d,
        wine: [read.producer, read.name].filter(Boolean).join(' '),
        vintage: read.vintage,
        type: read.type,
        region: read.region,
        structure: read.structure ?? null,
      }))
    } catch (err) {
      setError(t('The label could not be read. {why}', { why: err instanceof Error ? err.message : '' }))
    } finally {
      setScanning(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // Without a rating it is a wine to remember, so it goes on the list to buy.
    onSave({ ...draft, rating: null, wantToBuy: draft.stars ? draft.wantToBuy : true })
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      <SheetHeader eyebrow="Diário" title={t(entry ? 'Edit wine' : 'A wine to remember')}>
        {t("From anywhere: a restaurant, a shop shelf, a friend's table. Rate it now, or save it for later and rate it when you drink it.")}
      </SheetHeader>

      <section className="flex flex-col gap-4 border-b p-6">
        {aiEnabled && (
          <label
            htmlFor={photoId}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            {scanning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}
            {t(scanning ? 'Reading the label…' : 'Fill in from a label photo')}
            <input id={photoId} type="file" accept="image/*" capture="environment" onChange={scan} className="sr-only" />
          </label>
        )}
        <Field label={t('Wine')} placeholder={t('Producer and wine')} value={draft.wine} onChange={(v) => set('wine', v)} required />
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('Vintage')} inputMode="numeric" value={draft.vintage ?? ''} onChange={(v) => set('vintage', numberOrNull(v))} />
          <SelectField label={t('Type')} value={draft.type} options={WINE_TYPES} onChange={(v) => set('type', v)} />
          <SelectField label={t('Region')} value={draft.region} options={REGIONS} onChange={(v) => set('region', v)} />
        </div>
      </section>

      <section className="flex flex-col gap-4 border-b p-6">
        <SectionTitle>{t('Your rating, if you have tasted it')}</SectionTitle>
        <Stars value={draft.stars ?? null} onChange={(n) => set('stars', n)} />
        <TagPicker value={draft.tags} onChange={(tags) => set('tags', tags)} />
        <Field label={t('What you thought')} value={draft.note} onChange={(v) => set('note', v)} />
      </section>

      <section className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Where')} placeholder={t("Restaurant, shop, friend's")} value={draft.place ?? ''} onChange={(v) => set('place', v)} />
          <Field label={t('Price (€)')} inputMode="decimal" value={draft.price ?? ''} onChange={(v) => set('price', numberOrNull(v))} />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(draft.wantToBuy)}
            onChange={(e) => set('wantToBuy', e.target.checked)}
            className="size-4 accent-primary"
          />
          {t('I want to buy this one')}
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-2 h-11 tracking-wide">
          {t(entry ? 'Save changes' : draft.stars ? 'Add to my journal' : 'Save for later')}
        </Button>
      </section>
    </form>
  )
}

type Filter = 'all' | 'buy' | 'friends'

// One line of the journal: a wine from it, rated or saved for later, or a bottle opened from a cellar.
interface Row {
  key: string
  date: string
  wine: string
  stars: number | null
  details: string
  why: string
  wantToBuy: boolean
  entry: Tasting | null
  bottleId: string | null
}

interface Props {
  journal: JournalData
  bottles: Bottle[]
  friendJournals: FriendJournal[]
  canShare: boolean
  profile: Profile
  onSave: (journal: JournalData) => void
  onSaveProfile: (profile: Profile) => void
  onSelectBottle: (bottleId: string) => void
}

export function Journal({ journal, bottles, friendJournals, canShare, profile, onSave, onSaveProfile, onSelectBottle }: Props) {
  const [editing, setEditing] = useState<Tasting | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const rated = ratedWines(bottles, journal.entries)

  const rows: Row[] = [
    ...rated.map((r) => {
      const entry = journal.entries.find((e) => e.id === r.key) ?? null
      return {
        key: r.key,
        date: r.date,
        wine: r.wine,
        stars: r.stars,
        details: [t(r.type), t(r.region), entry?.place, new Date(r.date).toLocaleDateString(locale)].filter(Boolean).join(' · '),
        why: [...r.tags.map((tag) => t(tag)), r.note].filter(Boolean).join(' · '),
        wantToBuy: r.wantToBuy,
        entry,
        bottleId: r.bottleId,
      }
    }),
    ...journal.entries
      .filter((e) => starsOf(e) === null)
      .map((e) => ({
        key: e.id,
        date: e.date,
        wine: [e.wine, e.vintage].filter(Boolean).join(' '),
        stars: null,
        details: [t(e.type), t(e.region), e.place, e.price ? `€${e.price}` : ''].filter(Boolean).join(' · '),
        why: e.note,
        wantToBuy: true,
        entry: e,
        bottleId: null,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date))
  const shown = filter === 'buy' ? rows.filter((r) => r.wantToBuy) : rows

  const save = (entry: Tasting) => {
    const exists = journal.entries.some((e) => e.id === entry.id)
    onSave({ ...journal, entries: exists ? journal.entries.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...journal.entries] })
    setEditing(null)
  }
  const addFriend = () => {
    const email = window.prompt(t('Google account email of the friend who can read your journal'))?.trim().toLowerCase()
    if (email && !journal.friends.includes(email)) onSave({ ...journal, friends: [...journal.friends, email] })
  }

  return (
    <section aria-labelledby="journal" className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 id="journal" className="font-serif text-4xl font-light">
          {t('Your journal')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("Wines you drank or want to try. Add one with the + at the top: snap it, rate it now or save it for later. Every rating shapes your palate and the sommelier's advice.")}
        </p>
      </div>

      <PalateSummary rated={rated} profile={profile} onSave={onSaveProfile} />

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Show">
        {(
          [
            ['all', t('All ({n})', { n: rows.length })],
            ['buy', t('To buy ({n})', { n: rows.filter((r) => r.wantToBuy).length })],
            ...(canShare ? [['friends', t('Friends ({n})', { n: friendJournals.length })]] : []),
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={cn(
              'h-9 rounded-md border px-3 text-sm transition-colors',
              filter === id ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/40',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filter !== 'friends' && (
        <ul className="flex flex-col divide-y border-y">
          {shown.length === 0 && (
            <li className="py-12 text-center text-sm text-muted-foreground">
              {t(filter === 'buy' ? 'Nothing saved to buy yet.' : 'No wines yet. Snap the next one you enjoy.')}
            </li>
          )}
          {shown.map((r) => (
            <li key={r.key} className="flex items-start justify-between gap-3 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-serif text-xl leading-tight">{r.wine}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {r.stars !== null ? <Stars value={r.stars} size="sm" /> : <span className="text-primary">{t('Not tasted yet')}</span>}
                  {r.details}
                </span>
                {r.why && <span className="text-sm text-muted-foreground">{r.why}</span>}
                {r.wantToBuy && <span className="text-xs text-primary">{t('To buy')}</span>}
              </div>
              {r.entry ? (
                <div className="flex shrink-0 items-center">
                  {r.stars === null && (
                    <button
                      type="button"
                      onClick={() => setEditing(r.entry)}
                      className="mr-1 text-xs text-primary underline underline-offset-4"
                    >
                      {t('Rate it')}
                    </button>
                  )}
                  <IconButton label={t('Edit')} onClick={() => setEditing(r.entry)}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={t('Remove')}
                    onClick={() =>
                      window.confirm(t('Remove {name} from your journal?', { name: r.wine })) &&
                      onSave({ ...journal, entries: journal.entries.filter((e) => e.id !== r.key) })
                    }
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </IconButton>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectBottle(r.bottleId!)}
                  className="shrink-0 text-xs text-primary underline underline-offset-4"
                >
                  {t('From your cellar')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {filter === 'friends' && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            {t('Friends you add can read your journal, not change it. You see theirs once they add you too. Your palate stays private.')}
          </p>
          <Button variant="outline" onClick={addFriend} className="self-center">
            {t('Add a friend')}
          </Button>
          {friendJournals.map(({ email, journal: theirs }) => (
            <div key={email} className="flex flex-col gap-3 border-t pt-5">
              <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>{email}</SectionTitle>
                <button
                  type="button"
                  onClick={() => onSave({ ...journal, friends: journal.friends.filter((f) => f !== email) })}
                  className="text-xs text-muted-foreground underline underline-offset-4"
                >
                  {t('Stop sharing')}
                </button>
              </div>
              {theirs === null ? (
                <p className="text-sm text-muted-foreground">{t('They can read your journal. Theirs shows here once they add you.')}</p>
              ) : theirs.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('No wines in their journal yet.')}</p>
              ) : (
                <ul className="flex flex-col divide-y border-y">
                  {theirs.entries.map((e) => (
                    <li key={e.id} className="flex flex-col gap-1 py-3">
                      <span className="font-serif text-lg leading-tight">{[e.wine, e.vintage].filter(Boolean).join(' ')}</span>
                      <span className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        {starsOf(e) !== null ? <Stars value={starsOf(e)} size="sm" /> : <span>{t('Saved for later')}</span>}
                        {[t(e.type), t(e.region), e.place].filter(Boolean).join(' · ')}
                      </span>
                      {(e.tags.length > 0 || e.note) && (
                        <span className="text-sm text-muted-foreground">{[...e.tags.map((tag) => t(tag)), e.note].filter(Boolean).join(' · ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)}>
        {editing !== null && <JournalForm key={editing.id} entry={editing} onSave={save} />}
      </Sheet>
    </section>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  )
}