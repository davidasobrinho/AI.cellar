import { GoogleAIBackend, getAI, getGenerativeModel } from 'firebase/ai'
import type { Schema } from 'firebase/ai'
import { app, firebaseEnabled } from './firebase'

// Gemini, called through the Firebase project (AI Logic must be turned on there).
// App Check, when a site key is set, adds proof that a request comes from this app.
export const aiEnabled = firebaseEnabled

// Best model first. The free tier gives each model its own small daily allowance,
// so when one is used up for the day the next one takes over.
const MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']
const usedUp = new Set<string>()
const TIMEOUT_MS = 60_000

const isQuotaError = (e: unknown) => /429|quota|RESOURCE_EXHAUSTED/i.test(e instanceof Error ? e.message : '')
// A model that is overloaded or timed out: the next one may still answer.
const isBusyError = (e: unknown) => /\[50\d|high demand|overloaded|UNAVAILABLE|No answer after/i.test(e instanceof Error ? e.message : '')

// Asks for an answer in the shape of the schema. Photos are JPEG or PNG data URLs.
export async function generateJson<T>(system: string, schema: Schema, prompt: string, photos: string[] = []): Promise<T> {
  const parts = [
    prompt,
    ...photos.map((dataUrl) => {
      const [meta, data] = dataUrl.split(',')
      return { type: 'inlineData' as const, inlineData: { mimeType: meta.slice(5, meta.indexOf(';')), data } }
    }),
  ]
  let busy = false
  for (const name of MODELS.filter((m) => !usedUp.has(m))) {
    const model = getGenerativeModel(getAI(app!, { backend: new GoogleAIBackend() }), {
      model: name,
      systemInstruction: system,
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
    })
    try {
      // The App Check step can wait forever when the browser check does not complete.
      const result = await Promise.race([
        model.generateContent(parts),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('No answer after 60 seconds.')), TIMEOUT_MS),
        ),
      ])
      return JSON.parse(result.response.text()) as T
    } catch (e) {
      if (isQuotaError(e)) usedUp.add(name)
      else if (isBusyError(e)) busy = true
      else throw e
    }
  }
  throw new Error(
    busy
      ? 'The AI models are busy right now. Try again in a minute.'
      : "Today's free AI allowance is used up. It resets within a day.",
  )
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
