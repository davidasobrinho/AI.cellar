import type { Region, Structure, Tier, WineType } from '../types'
import { t } from './i18n'
import type { RatedWine } from './taste'

// How a wine is built, on six scales from 1 to 5. A wine read from its label
// carries values for that wine. Any other wine gets an estimate from its style,
// so every rated wine can count towards the palate.

export const AXES: { key: keyof Structure; label: string; low: string; high: string }[] = [
  { key: 'body', label: 'Body', low: 'light', high: 'full-bodied' },
  { key: 'tannin', label: 'Tannin', low: 'soft', high: 'firm, tannic' },
  { key: 'acidity', label: 'Acidity', low: 'round', high: 'fresh, high-acid' },
  { key: 'oak', label: 'Oak', low: 'unoaked', high: 'oaky' },
  { key: 'fruit', label: 'Fruit', low: 'lean, savoury', high: 'ripe, fruit-forward' },
  { key: 'age', label: 'Maturity', low: 'young', high: 'aged' },
]

type Shape = Omit<Structure, 'age'>
const shape = (body: number, tannin: number, acidity: number, oak: number, fruit: number): Shape => ({ body, tannin, acidity, oak, fruit })

const FIXED: Partial<Record<WineType, Shape>> = {
  Rosé: shape(2, 1, 4, 1, 3),
  Sparkling: shape(2, 1, 5, 1, 2),
  'Vintage Port': shape(5, 5, 3, 2, 5),
  'LBV Port': shape(5, 4, 3, 2, 5),
  'Tawny or other Port': shape(4, 2, 3, 4, 4),
  Madeira: shape(4, 1, 5, 3, 3),
  Moscatel: shape(4, 1, 3, 2, 5),
  Other: shape(3, 3, 3, 2, 3),
}

// What a region tends to add to or take from the base style.
const REGION: Partial<Record<Region, Partial<Shape>>> = {
  'Vinho Verde': { body: -1, acidity: 1 },
  Douro: { fruit: 1 },
  Dão: { acidity: 1 },
  Bairrada: { tannin: 1, acidity: 1 },
  Alentejo: { fruit: 1, acidity: -1 },
  'Península de Setúbal': { fruit: 1 },
  Algarve: { fruit: 1, acidity: -1 },
}

const clamp = (n: number) => Math.min(5, Math.max(1, n))

function maturity(type: WineType, vintage: number | null, year: number): number {
  if (vintage === null) return type === 'Tawny or other Port' || type === 'Madeira' ? 5 : 2
  const years = year - vintage
  return years < 2 ? 1 : years < 4 ? 2 : years < 7 ? 3 : years < 12 ? 4 : 5
}

export function styleStructure(
  wine: { type: WineType; region: Region; tier?: Tier; vintage?: number | null },
  year = new Date().getFullYear(),
): Structure {
  let s = FIXED[wine.type]
  if (!s) {
    const red = wine.type === 'Red'
    const step = wine.tier === 'Grande Reserva or top' ? 2 : wine.tier === 'Reserva' ? 1 : 0
    s = red
      ? shape(3 + Math.min(step, 1), 3 + Math.min(step, 1), 3, 2 + step, 3)
      : shape(2 + Math.min(step, 1), 1, 4, 1 + step, 3)
    const shift = REGION[wine.region] ?? {}
    // A white has no tannin to speak of, whatever the region.
    s = shape(
      s.body + (shift.body ?? 0),
      red ? s.tannin + (shift.tannin ?? 0) : 1,
      s.acidity + (shift.acidity ?? 0),
      s.oak + (shift.oak ?? 0),
      s.fruit + (shift.fruit ?? 0),
    )
  }
  return {
    body: clamp(s.body),
    tannin: clamp(s.tannin),
    acidity: clamp(s.acidity),
    oak: clamp(s.oak),
    fruit: clamp(s.fruit),
    age: maturity(wine.type, wine.vintage ?? null, year),
  }
}

export interface PalateShape {
  // The average build of the wines liked, and of the wines disliked. Null with none.
  liked: Structure | null
  disliked: Structure | null
  likedCount: number
  dislikedCount: number
}

function average(wines: RatedWine[]): Structure | null {
  if (wines.length === 0) return null
  const mean = (key: keyof Structure) => wines.reduce((sum, w) => sum + w.structure[key], 0) / wines.length
  return { body: mean('body'), tannin: mean('tannin'), acidity: mean('acidity'), oak: mean('oak'), fruit: mean('fruit'), age: mean('age') }
}

export function palate(rated: RatedWine[]): PalateShape {
  const liked = rated.filter((r) => r.rating === 'Liked')
  const disliked = rated.filter((r) => r.rating === 'Disliked')
  return { liked: average(liked), disliked: average(disliked), likedCount: liked.length, dislikedCount: disliked.length }
}

// The palate in plain words: where the liked wines sit clearly high or low, and
// where they part most from the disliked ones.
export function palateInWords(p: PalateShape): string[] {
  if (!p.liked) return []
  const lines: string[] = []
  for (const axis of AXES) {
    const value = p.liked[axis.key]
    if (value >= 3.7) lines.push(t('You lean towards {x} wines.', { x: t(axis.high) }))
    else if (value <= 2.3) lines.push(t('You lean towards {x} wines.', { x: t(axis.low) }))
  }
  if (p.disliked) {
    for (const axis of AXES) {
      const gap = p.disliked[axis.key] - p.liked[axis.key]
      if (gap >= 1) lines.push(t('The wines you disliked were more {x} than the ones you liked.', { x: t(axis.high) }))
      else if (gap <= -1) lines.push(t('The wines you disliked were more {x} than the ones you liked.', { x: t(axis.low) }))
    }
  }
  return lines
}
