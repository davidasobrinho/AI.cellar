import type { Bottle, Region, Tier, WineType } from '../types'

// Drinking windows are rule-of-thumb estimates by style, region and tier.
// They assume good, stable storage and say nothing about one producer or one year.

export type WindowStatus =
  | 'Too young'
  | 'Approaching'
  | 'Prime'
  | 'Declining'
  | 'Past prime'
  | 'Ready any time'
  | 'Unknown'

export interface DrinkingWindow {
  status: WindowStatus
  // Calendar years. Null when the wine has no meaningful window.
  drinkFrom: number | null
  peakFrom: number | null
  peakUntil: number | null
  drinkUntil: number | null
  confidence: 'Medium' | 'Low' | null
  advice: string
}

// Years after the vintage: drink from, peak from, peak until, drink until.
type Offsets = [number, number, number, number]

const STILL: Record<'Red' | 'White', Record<Tier, Offsets>> = {
  Red: {
    Everyday: [1, 2, 5, 8],
    Reserva: [3, 5, 10, 15],
    'Grande Reserva or top': [5, 8, 18, 25],
  },
  White: {
    Everyday: [0, 1, 2, 4],
    Reserva: [1, 2, 6, 9],
    'Grande Reserva or top': [2, 3, 10, 15],
  },
}

const FIXED: Partial<Record<WineType, Offsets>> = {
  Rosé: [0, 0, 2, 3],
  Sparkling: [0, 1, 5, 8],
  'Vintage Port': [10, 20, 50, 70],
  'LBV Port': [4, 5, 15, 20],
}

// Wines aged in cask before bottling. They do not improve in the bottle.
const STABLE: WineType[] = ['Tawny or other Port', 'Madeira', 'Moscatel']

// Regions whose serious reds are built on tannin and acidity and keep longer.
const LONG_LIVED_RED_REGIONS: Region[] = ['Douro', 'Dão', 'Bairrada']

function offsetsFor(type: WineType, region: Region, tier: Tier): Offsets | null {
  if (type === 'Red' || type === 'White') {
    const base = STILL[type][tier]
    if (type === 'Red' && tier !== 'Everyday' && LONG_LIVED_RED_REGIONS.includes(region)) {
      return [base[0], base[1], Math.round(base[2] * 1.25), Math.round(base[3] * 1.25)]
    }
    return base
  }
  return FIXED[type] ?? null
}

const ADVICE: Record<WindowStatus, string> = {
  'Too young': 'Wait. It is likely still closed.',
  Approaching: 'Enjoyable now, better soon.',
  Prime: 'Good to drink now.',
  Declining: 'Drink soon. It is past its best years.',
  'Past prime': 'Probably past its best. Open one to check.',
  'Ready any time': 'Ready when bottled. It does not improve in the bottle.',
  Unknown: 'Add a vintage and type to get an estimate.',
}

const NONE = { drinkFrom: null, peakFrom: null, peakUntil: null, drinkUntil: null }

export function drinkingWindow(
  bottle: Pick<Bottle, 'type' | 'region' | 'tier' | 'vintage'>,
  year = new Date().getFullYear(),
): DrinkingWindow {
  if (STABLE.includes(bottle.type)) {
    return { ...NONE, status: 'Ready any time', confidence: 'Medium', advice: ADVICE['Ready any time'] }
  }
  const offsets = offsetsFor(bottle.type, bottle.region, bottle.tier)
  if (bottle.vintage === null || offsets === null) {
    return { ...NONE, status: 'Unknown', confidence: null, advice: ADVICE.Unknown }
  }
  const [drinkFrom, peakFrom, peakUntil, drinkUntil] = offsets.map((o) => bottle.vintage! + o)
  let status: WindowStatus
  if (year < drinkFrom) status = 'Too young'
  else if (year < peakFrom) status = 'Approaching'
  else if (year <= peakUntil) status = 'Prime'
  else if (year <= drinkUntil) status = 'Declining'
  else status = 'Past prime'
  // The rules know Portuguese styles. Anything else gets a weaker estimate.
  const confidence = bottle.region === 'Outside Portugal' ? 'Low' : 'Medium'
  return { status, drinkFrom, peakFrom, peakUntil, drinkUntil, confidence, advice: ADVICE[status] }
}

const URGENCY: WindowStatus[] = ['Declining', 'Prime', 'Ready any time', 'Approaching']

// Bottles worth opening now, most time-sensitive first.
export function openTonight<T extends Bottle>(bottles: T[], year = new Date().getFullYear()): T[] {
  return bottles
    .filter((b) => b.quantity > 0)
    .map((b) => ({ b, w: drinkingWindow(b, year) }))
    .filter(({ w }) => URGENCY.includes(w.status))
    .sort(
      (x, y) =>
        URGENCY.indexOf(x.w.status) - URGENCY.indexOf(y.w.status) ||
        (x.w.drinkUntil ?? Infinity) - (y.w.drinkUntil ?? Infinity),
    )
    .map(({ b }) => b)
}
