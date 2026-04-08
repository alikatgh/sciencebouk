import type { ReactElement } from "react"
import { Suspense } from "react"
import { EquationIdProvider } from "./teaching/EquationContext"
import { getScene } from "./sceneRegistry"

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
  if (!SceneComponent) {
    return <div className="flex h-80 items-center justify-center text-slate-400">No visualization available</div>
  }

  // No ErrorBoundary here — App.tsx wraps us in one with a proper fallback UI.
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <div key={equationId} className="h-full animate-fade-in-up motion-reduce:animate-none">
        <EquationIdProvider value={equationId}>
          <SceneComponent />
        </EquationIdProvider>
      </div>
    </Suspense>
  )
}
