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

export interface Opening {
  date: string
  rating: Rating | null
  note: string
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
