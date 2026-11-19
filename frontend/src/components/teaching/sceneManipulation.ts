import type { Variable } from "./types"

export interface DragBinding {
  name: string
  axis: "x" | "y"
  direction: number
}

export function sceneDragBindings(element: Element): DragBinding[] {
  const primary = element.getAttribute("data-drag-variable")
  if (!primary) return []
  const direction = element.getAttribute("data-drag-direction") === "-1" ? -1 : 1
  const bindings: DragBinding[] = [{ name: primary, axis: element.getAttribute("data-drag-axis") === "y" ? "y" : "x", direction }]
  const secondary = element.getAttribute("data-drag-variable-y")
  if (secondary && secondary !== primary) bindings.push({ name: secondary, axis: "y", direction: 1 })
  return bindings
}

/** Keep real input stops, including exact endpoints, without binary rounding noise. */
export function snapSceneValue(value: number, variable: Variable): number {
  if (![value, variable.min, variable.max, variable.step].every(Number.isFinite)
    || variable.step <= 0 || variable.max <= variable.min) return variable.value
  if (value >= variable.max) return variable.max
  if (value <= variable.min) return variable.min
  const last = Math.floor((variable.max - variable.min) / variable.step + 1e-7)
  const index = Math.max(0, Math.min(last, Math.round((value - variable.min) / variable.step)))
  if (index === 0) return variable.min
  const result = variable.min + index * variable.step
  if (Math.abs(result - variable.max) / variable.step <= 1e-7) return variable.max
  return Math.max(variable.min, Math.min(variable.max, Number(result.toPrecision(14))))
}

export function projectedSceneValue(
  variable: Variable, start: number, delta: number, extent: number, direction = 1,
): number {
  if (!Number.isFinite(start) || !Number.isFinite(delta) || !Number.isFinite(extent) || extent <= 0) return variable.value
  if (delta === 0) return start
  return snapSceneValue(start + delta / extent * (variable.max - variable.min) * direction, variable)
}

export function keyboardSceneValue(variable: Variable, key: string, largeStep = false): number | null {
  if (variable.constant || variable.locked) return null
  if (key === "Home") return variable.min
  if (key === "End") return snapSceneValue(variable.max, variable)
  const increase = key === "ArrowRight" || key === "ArrowUp" || key === "PageUp"
  const decrease = key === "ArrowLeft" || key === "ArrowDown" || key === "PageDown"
  if (!increase && !decrease) return null
  const steps = largeStep || key.startsWith("Page") ? 10 : 1
  const tick = (variable.value - variable.min) / variable.step
  const index = increase ? Math.floor(tick + 1e-7) + steps : Math.ceil(tick - 1e-7) - steps
  return snapSceneValue(variable.min + index * variable.step, variable)
}
