import { useEffect, useMemo, useState } from 'react'
import type { ComponentProps, FormEvent, ReactNode } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { Plus } from 'lucide-react'
import { BottleForm } from './components/BottleForm'
import { Journal } from './components/Journal'
import { Palate } from './components/Palate'
import { Sommelier } from './components/Sommelier'
import { WineDetail } from './components/WineDetail'
import { Button, Field, SectionTitle, Sheet, SheetHeader, cn } from './components/ui'
import { CellarSummary, DontMiss, TimelineView, WineList } from './components/views'
import { auth, firebaseEnabled } from './lib/firebase'
import { SHOWCASE_CELLAR, showcaseBottles } from './lib/showcase'
import { useFirebaseStore, useLocalStore } from './lib/store'
import type { Role, Store } from './lib/store'
import { STATUS_ORDER, drinkingWindow } from './lib/windows'
import type { WindowStatus } from './lib/windows'
import type { Bottle, Cellar } from './types'

const DEFAULT_TITLE = 'CAVE SOBRI'

// A link shared to the app from another app (Android's Share menu), such as the
// menu page a restaurant's QR code opened. Read once, then cleared from the address.
const SHARED_LINK = (() => {
  const params = new URLSearchParams(window.location.search)
  const found = [params.get('url'), params.get('text'), params.get('title')]
    .map((v) => v?.match(/https?:\/\/\S+/)?.[0])
    .find(Boolean)
  if (params.has('url') || params.has('text')) window.history.replaceState(null, '', '/')
  return found
})()

function Brand({ title = DEFAULT_TITLE }: { title?: string }) {
  return <h1 className="text-center font-serif text-2xl font-light tracking-[0.35em] md:text-3xl">{title}</h1>
}

function Centered({ children }: { children: ReactNode }) {
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
        <p className="text-sm text-muted-foreground">Sign in to see your cellars and the ones shared with you.</p>
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

type View = 'cellar' | 'journal' | 'sommelier' | 'palate'
const VIEWS: { id: View; label: string }[] = [
  { id: 'cellar', label: 'Cellar' },
  { id: 'journal', label: 'Journal' },
  { id: 'sommelier', label: 'Sommelier' },
  { id: 'palate', label: 'Palate' },
]

type Layout = 'list' | 'timeline'
const LAYOUTS: { id: Layout; label: string }[] = [
  { id: 'list', label: 'List' },
  { id: 'timeline', label: 'Timeline' },
]

type Panel = { kind: 'detail'; id: string } | { kind: 'form'; bottle: Bottle | null } | { kind: 'share'; cellarId: string } | null

function Chip({ active, className, ...props }: ComponentProps<'button'> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors',
        active ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/40',
        className,
      )}
      {...props}
    />
  )
}

