import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Slider } from "./slider"

describe("Slider", () => {
  it("emits a single-value array when changed", () => {
    const handleChange = vi.fn()

    render(
      <Slider
        aria-label="Volume"
        min={0}
        max={100}
        step={5}
        value={[20]}
        onValueChange={handleChange}
      />,
    )

    fireEvent.change(screen.getByLabelText("Volume"), { target: { value: "25" } })

    expect(handleChange).toHaveBeenLastCalledWith([25])
  })

  it("exposes fill progress as a CSS variable instead of a per-track color", () => {
    render(<Slider aria-label="Share" min={0} max={1} step={0.1} value={[0.3]} />)
    const slider = screen.getByLabelText("Share")
    expect(slider.style.getPropertyValue("--slider-progress")).toBe("30%")
    expect(slider.style.getPropertyValue("--slider-fill")).toBe("")
  })
})
