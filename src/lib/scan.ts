import { GoogleAIBackend, Schema, getAI, getGenerativeModel } from 'firebase/ai'
import { REGIONS, TIERS, WINE_TYPES } from '../types'
import type { Bottle } from '../types'
import { app, appCheckEnabled } from './firebase'

// Reads one or two label photos with Gemini, through the Firebase project.
export const scanEnabled = appCheckEnabled

export type ScannedBottle = Pick<
  Bottle,
  'producer' | 'name' | 'vintage' | 'type' | 'region' | 'tier' | 'grapes' | 'window' | 'label' | 'notes'
>

const text = (description: string) => Schema.string({ description })
const year = (description: string) => Schema.integer({ description })

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
    note: text('One short sentence on style and what to expect'),
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
    backLabel: text('Tasting text from the back label, translated to English. Empty if there is none'),
  },
})

const SYSTEM = `You are a Portuguese wine expert reading bottle labels for a private cellar.
Transcribe what is printed exactly. Never invent a producer or a wine name: if the label cannot be read, leave the field empty.
For what is not printed (drinking window, serving temperature, decanting, closure), give your best expert estimate for this specific wine and vintage, assuming good storage.
The current year is ${new Date().getFullYear()}.`

export async function scanLabel(photos: string[]): Promise<ScannedBottle> {
  const model = getGenerativeModel(getAI(app!, { backend: new GoogleAIBackend() }), {
    model: 'gemini-3.8-flash',
    systemInstruction: SYSTEM,
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
  })
  const result = await model.generateContent([
    'Read these wine label photos (front and/or back) and fill in the cellar record.',
    ...photos.map((dataUrl) => {
      const [meta, data] = dataUrl.split(',')
      return { type: 'inlineData' as const, inlineData: { mimeType: meta.slice(5, meta.indexOf(';')), data } }
    }),
  ])
  const r = JSON.parse(result.response.text())
  const hasWindow = r.drinkFrom > 0 && r.peakFrom >= r.drinkFrom && r.peakTo >= r.peakFrom && r.drinkUntil >= r.peakTo

  return {
    producer: r.producer,
    name: r.name,
    vintage: r.vintage > 0 ? r.vintage : null,
    type: r.type,
    region: r.region,
    tier: r.tier,
    grapes: r.grapes,
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

const MAX_SIDE = 1600

// Shrinks a phone photo before sending it, as a JPEG data URL.
export function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unreadable image'))
    }
    img.src = url
  })
}
