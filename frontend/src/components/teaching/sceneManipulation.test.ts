import { describe, expect, it } from "vitest"
import type { Variable } from "./types"
import { keyboardSceneValue, projectedSceneValue, sceneDragBindings, snapSceneValue } from "./sceneManipulation"

function variable(overrides: Partial<Variable> = {}): Variable {
  return {
    name: "position", symbol: "x", latex: "x", value: 2, min: 0, max: 10, step: 0.5,
    color: "#3b82f6", ...overrides,
  }
}

describe("scene drag bindings", () => {
  it("reads the real primary and optional vertical cause without duplicating the same input", () => {
    const mark = document.createElementNS("http://www.w3.org/2000/svg", "g")
    expect(sceneDragBindings(mark)).toEqual([])
    mark.setAttribute("data-drag-variable", "position")
    expect(sceneDragBindings(mark)).toEqual([{ name: "position", axis: "x", direction: 1 }])
    mark.setAttribute("data-drag-axis", "y")
    mark.setAttribute("data-drag-direction", "-1")
    mark.setAttribute("data-drag-variable-y", "spread")
    expect(sceneDragBindings(mark)).toEqual([
      { name: "position", axis: "y", direction: -1 },
      { name: "spread", axis: "y", direction: 1 },
    ])
    mark.setAttribute("data-drag-variable-y", "position")
    expect(sceneDragBindings(mark)).toEqual([{ name: "position", axis: "y", direction: -1 }])
  })
})

describe("bounded scene values", () => {
  it("snaps relative to the authored minimum without floating point noise", () => {
    const input = variable({ min: -0.3, max: 0.8, step: 0.1, value: 0 })
    expect(snapSceneValue(0.29999999999999993, input)).toBe(0.3)
    expect(snapSceneValue(-0.11, input)).toBe(-0.1)
    expect(snapSceneValue(0.75, input)).toBe(0.8)
    expect(snapSceneValue(-100, input)).toBe(-0.3)
    expect(snapSceneValue(100, input)).toBe(0.8)
  })

  it("retains exact minimum and maximum even when the range ends between regular stops", () => {
    const input = variable({ min: 0.3, max: 2, step: 0.4, value: 1.9 })
    expect(snapSceneValue(input.min, input)).toBe(0.3)
    expect(snapSceneValue(input.max, input)).toBe(2)
    expect(snapSceneValue(1.99, input)).toBe(1.9)
    expect(keyboardSceneValue(input, "ArrowRight")).toBe(2)
    expect(keyboardSceneValue({ ...input, value: 2 }, "ArrowLeft")).toBe(1.9)
    expect(keyboardSceneValue(input, "Home")).toBe(0.3)
    expect(keyboardSceneValue(input, "End")).toBe(2)
  })

  it("supports a range narrower than one step and tiny scientific values", () => {
    const short = variable({ min: 1, max: 1.2, step: 0.5, value: 1 })
    expect(snapSceneValue(1.1, short)).toBe(1)
    expect(keyboardSceneValue(short, "ArrowRight")).toBe(1.2)
    expect(keyboardSceneValue({ ...short, value: 1.2 }, "ArrowLeft")).toBe(1)
    const tiny = variable({ min: 0, max: 6e-34, step: 1e-35, value: 0 })
    expect(keyboardSceneValue(tiny, "ArrowRight")).toBe(1e-35)
    expect(keyboardSceneValue(tiny, "ArrowRight", true)).toBe(1e-34)
    expect(projectedSceneValue(tiny, 0, 1, 10)).toBe(6e-35)
    expect(snapSceneValue(6e-34, tiny)).toBe(6e-34)
  })

  it("projects relative physical motion over the authored range, including inverse controls", () => {
    const input = variable()
    expect(projectedSceneValue(input, 2, 30, 200)).toBe(3.5)
    expect(projectedSceneValue(input, 2, 30, 200, -1)).toBe(0.5)
    expect(projectedSceneValue(input, 8, 10000, 200)).toBe(10)
    expect(projectedSceneValue(input, 2, -10000, 200)).toBe(0)
    expect(projectedSceneValue(input, 2, 0, 200)).toBe(2)
  })

  it("preserves an off-grid starting value when its bound axis has no motion", () => {
    const input = variable({ value: 4.5 })
    expect(projectedSceneValue(input, 2.13, 0, 200)).toBe(2.13)
    expect(projectedSceneValue(input, 2.13, 0, 100, -1)).toBe(2.13)
  })

  it("retains the current input when projection or snapping receives invalid numeric data", () => {
    const input = variable()
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(snapSceneValue(value, input)).toBe(2)
      expect(projectedSceneValue(input, value, 20, 200)).toBe(2)
      expect(projectedSceneValue(input, 2, value, 200)).toBe(2)
      expect(projectedSceneValue(input, 2, 20, value)).toBe(2)
    }
    for (const extent of [0, -1]) expect(projectedSceneValue(input, 2, 20, extent)).toBe(2)
    for (const step of [0, -1, Number.NaN]) expect(snapSceneValue(5, { ...input, step })).toBe(2)
    expect(snapSceneValue(5, { ...input, min: 10, max: 10 })).toBe(2)
  })
})

describe("scene keyboard values", () => {
  it("uses one stop normally, ten stops with Shift or Page keys, and clamps at both endpoints", () => {
    const input = variable()
    for (const key of ["ArrowRight", "ArrowUp"]) expect(keyboardSceneValue(input, key)).toBe(2.5)
    for (const key of ["ArrowLeft", "ArrowDown"]) expect(keyboardSceneValue(input, key)).toBe(1.5)
    expect(keyboardSceneValue(input, "ArrowRight", true)).toBe(7)
    expect(keyboardSceneValue(input, "ArrowLeft", true)).toBe(0)
    expect(keyboardSceneValue(input, "PageUp")).toBe(7)
    expect(keyboardSceneValue(input, "PageDown")).toBe(0)
    expect(keyboardSceneValue({ ...input, value: 10 }, "ArrowUp")).toBe(10)
    expect(keyboardSceneValue({ ...input, value: 0 }, "ArrowDown")).toBe(0)
    expect(keyboardSceneValue(input, "Enter")).toBeNull()
  })

  it("denies every keyboard mutation of constants and locked inputs", () => {
    for (const restriction of [{ constant: true }, { locked: true }]) {
      for (const key of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]) {
        expect(keyboardSceneValue(variable(restriction), key, true)).toBeNull()
      }
    }
  })
})
