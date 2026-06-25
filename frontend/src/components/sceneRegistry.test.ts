import { describe, expect, it } from "vitest"
import { getScene } from "./sceneRegistry"

/**
 * Smoke test for the scene→equation mapping. `npm run build` catches broken
 * scene *imports*, but not a *mapping* regression (an id resolving to the wrong
 * scene, the generic fallback breaking, or the cache returning fresh components
 * each call). This guards those.
 */
describe("sceneRegistry.getScene", () => {
  it("maps each bespoke equation (ids 1-17) to its own distinct scene", () => {
    const bespoke = Array.from({ length: 17 }, (_, i) => getScene(i + 1))
    bespoke.forEach((scene) => expect(scene).toBeTruthy())
    // no two ids collide onto the same bespoke scene
    expect(new Set(bespoke).size).toBe(17)
  })

  it("falls back to a single shared generic scene for every unmapped id", () => {
    const generic = getScene(18)
    expect(getScene(81)).toBe(generic) // data-driven subject equation
    expect(getScene(9999)).toBe(generic) // unknown id still resolves safely
    expect(getScene(1)).not.toBe(generic) // bespoke wins over the fallback
  })

  it("caches: repeated calls for the same id return the same component", () => {
    expect(getScene(5)).toBe(getScene(5))
    expect(getScene(17)).toBe(getScene(17))
  })
})
