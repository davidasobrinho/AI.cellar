import type { CellarData } from '../types'

// The cellar lives in this browser for now. Shared, synced storage replaces
// these two functions later without touching the rest of the app.

const KEY = 'private-sommelier:v1'

const EMPTY: CellarData = { cellars: [{ id: 'main', name: 'Main cellar' }], bottles: [] }

export function loadData(): CellarData {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CellarData) : EMPTY
  } catch {
    return EMPTY
  }
}

export function saveData(data: CellarData): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function newId(): string {
  return crypto.randomUUID()
}
