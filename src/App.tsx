import { useEffect, useMemo, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { Plus } from 'lucide-react'
import { BottleForm } from './components/BottleForm'
import { WineDetail } from './components/WineDetail'
import { Button, Sheet, cn } from './components/ui'
import { CellarSummary, DontMiss, TimelineView, WineList } from './components/views'
import { auth, firebaseEnabled } from './lib/firebase'
import { useFirebaseStore, useLocalStore } from './lib/store'
import type { Store } from './lib/store'
import { STATUS_ORDER, drinkingWindow } from './lib/windows'
import type { WindowStatus } from './lib/windows'
import type { Bottle } from './types'

const ALL = 'all'

function Brand() {
  return <h1 className="font-serif text-2xl font-light tracking-[0.35em] md:text-3xl">CAVE SOBRI</h1>
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
      <Brand />
      {children}
    </main>
  )
}

export default function App() {
  return firebaseEnabled ? <SharedApp /> : <LocalApp />
}

function LocalApp() {
  return <CellarApp store={useLocalStore()} />
}

function SharedApp() {
  // undefined while Firebase is still working out who is signed in.
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => onAuthStateChanged(auth!, setUser), [])

  if (user === undefined) return <Centered>Loading…</Centered>
  if (user === null || !user.email) {
    return (
      <Centered>
        <p className="text-sm text-muted-foreground">Sign in to see the cellars shared with you.</p>
        <Button className="h-11 px-6" onClick={() => void signInWithPopup(auth!, new GoogleAuthProvider())}>
          Sign in with Google
        </Button>
      </Centered>
    )
  }
  return <SignedInApp email={user.email} />
}

function SignedInApp({ email }: { email: string }) {
  const store = useFirebaseStore(email)
  if (!store.ready) {
    return (
      <Centered>
        <p className={cn('text-sm', store.error ? 'text-destructive' : 'text-muted-foreground')}>
          {store.error ? `Problem ${store.error}` : 'Loading your cellar…'}
        </p>
        <Account email={email} />
      </Centered>
    )
  }
  return <CellarApp store={store} account={email} />
}

function Account({ email }: { email: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      {email} ·{' '}
      <button type="button" className="underline underline-offset-4" onClick={() => void signOut(auth!)}>
        Sign out
      </button>
    </p>
  )
}

type View = 'list' | 'timeline'
const VIEWS: { id: View; label: string }[] = [
  { id: 'list', label: 'Bottles' },
  { id: 'timeline', label: 'Timeline' },
]

type Panel = { kind: 'detail'; id: string } | { kind: 'form'; bottle: Bottle | null } | null

