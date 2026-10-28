import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Camera, Loader2, Pencil, Star, X } from 'lucide-react'
import { aiEnabled, resizeToDataUrl } from '../lib/ai'
import { scanLabel } from '../lib/scan'
import type { FriendJournal } from '../lib/store'
import { newId } from '../lib/store'
import { ratedWines, starsOf } from '../lib/taste'
import { REGIONS, TASTE_TAGS, WINE_TYPES } from '../types'
import type { Bottle, Journal as JournalData, Tasting } from '../types'
import { Button, Field, SectionTitle, SelectField, Sheet, SheetHeader, cn } from './ui'

export function Stars({ value, onChange, size = 'md' }: { value: number | null; onChange?: (stars: number) => void; size?: 'sm' | 'md' }) {
  const icon = size === 'sm' ? 'size-3.5' : 'size-7'
  return (
    <span className="inline-flex gap-0.5" aria-label={value ? `${value} out of 5 stars` : 'Not rated'}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value !== null && n <= value
        const star = <Star className={cn(icon, on ? 'fill-primary text-primary' : 'text-input')} aria-hidden="true" />
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5" aria-label={`${n} stars`}>
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
            onClick={() => onChange(on ? value.filter((t) => t !== tag) : [...value, tag])}
            className={cn(
              'h-8 rounded-md border px-2.5 text-xs transition-colors',
              on ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/40',
            )}
          >
            {tag}
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

function JournalForm({ entry, onSave }: { entry: Tasting | null; onSave: (entry: Tasting) => void }) {
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
      setError(`The label could not be read. ${err instanceof Error ? err.message : ''}`)
    } finally {
      setScanning(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.stars) {
      setError('Give it a rating first.')
      return
    }
    onSave({ ...draft, rating: null })
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      <SheetHeader eyebrow="Diário" title={entry ? 'Edit wine' : 'A wine I drank'}>
        For wines anywhere: a restaurant, a friend's table, a tasting. It does not go in a cellar.
      </SheetHeader>

      <section className="flex flex-col gap-4 border-b p-6">
        {aiEnabled && (
          <label
            htmlFor={photoId}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            {scanning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}
            {scanning ? 'Reading the label…' : 'Fill in from a label photo'}
            <input id={photoId} type="file" accept="image/*" capture="environment" onChange={scan} className="sr-only" />
          </label>
        )}
        <Field label="Wine" placeholder="Producer and wine" value={draft.wine} onChange={(v) => set('wine', v)} required />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Vintage" inputMode="numeric" value={draft.vintage ?? ''} onChange={(v) => set('vintage', numberOrNull(v))} />
          <SelectField label="Type" value={draft.type} options={WINE_TYPES} onChange={(v) => set('type', v)} />
          <SelectField label="Region" value={draft.region} options={REGIONS} onChange={(v) => set('region', v)} />
        </div>
      </section>

      <section className="flex flex-col gap-4 border-b p-6">
        <SectionTitle>Your rating</SectionTitle>
        <Stars value={draft.stars ?? null} onChange={(n) => set('stars', n)} />
        <TagPicker value={draft.tags} onChange={(tags) => set('tags', tags)} />
        <Field label="What you thought" value={draft.note} onChange={(v) => set('note', v)} />
      </section>

      <section className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Where" placeholder="Restaurant, shop, friend's" value={draft.place ?? ''} onChange={(v) => set('place', v)} />
          <Field label="Price (€)" inputMode="decimal" value={draft.price ?? ''} onChange={(v) => set('price', numberOrNull(v))} />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(draft.wantToBuy)}
            onChange={(e) => set('wantToBuy', e.target.checked)}
            className="size-4 accent-primary"
          />
          I want to buy this one
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-2 h-11 tracking-wide">
          {entry ? 'Save changes' : 'Add to my journal'}
        </Button>
      </section>
    </form>
  )
}

type Filter = 'all' | 'buy' | 'friends'

interface Props {
  journal: JournalData
  bottles: Bottle[]
  friendJournals: FriendJournal[]
  canShare: boolean
  onSave: (journal: JournalData) => void
  onSelectBottle: (bottleId: string) => void
}

