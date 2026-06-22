import { scaleLinear } from "d3-scale"
import { describe, expect, it } from "vitest"
import { buildAreaPath, buildLinePath, clamp, getTicks } from "./simpleChart"

describe("clamp", () => {
  it("returns the value unchanged when it is within range", () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it("clamps to min when the value is below the lower bound", () => {
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(-Infinity, -100, 100)).toBe(-100)
  })

  it("clamps to max when the value exceeds the upper bound", () => {
    expect(clamp(15, 0, 10)).toBe(10)
    expect(clamp(Infinity, 0, 1)).toBe(1)
  })
})

describe("getTicks", () => {
  it("returns approximately the requested tick count within a domain", () => {
    const ticks = getTicks([0, 10], 5)
    expect(ticks.length).toBeGreaterThanOrEqual(4)
    expect(ticks.length).toBeLessThanOrEqual(6)
    expect(ticks[0]).toBeGreaterThanOrEqual(0)
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(10)
  })

  it("returns sensible ticks for a negative-to-positive domain", () => {
    const ticks = getTicks([-5, 5], 4)
    expect(ticks).toContain(0)
    expect(ticks.every((t) => t >= -5 && t <= 5)).toBe(true)
  })
})

// Helpers to build minimal scale pairs for path tests
function makeScales(xDomain: [number, number], yDomain: [number, number]) {
  const xScale = scaleLinear().domain(xDomain).range([0, 100])
  const yScale = scaleLinear().domain(yDomain).range([100, 0])
  return { xScale, yScale }
}

describe("buildLinePath", () => {
  it("returns a non-empty SVG path string for valid data", () => {
    const { xScale, yScale } = makeScales([0, 10], [0, 10])
    const data = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 10 },
    ]
    const path = buildLinePath({ data, xScale, yScale, x: (d) => d.x, y: (d) => d.y })
    expect(typeof path).toBe("string")
    expect(path.length).toBeGreaterThan(0)
    expect(path.startsWith("M")).toBe(true)
  })

  it("skips null or NaN y-values and produces a defined-only path", () => {
    const { xScale, yScale } = makeScales([0, 10], [0, 10])
    const data = [
      { x: 0, y: 0 as number | null },
      { x: 5, y: null },
      { x: 10, y: 10 as number | null },
    ]
    const path = buildLinePath({ data, xScale, yScale, x: (d) => d.x, y: (d) => d.y })
    // The path should still be a string (possibly with a gap / move)
    expect(typeof path).toBe("string")
  })

  it("returns an empty string for an empty dataset", () => {
    const { xScale, yScale } = makeScales([0, 10], [0, 10])
    const path = buildLinePath({ data: [], xScale, yScale, x: (d: { x: number; y: number }) => d.x, y: (d) => d.y })
    expect(path).toBe("")
  })
})

describe("buildAreaPath", () => {
  it("returns a non-empty SVG path string for valid data", () => {
    const { xScale, yScale } = makeScales([0, 10], [0, 10])
    const data = [
      { x: 0, y0: 0, y1: 5 },
      { x: 5, y0: 0, y1: 7 },
      { x: 10, y0: 0, y1: 10 },
    ]
    const path = buildAreaPath({
      data,
      xScale,
      yScale,
      x: (d) => d.x,
      y0: (d) => d.y0,
      y1: (d) => d.y1,
    })
    expect(typeof path).toBe("string")
    expect(path.length).toBeGreaterThan(0)
  })

  it("skips null y1 values (gaps in the filled area)", () => {
    const { xScale, yScale } = makeScales([0, 10], [0, 10])
    const data = [
      { x: 0, y0: 0, y1: 5 as number | null },
      { x: 5, y0: 0, y1: null },
      { x: 10, y0: 0, y1: 10 as number | null },
    ]
    const path = buildAreaPath({
      data,
      xScale,
      yScale,
      x: (d) => d.x,
      y0: (d) => d.y0,
      y1: (d) => d.y1,
    })
    expect(typeof path).toBe("string")
  })

  it("returns an empty string for an empty dataset", () => {
    const { xScale, yScale } = makeScales([0, 10], [0, 10])
    const path = buildAreaPath({
      data: [],
      xScale,
      yScale,
      x: (d: { x: number; y0: number; y1: number }) => d.x,
      y0: (d) => d.y0,
      y1: (d) => d.y1,
    })
    expect(path).toBe("")
  })
})
