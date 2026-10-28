import type { Bottle, Profile, Rated, Rating, Structure, Tasting } from '../types'
import { palate, palateInWords, styleStructure } from './structure'

// Everything a person has said about wines they drank: bottles opened from a
// cellar and wines in their journal, newest first.

const OLD_RATING: Record<Rating, number> = { Liked: 4, OK: 3, Disliked: 2 }

export function starsOf(r: Rated): number | null {
  return r.stars ?? (r.rating ? OLD_RATING[r.rating] : null)
}

// What a number of stars means for the palate.
export function feeling(stars: number): Rating {
  return stars >= 4 ? 'Liked' : stars === 3 ? 'OK' : 'Disliked'
}

export interface RatedWine {
  key: string
  date: string
  wine: string
  type: string
  region: string
  stars: number
  rating: Rating
  tags: string[]
  note: string
  // The cellar bottle it came from, or null for a journal entry.
  bottleId: string | null
  wantToBuy: boolean
  structure: Structure
}

export function ratedWines(bottles: Bottle[], journal: Tasting[]): RatedWine[] {
  const opened = bottles.flatMap((b) =>
    b.openings.flatMap((o) => {
      const stars = starsOf(o)
      if (stars === null) return []
      return [
        {
          key: `${b.id}:${o.date}`,
          date: o.date,
          wine: [b.producer, b.name, b.vintage].filter(Boolean).join(' '),
          type: b.type,
          region: b.region,
          stars,
          rating: feeling(stars),
          tags: o.tags ?? [],
          note: o.note,
          bottleId: b.id,
          wantToBuy: false,
          structure: b.structure ?? styleStructure(b),
        },
      ]
    }),
  )
  const tried = journal.flatMap((t) => {
    const stars = starsOf(t)
    if (stars === null) return []
    return [
      {
        key: t.id,
        date: t.date,
        wine: [t.wine, t.vintage].filter(Boolean).join(' '),
        type: t.type,
        region: t.region,
        stars,
        rating: feeling(stars),
        tags: t.tags,
        note: t.note,
        bottleId: null,
        wantToBuy: Boolean(t.wantToBuy),
        structure: t.structure ?? styleStructure(t),
      },
    ]
  })
  return [...opened, ...tried].sort((a, b) => b.date.localeCompare(a.date))
}

// The taste as text for the sommelier.
export function tasteText(bottles: Bottle[], journal: Tasting[], profile: Profile): string {
  const rated = ratedWines(bottles, journal)
  const lines = rated.map((r) => {
    const why = [...r.tags, r.note].filter(Boolean).join('; ')
    return `${r.stars}/5: ${r.wine} (${r.type}, ${r.region})${why ? `. ${why}` : ''}`
  })
  const wanted = journal.filter((t) => t.wantToBuy).map((t) => t.wine)
  const shape = palateInWords(palate(rated))
  return [
    profile.about ? `In my own words: ${profile.about}` : '',
    lines.length ? `Wines I rated, out of 5 stars (${lines.length}):\n${lines.join('\n')}` : 'I have not rated any wines yet.',
    wanted.length ? `Wines I want to buy: ${wanted.join('; ')}` : '',
    shape.length ? `What my ratings add up to:\n${shape.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}
