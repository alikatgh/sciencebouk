import { prefetchEquationScene } from "../components/sceneRegistry"

let appRoutePromise: Promise<void> | null = null
let visualizationPromise: Promise<void> | null = null

function prefetchAppRoute(): Promise<void> {
  if (!appRoutePromise) {
    appRoutePromise = import("../App").then(() => {})
  }
  return appRoutePromise
}

function prefetchVisualizationShell(): Promise<void> {
  if (!visualizationPromise) {
    visualizationPromise = import("../components/EquationVisualization").then(() => {})
  }
  return visualizationPromise
}

export function prefetchEquationExperience(equationId: number): Promise<void> {
  return Promise.all([
    prefetchAppRoute(),
    prefetchVisualizationShell(),
    prefetchEquationScene(equationId),
  ]).then(() => {})
}
