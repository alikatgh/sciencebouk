import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ResponseCurve } from "./ResponseCurve"
import type { Variable } from "../teaching/types"

/**
 * Render smoke test (F55) — mounts the response-curve stage across representative
 * equations, including a singular/NaN domain and the log-scale path, and asserts
 * it produces an SVG without throwing. Catches JSX/render crashes that the pure
 * unit tests (which only call compute/pickSweepVariable) cannot.
 */
function v(name: string, min: number, max: number, value: number): Variable {
  return { name, symbol: name, latex: name, value, min, max, step: (max - min) / 100 || 1, color: "#3b82f6" }
}

const CASES: Array<{ id: number; vars: Record<string, number>; variables: Variable[] }> = [
  { id: 37, vars: { I: 2, R: 10 }, variables: [v("I", 0, 10, 2), v("R", 1, 100, 10)] }, // linear
  { id: 21, vars: { prior: 0.01, sens: 0.99, fpr: 0.05 }, variables: [v("prior", 0.001, 0.5, 0.01), v("sens", 0.5, 1, 0.99), v("fpr", 0.001, 0.5, 0.05)] }, // S-curve
  { id: 46, vars: { N: 50, r: 0.5, K: 500 }, variables: [v("N", 0, 1000, 50), v("r", 0, 2, 0.5), v("K", 100, 1000, 500)] }, // parabola + markers
  { id: 40, vars: { T: 300, A: 1 }, variables: [v("T", 100, 6000, 300), v("A", 0.1, 10, 1)] }, // wide range (log path)
  { id: 38, vars: { theta1: 80, n1: 2, n2: 1 }, variables: [v("theta1", 0, 89, 80), v("n1", 1, 2.5, 2), v("n2", 1, 2.5, 1)] }, // total internal reflection → NaN region
]

describe("ResponseCurve render smoke", () => {
  it("mounts an SVG for representative equations without throwing", () => {
    for (const c of CASES) {
      const { container, unmount } = render(
        <ResponseCurve equationId={c.id} variables={c.variables} vars={c.vars} />,
      )
      const svg = container.querySelector('svg[aria-label^="Response curve"]')
      expect(svg, `equation ${c.id} should render a response-curve SVG`).not.toBeNull()
      expect(svg?.querySelector("path"), `equation ${c.id} should draw a curve path`).not.toBeNull()
      unmount()
    }
  })

  it("returns null (no crash) for an equation without a computed result", () => {
    const { container } = render(<ResponseCurve equationId={18} variables={[v("n", 1, 100, 8)]} vars={{ n: 8 }} />)
    expect(container.querySelector("svg")).toBeNull()
  })
})
