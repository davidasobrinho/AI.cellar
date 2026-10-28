import type { Bottle, Structure } from '../types'
import { newId } from './store'
import { styleStructure } from './structure'
import type { RatedWine } from './taste'

// Ten wines that João's Wine Deals PT newsletter scored 5 out of 5 for value.
// The wine, the price and the shop are from the newsletter. Two things are not:
// the vintage is a placeholder (the issue year minus three for reds and minus
// one for whites, as the newsletter gives none), and the five structure values
// (body, tannin, acidity, oak, fruit) are rough estimates of each wine's style.

export const SHOWCASE_CELLAR = "João's 5-star picks"

type Pick = [
  producer: string,
  name: string,
  type: Bottle['type'],
  region: Bottle['region'],
  tier: Bottle['tier'],
  grapes: string,
  price: number,
  shop: string,
  issue: number,
  issued: string,
  structure: [body: number, tannin: number, acidity: number, oak: number, fruit: number],
]

const PICKS: Pick[] = [
  ['Quinta dos Carvalhais', 'Reserva Tinto', 'Red', 'Dão', 'Reserva', '', 26.25, 'Continente', 11, '2024-07', [4, 4, 4, 3, 3]],
  ['Casa Ferreirinha', 'Quinta da Leda', 'Red', 'Douro', 'Grande Reserva or top', '', 37.49, 'Pingo Doce', 16, '2024-09', [5, 5, 3, 4, 4]],
  ['Quinta Vale D. Maria', 'Vinhas do Sabor', 'Red', 'Douro', 'Reserva', '', 14.39, 'Continente', 18, '2024-09', [4, 4, 3, 3, 4]],
  ['Quinta do Vale Meão', 'Meandro', 'Red', 'Douro', 'Reserva', '', 25, 'Continente', 63, '2025-09', [4, 4, 3, 3, 4]],
  ['Quinta do Vallado', 'Touriga Nacional', 'Red', 'Douro', 'Reserva', 'Touriga Nacional', 16.35, 'Continente', 64, '2025-10', [4, 4, 3, 3, 4]],
  ['Ramos Pinto', 'Duas Quintas Reserva', 'Red', 'Douro', 'Reserva', '', 30.89, 'Continente', 45, '2025-03', [5, 4, 3, 4, 4]],
  ['Anselmo Mendes', 'Contacto Alvarinho', 'White', 'Vinho Verde', 'Everyday', 'Alvarinho', 9.59, 'Continente', 51, '2025-05', [3, 1, 4, 1, 3]],
  ['Soalheiro', 'Alvarinho', 'White', 'Vinho Verde', 'Everyday', 'Alvarinho', 8.99, 'Continente', 59, '2025-09', [2, 1, 5, 1, 3]],
  ['Herdade dos Grous', 'Tinto', 'Red', 'Alentejo', 'Everyday', '', 10.99, 'Pingo Doce', 52, '2025-05', [4, 3, 2, 2, 5]],
  ['Quinta de Lemos', 'Alfrocheiro', 'Red', 'Dão', 'Reserva', 'Alfrocheiro', 16.49, 'Pingo Doce', 64, '2025-10', [3, 3, 4, 2, 3]],
]

const vintageOf = (type: Bottle['type'], issued: string) => Number(issued.slice(0, 4)) - (type === 'White' ? 1 : 3)

function structureOf([, , type, region, tier, , , , , issued, [body, tannin, acidity, oak, fruit]]: Pick): Structure {
  const { age } = styleStructure({ type, region, tier, vintage: vintageOf(type, issued) })
  return { body, tannin, acidity, oak, fruit, age }
}

export function showcaseBottles(): Omit<Bottle, 'cellarId'>[] {
  return PICKS.map((pick) => {
    const [producer, name, type, region, tier, grapes, price, shop, issue, issued] = pick
    return {
      id: newId(),
      producer,
      name,
      vintage: vintageOf(type, issued),
      type,
      region,
      tier,
      grapes,
      quantity: 1,
      priceToday: price,
      pricePaid: null,
      location: '',
      notes: `Showcase bottle. Wine Deals PT #${issue} scored it 5 out of 5 for value at €${price.toFixed(2)} in ${shop} (${issued}). The vintage, the quantity and the structure values are placeholders.`,
      openings: [],
      addedAt: new Date().toISOString(),
      window: null,
      label: null,
      structure: structureOf(pick),
    }
  })
}

// The same ten wines as if João had rated each one "Liked": a sample palate to
// show what the graph looks like before a person has rated wines of their own.
export function samplePalate(): RatedWine[] {
  return PICKS.map((pick) => {
    const [producer, name, type, region, , , , , issue, issued] = pick
    return {
      key: `sample-${issue}-${name}`,
      date: issued,
      wine: `${producer} ${name}`,
      type,
      region,
      stars: 5,
      rating: 'Liked',
      tags: [],
      note: '',
      bottleId: null,
      wantToBuy: false,
      structure: structureOf(pick),
    }
  })
}
