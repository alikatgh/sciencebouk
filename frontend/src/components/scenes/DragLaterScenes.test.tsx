import type { ComponentType, ReactNode } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Variable } from "../teaching/types"
import { RelativityScene } from "./RelativityScene"
import { SchrodingerScene } from "./SchrodingerScene"
import { InformationScene } from "./InformationScene"
import { ChaosScene } from "./ChaosScene"
import { BlackScholesScene } from "./BlackScholesScene"

const state = vi.hoisted(() => ({ setVar: vi.fn() }))

vi.mock("../../settings/SettingsContext", () => ({ useSettings: () => ({ settings: { language: "en" } }) }))
vi.mock("../../hooks/useContainerSize", () => ({ useContainerSize: () => ({ width: 800, height: 500 }) }))
vi.mock("../teaching/TeachableEquation", () => ({
  TeachableEquation: ({ variables, children }: {
    variables: Variable[]
    children: (context: {
      vars: Record<string, number>
      setVar: typeof state.setVar
      highlightedVar: null
      setHighlightedVar: () => void
    }) => ReactNode
  }) => children({
    vars: Object.fromEntries(variables.map((variable) => [variable.name, variable.value])),
    setVar: state.setVar,
    highlightedVar: null,
    setHighlightedVar: () => {},
  }),
}))

beforeEach(() => {
  state.setVar.mockClear()
  // Mount real scene geometry while bounding unrelated animation loops.
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1))
  vi.stubGlobal("cancelAnimationFrame", vi.fn())
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const scenes: Array<{ name: string; Scene: ComponentType; inputs: string[] }> = [
  { name: "relativity", Scene: RelativityScene, inputs: ["v"] },
  { name: "Schrödinger", Scene: SchrodingerScene, inputs: ["n", "L"] },
  { name: "information", Scene: InformationScene, inputs: ["p"] },
  { name: "chaos", Scene: ChaosScene, inputs: ["r", "x0"] },
  { name: "Black–Scholes", Scene: BlackScholesScene, inputs: ["K", "sigma", "T", "r"] },
]

