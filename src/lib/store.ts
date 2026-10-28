import { useEffect, useRef, useState } from 'react'
import {
  addDoc,
  arrayRemove,
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
import type { Bottle, Cellar, CellarData, Journal, Profile } from '../types'
import { db } from './firebase'

const NO_PROFILE: Profile = { about: '', tastings: [] }
const NO_JOURNAL: Journal = { entries: [], friends: [] }

export type Role = 'edit' | 'view'

// A friend's journal: null until they add this person as a friend too.
export interface FriendJournal {
  email: string
  journal: Journal | null
}

// The screens talk to a Store and do not know where the cellar is kept.
export interface Store {
  data: CellarData
  // Whether this person can change a cellar, or only look at it.
  canEdit: (cellarId: string) => boolean
  // The signed-in person's own taste. Never shared, not even with friends.
  profile: Profile
  saveProfile: (profile: Profile) => void
  // The person's wine journal, which the friends listed in it can read.
  journal: Journal
  saveJournal: (journal: Journal) => void
  friendJournals: FriendJournal[]
  ready: boolean
  // The last failure reading or saving, in the storage's own words.
  error?: string
  putBottle: (bottle: Bottle) => void
  deleteBottle: (bottle: Bottle) => void
  // A new cellar, optionally filled with bottles from the start.
  addCellar: (name: string, bottles?: Omit<Bottle, 'cellarId'>[]) => void
  // Removes the cellar and every bottle in it, for all its members.
  deleteCellar: (cellarId: string) => void
  // Only shared storage can give another person access to a cellar.
  shareCellar?: (cellarId: string, email: string, role: Role) => void
  unshareCellar?: (cellarId: string, email: string) => void
}

export function newId(): string {
  return crypto.randomUUID()
}

const KEY = 'private-sommelier:v1'
const PROFILE_KEY = 'private-sommelier:profile:v1'
const JOURNAL_KEY = 'private-sommelier:journal:v1'

const EMPTY: CellarData = { cellars: [{ id: 'main', name: 'Main cellar' }], bottles: [] }

function useSaved<T>(key: string, empty: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      return { ...empty, ...JSON.parse(localStorage.getItem(key) ?? 'null') }
    } catch {
      return empty
    }
  })
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value])
  return [value, setValue] as const
}

