import type { ReactElement } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Slider } from "../ui/slider"
import { Input } from "../ui/input"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../ui/tooltip"
import type { Variable } from "./types"

interface TouchableFormulaProps {
  variables: Variable[]
  onVariableChange: (name: string, value: number) => void
  highlightedVariable?: string | null
  onVariableHover?: (name: string | null) => void
  formula: string
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

function formatValue(value: number, step: number): string {
  if (step >= 1) return value.toFixed(0)
  if (step >= 0.1) return value.toFixed(1)
  if (step >= 0.01) return value.toFixed(2)
  return value.toFixed(3)
}

interface SliderRowProps {
  variable: Variable
  isHighlighted: boolean
  onChange: (name: string, value: number) => void
  onHover: (name: string | null) => void
}

function SliderRow({ variable, isHighlighted, onChange, onHover }: SliderRowProps): ReactElement {
  const isDisabled = variable.constant || variable.locked
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(() => formatValue(variable.value, variable.step))
  const inputRef = useRef<HTMLInputElement>(null)
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelEditRef = useRef(false)

  // Re-initialise the controlled input value from the prop whenever it changes externally.
  // Only apply when NOT editing — if the user is actively typing we must not clobber their input.
  useEffect(() => {
    if (!editing) {
      setInputValue(formatValue(variable.value, variable.step))
    }
  }, [variable.value, variable.step, editing])

  useEffect(() => () => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current)
      focusTimerRef.current = null
    }
  }, [])

  const handleValueClick = useCallback(() => {
    if (isDisabled) return
    setInputValue(formatValue(variable.value, variable.step))
    setEditing(true)
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current)
    }
    focusTimerRef.current = setTimeout(() => {
      inputRef.current?.select()
      focusTimerRef.current = null
    }, 10)
  }, [isDisabled, variable.value, variable.step])

  const handleValueSubmit = useCallback(() => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false
      setInputValue(formatValue(variable.value, variable.step))
      setEditing(false)
      return
    }
    const val = Number(inputValue)
    if (!isNaN(val)) onChange(variable.name, clamp(val, variable.min, variable.max))
    setEditing(false)
  }, [inputValue, variable, onChange])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`rounded-lg px-2.5 py-2 transition-colors [@media(pointer:coarse)]:rounded-xl [@media(pointer:coarse)]:px-3 [@media(pointer:coarse)]:py-3 ${isHighlighted ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          onPointerEnter={() => onHover(variable.name)}
          onPointerLeave={() => onHover(null)}
          style={{ opacity: variable.locked ? 0.4 : 1 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: variable.color }}>
              {variable.symbol}
            </span>
            {editing ? (
              <Input
                ref={inputRef}
                type="number"
                value={inputValue}
                min={variable.min} max={variable.max} step={variable.step}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleValueSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleValueSubmit()
                  if (e.key === "Escape") {
                    cancelEditRef.current = true
                    setEditing(false)
                  }
                }}
                className="h-6 w-20 text-right font-mono text-sm font-bold [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-24"
                style={{ color: variable.color }}
                autoFocus
              />
            ) : (
              <button
                onClick={handleValueClick}
                className={`rounded px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums transition [@media(pointer:coarse)]:min-h-[36px] [@media(pointer:coarse)]:px-2.5 ${
                  isDisabled ? "cursor-default" : "cursor-text hover:bg-slate-100 dark:hover:bg-slate-600"
                }`}
                style={{ color: variable.color }}
                type="button"
              >
                {formatValue(variable.value, variable.step)}
                {variable.unit ? ` ${variable.unit}` : ""}
              </button>
            )}
          </div>
          {!isDisabled && (
            <Slider
              className="mt-1.5 [@media(pointer:coarse)]:mt-2"
              min={variable.min}
              max={variable.max}
              step={variable.step}
              value={[variable.value]}
              onValueChange={([v]) => onChange(variable.name, v)}
              trackColor={variable.color}
              aria-label={`${variable.description ?? variable.symbol}: ${variable.value}`}
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>{variable.description}</p>
        {!isDisabled && <p className="text-white/60">Click number to type exact value</p>}
        {variable.locked && <p className="text-amber-300">Locked in this lesson step</p>}
      </TooltipContent>
    </Tooltip>
  )
}

export function TouchableFormula({
  variables,
  onVariableChange,
  highlightedVariable,
  onVariableHover,
}: TouchableFormulaProps): ReactElement {
  const interactiveVars = variables.filter((v) => !v.constant)
  if (interactiveVars.length === 0) return <div />

  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-0.5" role="group" aria-label="Variable controls">
        {interactiveVars.map((v) => (
          <SliderRow
            key={v.name}
            variable={v}
            isHighlighted={highlightedVariable === v.name}
            onChange={onVariableChange}
            onHover={onVariableHover ?? (() => {})}
          />
        ))}
      </div>
    </TooltipProvider>
  )
}
