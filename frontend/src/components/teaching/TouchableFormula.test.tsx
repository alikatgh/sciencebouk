import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TouchableFormula } from "./TouchableFormula"
import type { Variable } from "./types"

const capital: Variable = {
  name: "K",
  symbol: "K",
  latex: "K",
  value: 50,
  min: 1,
  max: 100,
  step: 1,
  color: "#3b82f6",
  description: "Capital",
}

describe("TouchableFormula", () => {
  it("does not paint the control with the variable's rainbow color", () => {
    render(
      <TouchableFormula
        variables={[capital]}
        onVariableChange={vi.fn()}
        formula="Y"
      />,
    )
    const symbol = screen.getByText("K")
    expect(symbol).not.toHaveStyle({ color: "#3b82f6" })
    const slider = screen.getByLabelText("Capital: 50")
    expect(slider.style.getPropertyValue("--slider-fill")).toBe("")
  })
})