describe("later-scene direct-manipulation coverage", () => {
  it.each(scenes)("exposes each $name input on real objects without editing derived outputs", ({ Scene, inputs }) => {
    const { container } = render(<Scene />)
    const targets = [...container.querySelectorAll("[data-drag-variable]")]
    const mappedInputs = targets.flatMap((target) => [
      target.getAttribute("data-drag-variable"),
      target.getAttribute("data-drag-variable-y"),
    ]).filter((name): name is string => name !== null)

    expect(targets.length).toBeGreaterThan(2)
    expect(new Set(mappedInputs)).toEqual(new Set(inputs))
    for (const target of targets) expect(target.getAttribute("aria-label")).toBeTruthy()
    expect(container.querySelector("svg [data-drag-variable]")).not.toBeNull()
  })

  it("maps clocks and contraction back to velocity while preserving the native curve handle", () => {
    const { container } = render(<RelativityScene />)
    for (const selector of [".clock1-hand", ".clock2-hand", ".clock2-label", ".v-curve-label"]) {
      expect(container.querySelector(selector)?.closest("[data-drag-variable]")).toHaveAttribute("data-drag-variable", "v")
    }
    expect(container.querySelector(".contract-bar")).toHaveAttribute("data-drag-direction", "-1")
    expect(container.querySelector(".contract-label")).toHaveAttribute("data-drag-variable", "v")
    expect(container.querySelector(".curve-dot-group")).toHaveAttribute("data-scene-drag", "native")
    expect(container.querySelector('[data-drag-variable="gamma"]')).toBeNull()
  })

  it("keeps both native quantum handles and energy-level selection working", () => {
    const { container } = render(<SchrodingerScene />)
    expect(container.querySelector(".wall-drag-handle")).toHaveAttribute("data-scene-drag", "native")
    expect(container.querySelector(".wall-drag-handle")).toHaveAttribute("data-drag-variable", "L")
    expect(container.querySelector(".n-drag-handle")).toHaveAttribute("data-scene-drag", "native")
    expect(container.querySelector(".n-drag-handle")).toHaveAttribute("data-drag-axis", "y")
    for (const selector of [".psi-path", ".prob-line", ".prob-area"]) {
      expect(container.querySelector(selector)).toHaveAttribute("data-drag-variable", "n")
      expect(container.querySelector(selector)).toHaveAttribute("data-drag-variable-y", "L")
    }
    expect(container.querySelector(".elevel-val-3")?.closest("[data-drag-variable]")).toHaveAttribute("data-drag-variable", "n")

    fireEvent.click(container.querySelector(".n-btn-3")!)

    expect(state.setVar).toHaveBeenCalledWith("n", 3)
    expect(container.querySelector(".energy-current")).toHaveTextContent("3")
    expect(container.querySelector(".play-btn")?.closest("[data-drag-variable]")).toBeNull()
  })

  it("keeps coin actions and typed probability entry alongside the coin/readout drag mappings", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    const { container } = render(<InformationScene />)
    expect(screen.getByLabelText("Probability of heads for future coin flips")).toHaveAttribute("data-drag-variable", "p")
    const flip = screen.getByRole("button", { name: "Flip" })
    const reset = screen.getByRole("button", { name: "Reset" })
    expect(flip.closest("[data-drag-variable]")).toBeNull()
    expect(reset.closest("[data-drag-variable]")).toBeNull()

    fireEvent.click(flip)
    expect(screen.getByText("H: 1")).toBeInTheDocument()
    fireEvent.click(reset)
    expect(screen.getByText("H: 0")).toBeInTheDocument()
    expect(state.setVar).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Probability of heads" }))
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0.8" } })
    fireEvent.blur(screen.getByRole("spinbutton"))
    expect(state.setVar).toHaveBeenCalledWith("p", 0.8)
    expect(container.querySelector('svg circle[r="7"]')?.closest("[data-drag-variable]")).toHaveAttribute("data-drag-variable", "p")
  })

  it("maps the bifurcation cloud and time series without losing typed initial-population entry", () => {
    const { container } = render(<ChaosScene />)
    const cloud = screen.getByLabelText("Growth rate on the bifurcation cloud")
    expect(cloud).toHaveAttribute("data-drag-variable", "r")
    expect(cloud.querySelectorAll("circle").length).toBeGreaterThan(1000)
    const series = screen.getByLabelText("Population series: growth rate horizontally, initial population vertically")
    expect(series).toHaveAttribute("data-drag-variable", "r")
    expect(series).toHaveAttribute("data-drag-variable-y", "x0")
    expect(series.querySelectorAll("circle")).toHaveLength(60)

    fireEvent.click(screen.getByRole("button", { name: "Initial population" }))
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0.65" } })
    fireEvent.blur(screen.getByRole("spinbutton"))
    expect(state.setVar).toHaveBeenCalledWith("x0", 0.65)
    expect(container.querySelector('[data-drag-variable="x"]')).toBeNull()
  })

  it("maps optional Greeks to their input causes and preserves their visibility action", () => {
    const { container } = render(<BlackScholesScene />)
    const toggle = screen.getByRole("button", { name: "Show Greeks" })
    expect(toggle.closest("[data-drag-variable]")).toBeNull()
    fireEvent.click(toggle)

    expect(screen.getByLabelText("Delta controlled by the risk-free rate")).toHaveAttribute("data-drag-variable", "r")
    expect(screen.getByLabelText("Gamma controlled by volatility")).toHaveAttribute("data-drag-variable", "sigma")
    expect(screen.getByLabelText("Call price: strike horizontally, volatility vertically")).toHaveAttribute("data-drag-variable-y", "sigma")
    expect(screen.getByLabelText("Strike price marker and readout")).toHaveAttribute("data-drag-variable", "K")
    expect(container.querySelector('[data-drag-variable="call"], [data-drag-variable="put"], [data-drag-variable="delta"], [data-drag-variable="gamma"]')).toBeNull()
    expect(state.setVar).not.toHaveBeenCalled()
  })
})
