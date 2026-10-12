import type { Bottle, DrinkWindow, Region, Tier, WineType } from '../types'

// When to drink a bottle. A window set for the wine itself (read from the label
// or typed in) wins. Otherwise it is a rule-of-thumb estimate by style, region
// and level. Both assume good, stable storage.

export type WindowStatus = 'Drink soon' | 'At peak' | 'Ready' | 'Wait' | 'Past best' | 'Ready any time' | 'Unknown'

// Most time-sensitive first. Used to sort lists and order the filters.
export const STATUS_ORDER: WindowStatus[] = [
  'Drink soon',
  'At peak',
  'Ready',
  'Ready any time',
  'Wait',
  'Past best',
  'Unknown',
]

export const STATUS_DESCRIPTION: Record<WindowStatus, string> = {
  'Drink soon': 'Past its peak and starting to fade. Open in the next year or so.',
  'At peak': 'Drinking at its best right now. A great moment to open it.',
  Ready: 'Drinkable now, but will still improve with a few more years.',
  Wait: 'Still too young. Leave it in the cellar for now.',
  'Past best': 'Likely beyond its window. Open one soon to check.',
  'Ready any time': 'Aged before bottling. It does not improve in the bottle.',
  Unknown: 'Add a vintage to get an estimate.',
}

export interface DrinkingWindow {
  status: WindowStatus
  // Null when the wine has no meaningful window.
  dates: DrinkWindow | null
  source: 'This wine' | 'Its style' | null
  hint: string
}

// Years after the vintage: drink from, peak from, peak to, drink until.
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

type Windowed = Pick<Bottle, 'type' | 'region' | 'tier' | 'vintage' | 'window'>

// The style estimate alone, for showing next to a window set by hand or for prefilling one.
export function styleWindow(bottle: Windowed): DrinkWindow | null {
  const offsets = offsetsFor(bottle.type, bottle.region, bottle.tier)
  if (bottle.vintage === null || offsets === null) return null
  const [drinkFrom, peakFrom, peakTo, drinkUntil] = offsets.map((o) => bottle.vintage! + o)
  return { drinkFrom, peakFrom, peakTo, drinkUntil }
}

function statusOf(w: DrinkWindow, year: number): WindowStatus {
  if (year < w.drinkFrom) return 'Wait'
  if (year < w.peakFrom) return 'Ready'
  if (year <= w.peakTo) return 'At peak'
  if (year <= w.drinkUntil) return 'Drink soon'
  return 'Past best'
}

function hintFor(status: WindowStatus, w: DrinkWindow | null, year: number): string {
  if (!w) return status === 'Ready any time' ? 'Open whenever you like' : 'No estimate yet'
  const years = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`
  switch (status) {
    case 'Wait':
      return `Ready in ${years(w.drinkFrom - year)} (${w.drinkFrom})`
    case 'Ready':
      return `Peaks in ${years(w.peakFrom - year)} (${w.peakFrom})`
    case 'At peak':
      return w.peakTo === year ? 'Last year at peak' : `At peak until ${w.peakTo}`
    case 'Drink soon':
      return `Best before end of ${w.drinkUntil}`
    default:
      return `Window closed in ${w.drinkUntil}`
  }
}

export function drinkingWindow(bottle: Windowed, year = new Date().getFullYear()): DrinkingWindow {
  const own = bottle.window ?? null
  if (!own && STABLE.includes(bottle.type)) {
    return { status: 'Ready any time', dates: null, source: 'Its style', hint: hintFor('Ready any time', null, year) }
  }
  const dates = own ?? styleWindow(bottle)
  if (!dates) return { status: 'Unknown', dates: null, source: null, hint: hintFor('Unknown', null, year) }
  const status = statusOf(dates, year)
  return { status, dates, source: own ? 'This wine' : 'Its style', hint: hintFor(status, dates, year) }
}

// The few bottles whose window is closing: past best, fading, or in their last year of peak.
export function closingFirst<T extends Bottle>(bottles: T[], year = new Date().getFullYear(), limit = 3): T[] {
  return bottles
    .filter((b) => b.quantity > 0)
    .map((b) => ({ b, w: drinkingWindow(b, year) }))
    .filter(
      ({ w }) =>
        w.status === 'Past best' ||
        w.status === 'Drink soon' ||
        (w.status === 'At peak' && w.dates!.peakTo - year <= 1),
    )
    .sort((x, y) => x.w.dates!.drinkUntil - y.w.dates!.drinkUntil)
    .slice(0, limit)
    .map(({ b }) => b)
}
