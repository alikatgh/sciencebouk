import type { ReactNode } from "react"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Variable } from "../teaching/types"
import { ConfigurableEquationScene } from "./ConfigurableEquationScene"

const state = vi.hoisted(() => ({
  equationId: 37,
  setVar: vi.fn(),
  variables: [] as Array<{ name: string; symbol: string; description: string; min: number; max: number; default: number; unit?: string; constant?: boolean }>,
}))

vi.mock("../teaching/EquationContext", () => ({ useEquationId: () => state.equationId }))
vi.mock("../../api/hooks", () => ({
  useEquation: () => ({
    data: { title: "Ohm’s law", formula: "V=IR", variables_data: state.variables },
    isError: false,
    isLoading: false,
  }),
}))
vi.mock("../teaching/TeachableEquation", () => ({
  TeachableEquation: ({ variables, children }: { variables: Variable[]; children: (context: { vars: Record<string, number>; setVar: typeof state.setVar }) => ReactNode }) => children({
    vars: Object.fromEntries(variables.map((variable) => [variable.name, variable.value])),
    setVar: state.setVar,
  }),
}))

beforeEach(() => {
  state.equationId = 37
  state.variables = [
    { name: "I", symbol: "I", description: "Current", min: 0, max: 10, default: 2, unit: "A" },
    { name: "R", symbol: "R", description: "Resistance", min: 1, max: 100, default: 10, unit: "Ω" },
  ]
  state.setVar.mockClear()
})

afterEach(cleanup)

describe("configurable chart axis selection", () => {
  it("lets a fixed formula move and reset without inventing editable constants", () => {
    state.variables = state.variables.map((variable) => ({ ...variable, constant: true }))
    const { container } = render(<ConfigurableEquationScene />)
    const canvas = screen.getByRole("group", { name: "Interactive visualization canvas" })
    const reset = screen.getByRole("button", { name: "Reset visualization view" })
    expect(reset).toBeDisabled()
    fireEvent.keyDown(canvas, { key: "ArrowRight" })
    expect(container.querySelector("[data-scene-pan]")).toHaveAttribute("data-scene-pan", "10,0")
    expect(reset).not.toBeDisabled()
    fireEvent.click(reset)
    expect(container.querySelector("[data-scene-pan]")).toHaveAttribute("data-scene-pan", "0,0")
    expect(container.querySelector("[data-drag-variable]")).toBeNull()
    expect(state.setVar).not.toHaveBeenCalled()
  })
  it("names the axis choices and changes the curve and pressed state without changing inputs", () => {
    render(<ConfigurableEquationScene />)
    const choices = within(screen.getByRole("group", { name: "Choose x-axis variable" }))
    const current = choices.getByRole("button", { name: "Set x-axis to Current (I)" })
    const resistance = choices.getByRole("button", { name: "Set x-axis to Resistance (R)" })
    expect(resistance).toHaveAttribute("aria-pressed", "true")
    expect(current).toHaveAttribute("aria-pressed", "false")
    expect(current).toHaveAttribute("data-drag-variable", "I")
    expect(resistance).toHaveAttribute("data-drag-variable", "R")
    expect(screen.getByLabelText(/^Result: V equals/).closest("[data-drag-variable]")).toHaveAttribute("data-drag-variable", "R")

    fireEvent.click(current)

    expect(current).toHaveAttribute("aria-pressed", "true")
    expect(resistance).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("img", { name: "Response curve of V versus I" })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Result: V equals/).closest("[data-drag-variable]")).toHaveAttribute("data-drag-variable", "I")
    expect(state.setVar).not.toHaveBeenCalled()
  })

  it("exposes every nonconstant choice in a five-variable equation", () => {
    state.variables.push(
      { name: "a", symbol: "a", description: "First input", min: 0, max: 10, default: 1 },
      { name: "b", symbol: "b", description: "Second input", min: 0, max: 10, default: 2 },
      { name: "c", symbol: "c", description: "Third input", min: 0, max: 10, default: 3 },
      { name: "k", symbol: "k", description: "Constant", min: 0, max: 10, default: 1, constant: true },
    )
    render(<ConfigurableEquationScene />)
    const choices = within(screen.getByRole("group", { name: "Choose x-axis variable" }))
    expect(choices.getAllByRole("button")).toHaveLength(5)
    expect(choices.queryByRole("button", { name: /Constant/ })).not.toBeInTheDocument()
    expect(document.querySelector('[data-drag-variable="k"]')).toBeNull()

    fireEvent.click(choices.getByRole("button", { name: "Set x-axis to Third input (c)" }))

    expect(screen.getByRole("img", { name: "Response curve of V versus c" })).toBeInTheDocument()
  })

  it("retains input meters for equations without a scalar response curve", () => {
    state.equationId = 18
    render(<ConfigurableEquationScene />)

    expect(screen.queryByRole("group", { name: "Choose x-axis variable" })).not.toBeInTheDocument()
    expect(screen.queryByRole("img", { name: /Response curve/ })).not.toBeInTheDocument()
    expect(screen.getByText("2.00 A")).toBeInTheDocument()
    expect(screen.getByText("10.00 Ω")).toBeInTheDocument()
    const currentMeter = screen.getByLabelText("Current input meter")
    const resistanceMeter = screen.getByLabelText("Resistance input meter")
    expect(currentMeter).toHaveAttribute("data-drag-variable", "I")
    expect(resistanceMeter).toHaveAttribute("data-drag-variable", "R")
    expect(screen.getByText("2.00 A").closest("[data-drag-variable]")).toBe(currentMeter)
    expect(currentMeter.querySelector('[style*="width"]')?.closest("[data-drag-variable]")).toBe(currentMeter)
    expect(currentMeter.closest("[data-scene-canvas]")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Reset variables" }).closest("[data-drag-variable]")).toBeNull()
  })
})
