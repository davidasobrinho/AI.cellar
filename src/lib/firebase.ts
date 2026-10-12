import { initializeApp } from 'firebase/app'
import { ReCaptchaEnterpriseProvider, ReCaptchaV3Provider, initializeAppCheck } from 'firebase/app-check'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Without the Firebase settings the app keeps the cellar in this browser only.
export const firebaseEnabled = Boolean(config.apiKey && config.projectId)

export const app = firebaseEnabled ? initializeApp(config) : null

export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null

// App Check proves a request comes from this app. It is used when a key is set.
const appCheckKey: string | undefined = import.meta.env.VITE_APPCHECK_SITE_KEY

if (app && appCheckKey) {
  // On a development machine this prints a debug token to register in the console.
  if (import.meta.env.DEV) Object.assign(self, { FIREBASE_APPCHECK_DEBUG_TOKEN: true })
  initializeAppCheck(app, {
    provider:
      import.meta.env.VITE_APPCHECK_PROVIDER === 'v3'
        ? new ReCaptchaV3Provider(appCheckKey)
        : new ReCaptchaEnterpriseProvider(appCheckKey),
    isTokenAutoRefreshEnabled: true,
  })
}
