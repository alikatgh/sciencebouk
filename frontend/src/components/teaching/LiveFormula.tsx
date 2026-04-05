import type { ReactElement } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
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

  // After KaTeX renders, attach click handlers to colored number spans
  useEffect(() => {
    const el = liveRef.current
    if (!el || !variables || !onVariableChange) return

    // Find all colored spans in the rendered KaTeX
    const coloredSpans = el.querySelectorAll<HTMLSpanElement>('span.mord[style*="color"]')
    coloredSpans.forEach((span) => {
      const color = span.style.color
      if (!color) return

      // Match color to variable
      const matchedVar = variables.find((v) => {
        const varColor = v.color.toLowerCase()
        // Compare rgb values
        const temp = document.createElement("div")
        temp.style.color = varColor
        document.body.appendChild(temp)
        const computed = getComputedStyle(temp).color
        document.body.removeChild(temp)
        return computed === color || varColor === color
      })

      if (matchedVar && !matchedVar.constant && !matchedVar.locked) {
        span.style.cursor = "pointer"
        span.style.borderBottom = `1.5px dashed ${matchedVar.color}`
        span.style.paddingBottom = "1px"
        span.title = `Click to edit ${matchedVar.symbol}`

        span.onclick = (e) => {
          e.stopPropagation()
          const rect = span.getBoundingClientRect()
          const parentRect = el.getBoundingClientRect()
          setEditing({
            varName: matchedVar.name,
            color: matchedVar.color,
            rect: new DOMRect(rect.left - parentRect.left, rect.top - parentRect.top, rect.width, rect.height),
          })
          setInputValue(String(matchedVar.value))
        }
      }
    })
  }, [liveFormula, variables, onVariableChange])

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

  return (
    <div className="relative space-y-1">
      {/* Letter formula */}
      <div className="overflow-x-auto text-xs text-slate-400 dark:text-slate-500">
        <InlineMath math={letterFormula} />
      </div>
      {/* Live formula — numbers are clickable */}
      <div ref={liveRef} className="overflow-x-auto text-base text-slate-800 dark:text-slate-200">
        <InlineMath math={liveFormula} />
      </div>
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
            className="w-20 rounded border-2 bg-white px-1.5 py-0.5 font-mono text-sm font-bold shadow-lg outline-none dark:bg-slate-700"
            style={{ borderColor: editing.color, color: editing.color }}
            autoFocus
          />
        </div>
      )}
      {/* Result */}
      {resultLine && (
        <div className="overflow-x-auto text-sm font-bold text-slate-700 dark:text-slate-300">
          <InlineMath math={resultLine} />
        </div>
      )}
      {/* Note */}
      {resultNote && (
        <p className="text-[10px] leading-tight text-slate-400 dark:text-slate-500">
          {resultNote}
        </p>
      )}
    </div>
  )
}
