import { describe, expect, it } from "vitest"
import { computeLayout, sideLabelLayout } from "./PythagorasScene"

function dist(
  p: { x: number; y: number },
  q: { x: number; y: number },
): number {
  return Math.hypot(p.x - q.x, p.y - q.y)
}

describe("sideLabelLayout", () => {
  it("keeps 3-4-5 side labels apart on a typical desktop canvas", () => {
    const { s, ox, oy, compact, ultraCompact } = computeLayout(3, 4, 720, 520)
    expect(compact).toBe(false)
    const labels = sideLabelLayout(3, 4, 5, s, ox, oy, compact, ultraCompact)
    expect(labels.c.visible).toBe(true)
    expect(dist(labels.a, labels.b)).toBeGreaterThan(36)
    expect(dist(labels.a, labels.c)).toBeGreaterThan(36)
    expect(dist(labels.b, labels.c)).toBeGreaterThan(36)
  })

  it("keeps a and b apart on a compact canvas (c is hidden)", () => {
    const { s, ox, oy, compact, ultraCompact } = computeLayout(3, 4, 400, 320)
    expect(compact).toBe(true)
    const labels = sideLabelLayout(3, 4, 5, s, ox, oy, compact, ultraCompact)
    expect(labels.c.visible).toBe(false)
    expect(dist(labels.a, labels.b)).toBeGreaterThan(24)
  })

  it("places c outside the triangle, toward the hypotenuse square", () => {
    const { s, ox, oy, compact, ultraCompact } = computeLayout(3, 4, 720, 520)
    const labels = sideLabelLayout(3, 4, 5, s, ox, oy, compact, ultraCompact)
    const incenterX = ox + (4 * s) / 3
    const incenterY = oy - (3 * s) / 3
    const aToCenter = dist(labels.a, { x: incenterX, y: incenterY })
    const cToCenter = dist(labels.c, { x: incenterX, y: incenterY })
    expect(cToCenter).toBeGreaterThan(aToCenter)
  })
})
