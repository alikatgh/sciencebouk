import type { ReactElement } from "react"
import { BlockMath } from "react-katex"
import { useEquationId } from "../teaching/EquationContext"
import { useEquation } from "../../api/hooks"

export function GenericEquationScene(): ReactElement {
  const equationId = useEquationId()
  const { data: equation, isError, isLoading } = useEquation(equationId)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ocean border-t-transparent" />
      </div>
    )
  }

  if (isError || !equation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Visualization unavailable
        </div>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          We could not load this equation’s teaching payload right now. Try refreshing the page in a moment.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="rounded-2xl bg-white px-8 py-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <BlockMath math={equation.formula} />
      </div>

      {equation.hook && (
        <div className="max-w-lg text-center">
          <p className="text-base font-medium text-slate-700 dark:text-slate-200">{equation.hook}</p>
          {equation.hook_action && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{equation.hook_action}</p>
          )}
        </div>
      )}

      {equation.description && !equation.hook && (
        <p className="max-w-lg text-center text-sm text-slate-500 dark:text-slate-400">
          {equation.description}
        </p>
      )}

      <p className="text-xs text-slate-400">
        {equation.author}
        {equation.year ? `, ${equation.year}` : ""}
      </p>
    </div>
  )
}
