import type { ReactElement } from "react"
import { useState } from "react"
import { RotateCw } from "lucide-react"
import { cn } from "../lib/utils"

// Every example is an exact Pythagorean triple.
const PRESETS = [
  { a: 3, b: 4 },
  { a: 5, b: 12 },
  { a: 8, b: 6 },
  { a: 9, b: 12 },
  { a: 20, b: 21 },
]

interface HeroDemoProps {
  className?: string
}

export function HeroDemo({ className }: HeroDemoProps): ReactElement {
  const [idx, setIdx] = useState(0)
  const { a, b } = PRESETS[idx]
  const c = Math.round(Math.sqrt(a * a + b * b))
  const scale = 164 / Math.max(a, b)
  const width = b * scale
  const height = a * scale
  const left = (320 - width) / 2
  const bottom = 195
  const top = bottom - height

  return (
    <div className={cn("overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <span className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">Pythagoras, in motion</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">a² + b² = c²</span>
      </div>
      <div className="relative bg-[#f8faff] px-3 dark:bg-slate-950/40">
        <svg viewBox="0 0 320 240" className="mx-auto h-[240px] w-full max-w-[420px]" role="img" aria-label={`Right triangle with sides ${a}, ${b}, and ${c}`}>
          <defs>
            <pattern id="hero-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#d8e1f1" />
            </pattern>
          </defs>
          <rect width="320" height="240" fill="url(#hero-dot-grid)" />
          <path d={`M ${left} ${top} L ${left} ${bottom} L ${left + width} ${bottom} Z`} fill="#315cdd" fillOpacity="0.07" />
          <path d={`M ${left} ${bottom - 14} h 14 v 14`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          <path d={`M ${left} ${top} V ${bottom}`} stroke="#315cdd" strokeWidth="4" strokeLinecap="round" />
          <path d={`M ${left} ${bottom} H ${left + width}`} stroke="#167c66" strokeWidth="4" strokeLinecap="round" />
          <path d={`M ${left} ${top} L ${left + width} ${bottom}`} stroke="#b85e30" strokeWidth="4" strokeLinecap="round" />
          <text x={left - 15} y={(top + bottom) / 2 + 5} textAnchor="end" fill="#315cdd" fontSize="17" fontWeight="600">{a}</text>
          <text x={left + width / 2} y={bottom + 28} textAnchor="middle" fill="#167c66" fontSize="17" fontWeight="600">{b}</text>
          <text x={left + width / 2 + 16} y={(top + bottom) / 2 - 12} textAnchor="start" fill="#b85e30" fontSize="17" fontWeight="600">{c}</text>
          {[{ x: left, y: top }, { x: left, y: bottom }, { x: left + width, y: bottom }].map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="5" fill="white" stroke="#17213a" strokeWidth="2" />
          ))}
        </svg>
      </div>
      <div className="border-t border-slate-100 px-5 py-5 dark:border-slate-800">
        <p className="text-center font-display text-2xl font-bold text-slate-800 dark:text-slate-100" aria-live="polite" aria-atomic="true">
          <span className="text-ocean">{a}²</span> + <span className="text-emerald-700 dark:text-emerald-400">{b}²</span> = <span className="text-[#b85e30] dark:text-orange-300">{c}²</span>
        </p>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">{a * a} + {b * b} = {c * c}</p>
        <div className="mt-5 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <label htmlFor="hero-triangle" className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Change the triangle</label>
            <input id="hero-triangle" type="range" min={0} max={PRESETS.length - 1} step={1} value={idx} onChange={(event) => setIdx(Number(event.target.value))} aria-valuetext={`Sides ${a}, ${b}, and ${c}`} className="block h-6 w-full cursor-pointer accent-ocean" />
          </div>
          <button type="button" onClick={() => setIdx((current) => (current + 1) % PRESETS.length)} aria-label="Click to cycle through examples" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-ocean hover:text-ocean dark:border-slate-700 dark:text-slate-300">
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
