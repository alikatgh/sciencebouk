import type { ReactElement } from "react"
import { Suspense } from "react"
import { EquationIdProvider } from "./teaching/EquationContext"
import { getScene } from "./sceneRegistry"
import { ErrorBoundary } from "./ErrorBoundary"

function LoadingSkeleton(): ReactElement {
  return (
    <div className="flex h-[400px] items-center justify-center rounded-[34px] border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ocean border-t-transparent" />
        <p className="text-sm text-slate-400">Loading visualization...</p>
      </div>
    </div>
  )
}

export function EquationVisualization({
  equationId,
}: {
  equationId: number
}): ReactElement {
  const SceneComponent = getScene(equationId)

  // Scene-scoped ErrorBoundary: a crash in one visualization stays contained to
  // the viz panel (App.tsx's boundary is the app-shell backstop), and `resetKey`
  // clears it automatically when the learner navigates to another equation.
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <div key={equationId} className="h-full animate-fade-in-up motion-reduce:animate-none">
        <EquationIdProvider value={equationId}>
          <ErrorBoundary resetKey={equationId}>
            <SceneComponent />
          </ErrorBoundary>
        </EquationIdProvider>
      </div>
    </Suspense>
  )
}
