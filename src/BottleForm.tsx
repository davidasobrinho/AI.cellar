import { useState } from 'react'
import { REGIONS, TIERS, WINE_TYPES } from './types'
import type { Bottle, Cellar } from './types'
import { newId } from './lib/store'

interface Props {
  bottle: Bottle | null
  cellars: Cellar[]
  defaultCellarId: string
  onSave: (bottle: Bottle) => void
  onCancel: () => void
}

const numberOrNull = (value: string): number | null => {
  const n = Number(value.replace(',', '.'))
  return value.trim() === '' || Number.isNaN(n) ? null : n
}

export function BottleForm({ bottle, cellars, defaultCellarId, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<Bottle>(
    () => bottle ?? {
      id: newId(),
      cellarId: defaultCellarId,
      producer: '',
      name: '',
      vintage: null,
      type: 'Red',
      region: 'Douro',
      tier: 'Everyday',
      quantity: 1,
      priceToday: null,
      pricePaid: null,
      location: '',
      notes: '',
      openings: [],
      addedAt: new Date().toISOString(),
    },
  )
  const set = <K extends keyof Bottle>(key: K, value: Bottle[K]) => setDraft({ ...draft, [key]: value })
  const isStill = draft.type === 'Red' || draft.type === 'White'

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(draft)
      }}
    >
      <h2>{bottle ? 'Edit bottle' : 'Add bottle'}</h2>
      <label>
        Wine name
        <input required value={draft.name} onChange={(e) => set('name', e.target.value)} />
      </label>
      <label>
        Producer
        <input value={draft.producer} onChange={(e) => set('producer', e.target.value)} />
      </label>
      <div className="row">
        <label>
          Vintage
          <input
            inputMode="numeric"
            placeholder="No vintage"
            value={draft.vintage ?? ''}
            onChange={(e) => set('vintage', numberOrNull(e.target.value))}
          />
        </label>
        <label>
          Bottles
          <input
            type="number"
            min={0}
            value={draft.quantity}
            onChange={(e) => set('quantity', Math.max(0, Number(e.target.value)))}
          />
        </label>
      </div>
      <div className="row">
        <label>
          Type
          <select value={draft.type} onChange={(e) => set('type', e.target.value as Bottle['type'])}>
            {WINE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Region
          <select value={draft.region} onChange={(e) => set('region', e.target.value as Bottle['region'])}>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>
      {isStill && (
        <label>
          Level
          <select value={draft.tier} onChange={(e) => set('tier', e.target.value as Bottle['tier'])}>
            {TIERS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      )}
      <div className="row">
        <label>
          Price today (€)
          <input
            inputMode="decimal"
            value={draft.priceToday ?? ''}
            onChange={(e) => set('priceToday', numberOrNull(e.target.value))}
          />
        </label>
        <label>
          Price paid (€)
          <input
            inputMode="decimal"
            value={draft.pricePaid ?? ''}
            onChange={(e) => set('pricePaid', numberOrNull(e.target.value))}
          />
        </label>
      </div>
      <div className="row">
        <label>
          Cellar
          <select value={draft.cellarId} onChange={(e) => set('cellarId', e.target.value)}>
            {cellars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Where in the cellar
          <input placeholder="Rack, shelf" value={draft.location} onChange={(e) => set('location', e.target.value)} />
        </label>
      </div>
      <label>
        Notes
        <textarea rows={2} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      <div className="actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary">
          Save
        </button>
      </div>
    </form>
  )
}