function ShareForm({ cellar, account, store }: { cellar: Cellar; account?: string; store: Store }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('view')
  const people = [
    ...(cellar.members ?? []).map((m) => ({ email: m, role: 'Can edit' })),
    ...(cellar.viewers ?? []).map((v) => ({ email: v, role: 'Can view' })),
  ].filter((p) => p.email !== account)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    store.shareCellar!(cellar.id, email, role)
    setEmail('')
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      <SheetHeader eyebrow="Partilhar" title={`Share ${cellar.name}`}>
        They sign in with that Google account and the cellar appears in their app, next to their own.
      </SheetHeader>
      <section className="flex flex-col gap-4 border-b p-6">
        <Field label="Their Google email" type="email" value={email} onChange={setEmail} required />
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="What they can do">
          {(
            [
              ['view', 'Can view', 'Look only'],
              ['edit', 'Can edit', 'Add, open, change'],
            ] as [Role, string, string][]
          ).map(([id, label, hint]) => (
            <button
              key={id}
              type="button"
              aria-pressed={role === id}
              onClick={() => setRole(id)}
              className={cn(
                'flex flex-col gap-0.5 rounded-md border p-3 text-left text-sm transition-colors',
                role === id ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/40',
              )}
            >
              {label}
              <span className={cn('text-xs', role === id ? 'text-background/70' : 'text-muted-foreground')}>{hint}</span>
            </button>
          ))}
        </div>
        <Button type="submit" className="h-11">
          Share
        </Button>
      </section>
      {people.length > 0 && (
        <section className="flex flex-col gap-3 p-6">
          <SectionTitle>Shared with</SectionTitle>
          <ul className="flex flex-col divide-y border-y text-sm">
            {people.map((p) => (
              <li key={p.email} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">
                  {p.email} <span className="text-muted-foreground">· {p.role}</span>
                </span>
                <button
                  type="button"
                  onClick={() => store.unshareCellar!(cellar.id, p.email)}
                  className="shrink-0 text-xs text-muted-foreground underline underline-offset-4"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </form>
  )
}

function CellarApp({ store, account }: { store: Store; account?: string }) {
  const { data, profile } = store
  const [view, setView] = useState<View>(SHARED_LINK ? 'sommelier' : 'cellar')
  const [layout, setLayout] = useState<Layout>('list')
  const [status, setStatus] = useState<WindowStatus | null>(null)
  // The cellars being looked at. None chosen means all of them.
  const [chosen, setChosen] = useState<string[]>([])
  const [panel, setPanel] = useState<Panel>(null)
  const title = profile.title?.trim() || DEFAULT_TITLE

  // The name saved on a phone's home screen is the page title when it is added.
  useEffect(() => {
    document.title = title.replace(/\b(\p{L})(\p{L}*)/gu, (_, a: string, b: string) => a + b.toLowerCase())
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', document.title)
  }, [title])

  // A chosen cellar that has since been deleted no longer counts.
  const shown = chosen.filter((id) => data.cellars.some((c) => c.id === id))
  const shownKey = shown.join(',')
  const inCellar = useMemo(() => {
    const ids = shownKey.split(',')
    return data.bottles.filter((b) => shownKey === '' || ids.includes(b.cellarId))
  }, [data.bottles, shownKey])
  const visible = useMemo(() => {
    const rank = (b: Bottle) => STATUS_ORDER.indexOf(drinkingWindow(b).status)
    const until = (b: Bottle) => drinkingWindow(b).dates?.drinkUntil ?? Infinity
    return inCellar
      .filter((b) => status === null || drinkingWindow(b).status === status)
      .sort((a, b) => rank(a) - rank(b) || until(a) - until(b))
  }, [inCellar, status])

  const editableCellars = data.cellars.filter((c) => store.canEdit(c.id))
  const myBottles = data.bottles.filter((b) => store.canEdit(b.cellarId))
  // Sharing and deleting act on one cellar, so they show when exactly one is chosen.
  const selected = shown.length === 1 ? data.cellars.find((c) => c.id === shown[0]) : undefined
  const selectedEditable = selected !== undefined && store.canEdit(selected.id)
  const toggle = (id: string) => setChosen(shown.includes(id) ? shown.filter((c) => c !== id) : [...shown, id])
  const cellarView = view === 'cellar'
  const detail = panel?.kind === 'detail' ? data.bottles.find((b) => b.id === panel.id) : undefined
  const sharing = panel?.kind === 'share' ? data.cellars.find((c) => c.id === panel.cellarId) : undefined
  const select = (b: Bottle) => setPanel({ kind: 'detail', id: b.id })

  const addCellar = () => {
    const name = window.prompt('Name of the new cellar')?.trim()
    if (name) store.addCellar(name)
  }
  const removeCellar = () => {
    const count = data.bottles.filter((b) => b.cellarId === selected!.id).length
    const others = (selected!.members?.length ?? 1) + (selected!.viewers?.length ?? 0) > 1
    const note = others ? ' It will disappear for everyone it is shared with.' : ''
    if (window.confirm(`Delete the cellar "${selected!.name}" and its ${count} wines? This cannot be undone.${note}`)) {
      store.deleteCellar(selected!.id)
    }
  }
  const rename = () => {
    const next = window.prompt('Name at the top of your app, for example CAVE MARIA', title)?.trim()
    if (next !== undefined) store.saveProfile({ ...profile, title: next.toUpperCase() })
  }

  return (
    <div className="min-h-dvh">
      <header>
        <div className="mx-auto grid h-24 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-5">
          <span aria-hidden="true" />
          <Brand title={title} />
          <div className="flex justify-end">
            <Button onClick={() => setPanel({ kind: 'form', bottle: null })}>
              <Plus aria-hidden="true" />
              <span className="hidden sm:inline">Add bottle</span>
              <span className="sr-only sm:hidden">Add bottle</span>
            </Button>
          </div>
        </div>
        <nav aria-label="Views" className="border-y">
          <div className="mx-auto flex max-w-6xl justify-center gap-5 overflow-x-auto px-5 sm:gap-8">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? 'page' : undefined}
                className={cn(
                  '-mb-px h-12 shrink-0 border-b-2 text-sm transition-colors',
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
        {store.error && (
          <p role="alert" className="text-center text-sm text-destructive">
            Problem {store.error}
          </p>
        )}

        {view === 'journal' && (
          <Journal
            journal={store.journal}
            bottles={myBottles}
            friendJournals={store.friendJournals}
            canShare={firebaseEnabled}
            onSave={store.saveJournal}
            onSelectBottle={(id) => setPanel({ kind: 'detail', id })}
          />
        )}

        {/* Sommelier and Palate draw on the person's own cellars, not on cellars friends share to look at. */}
        {view === 'sommelier' && (
          <Sommelier
            bottles={myBottles}
            rated={myBottles}
            journal={store.journal.entries}
            profile={profile}
            sharedLink={SHARED_LINK}
            onSelect={select}
          />
        )}

        {view === 'palate' && (
          <Palate
            profile={profile}
            bottles={myBottles}
            journal={store.journal.entries}
            onSave={store.saveProfile}
            onOpenJournal={() => setView('journal')}
          />
        )}

        {cellarView && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Cellars to show">
              <Chip active={shown.length === 0} onClick={() => setChosen([])}>
                All cellars
              </Chip>
              {data.cellars.map((c) => (
                <Chip key={c.id} active={shown.includes(c.id)} onClick={() => toggle(c.id)}>
                  {c.name}
                  {!store.canEdit(c.id) && <span className="text-[10px] uppercase tracking-wider opacity-60">view</span>}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
              <Button variant="ghost" className="h-8" onClick={addCellar}>
                New cellar
              </Button>
              {!data.cellars.some((c) => c.name === SHOWCASE_CELLAR) && (
                <Button variant="ghost" className="h-8" onClick={() => store.addCellar(SHOWCASE_CELLAR, showcaseBottles())}>
                  Add showcase wines
                </Button>
              )}
              {store.shareCellar && selectedEditable && (
                <Button variant="ghost" className="h-8" onClick={() => setPanel({ kind: 'share', cellarId: selected.id })}>
                  Share
                </Button>
              )}
              {selectedEditable && editableCellars.length > 1 && (
                <Button variant="danger" className="h-8" onClick={removeCellar}>
                  Delete cellar
                </Button>
              )}
            </div>
            {selected && !selectedEditable && (
              <p className="text-xs text-muted-foreground">Shared with you to look at. You cannot change it.</p>
            )}
          </div>
        )}

        {cellarView && <CellarSummary bottles={inCellar} activeStatus={status} onStatusChange={setStatus} />}

        {cellarView && status === null && <DontMiss bottles={inCellar} onSelect={select} />}

        <section aria-labelledby="bottles" className={cn('flex flex-col gap-5 border-t pt-8', !cellarView && 'hidden')}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="bottles" className="font-serif text-3xl font-light">
              {status ?? (layout === 'list' ? 'All wines' : 'Drinking timeline')}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {visible.length} {visible.length === 1 ? 'wine' : 'wines'}
              </span>
              <div className="flex gap-1" role="group" aria-label="Layout">
                {LAYOUTS.map((l) => (
                  <Chip key={l.id} active={layout === l.id} className="h-8" onClick={() => setLayout(l.id)}>
                    {l.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {layout === 'list' ? (
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
          <button type="button" onClick={rename} className="text-xs text-muted-foreground underline underline-offset-4">
            Change the name at the top
          </button>
          {account && <Account email={account} />}
        </div>
      </footer>

      <Sheet open={panel !== null} onClose={() => setPanel(null)}>
        {detail && (
          <WineDetail
            key={detail.id}
            bottle={detail}
            cellarName={data.cellars.find((c) => c.id === detail.cellarId)?.name ?? ''}
            readOnly={!store.canEdit(detail.cellarId)}
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
            cellars={editableCellars}
            defaultCellarId={shown.find((id) => store.canEdit(id)) ?? editableCellars[0].id}
            onSave={(bottle) => {
              store.putBottle(bottle)
              setStatus(null)
              setPanel({ kind: 'detail', id: bottle.id })
            }}
          />
        )}
        {sharing && <ShareForm cellar={sharing} account={account} store={store} />}
      </Sheet>
    </div>
  )
}
