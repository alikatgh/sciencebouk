import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
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

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

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

  it("binds the curve, shaded area and live result to the chosen input name and leaves axes for panning", () => {
    const variables = [
      { ...v("I", 0, 10, 2), symbol: "current" },
      { ...v("R", 1, 100, 10), symbol: "resistance" },
    ]
    const props = { equationId: 37, variables, vars: { I: 2, R: 10 } }
    const { container, rerender } = render(<ResponseCurve {...props} sweepOverride="I" />)
    const initialTargets = [...container.querySelectorAll("[data-drag-variable]")]

    expect(initialTargets.length).toBeGreaterThanOrEqual(3)
    for (const target of initialTargets) expect(target).toHaveAttribute("data-drag-variable", "I")
    expect(container.querySelector('path[stroke="transparent"][stroke-width="24"]')?.closest("[data-drag-variable]")).toHaveAttribute("data-drag-variable", "I")
    expect(container.querySelector('circle[r="22"]')?.closest("[data-drag-variable]")).toHaveAttribute("data-drag-variable", "I")
    expect(container.querySelector('circle[r="8"]')?.closest("[data-drag-variable]")).toHaveAttribute("data-drag-variable", "I")
    expect(container.querySelector('text[font-weight="700"]')?.closest("[data-drag-variable]")).toHaveAttribute("data-drag-variable", "I")
    for (const axis of container.querySelectorAll('line[stroke="currentColor"]')) {
      expect(axis.closest("[data-drag-variable]")).toBeNull()
    }
    expect(screen.getByRole("img").closest("[data-scene-canvas]")).not.toBeNull()

    rerender(<ResponseCurve {...props} sweepOverride="R" />)

    for (const target of container.querySelectorAll("[data-drag-variable]")) {
      expect(target).toHaveAttribute("data-drag-variable", "R")
    }
    expect(screen.getByRole("button", { name: /Toggle logarithmic/ }).closest("[data-drag-variable]")).toBeNull()
    expect(container.querySelector('[data-drag-variable="V"], [data-drag-variable="current"], [data-drag-variable="resistance"]')).toBeNull()
  })

  it("describes both phone axes with ranges and units and updates the selected axis", () => {
    vi.stubGlobal("innerWidth", 390)
    vi.stubGlobal("innerHeight", 844)
    const variables = [{ ...v("I", 0, 10, 2), unit: "A" }, { ...v("R", 1, 100, 10), unit: "Ω" }]
    const props = { equationId: 37, variables, vars: { I: 2, R: 10 } }
    const { rerender } = render(<ResponseCurve {...props} sweepOverride="I" />)

    expect(screen.getByRole("img", { name: "Response curve of V versus I" })).toHaveAccessibleDescription(/Horizontal · I.*0 to 10 A.*Vertical · V.* V/)
    expect(screen.getByText("0 to 10 A")).toBeInTheDocument()

    rerender(<ResponseCurve {...props} sweepOverride="R" />)

    expect(screen.getByRole("img", { name: "Response curve of V versus R" })).toHaveAccessibleDescription(/Horizontal · R.*1 to 100 Ω/)
    expect(screen.getByText("1 to 100 Ω")).toBeInTheDocument()
  })

  it("keeps logarithmic scaling operable and describes it without changing the current result", () => {
    vi.stubGlobal("innerWidth", 390)
    vi.stubGlobal("innerHeight", 844)
    const example = CASES[3]
    const { container } = render(<ResponseCurve equationId={example.id} variables={example.variables} vars={example.vars} />)
    const initialPath = container.querySelector('path[fill="none"]')?.getAttribute("d")
    const result = screen.getByRole("status").textContent

    fireEvent.click(screen.getByRole("button", { name: "Toggle logarithmic y-axis (currently off)" }))

    expect(screen.getByRole("button", { name: "Toggle logarithmic y-axis (currently on)" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("img")).toHaveAccessibleDescription(/log scale/)
    expect(container.querySelector('path[fill="none"]')?.getAttribute("d")).not.toBe(initialPath)
    expect(screen.getByRole("status").textContent).toBe(result)
  })

  it("preserves pointer scrubbing and removes the scrub readout on pointer leave", () => {
    vi.stubGlobal("innerWidth", 390)
    vi.stubGlobal("innerHeight", 844)
    vi.stubGlobal("PointerEvent", MouseEvent)
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1 })
    vi.stubGlobal("cancelAnimationFrame", vi.fn())
    render(<ResponseCurve equationId={37} variables={[v("I", 0, 10, 2), v("R", 1, 100, 10)]} vars={{ I: 2, R: 10 }} sweepOverride="I" />)
    const svg = screen.getByRole("img")
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 880, height: 520, right: 880, bottom: 520, toJSON: () => ({}) })

    fireEvent.pointerMove(svg, { clientX: 454, clientY: 220 })
    const readout = screen.getByText("I = 5 · V = 50 V")
    expect(readout.closest("svg")).toBeNull()

    fireEvent.pointerLeave(svg)
    expect(screen.queryByText("I = 5 · V = 50 V")).not.toBeInTheDocument()
  })
})
