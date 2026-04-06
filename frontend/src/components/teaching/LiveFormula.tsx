import type { ReactElement } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "katex/dist/katex.min.css"
import { InlineMath } from "react-katex"
import type { Variable } from "./types"

interface LiveFormulaProps {
  letterFormula: string
  liveFormula: string
  resultLine?: string
  resultNote?: string
  variables?: Variable[]
  onVariableChange?: (name: string, value: number) => void
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

export function LiveFormula({ letterFormula, liveFormula, resultLine, resultNote, variables, onVariableChange }: LiveFormulaProps): ReactElement {
  const liveRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState<{ varName: string; color: string; rect: DOMRect } | null>(null)
  const [inputValue, setInputValue] = useState("")

  const colorLookup = useMemo(() => {
    return new Map((variables ?? []).map((variable) => [variable.color.toLowerCase(), variable]))
  }, [variables])

  // Click handler for colored spans inside KaTeX-rendered live formula
  useEffect(() => {
    const container = liveRef.current
    if (!container || !variables || !onVariableChange) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // KaTeX renders \color{} as <span style="color: ...">
      const colorEl = target.closest<HTMLElement>("[style*='color']")
      if (!colorEl) return

      const style = colorEl.style.color
      if (!style) return

      // Normalize color to hex for lookup
      const normalized = normalizeColor(style)
      const matchedVar = colorLookup.get(normalized)
      if (!matchedVar || matchedVar.constant || matchedVar.locked) return

      const parentRect = container.getBoundingClientRect()
      const rect = colorEl.getBoundingClientRect()
      setEditing({
        varName: matchedVar.name,
        color: matchedVar.color,
        rect: new DOMRect(rect.left - parentRect.left, rect.top - parentRect.top, rect.width, rect.height),
      })
      setInputValue(String(matchedVar.value))
    }

    container.addEventListener("click", handleClick)
    return () => container.removeEventListener("click", handleClick)
  }, [variables, onVariableChange, colorLookup])

  // Add cursor pointer to colored spans
  useEffect(() => {
    const container = liveRef.current
    if (!container || !variables || !onVariableChange) return

    const coloredSpans = container.querySelectorAll<HTMLElement>("[style*='color']")
    for (const span of coloredSpans) {
      const normalized = normalizeColor(span.style.color)
      const matchedVar = colorLookup.get(normalized)
      if (matchedVar && !matchedVar.constant && !matchedVar.locked) {
        span.style.cursor = "pointer"
        span.style.borderBottom = "1px dashed currentColor"
      }
    }
  }, [liveFormula, variables, onVariableChange, colorLookup])

  const handleSubmit = useCallback(() => {
    if (!editing || !variables || !onVariableChange) return
    const v = variables.find((vr) => vr.name === editing.varName)
    if (!v) return
    const num = Number(inputValue)
    if (!isNaN(num)) {
      onVariableChange(v.name, clamp(num, v.min, v.max))
    }
    setEditing(null)
  }, [editing, inputValue, variables, onVariableChange])

  const hasInteractiveVars = (variables ?? []).some((v) => !v.constant && !v.locked)

  return (
    <div className="relative space-y-2">
      {/* Letter formula — secondary label when live exists, hero when alone */}
      {letterFormula && (
        <div className={`overflow-x-auto ${
          liveFormula
            ? "text-sm text-slate-700 dark:text-slate-200"
            : "text-center text-2xl text-slate-900 dark:text-slate-50"
        }`}>
          <InlineMath math={letterFormula} />
        </div>
      )}
      {/* Live formula — always the hero: big, centered, display-math style */}
      {liveFormula && (
        <div ref={liveRef} className="overflow-x-auto text-center text-2xl text-slate-900 dark:text-slate-50">
          <InlineMath math={liveFormula} />
        </div>
      )}
      {/* Interactive hint */}
      {hasInteractiveVars && liveFormula && (
        <p className="text-center text-[9px] text-slate-400 dark:text-slate-500">
          tap colored values to edit
        </p>
      )}
      {/* Inline edit overlay */}
      {editing && (
        <div
          className="absolute z-10"
          style={{ left: editing.rect.left - 4, top: editing.rect.top - 2 }}
        >
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit()
              if (e.key === "Escape") setEditing(null)
            }}
            className="w-20 rounded border-2 bg-white px-1.5 py-0.5 font-mono text-sm font-bold shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ocean dark:bg-slate-700"
            style={{ borderColor: editing.color, color: editing.color }}
            aria-label="Edit variable value"
            autoFocus
          />
        </div>
      )}
      {/* Result */}
      {resultLine && (
        <div className="overflow-x-auto text-center text-sm text-slate-600 dark:text-slate-400">
          <InlineMath math={resultLine} />
        </div>
      )}
      {/* Note */}
      {resultNote && (
        <p className="text-center text-xs leading-tight text-slate-400 dark:text-slate-500">
          {resultNote}
        </p>
      )}
    </div>
  )
}

/** Normalize CSS color (rgb/hex) to lowercase hex for map lookup */
function normalizeColor(cssColor: string): string {
  const rgb = cssColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgb) {
    const r = Number(rgb[1]).toString(16).padStart(2, "0")
    const g = Number(rgb[2]).toString(16).padStart(2, "0")
    const b = Number(rgb[3]).toString(16).padStart(2, "0")
    return `#${r}${g}${b}`
  }
  return cssColor.toLowerCase()
}
