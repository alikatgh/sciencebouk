import { describe, expect, it } from "vitest"
import { particleEnergy, wallX } from "./SchrodingerScene"

describe("particleEnergy", () => {
  it("is n² / L² times the n=1, L=1 ground energy", () => {
    const ground = particleEnergy(1, 1)
    expect(particleEnergy(2, 1) / ground).toBeCloseTo(4, 8)
    expect(particleEnergy(1, 0.5) / ground).toBeCloseTo(4, 8)
  })
})

describe("wallX", () => {
  it("puts L=1 at the midpoint of a 0–2 domain", () => {
    expect(wallX(1, 0, 200)).toBe(100)
    expect(wallX(2, 0, 200)).toBe(200)
    expect(wallX(0.5, 0, 200)).toBe(50)
  })
})
