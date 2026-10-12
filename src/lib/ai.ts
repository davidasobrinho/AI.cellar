import { GoogleAIBackend, getAI, getGenerativeModel } from 'firebase/ai'
import type { Schema } from 'firebase/ai'
import { app, appCheckEnabled } from './firebase'

// Gemini, called through the Firebase project. Firebase only allows it once
// App Check is set up, so everything built on it is off until then.
export const aiEnabled = appCheckEnabled

// Asks for an answer in the shape of the schema. Photos are JPEG or PNG data URLs.
export async function generateJson<T>(system: string, schema: Schema, prompt: string, photos: string[] = []): Promise<T> {
  const model = getGenerativeModel(getAI(app!, { backend: new GoogleAIBackend() }), {
    model: 'gemini-3.8-flash',
    systemInstruction: system,
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
  })
  const result = await model.generateContent([
    prompt,
    ...photos.map((dataUrl) => {
      const [meta, data] = dataUrl.split(',')
      return { type: 'inlineData' as const, inlineData: { mimeType: meta.slice(5, meta.indexOf(';')), data } }
    }),
  ])
  return JSON.parse(result.response.text()) as T
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
