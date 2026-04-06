import type { ReactElement } from "react"
import { lazy, Suspense } from "react"

interface DeferredInlineMathProps {
  math: string
  className?: string
}

const InlineMathRenderer = lazy(() =>
  import("./InlineMathRenderer").then((module) => ({ default: module.InlineMathRenderer })),
)

export function DeferredInlineMath({ math, className }: DeferredInlineMathProps): ReactElement {
  return (
    <Suspense fallback={<span className="inline-block h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />}>
      <span className={className}>
        <InlineMathRenderer math={math} />
      </span>
    </Suspense>
  )
}
