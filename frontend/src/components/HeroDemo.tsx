import type { CSSProperties, ReactElement } from "react"
import { useId, useState } from "react"
import { RotateCw } from "lucide-react"
import { cn } from "../lib/utils"

// Keep every stop exact: these are integer Pythagorean triples.
const PRESETS = [
  { a: 3, b: 4, c: 5 },
  { a: 5, b: 12, c: 13 },
  { a: 8, b: 6, c: 10 },
  { a: 9, b: 12, c: 15 },
  { a: 20, b: 21, c: 29 },
]

interface HeroDemoProps {
  className?: string
}

export function HeroDemo({ className }: HeroDemoProps): ReactElement {
  const [idx, setIdx] = useState(0)
  const instanceId = useId()
  const sliderId = `hero-triangle-${instanceId}`
  const gridId = `hero-grid-${instanceId}`
  const { a, b, c } = PRESETS[idx]
  // The three attached squares have their true relative areas at every stop.
  const scale = Math.min(408 / (2 * a + b), 302 / (a + 2 * b))
  const originX = (480 - (2 * a + b) * scale) / 2 + a * scale
  const originY = (346 - (a + 2 * b) * scale) / 2 + b * scale
  const point = (x: number, y: number) => `${originX + x * scale},${originY + y * scale}`
  const label = (x: number, y: number) => ({ x: originX + x * scale, y: originY + y * scale })
  const aLabel = label(-a / 2, a / 2)
  const bLabel = label(b / 2, a + b / 2)
  const cLabel = label((a + b) / 2, (a - b) / 2)
  const corner = Math.min(a, b) * scale * 0.16

  return (
    <div className={cn("overflow-hidden rounded-[24px] border border-[var(--studio-line)] bg-[var(--studio-panel)]", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--studio-line)] px-5 py-4 sm:px-6">
        <span className="font-display text-sm font-bold text-ink dark:text-slate-100">Pythagoras, in motion</span>
        <span className="rounded-full bg-[#edf5f2] px-2.5 py-1 text-xs font-medium text-[#167c66] dark:bg-emerald-950/60 dark:text-emerald-300">Try it here</span>
      </div>
      <div className="relative bg-[#f8faff] dark:bg-[#101b30]">
        <svg viewBox="0 0 480 346" className="mx-auto block w-full" role="img" aria-label={`Right triangle with sides ${a}, ${b}, and ${c}; attached squares have areas ${a * a}, ${b * b}, and ${c * c}`}>
          <defs>
            <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r=".8" className="fill-[#cbd7ec] dark:fill-[#334561]" />
            </pattern>
          </defs>
          <rect width="480" height="346" fill={`url(#${gridId})`} />
          <g className="text-[#315cdd] dark:text-[#a9beff]">
            <polygon points={[point(-a, 0), point(0, 0), point(0, a), point(-a, a)].join(" ")} fill="currentColor" fillOpacity=".09" stroke="currentColor" strokeWidth="1.5" />
            <text {...aLabel} dy="-2" textAnchor="middle" fill="currentColor" className="font-display" fontSize="23" fontWeight="700">{a * a}</text>
            <text {...aLabel} dy="18" textAnchor="middle" fill="currentColor" fontSize="12">a²</text>
          </g>
          <g className="text-[#167c66] dark:text-[#77d9bd]">
            <polygon points={[point(0, a), point(b, a), point(b, a + b), point(0, a + b)].join(" ")} fill="currentColor" fillOpacity=".09" stroke="currentColor" strokeWidth="1.5" />
            <text {...bLabel} dy="-2" textAnchor="middle" fill="currentColor" className="font-display" fontSize="23" fontWeight="700">{b * b}</text>
            <text {...bLabel} dy="18" textAnchor="middle" fill="currentColor" fontSize="12">b²</text>
          </g>
          <g className="text-[#9c5534] dark:text-[#f1b18f]">
            <polygon points={[point(0, 0), point(b, a), point(a + b, a - b), point(a, -b)].join(" ")} fill="currentColor" fillOpacity=".09" stroke="currentColor" strokeWidth="1.5" />
            <text {...cLabel} dy="-2" textAnchor="middle" fill="currentColor" className="font-display" fontSize="23" fontWeight="700">{c * c}</text>
            <text {...cLabel} dy="18" textAnchor="middle" fill="currentColor" fontSize="12">c²</text>
          </g>
          <path d={`M ${point(0, 0)} L ${point(0, a)} L ${point(b, a)} Z`} className="fill-white stroke-ink dark:fill-[#17243b] dark:stroke-slate-200" strokeWidth="2.5" strokeLinejoin="round" />
          <path d={`M ${originX} ${originY + a * scale - corner} h ${corner} v ${corner}`} fill="none" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" />
          <text x={originX + 9} y={originY + a * scale / 2} className="fill-[#315cdd] dark:fill-[#a9beff]" fontSize="12" fontWeight="600">{a}</text>
          <text x={originX + b * scale / 2 + 5} y={originY + a * scale / 2 - 10} textAnchor="middle" className="fill-[#9c5534] dark:fill-[#f1b18f]" fontSize="12" fontWeight="600">{c}</text>
          <text x={originX + b * scale / 2} y={originY + a * scale - 9} textAnchor="middle" className="fill-[#167c66] dark:fill-[#77d9bd]" fontSize="12" fontWeight="600">{b}</text>
        </svg>
      </div>
      <div className="border-t border-[var(--studio-line)] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            <span className="text-[#315cdd] dark:text-[#a9beff]">a²</span> + <span className="text-[#167c66] dark:text-[#77d9bd]">b²</span> = <span className="text-[#9c5534] dark:text-[#f1b18f]">c²</span>
          </p>
          <output htmlFor={sliderId} aria-label="Squared side lengths" className="text-sm font-medium tabular-nums text-slate-600 dark:text-slate-300">{a * a} + {b * b} = {c * c}</output>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">The two smaller squares add up to the larger one.</p>
        <div className="mt-4 flex items-center gap-5">
          <div className="min-w-0 flex-1">
            <label htmlFor={sliderId} className="mb-2 flex items-center justify-between gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <span>Change the triangle</span><span aria-hidden="true" className="tabular-nums text-slate-500 dark:text-slate-400">{idx + 1} / {PRESETS.length}</span>
            </label>
            <input id={sliderId} type="range" min={0} max={PRESETS.length - 1} step={1} value={idx} onChange={(event) => setIdx(Number(event.target.value))} aria-valuetext={`Sides ${a}, ${b}, and ${c}`} className="science-slider block h-6 w-full cursor-pointer" style={{ "--slider-progress": `${idx / (PRESETS.length - 1) * 100}%` } as CSSProperties} />
          </div>
          <button type="button" onClick={() => setIdx((current) => (current + 1) % PRESETS.length)} aria-label="Next triangle" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--studio-line)] text-slate-500 hover:border-ocean hover:text-ocean dark:text-slate-300 dark:hover:text-[#a9beff]">
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
