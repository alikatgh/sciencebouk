import type { ReactElement } from "react"
import { lazy, Suspense } from "react"
import { ErrorBoundary } from "./ErrorBoundary"
import { EquationIdProvider } from "./teaching/EquationContext"

export type ScenePresentation = "standard" | "immersive"

const immersiveSceneIds = new Set<number>([12])

const PythagorasScene = lazy(() => import("./scenes/PythagorasScene").then((m) => ({ default: m.PythagorasScene })))
const LogarithmScene = lazy(() => import("./scenes/LogarithmScene").then((m) => ({ default: m.LogarithmScene })))
const CalculusScene = lazy(() => import("./scenes/CalculusScene").then((m) => ({ default: m.CalculusScene })))
const GravityScene = lazy(() => import("./scenes/GravityScene").then((m) => ({ default: m.GravityScene })))
const WaveScene = lazy(() => import("./scenes/WaveScene").then((m) => ({ default: m.WaveScene })))
const ComplexScene = lazy(() => import("./scenes/ComplexScene").then((m) => ({ default: m.ComplexScene })))
const EulerPolyhedraScene = lazy(() => import("./scenes/EulerPolyhedraScene").then((m) => ({ default: m.EulerPolyhedraScene })))
const NormalDistributionScene = lazy(() => import("./scenes/NormalDistributionScene").then((m) => ({ default: m.NormalDistributionScene })))
const FourierScene = lazy(() => import("./scenes/FourierScene").then((m) => ({ default: m.FourierScene })))
const FluidScene = lazy(() => import("./scenes/FluidScene").then((m) => ({ default: m.FluidScene })))
const MaxwellScene = lazy(() => import("./scenes/MaxwellScene").then((m) => ({ default: m.MaxwellScene })))
const EntropyScene = lazy(() => import("./scenes/EntropyScene").then((m) => ({ default: m.EntropyScene })))
const RelativityScene = lazy(() => import("./scenes/RelativityScene").then((m) => ({ default: m.RelativityScene })))
const SchrodingerScene = lazy(() => import("./scenes/SchrodingerScene").then((m) => ({ default: m.SchrodingerScene })))
const InformationScene = lazy(() => import("./scenes/InformationScene").then((m) => ({ default: m.InformationScene })))
const ChaosScene = lazy(() => import("./scenes/ChaosScene").then((m) => ({ default: m.ChaosScene })))
const BlackScholesScene = lazy(() => import("./scenes/BlackScholesScene").then((m) => ({ default: m.BlackScholesScene })))

function LoadingSkeleton({ immersive }: { immersive: boolean }): ReactElement {
  if (immersive) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#f8fbff_0%,#eef3ff_58%,#e8eef9_100%)] dark:bg-[radial-gradient(circle_at_top,#12192b_0%,#0b1120_58%,#060913_100%)]">
        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ocean border-t-transparent" />
          <p className="text-sm">Loading visualization...</p>
        </div>
      </div>
    )
  }

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
  const presentation = getScenePresentation(equationId)
  if (!SceneComponent) {
    return <div className="flex h-80 items-center justify-center text-slate-400">No visualization available</div>
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton immersive={presentation === "immersive"} />}>
        <EquationIdProvider value={equationId}>
          <SceneComponent />
        </EquationIdProvider>
      </Suspense>
    </ErrorBoundary>
  )
}

export function getScenePresentation(id: number): ScenePresentation {
  return immersiveSceneIds.has(id) ? "immersive" : "standard"
}

function getScene(id: number): React.LazyExoticComponent<React.ComponentType> | null {
  switch (id) {
    case 1: return PythagorasScene
    case 2: return LogarithmScene
    case 3: return CalculusScene
    case 4: return GravityScene
    case 5: return WaveScene
    case 6: return ComplexScene
    case 7: return EulerPolyhedraScene
    case 8: return NormalDistributionScene
    case 9: return FourierScene
    case 10: return FluidScene
    case 11: return MaxwellScene
    case 12: return EntropyScene
    case 13: return RelativityScene
    case 14: return SchrodingerScene
    case 15: return InformationScene
    case 16: return ChaosScene
    case 17: return BlackScholesScene
    default: return null
  }
}
