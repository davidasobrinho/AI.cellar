import { Schema } from 'firebase/ai'
import type { Bottle, Profile } from '../types'
import { generateJson } from './ai'
import { tasteText } from './taste'
import { drinkingWindow } from './windows'

// The private sommelier: what to open at home, what to order from a wine list,
// or what to buy, for a given meal and moment.

export type Place = 'home' | 'restaurant' | 'shop'

export interface Question {
  place: Place
  food: string
  occasion: string
  // Euros per bottle. Only asked when buying or ordering.
  budget: string
  // Photos of the wine list, at a restaurant.
  photos: string[]
}

export interface Advice {
  summary: string
  picks: { wine: string; bottleId: string; price: string; why: string; serving: string }[]
  caution: string
  // Which of the person's own ratings or words the answer relied on.
  basedOn: string
}

const schema = Schema.object({
  properties: {
    summary: Schema.string({ description: 'One or two sentences answering the question directly' }),
    picks: Schema.array({
      description: 'The best choice first, then up to two alternatives. Empty when nothing fits',
      items: Schema.object({
        properties: {
          wine: Schema.string({ description: 'Producer, wine and vintage; or a style to look for when buying' }),
          bottleId: Schema.string({ description: 'The id of the cellar bottle. Empty when the wine is not from the cellar' }),
          price: Schema.string({ description: 'Price as shown on the list, or a price range to expect. Empty if unknown' }),
          why: Schema.string({ description: 'Why it suits the food, the moment and this person, in one or two sentences' }),
          serving: Schema.string({ description: 'Serving temperature and whether to decant. Empty if not needed' }),
        },
      }),
    }),
    basedOn: Schema.string({
      description:
        'Which of my rated wines or my own words this answer relied on, named specifically. Empty when there was nothing personal to use',
    }),
    caution: Schema.string({ description: 'What could not be judged or read, or why nothing fits. Empty if nothing to flag' }),
  },
})

const SYSTEM = `You are a private sommelier for one person's cellar of Portuguese wine. Be direct and practical.
Rules:
- At home, recommend only bottles from the cellar list, by their id. Prefer bottles marked "At peak" or "Drink soon". Do not recommend a bottle marked "Wait" unless nothing else fits, and say so. If nothing in the cellar suits the meal, say so plainly and name a style worth buying.
- At a restaurant, recommend only wines you can actually read on the photographed list. Leave out anything unreadable; never guess a wine. Weigh the price against what the wine normally costs in a shop in Portugal.
- When buying, suggest styles, regions and grapes with one or two example producers. You do not know today's prices or promotions: say so in the caution.
- Fit the person's taste: their own words are firm rules, and their liked and disliked wines and tags show what to favour and avoid. Say in basedOn exactly what you used. If there is little or nothing, leave basedOn empty and give sound general advice.
- Portuguese wines first.
- Never invent a producer, a wine or a price.`

const SEASONS = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']

function moment(now = new Date()): string {
  const hour = now.getHours()
  const meal = hour < 11 ? 'morning' : hour < 16 ? 'lunch time' : hour < 19 ? 'late afternoon' : 'dinner time'
  return `${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${meal}, ${SEASONS[now.getMonth()]} in Portugal`
}

function cellarLines(bottles: Bottle[]): string {
  return bottles
    .filter((b) => b.quantity > 0)
    .map((b) => {
      const w = drinkingWindow(b)
      return [
        b.id,
        [b.producer, b.name, b.vintage].filter(Boolean).join(' '),
        b.type,
        b.region,
        b.grapes || 'grapes unknown',
        `${w.status} (${w.hint})`,
        `${b.quantity} left`,
        b.priceToday === null ? 'no price' : `€${b.priceToday}`,
      ].join(' | ')
    })
    .join('\n')
}

// `bottles` is what can be opened now; `rated` is every bottle the person can see, for their taste.
export function askSommelier(q: Question, bottles: Bottle[], rated: Bottle[], profile: Profile): Promise<Advice> {
  const where = {
    home: 'I am at home and want to open a bottle from my cellar.',
    restaurant: 'I am at a restaurant. The photos show the wine list.',
    shop: 'I want to buy a bottle.',
  }[q.place]

  const prompt = [
    where,
    `When: ${moment()}.`,
    `Food: ${q.food || 'not decided'}.`,
    `Occasion: ${q.occasion || 'nothing special'}.`,
    q.place !== 'home' && q.budget ? `Budget: up to €${q.budget} a bottle.` : '',
    q.place !== 'restaurant' ? `My cellar (id | wine | type | region | grapes | drinking status | bottles | price):\n${cellarLines(bottles) || 'Empty.'}` : '',
    `My taste.\n${tasteText(rated, profile)}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return generateJson<Advice>(SYSTEM, schema, prompt, q.place === 'restaurant' ? q.photos : [])
}
