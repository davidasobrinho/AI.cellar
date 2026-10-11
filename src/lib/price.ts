import type { Bottle } from '../types'

export type PriceBand = 'green' | 'blue' | 'red'

export const BAND_LABELS: Record<PriceBand, string> = {
  green: 'Below €10',
  blue: '€10 to €30',
  red: 'More than €30',
}

export function priceBand(price: number | null): PriceBand | null {
  if (price === null) return null
  if (price < 10) return 'green'
  if (price <= 30) return 'blue'
  return 'red'
}

export interface CellarValue {
  bottles: number
  pricedBottles: number
  total: number
  average: number | null
}

// Bottles without a price are counted but left out of the total and the average.
export function cellarValue(bottles: Bottle[]): CellarValue {
  let count = 0
  let priced = 0
  let total = 0
  for (const b of bottles) {
    count += b.quantity
    if (b.priceToday !== null) {
      priced += b.quantity
      total += b.priceToday * b.quantity
    }
  }
  return { bottles: count, pricedBottles: priced, total, average: priced ? total / priced : null }
}

export function euros(value: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value)
}
