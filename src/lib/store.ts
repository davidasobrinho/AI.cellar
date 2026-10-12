import { useEffect, useRef, useState } from 'react'
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { Bottle, Cellar, CellarData } from '../types'
import { db } from './firebase'

// The screens talk to a Store and do not know where the cellar is kept.
export interface Store {
  data: CellarData
  ready: boolean
  // The last failure reading or saving, in the storage's own words.
  error?: string
  putBottle: (bottle: Bottle) => void
  deleteBottle: (bottle: Bottle) => void
  // A new cellar, optionally filled with bottles from the start.
  addCellar: (name: string, bottles?: Omit<Bottle, 'cellarId'>[]) => void
  // Only shared storage can give another person access to a cellar.
  shareCellar?: (cellarId: string, email: string) => void
}

export function newId(): string {
  return crypto.randomUUID()
}

const KEY = 'private-sommelier:v1'

const EMPTY: CellarData = { cellars: [{ id: 'main', name: 'Main cellar' }], bottles: [] }

function loadLocal(): CellarData {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CellarData) : EMPTY
  } catch {
    return EMPTY
  }
}

// The cellar kept in this browser, on one device.
export function useLocalStore(): Store {
  const [data, setData] = useState<CellarData>(loadLocal)
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(data)), [data])

  return {
    data,
    ready: true,
    putBottle: (bottle) =>
      setData((d) => ({
        ...d,
        bottles: d.bottles.some((b) => b.id === bottle.id)
          ? d.bottles.map((b) => (b.id === bottle.id ? bottle : b))
          : [...d.bottles, bottle],
      })),
    deleteBottle: (bottle) => setData((d) => ({ ...d, bottles: d.bottles.filter((b) => b.id !== bottle.id) })),
    addCellar: (name, bottles = []) => {
      const cellarId = newId()
      setData((d) => ({
        cellars: [...d.cellars, { id: cellarId, name }],
        bottles: [...d.bottles, ...bottles.map((b) => ({ ...b, cellarId }))],
      }))
    },
  }
}

// Cellars shared through Firestore. A cellar belongs to its members, listed by
// email, and its bottles live under it: cellars/{cellarId}/bottles/{bottleId}.
// The email must be spelled exactly as in the sign-in token, which the access
// rules compare it with.
export function useFirebaseStore(email: string): Store {
  const [cellars, setCellars] = useState<Cellar[]>([])
  const [bottles, setBottles] = useState<Record<string, Bottle[]>>({})
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()
  const fail = (doing: string) => (e: Error) => setError(`${doing}: ${e.message}`)
  const createdFirst = useRef(false)

  useEffect(() => {
    const mine = query(collection(db!, 'cellars'), where('members', 'array-contains', email))
    return onSnapshot(
      mine,
      (snap) => {
        if (snap.empty) {
          // A first sign-in gets a cellar to start with. Wait for the server's
          // answer so that being offline does not create a second one, and try
          // only once so that a refused write is reported instead of repeated.
          if (!snap.metadata.fromCache && !createdFirst.current) {
            createdFirst.current = true
            addDoc(collection(db!, 'cellars'), { name: 'Main cellar', members: [email] }).catch(
              fail('creating your first cellar'),
            )
          }
          return
        }
        setCellars(snap.docs.map((d) => ({ id: d.id, name: d.data().name, members: d.data().members })))
        setReady(true)
      },
      fail('reading your cellars'),
    )
  }, [email])

  const cellarIds = cellars.map((c) => c.id).join(',')
  useEffect(() => {
    const stops = cellarIds
      .split(',')
      .filter(Boolean)
      .map((id) =>
        onSnapshot(
          collection(db!, 'cellars', id, 'bottles'),
          (snap) => setBottles((all) => ({ ...all, [id]: snap.docs.map((d) => d.data() as Bottle) })),
          fail('reading the bottles'),
        ),
      )
    return () => stops.forEach((stop) => stop())
  }, [cellarIds])

  const data = { cellars, bottles: cellars.flatMap((c) => bottles[c.id] ?? []) }
  const bottleRef = (b: Bottle) => doc(db!, 'cellars', b.cellarId, 'bottles', b.id)

  return {
    data,
    ready,
    error,
    putBottle: (bottle) => {
      const before = data.bottles.find((b) => b.id === bottle.id)
      if (before && before.cellarId !== bottle.cellarId) {
        deleteDoc(bottleRef(before)).catch(fail('moving the bottle'))
      }
      setDoc(bottleRef(bottle), bottle).catch(fail('saving the bottle'))
    },
    deleteBottle: (bottle) => void deleteDoc(bottleRef(bottle)).catch(fail('removing the bottle')),
    addCellar: (name, bottles = []) =>
      void addDoc(collection(db!, 'cellars'), { name, members: [email] })
        .then((cellar) =>
          Promise.all(bottles.map((b) => setDoc(doc(cellar, 'bottles', b.id), { ...b, cellarId: cellar.id }))),
        )
        .catch(fail('creating the cellar')),
    shareCellar: (cellarId, other) =>
      void updateDoc(doc(db!, 'cellars', cellarId), { members: arrayUnion(other.trim().toLowerCase()) }).catch(
        fail('sharing the cellar'),
      ),
  }
}
