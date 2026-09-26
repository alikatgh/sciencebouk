import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

  it("explains lesson locks and disables the value editor", () => {
    render(<TouchableFormula variables={[{ ...capital, locked: true }]} onVariableChange={vi.fn()} formula="Y" />)
    expect(screen.getByText("Capital")).toBeVisible()
    expect(screen.getByText("Locked for this lesson step")).toBeVisible()
    expect(screen.getByRole("button", { name: /Capital: 50.*Locked/ })).toBeDisabled()
  })

  it("keeps the current value when an exact-value edit is cleared", async () => {
    const change = vi.fn()
    render(<TouchableFormula variables={[capital]} onVariableChange={change} formula="Y" />)
    await userEvent.click(screen.getByRole("button", { name: /Capital: 50.*Edit value/ }))
    await userEvent.clear(screen.getByRole("spinbutton", { name: "Edit Capital" }))
    await userEvent.tab()
    expect(change).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /Capital: 50.*Edit value/ })).toBeVisible()
  })

  it("allows a new edit after Escape cancels a previous edit", async () => {
    const change = vi.fn()
    render(<TouchableFormula variables={[capital]} onVariableChange={change} formula="Y" />)
    await userEvent.click(screen.getByRole("button", { name: /Capital: 50.*Edit value/ }))
    fireEvent.change(screen.getByRole("spinbutton", { name: "Edit Capital" }), { target: { value: "70" } })
    await userEvent.keyboard("{Escape}")
    expect(change).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: /Capital: 50.*Edit value/ }))
    fireEvent.change(screen.getByRole("spinbutton", { name: "Edit Capital" }), { target: { value: "80" } })
    await userEvent.keyboard("{Enter}")
    expect(change).toHaveBeenCalledExactlyOnceWith("K", 80)
  })
})
