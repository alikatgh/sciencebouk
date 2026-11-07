import type { ReactElement } from "react"
import { useEffect, useRef, useState } from "react"
import { getConceptCheck, type ConceptCheck as ConceptCheckContent } from "../../data/conceptChecks"
import { track } from "../../lib/analytics"

interface ConceptCheckProps {
  equationId: number
  onAnswer?: (index: number | null) => void
  resetKey?: string | number
  variant?: "practice" | "lesson"
}

/** A curated concept check, shared by optional practice and guided lessons. */
export function ConceptCheck({ equationId, onAnswer, resetKey, variant = "practice" }: ConceptCheckProps): ReactElement | null {
  const check = getConceptCheck(equationId)
  if (!check) return null

  return (
    <ConceptCheckQuestion
      key={JSON.stringify([equationId, resetKey])}
      equationId={equationId} check={check} onAnswer={onAnswer} variant={variant}
    />
  )
}

function ConceptCheckQuestion({ equationId, check, onAnswer, variant }: {
  equationId: number
  check: ConceptCheckContent
  onAnswer?: ConceptCheckProps["onAnswer"]
  variant: "practice" | "lesson"
}): ReactElement {
  const [selected, setSelected] = useState<number | null>(null)
  const firstOptionRef = useRef<HTMLButtonElement>(null)
  const retryRequestedRef = useRef(false)
  const answered = selected !== null
  const isRight = selected === check.correctIndex
  const revealAnswer = answered && (variant === "practice" || isRight)

  useEffect(() => {
    if (selected === null && retryRequestedRef.current) {
      retryRequestedRef.current = false
      firstOptionRef.current?.focus()
    }
  }, [selected])

  return (
    <div role="group" aria-label="Concept check" className="w-full">
      <p className="text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-200">{check.question}</p>

      <div className="mt-2.5 flex flex-col gap-1.5">
        {check.options.map((opt, i) => {
          const isCorrect = i === check.correctIndex
          const isChosen = i === selected
          let tone =
            "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          if (revealAnswer && isCorrect)
            tone = "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-300"
          else if (answered && isChosen) tone = "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
          else if (answered) tone = "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
          return (
            <button
              key={i}
              ref={i === 0 ? firstOptionRef : undefined}
              type="button"
              disabled={variant === "lesson" && answered}
              onClick={() => {
                setSelected(i)
                onAnswer?.(i)
                track("concept_check_answered", { equationId, correct: i === check.correctIndex })
              }}
              aria-pressed={isChosen}
              className={`min-h-11 rounded-lg border px-3 py-2 text-left text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${tone}`}
            >
              <span aria-hidden="true">{revealAnswer && isCorrect ? "✓ " : answered && isChosen ? "✗ " : ""}</span>
              {opt}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="mt-2.5">
          <p role="status" aria-live="polite" className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <span className={`font-semibold ${isRight ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
              {isRight ? "Correct. " : "Not quite. "}
            </span>
            {variant === "lesson" && !isRight
              ? "Look at how the variables change the visualization, then try another answer."
              : check.explanation}
          </p>
          {variant === "lesson" && !isRight && (
            <button
              type="button"
              className="mt-1 min-h-11 rounded px-1 text-xs font-medium text-ocean focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              onClick={() => { retryRequestedRef.current = true; setSelected(null); onAnswer?.(null) }}
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  )
}
