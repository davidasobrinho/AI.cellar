import { useState } from 'react'
import { samplePalate } from '../lib/showcase'
import { palate } from '../lib/structure'
import type { RatedWine } from '../lib/taste'
import type { Profile } from '../types'
import { PalateGraph } from './PalateGraph'
import { SectionTitle } from './ui'

const strength = (n: number) =>
  n === 0 ? 'Nothing to go on yet' : n < 5 ? 'A first sketch' : n < 15 ? 'Taking shape' : 'A solid picture'

// What the sommelier knows about a person's taste, at the top of their journal:
// the graph drawn from their ratings, and their own words. Both stay private.
export function PalateSummary({ rated, profile, onSave }: { rated: RatedWine[]; profile: Profile; onSave: (profile: Profile) => void }) {
  const [about, setAbout] = useState(profile.about)
  const [example, setExample] = useState(false)
  const [editing, setEditing] = useState(false)
  const mine = palate(rated)

  return (
    <section aria-label="Your palate" className="flex flex-col gap-5 border-y py-6">
      <div className="flex items-baseline justify-between gap-4">
        <SectionTitle>{example ? "Example: João's palate" : 'Your palate'}</SectionTitle>
        <span className="text-xs text-muted-foreground">
          {rated.length} rated · {strength(rated.length)}
        </span>
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
          Your palate graph appears here once you rate a wine.
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs">
        <button type="button" onClick={() => setExample(!example)} className="text-primary underline underline-offset-4">
          {example ? 'Back to mine' : 'See an example'}
        </button>
        <button type="button" onClick={() => setEditing(!editing)} className="text-primary underline underline-offset-4">
          {profile.about ? 'Your taste in your own words' : 'Describe your taste in your own words'}
        </button>
      </div>

      {editing && (
        <div className="flex flex-col gap-2">
          <textarea
            rows={4}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            onBlur={() => about !== profile.about && onSave({ ...profile, about })}
            placeholder="I like fresh, elegant reds. Not much oak. No sweet wines. Rarely above €30 a bottle."
            className="border border-input bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            Saved when you leave the box. Private, even from friends. The sommelier treats firm rules here as firm.
          </p>
        </div>
      )}
    </section>
  )
}
