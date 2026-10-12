import { useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { newId } from '../lib/store'
import { ratedWines } from '../lib/taste'
import { RATINGS, REGIONS, TASTE_TAGS, WINE_TYPES } from '../types'
import type { Bottle, Profile, Rating, Tasting } from '../types'
import { Button, Field, SectionTitle, SelectField, cn } from './ui'

interface Props {
  profile: Profile
  bottles: Bottle[]
  onSave: (profile: Profile) => void
}

const strength = (n: number) =>
  n === 0 ? 'Nothing to go on yet' : n < 5 ? 'A first sketch' : n < 15 ? 'Taking shape' : 'A solid picture'

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

const BLANK = { wine: '', type: 'Red', region: 'Douro', rating: 'Liked', tags: [], note: '' } satisfies Partial<Tasting>

export function Palate({ profile, bottles, onSave }: Props) {
  const [about, setAbout] = useState(profile.about)
  const [draft, setDraft] = useState<Omit<Tasting, 'id' | 'date'>>(BLANK)
  const rated = ratedWines(bottles, profile)

  const add = (e: FormEvent) => {
    e.preventDefault()
    onSave({
      ...profile,
      about,
      tastings: [{ ...draft, id: newId(), date: new Date().toISOString() }, ...profile.tastings],
    })
    setDraft(BLANK)
  }

  return (
    <section aria-labelledby="palate" className="mx-auto flex w-full max-w-2xl flex-col gap-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 id="palate" className="font-serif text-4xl font-light">
          Your palate
        </h2>
        <p className="text-sm text-muted-foreground">
          What the sommelier knows about your taste. It is yours alone, even when a cellar is shared.
        </p>
      </div>

      <dl className="grid grid-cols-2 divide-x border-y text-center">
        <div className="flex flex-col gap-2 py-5">
          <dt className="text-xs uppercase tracking-widest text-muted-foreground">Wines you rated</dt>
          <dd className="font-serif text-4xl font-light tabular-nums">{rated.length}</dd>
        </div>
        <div className="flex flex-col justify-center gap-2 py-5">
          <dt className="text-xs uppercase tracking-widest text-muted-foreground">How well it knows you</dt>
          <dd className="font-serif text-2xl font-light">{strength(rated.length)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        <SectionTitle>In your own words</SectionTitle>
        <textarea
          rows={4}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          onBlur={() => about !== profile.about && onSave({ ...profile, about })}
          placeholder="I like fresh, elegant reds. Not much oak. No sweet wines. Rarely above €30 a bottle."
          className="border border-input bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary"
        />
        <p className="text-xs text-muted-foreground">Saved when you leave the box. The sommelier treats firm rules here as firm.</p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-4">
        <SectionTitle>Wines you know</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Wines you have tried anywhere, not only bottles you own. A few you loved and a few you did not teach it the most.
        </p>
        <Field
          label="Wine"
          placeholder="Producer, wine and year if you remember"
          value={draft.wine}
          onChange={(wine) => setDraft({ ...draft, wine })}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Type" value={draft.type} options={WINE_TYPES} onChange={(type) => setDraft({ ...draft, type })} />
          <SelectField label="Region" value={draft.region} options={REGIONS} onChange={(region) => setDraft({ ...draft, region })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {RATINGS.map((r: Rating) => (
            <Button
              key={r}
              variant="outline"
              className={cn(draft.rating === r && 'border-primary bg-accent')}
              onClick={() => setDraft({ ...draft, rating: r })}
            >
              {r}
            </Button>
          ))}
        </div>
        <TagPicker value={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} />
        <Field label="Why, in a few words" value={draft.note} onChange={(note) => setDraft({ ...draft, note })} />
        <Button type="submit" className="h-11 tracking-wide">
          Add to my palate
        </Button>
      </form>

      {rated.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionTitle>What it is based on</SectionTitle>
          <ul className="flex flex-col divide-y border-y text-sm">
            {rated.map((r) => (
              <li key={r.key} className="flex items-start justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-serif text-lg leading-tight">{r.wine}</span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {[r.rating, r.type, r.region, r.fromCellar ? 'From your cellar' : ''].filter(Boolean).join(' · ')}
                  </span>
                  {(r.tags.length > 0 || r.note) && (
                    <span className="text-muted-foreground">{[...r.tags, r.note].filter(Boolean).join(' · ')}</span>
                  )}
                </div>
                {!r.fromCellar && (
                  <button
                    type="button"
                    onClick={() => onSave({ ...profile, tastings: profile.tastings.filter((t) => t.id !== r.key) })}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">Remove</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
