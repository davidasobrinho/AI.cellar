import { describe, expect, it } from 'vitest'
import type { Bottle } from '../types'
import { cellarValue, priceBand } from './price'
import { closingFirst, drinkingWindow } from './windows'

const bottle = (over: Partial<Bottle>): Bottle => ({
  id: 'x',
  cellarId: 'main',
  producer: 'P',
  name: 'N',
  vintage: 2020,
  type: 'Red',
  region: 'Alentejo',
  tier: 'Everyday',
  quantity: 1,
  priceToday: null,
  pricePaid: null,
  location: '',
  notes: '',
  openings: [],
  addedAt: '',
  ...over,
})

describe('drinkingWindow', () => {
  it('moves an everyday red through the five states', () => {
    const b = bottle({ vintage: 2020 })
    expect(drinkingWindow(b, 2020).status).toBe('Wait')
    expect(drinkingWindow(b, 2021).status).toBe('Ready')
    expect(drinkingWindow(b, 2023).status).toBe('At peak')
    expect(drinkingWindow(b, 2027).status).toBe('Drink soon')
    expect(drinkingWindow(b, 2030).status).toBe('Past best')
  })

  it('keeps a Douro reserva red longer than an Alentejo one', () => {
    const douro = drinkingWindow(bottle({ region: 'Douro', tier: 'Reserva' }))
    const alentejo = drinkingWindow(bottle({ region: 'Alentejo', tier: 'Reserva' }))
    expect(douro.dates!.drinkUntil).toBeGreaterThan(alentejo.dates!.drinkUntil)
  })

  it('prefers a window set for the wine over the style estimate', () => {
    const own = { drinkFrom: 2030, peakFrom: 2035, peakTo: 2045, drinkUntil: 2055 }
    const w = drinkingWindow(bottle({ vintage: 2020, window: own }), 2026)
    expect(w.status).toBe('Wait')
    expect(w.source).toBe('This wine')
    expect(w.hint).toBe('Ready in 4 years (2030)')
  })

  it('gives no dates to cask-aged wines', () => {
    const w = drinkingWindow(bottle({ type: 'Madeira', vintage: null }))
    expect(w.status).toBe('Ready any time')
    expect(w.dates).toBeNull()
  })

  it('is unknown without a vintage', () => {
    expect(drinkingWindow(bottle({ vintage: null })).status).toBe('Unknown')
  })
})

describe('closingFirst', () => {
  it('lists fading bottles by closing year and leaves out young, mid-peak and empty ones', () => {
    const list = closingFirst(
      [
        bottle({ id: 'mid-peak', vintage: 2023 }),
        bottle({ id: 'last-peak-year', vintage: 2021 }),
        bottle({ id: 'fading', vintage: 2019 }),
        bottle({ id: 'young', vintage: 2026 }),
        bottle({ id: 'empty', vintage: 2019, quantity: 0 }),
      ],
      2026,
    )
    expect(list.map((b) => b.id)).toEqual(['fading', 'last-peak-year'])
  })
})

describe('price', () => {
  it('bands prices at 10 and 30 euros', () => {
    expect(priceBand(9.99)).toBe('green')
    expect(priceBand(10)).toBe('blue')
    expect(priceBand(30)).toBe('blue')
    expect(priceBand(30.01)).toBe('red')
    expect(priceBand(null)).toBeNull()
  })

  it('values only priced bottles', () => {
    const v = cellarValue([
      bottle({ priceToday: 8, quantity: 2 }),
      bottle({ priceToday: 40, quantity: 1 }),
      bottle({ priceToday: null, quantity: 3 }),
    ])
    expect(v).toEqual({ bottles: 6, pricedBottles: 3, total: 56, average: 56 / 3 })
  })
})
