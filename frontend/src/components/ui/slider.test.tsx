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
})
