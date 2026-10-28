import { Schema } from 'firebase/ai'
import { REGIONS, TIERS, WINE_TYPES } from '../types'
import type { Bottle } from '../types'
import { aiEnabled, generateJson } from './ai'
import { styleStructure } from './structure'
import { lang } from './i18n'

// Reads one or two label photos with Gemini.
export const scanEnabled = aiEnabled

export type ScannedBottle = Pick<
  Bottle,
  'producer' | 'name' | 'vintage' | 'type' | 'region' | 'tier' | 'grapes' | 'window' | 'label' | 'notes' | 'structure'
>

const text = (description: string) => Schema.string({ description })
const year = (description: string) => Schema.integer({ description })
const scale = (description: string) => Schema.integer({ description: `${description}. Your estimate for this wine` })

const schema = Schema.object({
  properties: {
    producer: text('Producer or estate, as printed'),
    name: text('Wine name as printed, without producer or vintage'),
    vintage: year('Harvest year. 0 when the label shows none'),
    type: Schema.enumString({ enum: [...WINE_TYPES] }),
    region: Schema.enumString({
      enum: [...REGIONS],
      description: 'Portuguese wine region. "Outside Portugal" for any foreign wine',
    }),
    tier: Schema.enumString({
      enum: [...TIERS],
      description: 'Level of the wine. Everyday unless the label or the wine itself says otherwise',
    }),
    grapes: text('Comma-separated grape varieties. Empty if not printed and not known'),
    drinkFrom: year('Estimated first year the wine is enjoyable. 0 if it cannot be estimated'),
    peakFrom: year('Estimated start of peak drinking. 0 if it cannot be estimated'),
    peakTo: year('Estimated end of peak drinking. 0 if it cannot be estimated'),
    drinkUntil: year('Estimated last good year. 0 if it cannot be estimated'),
    note: text(`One short sentence on style and what to expect, in ${lang === 'pt' ? 'European Portuguese' : 'English'}`),
    body: scale('Body, from 1 light to 5 full'),
    tannin: scale('Tannin, from 1 soft or none to 5 firm'),
    acidity: scale('Acidity, from 1 round to 5 very fresh'),
    oak: scale('Oak, from 1 none to 5 marked'),
    fruit: scale('Fruit, from 1 lean and savoury to 5 ripe and fruit-forward'),
    designation: text('For example DOC Douro or Vinho Regional Alentejano. Empty if not printed'),
    classification: text('For example Reserva or Grande Reserva. Empty if none'),
    subRegion: text('Sub-region or vineyard. Empty if none'),
    alcohol: Schema.number({ description: 'Alcohol % vol. 0 if not visible' }),
    volume: text('For example 750 ml. Empty if not visible'),
    ageing: text('Barrel or bottle ageing as printed. Empty if none'),
    closure: text('Natural cork, technical cork, screwcap and so on. Best guess'),
    lot: text('Lot number. Empty if not visible'),
    bottledBy: text('Bottler name and town. Empty if not visible'),
    serveAt: text('Serving temperature, for example 16–18 °C'),
    decant: text('Decanting advice. Empty if not needed'),
    backLabel: text(`Tasting text from the back label, in ${lang === 'pt' ? 'European Portuguese' : 'English'}. Empty if there is none`),
  },
})

const SYSTEM = `You are a Portuguese wine expert reading bottle labels for a private cellar.
Transcribe what is printed exactly. Never invent a producer or a wine name: if the label cannot be read, leave the field empty.
For what is not printed (drinking window, serving temperature, decanting, closure), give your best expert estimate for this specific wine and vintage, assuming good storage.
The current year is ${new Date().getFullYear()}.`

export async function scanLabel(photos: string[]): Promise<ScannedBottle> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shaped by the schema above
  const r = await generateJson<any>(
    SYSTEM,
    schema,
    'Read these wine label photos (front and/or back) and fill in the cellar record.',
    photos,
  )
  const hasWindow = r.drinkFrom > 0 && r.peakFrom >= r.drinkFrom && r.peakTo >= r.peakFrom && r.drinkUntil >= r.peakTo

  return {
    producer: r.producer,
    name: r.name,
    vintage: r.vintage > 0 ? r.vintage : null,
    type: r.type,
    region: r.region,
    tier: r.tier,
    grapes: r.grapes,
    structure: [r.body, r.tannin, r.acidity, r.oak, r.fruit].every((n) => n >= 1 && n <= 5)
      ? {
          body: r.body,
          tannin: r.tannin,
          acidity: r.acidity,
          oak: r.oak,
          fruit: r.fruit,
          // Maturity follows from the vintage, so it is not asked of the model.
          age: styleStructure({ type: r.type, region: r.region, vintage: r.vintage > 0 ? r.vintage : null }).age,
        }
      : null,
    notes: r.note,
    window: hasWindow
      ? { drinkFrom: r.drinkFrom, peakFrom: r.peakFrom, peakTo: r.peakTo, drinkUntil: r.drinkUntil }
      : null,
    label: {
      designation: r.designation,
      classification: r.classification,
      subRegion: r.subRegion,
      alcohol: r.alcohol > 0 ? r.alcohol : null,
      volume: r.volume,
      ageing: r.ageing,
      closure: r.closure,
      lot: r.lot,
      bottledBy: r.bottledBy,
      serveAt: r.serveAt,
      decant: r.decant,
      backLabel: r.backLabel,
    },
  }
}
