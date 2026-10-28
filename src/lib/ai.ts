import { AgentPlatformBackend, GoogleAIBackend, getAI, getGenerativeModel } from 'firebase/ai'
import type { ModelParams, Schema } from 'firebase/ai'
import { app, firebaseEnabled } from './firebase'
import { t } from './i18n'

// Gemini, called through the Firebase project (AI Logic must be turned on there).
// App Check, when a site key is set, adds proof that a request comes from this app.
export const aiEnabled = firebaseEnabled

// Two routes to the same Gemini models. 'google' is the Gemini Developer API (AI Studio):
// a free daily allowance, or prepaid credit. 'vertex' is Vertex AI, billed to the Google
// Cloud account, which can use Google Cloud trial credit. It needs the Blaze plan. (The SDK now
// calls Vertex AI the Agent Platform.)
const VERTEX = import.meta.env.VITE_AI_PROVIDER === 'vertex'
const backend = () => (VERTEX ? new AgentPlatformBackend(import.meta.env.VITE_AI_LOCATION || 'global') : new GoogleAIBackend())

// Best model first. The free tier gives each model its own small daily allowance,
// so when one is used up for the day the next one takes over.
const MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']
const usedUp = new Set<string>()
const TIMEOUT_MS = 60_000

const isQuotaError = (e: unknown) => /429|quota|RESOURCE_EXHAUSTED/i.test(e instanceof Error ? e.message : '')
// A model that is overloaded or timed out: the next one may still answer.
const isBusyError = (e: unknown) => /\[50\d|high demand|overloaded|UNAVAILABLE|No answer after/i.test(e instanceof Error ? e.message : '')

type Settings = Omit<ModelParams, 'model'>

// Sends the request to the best model that still has allowance today, and returns its text.
async function ask(settings: Settings, prompt: string, photos: string[] = []): Promise<string> {
  const parts = [
    prompt,
    ...photos.map((dataUrl) => {
      const [meta, data] = dataUrl.split(',')
      return { type: 'inlineData' as const, inlineData: { mimeType: meta.slice(5, meta.indexOf(';')), data } }
    }),
  ]
  let busy = false
  for (const name of MODELS.filter((m) => !usedUp.has(m))) {
    const model = getGenerativeModel(getAI(app!, { backend: backend() }), { ...settings, model: name })
    try {
      // The App Check step can wait forever when the browser check does not complete.
      const result = await Promise.race([
        model.generateContent(parts),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(t('No answer after 60 seconds.'))), TIMEOUT_MS),
        ),
      ])
      return result.response.text()
    } catch (e) {
      if (isQuotaError(e)) usedUp.add(name)
      else if (isBusyError(e)) busy = true
      else throw e
    }
  }
  throw new Error(
    busy
      ? t('The AI models are busy right now. Try again in a minute.')
      : t("Today's free AI allowance is used up. It resets within a day."),
  )
}

// Asks for an answer in the shape of the schema. Photos are JPEG or PNG data URLs.
export async function generateJson<T>(system: string, schema: Schema, prompt: string, photos: string[] = []): Promise<T> {
  const text = await ask(
    { systemInstruction: system, generationConfig: { responseMimeType: 'application/json', responseSchema: schema } },
    prompt,
    photos,
  )
  return JSON.parse(text) as T
}

// Opens a web page, such as the menu behind a restaurant's QR code, and copies
// out its wine list as plain text. A separate step, because a model reading a
// link cannot also be held to an answer shape.
export async function readWineListAt(url: string): Promise<string> {
  const text = await ask(
    { tools: [{ urlContext: {} }] },
    `Open ${url}. It is a restaurant menu. Copy out every wine on it, one per line, with producer, wine name, vintage, colour, and the price of a bottle and of a glass when shown. Copy exactly what is written; never add a wine that is not there. If the page cannot be opened or has no wine list, answer only: NO WINE LIST.`,
  )
  if (/NO WINE LIST/.test(text) || text.trim().length < 20) {
    throw new Error(t('No wine list could be read at that link. Try pasting the list instead.'))
  }
  return text.trim()
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