function CellarApp({ store, account }: { store: Store; account?: string }) {
  const { data } = store
  const [view, setView] = useState<View>('list')
  const [status, setStatus] = useState<WindowStatus | null>(null)
  const [cellarId, setCellarId] = useState(ALL)
  const [panel, setPanel] = useState<Panel>(null)

  const inCellar = useMemo(
    () => data.bottles.filter((b) => cellarId === ALL || b.cellarId === cellarId),
    [data.bottles, cellarId],
  )
  const visible = useMemo(() => {
    const rank = (b: Bottle) => STATUS_ORDER.indexOf(drinkingWindow(b).status)
    const until = (b: Bottle) => drinkingWindow(b).dates?.drinkUntil ?? Infinity
    return inCellar
      .filter((b) => status === null || drinkingWindow(b).status === status)
      .sort((a, b) => rank(a) - rank(b) || until(a) - until(b))
  }, [inCellar, status])

  const selected = data.cellars.find((c) => c.id === cellarId)
  const detail = panel?.kind === 'detail' ? data.bottles.find((b) => b.id === panel.id) : undefined
  const select = (b: Bottle) => setPanel({ kind: 'detail', id: b.id })

  const addCellar = () => {
    const name = window.prompt('Name of the new cellar')?.trim()
    if (name) store.addCellar(name)
  }
  const share = () => {
    const email = window.prompt(`Google account email of the person to share "${selected!.name}" with`)?.trim()
    if (email) store.shareCellar!(selected!.id, email)
  }

  return (
    <div className="min-h-dvh">
      <header>
        <div className="mx-auto grid h-24 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-5">
          <span aria-hidden="true" />
          <Brand />
          <div className="flex justify-end">
            <Button onClick={() => setPanel({ kind: 'form', bottle: null })}>
              <Plus aria-hidden="true" />
              <span className="hidden sm:inline">Add bottle</span>
              <span className="sr-only sm:hidden">Add bottle</span>
            </Button>
          </div>
        </div>
        <nav aria-label="Views" className="border-y">
          <div className="mx-auto flex max-w-6xl justify-center gap-8 px-5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? 'page' : undefined}
                className={cn(
                  '-mb-px h-12 border-b-2 text-sm transition-colors',
                  view === v.id
                    ? 'border-foreground font-normal text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-14 px-5 py-10">
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <select
              aria-label="Cellar"
              value={cellarId}
              onChange={(e) => setCellarId(e.target.value)}
              className="h-9 border-b border-input bg-transparent pr-2 outline-none focus-visible:border-primary"
            >
              <option value={ALL}>All cellars</option>
              {data.cellars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button variant="ghost" className="h-9" onClick={addCellar}>
              New cellar
            </Button>
            {store.shareCellar && selected && (
              <Button variant="ghost" className="h-9" onClick={share}>
                Share
              </Button>
            )}
          </div>
          {selected?.members && selected.members.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Shared with {selected.members.filter((m) => m !== account).join(', ')}
            </p>
          )}
          {store.error && (
            <p role="alert" className="text-sm text-destructive">
              Problem {store.error}
            </p>
          )}
        </div>

        <CellarSummary bottles={inCellar} activeStatus={status} onStatusChange={setStatus} />

        {status === null && <DontMiss bottles={inCellar} onSelect={select} />}

        <section aria-labelledby="bottles" className="flex flex-col gap-5 border-t pt-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="bottles" className="font-serif text-3xl font-light">
              {status ?? (view === 'list' ? 'All bottles' : 'Drinking timeline')}
            </h2>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {visible.length} {visible.length === 1 ? 'wine' : 'wines'}
            </span>
          </div>

          {view === 'list' ? (
            <WineList bottles={visible} onSelect={select} />
          ) : (
            <TimelineView bottles={visible} onSelect={select} />
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-2 w-5 bg-cork/45" aria-hidden="true" />
              Drinking window
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-5 bg-status-peak" aria-hidden="true" />
              Peak
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-0.5 bg-foreground" aria-hidden="true" />
              Today
            </span>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-5 py-10 text-center">
          <span className="font-normal">SOBRI</span>
          <span className="text-xs text-muted-foreground">Sealed with Portuguese cork · Porto</span>
          {account && <Account email={account} />}
        </div>
      </footer>

      <Sheet open={panel !== null} onClose={() => setPanel(null)}>
        {detail && (
          <WineDetail
            key={detail.id}
            bottle={detail}
            cellarName={data.cellars.find((c) => c.id === detail.cellarId)?.name ?? ''}
            onChange={store.putBottle}
            onEdit={() => setPanel({ kind: 'form', bottle: detail })}
            onDelete={() => {
              store.deleteBottle(detail)
              setPanel(null)
            }}
          />
        )}
        {panel?.kind === 'form' && (
          <BottleForm
            bottle={panel.bottle}
            cellars={data.cellars}
            defaultCellarId={cellarId === ALL ? data.cellars[0].id : cellarId}
            onSave={(bottle) => {
              store.putBottle(bottle)
              setStatus(null)
              setPanel({ kind: 'detail', id: bottle.id })
            }}
          />
        )}
      </Sheet>
    </div>
  )
}
