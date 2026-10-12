import { AXES, palateInWords } from '../lib/structure'
import type { PalateShape } from '../lib/structure'
import type { Structure } from '../types'

const SIZE = 320
const CENTER = SIZE / 2
const RADIUS = 104
const RINGS = [1, 2, 3, 4, 5]

// Axis i points outwards from the centre, starting at the top and going clockwise.
function point(i: number, value: number, pad = 0): [number, number] {
  const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2
  const r = (value / 5) * RADIUS + pad
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)]
}

const outline = (value: (i: number) => number) => AXES.map((_, i) => point(i, value(i)).join(',')).join(' ')
const shapeOf = (s: Structure) => outline((i) => s[AXES[i].key])

// The paladar graph: the average build of the wines liked, with the wines
// disliked drawn as a dashed outline for contrast.
export function PalateGraph({ shape }: { shape: PalateShape }) {
  const words = palateInWords(shape)

  return (
    <figure className="flex flex-col items-center gap-5">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-sm" role="img" aria-label="Palate graph">
        {RINGS.map((ring) => (
          <polygon key={ring} points={outline(() => ring)} className="fill-none stroke-border" strokeWidth={1} />
        ))}
        {AXES.map((axis, i) => {
          const [x, y] = point(i, 5)
          const [lx, ly] = point(i, 5, 22)
          return (
            <g key={axis.key}>
              <line x1={CENTER} y1={CENTER} x2={x} y2={y} className="stroke-border" strokeWidth={1} />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] uppercase tracking-[0.15em]"
              >
                {axis.label}
              </text>
            </g>
          )
        })}
        {shape.disliked && (
          <polygon
            points={shapeOf(shape.disliked)}
            className="fill-none stroke-muted-foreground"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}
        {shape.liked && (
          <>
            <polygon points={shapeOf(shape.liked)} className="fill-primary/25 stroke-primary" strokeWidth={2} />
            {AXES.map((axis, i) => {
              const [x, y] = point(i, shape.liked![axis.key])
              return <circle key={axis.key} cx={x} cy={y} r={3} className="fill-primary" />
            })}
          </>
        )}
      </svg>

      <figcaption className="flex flex-col items-center gap-3 text-center">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-2 w-5 border-2 border-primary bg-primary/25" aria-hidden="true" />
            Liked ({shape.likedCount})
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0 w-5 border-t-2 border-dashed border-muted-foreground" aria-hidden="true" />
            Disliked ({shape.dislikedCount})
          </span>
        </div>
        {words.length > 0 && (
          <ul className="flex flex-col gap-1 font-serif text-lg font-light leading-snug">
            {words.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </figcaption>
    </figure>
  )
}

// One wine's build as six short bars.
export function StructureBars({ structure }: { structure: Structure }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
      {AXES.map((axis) => (
        <div key={axis.key} className="flex flex-col gap-1.5">
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{axis.label}</dt>
          <dd className="flex gap-1" aria-label={`${structure[axis.key]} out of 5`}>
            {RINGS.map((n) => (
              <span key={n} className={n <= Math.round(structure[axis.key]) ? 'h-1.5 flex-1 bg-primary' : 'h-1.5 flex-1 bg-muted'} />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}
