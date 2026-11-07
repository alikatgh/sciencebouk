import type { ReactElement, ReactNode } from "react"
import { useEffect, useId, useState } from "react"
import { ChevronDown } from "lucide-react"
import { DeferredInlineMath } from "../math/DeferredInlineMath"
import { Button } from "../ui/button"
import type { ExperimentSnapshot, Variable } from "./types"

interface ExperimentBenchProps {
  variables: Variable[]
  snapshot: ExperimentSnapshot | null
  currentResult?: string
  currentResultNote?: string
  onCapture: () => void
  onRestore: () => void
  onClear: () => void
  restoreDisabledReason?: string
  children?: ReactNode
  resetKey: string | number
}

function formatValue(value: number | undefined): string {
  return value !== undefined && Number.isFinite(value) ? String(value) : "Unavailable"
}

function hasResult(result: string | undefined): result is string {
  return Boolean(result?.trim())
}

export function ExperimentBench({
  variables, snapshot, currentResult, currentResultNote, onCapture, onRestore, onClear,
  restoreDisabledReason, children, resetKey,
}: ExperimentBenchProps): ReactElement {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const titleId = useId()
  const subtitleId = useId()
  const restoreReasonId = useId()

  useEffect(() => {
    setExpanded(false)
  }, [resetKey])

  const comparableVariables = snapshot ? variables.filter((variable) => {
    const baseline = snapshot.values[variable.name]
    return Number.isFinite(baseline) && Number.isFinite(variable.value)
  }) : []
  const changedCount = snapshot ? comparableVariables.filter((variable) => snapshot.values[variable.name] !== variable.value).length : 0
  const resultNote = currentResultNote ?? snapshot?.resultNote

  return (
    <section className="min-w-0 border-t border-slate-200 pt-2 dark:border-slate-700">
      <Button
        type="button"
        variant="ghost"
        className="h-auto min-h-11 w-full justify-between gap-3 px-1 py-2 text-left text-slate-800 dark:text-slate-100"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="min-w-0 whitespace-normal">
          <span id={titleId} className="block text-sm font-medium">Experiment bench</span>
          <span id={subtitleId} className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">
            {children ? "Predict a change, then test and compare." : "Save values, then compare a change."}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </Button>

      {expanded && (
        <div id={panelId} className="min-w-0 space-y-3 pt-2">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Save the values, change one input in the scene, then compare what happens.
          </p>
          <Button type="button" variant="outline" className="min-h-11 px-3" onClick={onCapture}>
            {snapshot ? "Replace baseline" : "Capture baseline"}
          </Button>

          {snapshot ? (
            <>
              <p className="text-xs text-slate-600 dark:text-slate-300" role="status">
                {comparableVariables.length === 0 ? "No comparable values are available."
                  : changedCount > 0 ? `${changedCount} ${changedCount === 1 ? "value has" : "values have"} changed.`
                    : comparableVariables.length === variables.length ? "Values match the baseline." : "Available values match the baseline."}
              </p>
              <table className="w-full table-fixed text-sm">
                <caption className="sr-only">Baseline and current values</caption>
                <colgroup><col className="w-[40%]" /><col className="w-[30%]" /><col className="w-[30%]" /></colgroup>
                <thead className="text-xs text-slate-500 dark:text-slate-400">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th scope="col" className="pb-2 pr-2 text-left font-medium">Variable</th>
                    <th scope="col" className="pb-2 pr-2 text-right font-medium">Baseline</th>
                    <th scope="col" className="pb-2 text-right font-medium">Current</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 dark:divide-slate-800 dark:text-slate-100">
                  {variables.map((variable) => {
                    const baseline = snapshot.values[variable.name]
                    const comparable = Number.isFinite(baseline) && Number.isFinite(variable.value)
                    const changed = comparable && baseline !== variable.value
                    return (
                      <tr key={variable.name}>
                        <th scope="row" className="min-w-0 py-2 pr-2 text-left align-top font-normal">
                          <span className="block max-w-full overflow-x-auto">
                            <DeferredInlineMath math={variable.latex || variable.symbol} />
                          </span>
                          {variable.unit && <span className="block text-xs text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">{variable.unit}</span>}
                          {variable.description && <span className="sr-only">{variable.description}</span>}
                        </th>
                        <td className="py-2 pr-2 text-right align-top tabular-nums [overflow-wrap:anywhere]">{formatValue(baseline)}</td>
                        <td className="py-2 text-right align-top tabular-nums [overflow-wrap:anywhere]">
                          <span className="block">{formatValue(variable.value)}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                            {comparable ? (changed ? "Changed" : "Unchanged") : "Cannot compare"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <dl className="space-y-2 text-sm text-slate-800 dark:text-slate-100">
                <div>
                  <dt className="mb-1 text-xs text-slate-500 dark:text-slate-400">Baseline result</dt>
                  <dd className="min-w-0 overflow-x-auto pb-1">
                    {hasResult(snapshot.resultLine) ? <DeferredInlineMath math={snapshot.resultLine} /> : <span className="text-xs text-slate-500 dark:text-slate-400">No result captured.</span>}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs text-slate-500 dark:text-slate-400">Current result</dt>
                  <dd className="min-w-0 overflow-x-auto pb-1">
                    {hasResult(currentResult) ? <DeferredInlineMath math={currentResult} /> : <span className="text-xs text-slate-500 dark:text-slate-400">No current result available.</span>}
                  </dd>
                </div>
              </dl>
              {hasResult(resultNote) && <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{resultNote}</p>}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 px-3"
                  disabled={Boolean(restoreDisabledReason)}
                  aria-describedby={restoreDisabledReason ? restoreReasonId : undefined}
                  onClick={onRestore}
                >
                  Restore inputs
                </Button>
                <Button type="button" variant="ghost" className="min-h-11 px-3 text-slate-600 dark:text-slate-300" onClick={onClear}>
                  Clear comparison
                </Button>
              </div>
              {restoreDisabledReason && (
                <p id={restoreReasonId} className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{restoreDisabledReason}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">No baseline captured yet.</p>
          )}
          {children}
        </div>
      )}
    </section>
  )
}
