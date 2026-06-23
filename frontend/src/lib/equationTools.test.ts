import { beforeEach, describe, expect, it } from "vitest"
import { clearRecentlyViewed, getRecentlyViewed, pushRecentlyViewed } from "./recentlyViewed"
import { getFavorites, isFavorite, toggleFavorite } from "./favorites"
import { decodeVarsFromParam, encodeVarsToParam } from "./equationShareUrl"

beforeEach(() => {
  localStorage.clear()
})

describe("recentlyViewed", () => {
  it("keeps newest first, de-duplicates, and caps the list", () => {
    pushRecentlyViewed(1)
    pushRecentlyViewed(2)
    expect(pushRecentlyViewed(1)).toEqual([1, 2]) // re-view moves to front, no dup
    for (let i = 3; i <= 20; i += 1) pushRecentlyViewed(i)
    expect(getRecentlyViewed()).toHaveLength(12)
    expect(getRecentlyViewed()[0]).toBe(20)
  })

  it("clears", () => {
    pushRecentlyViewed(7)
    clearRecentlyViewed()
    expect(getRecentlyViewed()).toEqual([])
  })
})

describe("favorites", () => {
  it("toggles membership and persists", () => {
    expect(isFavorite(5)).toBe(false)
    expect(toggleFavorite(5)).toEqual([5])
    expect(isFavorite(5)).toBe(true)
    expect(toggleFavorite(5)).toEqual([])
    expect(getFavorites()).toEqual([])
  })
})

describe("equationShareUrl", () => {
  it("round-trips slider values", () => {
    const vars = { m: 10, v: 25.5 }
    const decoded = decodeVarsFromParam(encodeVarsToParam(vars))
    expect(decoded).toEqual({ m: 10, v: 25.5 })
  })

  it("ignores malformed fragments and non-finite values", () => {
    expect(decodeVarsFromParam("garbage")).toEqual({})
    expect(decodeVarsFromParam(null)).toEqual({})
    expect(decodeVarsFromParam("m~10,~5,bad~xyz")).toEqual({ m: 10 })
    expect(encodeVarsToParam({ a: Infinity, b: 2 })).toBe("b~2")
  })
})
