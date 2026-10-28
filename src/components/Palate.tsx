import { useState } from 'react'
import { samplePalate } from '../lib/showcase'
import { palate } from '../lib/structure'
import { ratedWines } from '../lib/taste'
import type { Bottle, Profile, Tasting } from '../types'
import { PalateGraph } from './PalateGraph'
import { Button, SectionTitle } from './ui'

interface Props {
  profile: Profile
  bottles: Bottle[]
  journal: Tasting[]
  onSave: (profile: Profile) => void
  onOpenJournal: () => void
}

const strength = (n: number) =>
  n === 0 ? 'Nothing to go on yet' : n < 5 ? 'A first sketch' : n < 15 ? 'Taking shape' : 'A solid picture'

export function Palate({ profile, bottles, journal, onSave, onOpenJournal }: Props) {
  const [about, setAbout] = useState(profile.about)
  const [example, setExample] = useState(false)
  const rated = ratedWines(bottles, journal)
  const mine = palate(rated)

  return (
    <section aria-labelledby="palate" className="mx-auto flex w-full max-w-2xl flex-col gap-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 id="palate" className="font-serif text-4xl font-light">
          Your palate
        </h2>
        <p className="text-sm text-muted-foreground">
          What the sommelier knows about your taste, from your journal and the bottles you opened. It is yours alone.
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

      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <SectionTitle>{example ? "Example: João's palate" : 'Your palate graph'}</SectionTitle>
          <button type="button" onClick={() => setExample(!example)} className="text-xs text-primary underline underline-offset-4">
            {example ? 'Back to mine' : 'See an example'}
          </button>
        </div>
        {example ? (
          <>
            <PalateGraph shape={palate(samplePalate())} />
            <p className="text-center text-xs text-muted-foreground">
              Built from ten wines João's newsletter scored 5 out of 5, counted as liked. Their structure values are rough
              estimates.
            </p>
          </>
        ) : mine.liked || mine.disliked ? (
          <>
            <PalateGraph shape={mine} />
            <p className="text-center text-xs text-muted-foreground">
              Wines of 4 or 5 stars count as liked, 1 or 2 as disliked. A wine read from its label uses its own values; any
              other uses an estimate for its type and region.
            </p>
          </>
        ) : (
          <p className="border-l-2 border-primary bg-muted/70 p-4 text-sm text-muted-foreground">
            The graph appears once you have rated a wine. See an example to know what to expect.
          </p>
        )}
        <Button variant="outline" className="self-center" onClick={onOpenJournal}>
          Rate wines in your journal
        </Button>
      </div>

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
    </section>
  )
}
