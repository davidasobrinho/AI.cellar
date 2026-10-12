import type { Bottle, Profile, Rating, Structure } from '../types'
import { palate, palateInWords, styleStructure } from './structure'

// Everything a person has said about wines they drank: bottles opened from a
// cellar and wines tried elsewhere, newest first.

export interface RatedWine {
  key: string
  date: string
  wine: string
  type: string
  region: string
  rating: Rating
  tags: string[]
  note: string
  fromCellar: boolean
  structure: Structure
}

export function ratedWines(bottles: Bottle[], profile: Profile): RatedWine[] {
  const opened = bottles.flatMap((b) =>
    b.openings
      .filter((o) => o.rating)
      .map((o) => ({
        key: `${b.id}:${o.date}`,
        date: o.date,
        wine: [b.producer, b.name, b.vintage].filter(Boolean).join(' '),
        type: b.type,
        region: b.region,
        rating: o.rating!,
        tags: o.tags ?? [],
        note: o.note,
        fromCellar: true,
        structure: b.structure ?? styleStructure(b),
      })),
  )
  const tried = profile.tastings.map((t) => ({ ...t, key: t.id, fromCellar: false, structure: styleStructure(t) }))
  return [...opened, ...tried].sort((a, b) => b.date.localeCompare(a.date))
}

// The taste as text for the sommelier.
export function tasteText(bottles: Bottle[], profile: Profile): string {
  const rated = ratedWines(bottles, profile)
  const lines = rated.map((r) => {
    const why = [...r.tags, r.note].filter(Boolean).join('; ')
    return `${r.rating}: ${r.wine} (${r.type}, ${r.region})${why ? `. ${why}` : ''}`
  })
  const shape = palateInWords(palate(rated))
  return [
    profile.about ? `In my own words: ${profile.about}` : '',
    lines.length ? `Wines I rated (${lines.length}):\n${lines.join('\n')}` : 'I have not rated any wines yet.',
    shape.length ? `What my ratings add up to:\n${shape.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}
