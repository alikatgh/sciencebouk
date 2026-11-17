import type { MouseEvent, ReactElement } from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { FormulaText } from "../math/FormulaText"
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

  const handleColorTokenClick = useCallback(({ color, event }: { color: string; event: MouseEvent<HTMLElement> }) => {
    if (!variables || !onVariableChange) return

    const matchedVar = colorLookup.get(color.toLowerCase())
    if (!matchedVar || matchedVar.constant || matchedVar.locked) return

    const parentRect = liveRef.current?.getBoundingClientRect()
    if (!parentRect) return

    const rect = event.currentTarget.getBoundingClientRect()
    setEditing({
      varName: matchedVar.name,
      color: matchedVar.color,
      rect: new DOMRect(rect.left - parentRect.left, rect.top - parentRect.top, rect.width, rect.height),
    })
    setInputValue(String(matchedVar.value))
  }, [colorLookup, onVariableChange, variables])

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
        <FormulaText math={letterFormula} className="font-mono tabular-nums" />
      </div>
      {/* Live formula — numbers are clickable */}
      <div ref={liveRef} className="overflow-x-auto text-base text-slate-800 dark:text-slate-200">
        <FormulaText
          math={liveFormula}
          className="font-mono tabular-nums"
          colorTokenClassName="border-b border-dashed"
          onColorTokenClick={handleColorTokenClick}
        />
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
          <FormulaText math={resultLine} className="font-mono tabular-nums" />
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
