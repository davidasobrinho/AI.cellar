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

// Ratings are 1 to 5 stars. Early entries used Liked / OK / Disliked instead,
// read as 4, 3 and 2 stars.
export interface Rated {
  stars?: number | null
  rating?: Rating | null
}

export interface Opening extends Rated {
  date: string
  note: string
  tags?: string[]
}

// How a wine is built, each scale from 1 (low) to 5 (high).
export interface Structure {
  body: number
  tannin: number
  acidity: number
  oak: number
  // From lean and savoury to ripe and fruit-forward.
  fruit: number
  // From young to fully aged.
  age: number
}

// A wine tried anywhere, kept in the journal whether or not it is in a cellar.
export interface Tasting extends Rated {
  id: string
  date: string
  wine: string
  type: WineType
  region: Region
  tags: string[]
  note: string
  // Added with the journal, so early entries do not have these.
  vintage?: number | null
  price?: number | null
  // Where it was drunk or bought: a restaurant, a friend's, a shop.
  place?: string
  wantToBuy?: boolean
  structure?: Structure | null
}

// One person's taste. It belongs to the account, not to a cellar, and only
// that person can read it.
export interface Profile {
  // In the person's own words, including firm rules such as "no sweet wines".
  about: string
  // Journal entries from before the journal existed. Moved to the journal on load.
  tastings: Tasting[]
  // The name in the header, such as "CAVE MARIA".
  title?: string
}

// One person's wine journal. Readable by the friends listed in it.
export interface Journal {
  entries: Tasting[]
  // Emails of the people allowed to read it.
  friends: string[]
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
  // Set for this wine by a label reading. Without it, estimated from the style.
  structure?: Structure | null
}

export interface Cellar {
  id: string
  name: string
  // Emails of the people who can change the cellar. Absent when it is kept in the browser.
  members?: string[]
  // Emails of the people who can only look at it.
  viewers?: string[]
}

export interface CellarData {
  cellars: Cellar[]
  bottles: Bottle[]
}