export function Journal({ journal, bottles, friendJournals, canShare, onSave, onSelectBottle }: Props) {
  const [editing, setEditing] = useState<Tasting | 'new' | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const mine = ratedWines(bottles, journal.entries)
  const shown = filter === 'buy' ? mine.filter((r) => r.wantToBuy) : mine

  const save = (entry: Tasting) => {
    const exists = journal.entries.some((t) => t.id === entry.id)
    onSave({ ...journal, entries: exists ? journal.entries.map((t) => (t.id === entry.id ? entry : t)) : [entry, ...journal.entries] })
    setEditing(null)
  }
  const addFriend = () => {
    const email = window.prompt('Google account email of the friend who can read your journal')?.trim().toLowerCase()
    if (email && !journal.friends.includes(email)) onSave({ ...journal, friends: [...journal.friends, email] })
  }

  return (
    <section aria-labelledby="journal" className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 id="journal" className="font-serif text-4xl font-light">
          Your journal
        </h2>
        <p className="text-sm text-muted-foreground">
          Every wine you drink, at home or out. Rate it, remember it, mark the ones to buy. It all feeds your palate.
        </p>
        <Button className="h-11 px-6" onClick={() => setEditing('new')}>
          Add a wine I drank
        </Button>
      </div>

      <div className="flex justify-center gap-2" role="group" aria-label="Show">
        {(
          [
            ['all', `Mine (${mine.length})`],
            ['buy', `To buy (${mine.filter((r) => r.wantToBuy).length})`],
            ...(canShare ? [['friends', `Friends (${friendJournals.length})`]] : []),
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
              {filter === 'buy' ? 'Nothing marked to buy yet.' : 'No wines yet. Add the last one you enjoyed.'}
            </li>
          )}
          {shown.map((r) => {
            const entry = journal.entries.find((t) => t.id === r.key)
            return (
              <li key={r.key} className="flex items-start justify-between gap-3 py-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-serif text-xl leading-tight">{r.wine}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Stars value={r.stars} size="sm" />
                    {[r.type, r.region, entry?.place, new Date(r.date).toLocaleDateString('en-GB')].filter(Boolean).join(' · ')}
                  </span>
                  {(r.tags.length > 0 || r.note) && (
                    <span className="text-sm text-muted-foreground">{[...r.tags, r.note].filter(Boolean).join(' · ')}</span>
                  )}
                  {r.wantToBuy && <span className="text-xs text-primary">To buy</span>}
                </div>
                {entry ? (
                  <div className="flex shrink-0">
                    <IconButton label="Edit" onClick={() => setEditing(entry)}>
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label="Remove"
                      onClick={() =>
                        window.confirm(`Remove ${r.wine} from your journal?`) &&
                        onSave({ ...journal, entries: journal.entries.filter((t) => t.id !== entry.id) })
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
                    From your cellar
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {filter === 'friends' && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            Friends you add can read your journal, not change it. You see theirs once they add you too. Your palate notes
            stay private.
          </p>
          <Button variant="outline" onClick={addFriend} className="self-center">
            Add a friend
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
                  Stop sharing
                </button>
              </div>
              {theirs === null ? (
                <p className="text-sm text-muted-foreground">They can read your journal. Theirs shows here once they add you.</p>
              ) : theirs.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No wines in their journal yet.</p>
              ) : (
                <ul className="flex flex-col divide-y border-y">
                  {theirs.entries.map((t) => (
                    <li key={t.id} className="flex flex-col gap-1 py-3">
                      <span className="font-serif text-lg leading-tight">{[t.wine, t.vintage].filter(Boolean).join(' ')}</span>
                      <span className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        <Stars value={starsOf(t)} size="sm" />
                        {[t.type, t.region, t.place].filter(Boolean).join(' · ')}
                      </span>
                      {(t.tags.length > 0 || t.note) && (
                        <span className="text-sm text-muted-foreground">{[...t.tags, t.note].filter(Boolean).join(' · ')}</span>
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
        {editing !== null && <JournalForm key={editing === 'new' ? 'new' : editing.id} entry={editing === 'new' ? null : editing} onSave={save} />}
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