// Moves journal entries kept in the profile before the journal existed.
function useMoveOldTastings(profile: Profile, journal: Journal | null, saveProfile: (p: Profile) => void, saveJournal: (j: Journal) => void) {
  useEffect(() => {
    if (!journal || profile.tastings.length === 0) return
    saveJournal({ ...journal, entries: [...profile.tastings, ...journal.entries] })
    saveProfile({ ...profile, tastings: [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when old entries are found
  }, [profile.tastings.length, journal === null])
}

// The cellar kept in this browser, on one device.
export function useLocalStore(): Store {
  const [data, setData] = useSaved<CellarData>(KEY, EMPTY)
  const [profile, setProfile] = useSaved<Profile>(PROFILE_KEY, NO_PROFILE)
  const [journal, setJournal] = useSaved<Journal>(JOURNAL_KEY, NO_JOURNAL)
  useMoveOldTastings(profile, journal, setProfile, setJournal)

  return {
    data,
    canEdit: () => true,
    profile,
    saveProfile: setProfile,
    journal,
    saveJournal: setJournal,
    friendJournals: [],
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
    deleteCellar: (cellarId) =>
      setData((d) => ({
        cellars: d.cellars.filter((c) => c.id !== cellarId),
        bottles: d.bottles.filter((b) => b.cellarId !== cellarId),
      })),
  }
}

const toCellar = (id: string, d: Record<string, unknown>): Cellar => ({
  id,
  name: d.name as string,
  members: (d.members as string[]) ?? [],
  viewers: (d.viewers as string[]) ?? [],
})

// Cellars shared through Firestore. A cellar's members can change it and its
// viewers can only look; both are listed by email. Its bottles live under it:
// cellars/{cellarId}/bottles/{bottleId}. The email must be spelled exactly as
// in the sign-in token, which the access rules compare it with.
export function useFirebaseStore(email: string): Store {
  const [editable, setEditable] = useState<Cellar[] | null>(null)
  const [viewable, setViewable] = useState<Cellar[]>([])
  const [bottles, setBottles] = useState<Record<string, Bottle[]>>({})
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
            addDoc(collection(db!, 'cellars'), { name: 'Main cellar', members: [email], viewers: [] }).catch(
              fail('creating your first cellar'),
            )
          }
          return
        }
        setEditable(snap.docs.map((d) => toCellar(d.id, d.data())))
      },
      fail('reading your cellars'),
    )
  }, [email])

  useEffect(() => {
    const shared = query(collection(db!, 'cellars'), where('viewers', 'array-contains', email))
    return onSnapshot(shared, (snap) => setViewable(snap.docs.map((d) => toCellar(d.id, d.data()))), fail('reading shared cellars'))
  }, [email])

  const cellars = [...(editable ?? []), ...viewable.filter((v) => !editable?.some((e) => e.id === v.id))]
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

  // The taste profile lives at profiles/{email}, readable only by that person.
  const [profile, setProfile] = useState<Profile>(NO_PROFILE)
  useEffect(
    () =>
      onSnapshot(
        doc(db!, 'profiles', email),
        (snap) => setProfile({ ...NO_PROFILE, ...(snap.data() as Partial<Profile> | undefined) }),
        fail('reading your taste profile'),
      ),
    [email],
  )
  const saveProfile = (next: Profile) =>
    void setDoc(doc(db!, 'profiles', email), next).catch(fail('saving your taste profile'))

  // The journal lives at journals/{email}, readable by the friends it lists.
  const [journal, setJournal] = useState<Journal | null>(null)
  useEffect(
    () =>
      onSnapshot(
        doc(db!, 'journals', email),
        (snap) => setJournal({ ...NO_JOURNAL, ...(snap.data() as Partial<Journal> | undefined) }),
        fail('reading your journal'),
      ),
    [email],
  )
  const saveJournal = (next: Journal) => void setDoc(doc(db!, 'journals', email), next).catch(fail('saving your journal'))
  useMoveOldTastings(profile, journal, saveProfile, saveJournal)

  // Friends' journals open only once they have added this person in return.
  const friendList = (journal?.friends ?? []).join(',')
  const [friendJournals, setFriendJournals] = useState<Record<string, Journal | null>>({})
  useEffect(() => {
    const stops = friendList
      .split(',')
      .filter(Boolean)
      .map((friend) =>
        onSnapshot(
          doc(db!, 'journals', friend),
          (snap) => setFriendJournals((all) => ({ ...all, [friend]: { ...NO_JOURNAL, ...snap.data() } })),
          () => setFriendJournals((all) => ({ ...all, [friend]: null })),
        ),
      )
    return () => stops.forEach((stop) => stop())
  }, [friendList])

  const data = { cellars, bottles: cellars.flatMap((c) => bottles[c.id] ?? []) }
  const bottleRef = (b: Bottle) => doc(db!, 'cellars', b.cellarId, 'bottles', b.id)

  return {
    data,
    canEdit: (cellarId) => Boolean(editable?.some((c) => c.id === cellarId)),
    profile,
    saveProfile,
    journal: journal ?? NO_JOURNAL,
    saveJournal,
    friendJournals: (journal?.friends ?? []).map((friend) => ({ email: friend, journal: friendJournals[friend] ?? null })),
    ready: editable !== null && journal !== null,
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
      void addDoc(collection(db!, 'cellars'), { name, members: [email], viewers: [] })
        .then((cellar) =>
          Promise.all(bottles.map((b) => setDoc(doc(cellar, 'bottles', b.id), { ...b, cellarId: cellar.id }))),
        )
        .catch(fail('creating the cellar')),
    // Bottles go first: the rules check the cellar's members to allow each removal.
    deleteCellar: (cellarId) =>
      void Promise.all((bottles[cellarId] ?? []).map((b) => deleteDoc(bottleRef(b))))
        .then(() => deleteDoc(doc(db!, 'cellars', cellarId)))
        .catch(fail('deleting the cellar')),
    // A person is either a member or a viewer, never both.
    shareCellar: (cellarId, other, role) => {
      const who = other.trim().toLowerCase()
      void updateDoc(doc(db!, 'cellars', cellarId), {
        members: role === 'edit' ? arrayUnion(who) : arrayRemove(who),
        viewers: role === 'view' ? arrayUnion(who) : arrayRemove(who),
      }).catch(fail('sharing the cellar'))
    },
    unshareCellar: (cellarId, other) =>
      void updateDoc(doc(db!, 'cellars', cellarId), { members: arrayRemove(other), viewers: arrayRemove(other) }).catch(
        fail('removing access to the cellar'),
      ),
  }
}
