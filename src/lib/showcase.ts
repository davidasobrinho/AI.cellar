import type { Bottle } from '../types'
import { newId } from './store'

// Ten wines that João's Wine Deals PT newsletter scored 5 out of 5 for value.
// The wine, the price and the shop are from the newsletter. The newsletter does
// not give vintages, so the vintage is a placeholder: the issue year minus three
// for reds and minus one for whites.

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
]

const PICKS: Pick[] = [
  ['Quinta dos Carvalhais', 'Reserva Tinto', 'Red', 'Dão', 'Reserva', '', 26.25, 'Continente', 11, '2024-07'],
  ['Casa Ferreirinha', 'Quinta da Leda', 'Red', 'Douro', 'Grande Reserva or top', '', 37.49, 'Pingo Doce', 16, '2024-09'],
  ['Quinta Vale D. Maria', 'Vinhas do Sabor', 'Red', 'Douro', 'Reserva', '', 14.39, 'Continente', 18, '2024-09'],
  ['Quinta do Vale Meão', 'Meandro', 'Red', 'Douro', 'Reserva', '', 25, 'Continente', 63, '2025-09'],
  ['Quinta do Vallado', 'Touriga Nacional', 'Red', 'Douro', 'Reserva', 'Touriga Nacional', 16.35, 'Continente', 64, '2025-10'],
  ['Ramos Pinto', 'Duas Quintas Reserva', 'Red', 'Douro', 'Reserva', '', 30.89, 'Continente', 45, '2025-03'],
  ['Anselmo Mendes', 'Contacto Alvarinho', 'White', 'Vinho Verde', 'Everyday', 'Alvarinho', 9.59, 'Continente', 51, '2025-05'],
  ['Soalheiro', 'Alvarinho', 'White', 'Vinho Verde', 'Everyday', 'Alvarinho', 8.99, 'Continente', 59, '2025-09'],
  ['Herdade dos Grous', 'Tinto', 'Red', 'Alentejo', 'Everyday', '', 10.99, 'Pingo Doce', 52, '2025-05'],
  ['Quinta de Lemos', 'Alfrocheiro', 'Red', 'Dão', 'Reserva', 'Alfrocheiro', 16.49, 'Pingo Doce', 64, '2025-10'],
]

export function showcaseBottles(): Omit<Bottle, 'cellarId'>[] {
  return PICKS.map(([producer, name, type, region, tier, grapes, price, shop, issue, issued]) => ({
    id: newId(),
    producer,
    name,
    vintage: Number(issued.slice(0, 4)) - (type === 'White' ? 1 : 3),
    type,
    region,
    tier,
    grapes,
    quantity: 1,
    priceToday: price,
    pricePaid: null,
    location: '',
    notes: `Showcase bottle. Wine Deals PT #${issue} scored it 5 out of 5 for value at €${price.toFixed(2)} in ${shop} (${issued}). The vintage and the quantity are placeholders.`,
    openings: [],
    addedAt: new Date().toISOString(),
    window: null,
    label: null,
  }))
}
