export const WINE_TYPES = [
  'Red',
  'White',
  'Rosé',
  'Sparkling',
  'Vintage Port',
  'LBV Port',
  'Tawny or other Port',
  'Madeira',
  'Moscatel',
  'Other',
] as const
export type WineType = (typeof WINE_TYPES)[number]

export const REGIONS = [
  'Vinho Verde',
  'Trás-os-Montes',
  'Douro',
  'Távora-Varosa',
  'Bairrada',
  'Dão',
  'Beira Interior',
  'Lisboa',
  'Tejo',
  'Península de Setúbal',
  'Alentejo',
  'Algarve',
  'Madeira',
  'Açores',
  'Outside Portugal',
] as const
export type Region = (typeof REGIONS)[number]

export const TIERS = ['Everyday', 'Reserva', 'Grande Reserva or top'] as const
export type Tier = (typeof TIERS)[number]

export const RATINGS = ['Liked', 'OK', 'Disliked'] as const
export type Rating = (typeof RATINGS)[number]

// Quick words for why a wine did or did not please.
export const TASTE_TAGS = [
  'Fresh',
  'Elegant',
  'Fruity',
  'Smooth',
  'Complex',
  'Powerful',
  'Too heavy',
  'Too tannic',
  'Too oaky',
  'Too acidic',
  'Too sweet',
  'Thin',
] as const

export interface Opening {
  date: string
  rating: Rating | null
  note: string
  tags?: string[]
}

// A wine tried somewhere, not a bottle in the cellar.
export interface Tasting {
  id: string
  date: string
  wine: string
  type: WineType
  region: Region
  rating: Rating
  tags: string[]
  note: string
}

// One person's taste. It belongs to the account, not to a cellar.
export interface Profile {
  // In the person's own words, including firm rules such as "no sweet wines".
  about: string
  tastings: Tasting[]
}

// Calendar years.
export interface DrinkWindow {
  drinkFrom: number
  peakFrom: number
  peakTo: number
  drinkUntil: number
}

// What the front and back labels say, plus serving advice. Empty string when unknown.
export interface LabelDetails {
  designation: string
  classification: string
  subRegion: string
  alcohol: number | null
  volume: string
  ageing: string
  closure: string
  lot: string
  bottledBy: string
  serveAt: string
  decant: string
  backLabel: string
}

export interface Bottle {
  id: string
  cellarId: string
  producer: string
  name: string
  vintage: number | null
  type: WineType
  region: Region
  tier: Tier
  quantity: number
  // Euros per bottle. priceToday is the benchmark price, pricePaid what it cost.
  priceToday: number | null
  pricePaid: number | null
  location: string
  notes: string
  openings: Opening[]
  addedAt: string
  // Added later, so bottles saved before them do not have these three.
  grapes?: string
  // A window set for this wine, by the label reading or by hand. Without it,
  // the window is estimated from the style.
  window?: DrinkWindow | null
  label?: LabelDetails | null
}

export interface Cellar {
  id: string
  name: string
  // Emails of the people who share the cellar. Absent when it is kept in the browser.
  members?: string[]
}

export interface CellarData {
  cellars: Cellar[]
  bottles: Bottle[]
}
