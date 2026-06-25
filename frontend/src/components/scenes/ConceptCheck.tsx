import type { ReactElement } from "react"
import { useState } from "react"
import { getConceptCheck } from "../../data/conceptChecks"
import { track } from "../../lib/analytics"

/**
 * A one-question concept check for the data-driven subject scenes: tests
 * *understanding* of the relationship the sliders demonstrate, then reveals an
 * explanation. Self-contained and answer-state-owning; renders nothing when the
 * equation has no curated check. The parent keys the scene subtree by equation
 * id, so the answer state resets automatically on navigation.
 */
export function ConceptCheck({ equationId }: { equationId: number }): ReactElement | null {
  const check = getConceptCheck(equationId)
  const [selected, setSelected] = useState<number | null>(null)
  if (!check) return null

  const answered = selected !== null
  const isRight = selected === check.correctIndex

  return (
    <div role="group" aria-label="Concept check" className="w-full">
      <p className="text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-200">{check.question}</p>

      <div className="mt-2.5 flex flex-col gap-1.5">
        {check.options.map((opt, i) => {
          const isCorrect = i === check.correctIndex
          const isChosen = i === selected
          let tone =
            "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          if (answered && isCorrect)
            tone = "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-300"
          else if (answered && isChosen) tone = "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
          else if (answered) tone = "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelected(i)
                track("concept_check_answered", { equationId, correct: i === check.correctIndex })
              }}
              aria-pressed={isChosen}
              className={`rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition ${tone}`}
            >
              <span aria-hidden="true">{answered && isCorrect ? "✓ " : answered && isChosen ? "✗ " : ""}</span>
              {opt}
            </button>
          )
        })}
      </div>

      {answered && (
        <p
          role="status"
          aria-live="polite"
          className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-900/50 dark:text-slate-300"
        >
          <span className={`font-semibold ${isRight ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {isRight ? "Correct. " : "Not quite. "}
          </span>
          {check.explanation}
        </p>
      )}
    </div>
  )
}
