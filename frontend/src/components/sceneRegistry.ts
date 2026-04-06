import type { ComponentType, LazyExoticComponent } from "react"
import { lazy } from "react"

type SceneModule = { default: ComponentType }
type SceneLoader = () => Promise<SceneModule>

const sceneLoaders: Record<number, SceneLoader> = {
  1: () => import("./scenes/PythagorasScene").then((module) => ({ default: module.PythagorasScene })),
  2: () => import("./scenes/LogarithmScene").then((module) => ({ default: module.LogarithmScene })),
  3: () => import("./scenes/CalculusScene").then((module) => ({ default: module.CalculusScene })),
  4: () => import("./scenes/GravityScene").then((module) => ({ default: module.GravityScene })),
  5: () => import("./scenes/WaveScene").then((module) => ({ default: module.WaveScene })),
  6: () => import("./scenes/ComplexScene").then((module) => ({ default: module.ComplexScene })),
  7: () => import("./scenes/EulerPolyhedraScene").then((module) => ({ default: module.EulerPolyhedraScene })),
  8: () => import("./scenes/NormalDistributionScene").then((module) => ({ default: module.NormalDistributionScene })),
  9: () => import("./scenes/FourierScene").then((module) => ({ default: module.FourierScene })),
  10: () => import("./scenes/FluidScene").then((module) => ({ default: module.FluidScene })),
  11: () => import("./scenes/MaxwellScene").then((module) => ({ default: module.MaxwellScene })),
  12: () => import("./scenes/EntropyScene").then((module) => ({ default: module.EntropyScene })),
  13: () => import("./scenes/RelativityScene").then((module) => ({ default: module.RelativityScene })),
  14: () => import("./scenes/SchrodingerScene").then((module) => ({ default: module.SchrodingerScene })),
  15: () => import("./scenes/InformationScene").then((module) => ({ default: module.InformationScene })),
  16: () => import("./scenes/ChaosScene").then((module) => ({ default: module.ChaosScene })),
  17: () => import("./scenes/BlackScholesScene").then((module) => ({ default: module.BlackScholesScene })),
}

const sceneCache = new Map<number, LazyExoticComponent<ComponentType>>()
const prefetchedSceneIds = new Set<number>()

export function getScene(id: number): LazyExoticComponent<ComponentType> | null {
  const cached = sceneCache.get(id)
  if (cached) return cached

  const loader = sceneLoaders[id]
  if (!loader) return null

  const scene = lazy(loader)
  sceneCache.set(id, scene)
  return scene
}

export function prefetchEquationScene(id: number): Promise<void> {
  const loader = sceneLoaders[id]
  if (!loader || prefetchedSceneIds.has(id)) {
    return Promise.resolve()
  }

  prefetchedSceneIds.add(id)
  return loader()
    .then(() => {})
    .catch(() => {
      prefetchedSceneIds.delete(id)
    })
}
