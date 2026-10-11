import { useEffect, useMemo, useState } from 'react'
import { BottleForm } from './BottleForm'
import { BAND_LABELS, cellarValue, euros, priceBand } from './lib/price'
import { loadData, newId, saveData } from './lib/store'
import { drinkingWindow, openTonight } from './lib/windows'
import type { WindowStatus } from './lib/windows'
import { RATINGS } from './types'
import type { Bottle, CellarData, Rating } from './types'

type View = { name: 'list' } | { name: 'form'; bottle: Bottle | null } | { name: 'detail'; id: string }

const ALL = 'all'

function Sticker({ price }: { price: number | null }) {
  const band = priceBand(price)
  return <span className={`sticker ${band ?? 'none'}`} title={band ? BAND_LABELS[band] : 'No price yet'} />
}

function Status({ status }: { status: WindowStatus }) {
  return <span className={`status s-${status.replace(/ /g, '-').toLowerCase()}`}>{status}</span>
}

function title(b: Bottle) {
  return [b.producer, b.name, b.vintage].filter(Boolean).join(' ')
}

export default function App() {
  const [data, setData] = useState<CellarData>(loadData)
  const [view, setView] = useState<View>({ name: 'list' })
  const [tab, setTab] = useState<'cellar' | 'tonight'>('cellar')
  const [cellarId, setCellarId] = useState(ALL)
  const [search, setSearch] = useState('')

  useEffect(() => saveData(data), [data])

  const inCellar = useMemo(
    () => data.bottles.filter((b) => cellarId === ALL || b.cellarId === cellarId),
    [data.bottles, cellarId],
  )
  const value = cellarValue(inCellar)
  const visible = (tab === 'tonight' ? openTonight(inCellar) : inCellar).filter((b) =>
    title(b).toLowerCase().includes(search.toLowerCase()),
  )

  const putBottle = (bottle: Bottle) => {
    const exists = data.bottles.some((b) => b.id === bottle.id)
    setData({
      ...data,
      bottles: exists ? data.bottles.map((b) => (b.id === bottle.id ? bottle : b)) : [...data.bottles, bottle],
    })
  }

  const addCellar = () => {
    const name = window.prompt('Name of the new cellar')?.trim()
    if (!name) return
    const cellar = { id: newId(), name }
    setData({ ...data, cellars: [...data.cellars, cellar] })
    setCellarId(cellar.id)
  }

  if (view.name === 'form') {
    return (
      <main>
        <BottleForm
          bottle={view.bottle}
          cellars={data.cellars}
          defaultCellarId={cellarId === ALL ? data.cellars[0].id : cellarId}
          onSave={(bottle) => {
            putBottle(bottle)
            setView({ name: 'list' })
          }}
          onCancel={() => setView({ name: 'list' })}
        />
      </main>
    )
  }

  const detail = view.name === 'detail' ? data.bottles.find((b) => b.id === view.id) : undefined
  if (detail) {
    return (
      <main>
        <BottleDetail
          bottle={detail}
          cellarName={data.cellars.find((c) => c.id === detail.cellarId)?.name ?? ''}
          onBack={() => setView({ name: 'list' })}
          onEdit={() => setView({ name: 'form', bottle: detail })}
          onChange={putBottle}
          onDelete={() => {
            setData({ ...data, bottles: data.bottles.filter((b) => b.id !== detail.id) })
            setView({ name: 'list' })
          }}
        />
      </main>
    )
  }

  return (
    <main>
      <header>
        <h1>Private Sommelier</h1>
        <div className="row">
          <select value={cellarId} onChange={(e) => setCellarId(e.target.value)} aria-label="Cellar">
            <option value={ALL}>All cellars</option>
            {data.cellars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button onClick={addCellar}>New cellar</button>
        </div>
      </header>

      <section className="summary">
        <div>
          <strong>{value.bottles}</strong>
          <span>bottles</span>
        </div>
        <div>
          <strong>{euros(value.total)}</strong>
          <span>
            value today
            {value.pricedBottles < value.bottles && `, ${value.bottles - value.pricedBottles} without price`}
          </span>
        </div>
        <div>
          <strong>{value.average === null ? '–' : euros(value.average)}</strong>
          <span>average bottle</span>
        </div>
      </section>

      <nav className="tabs">
        <button className={tab === 'cellar' ? 'active' : ''} onClick={() => setTab('cellar')}>
          Cellar
        </button>
        <button className={tab === 'tonight' ? 'active' : ''} onClick={() => setTab('tonight')}>
          Open tonight
        </button>
      </nav>

      <input type="search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />

      <ul className="bottles">
        {visible.map((b) => (
          <li key={b.id} onClick={() => setView({ name: 'detail', id: b.id })}>
            <Sticker price={b.priceToday} />
            <div className="grow">
              <div className="name">{title(b)}</div>
              <div className="meta">
                {b.type} · {b.region} · {b.quantity} {b.quantity === 1 ? 'bottle' : 'bottles'}
              </div>
            </div>
            <Status status={drinkingWindow(b).status} />
          </li>
        ))}
      </ul>
      {visible.length === 0 && (
        <p className="empty">
          {tab === 'tonight' ? 'Nothing is ready to open yet.' : 'No bottles yet. Add your first one.'}
        </p>
      )}

      <button className="primary add" onClick={() => setView({ name: 'form', bottle: null })}>
        Add bottle
      </button>
    </main>
  )
}

interface DetailProps {
  bottle: Bottle
  cellarName: string
  onBack: () => void
  onEdit: () => void
  onChange: (bottle: Bottle) => void
  onDelete: () => void
}

function BottleDetail({ bottle, cellarName, onBack, onEdit, onChange, onDelete }: DetailProps) {
  const [rating, setRating] = useState<Rating | null>(null)
  const [note, setNote] = useState('')
  const w = drinkingWindow(bottle)
  const band = priceBand(bottle.priceToday)

  const open = () => {
    onChange({
      ...bottle,
      quantity: bottle.quantity - 1,
      openings: [{ date: new Date().toISOString(), rating, note }, ...bottle.openings],
    })
    setRating(null)
    setNote('')
  }

  const undo = () => onChange({ ...bottle, quantity: bottle.quantity + 1, openings: bottle.openings.slice(1) })

  return (
    <article className="detail">
      <button onClick={onBack}>Back</button>
      <h2>{title(bottle)}</h2>
      <p className="meta">
        {bottle.type} · {bottle.region}
        {(bottle.type === 'Red' || bottle.type === 'White') && ` · ${bottle.tier}`}
      </p>

      <section className="card">
        <Status status={w.status} />
        <p>{w.advice}</p>
        {w.drinkFrom !== null && (
          <p className="meta">
            Drink {w.drinkFrom} to {w.drinkUntil}, best {w.peakFrom} to {w.peakUntil}. Confidence:{' '}
            {w.confidence?.toLowerCase()}.
          </p>
        )}
        <p className="meta">An estimate from the style of the wine. It assumes good storage.</p>
      </section>

      <section className="card">
        <p>
          <Sticker price={bottle.priceToday} />{' '}
          {band === null ? 'No price yet' : `${euros(bottle.priceToday!)} today · ${BAND_LABELS[band]}`}
        </p>
        {bottle.pricePaid !== null && <p className="meta">Paid {euros(bottle.pricePaid)}</p>}
        <p className="meta">
          {bottle.quantity} in {cellarName}
          {bottle.location && `, ${bottle.location}`}
        </p>
        {bottle.notes && <p>{bottle.notes}</p>}
      </section>

      <section className="card">
        <h3>Open a bottle</h3>
        <div className="ratings">
          {RATINGS.map((r) => (
            <button key={r} className={rating === r ? 'active' : ''} onClick={() => setRating(rating === r ? null : r)}>
              {r}
            </button>
          ))}
        </div>
        <input placeholder="Occasion, food, what you thought" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="primary" disabled={bottle.quantity === 0} onClick={open}>
          Mark one as opened
        </button>
      </section>

      {bottle.openings.length > 0 && (
        <section className="card">
          <h3>Opened</h3>
          <ul className="openings">
            {bottle.openings.map((o, i) => (
              <li key={o.date}>
                {new Date(o.date).toLocaleDateString('en-GB')}
                {o.rating && ` · ${o.rating}`}
                {o.note && ` · ${o.note}`}
                {i === 0 && (
                  <button className="link" onClick={undo}>
                    Undo
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="actions">
        <button
          className="danger"
          onClick={() => window.confirm(`Remove ${title(bottle)} from the cellar?`) && onDelete()}
        >
          Remove
        </button>
        <button onClick={onEdit}>Edit</button>
      </div>
    </article>
  )
}
