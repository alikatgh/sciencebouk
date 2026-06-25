import { describe, expect, it } from "vitest"
import { encodeVarsToParam, decodeVarsFromParam } from "./equationShareUrl"

describe("equationShareUrl", () => {
  it("round-trips slider values", () => {
    const encoded = encodeVarsToParam({ m: 10, v: 25.5 })
    expect(decodeVarsFromParam(encoded)).toEqual({ m: 10, v: 25.5 })
  })

  it("ignores empty / malformed params instead of throwing", () => {
    expect(decodeVarsFromParam(null)).toEqual({})
    expect(decodeVarsFromParam("")).toEqual({})
    expect(decodeVarsFromParam("garbage,,~5,x~")).toEqual({})
    expect(decodeVarsFromParam("%E0%A4%A~5")).toEqual({}) // bad percent-encoding, swallowed
  })

  it("rejects prototype-pollution keys and never mutates the prototype", () => {
    const decoded = decodeVarsFromParam("__proto__~9,constructor~9,prototype~9,safe~1")
    expect(decoded).toEqual({ safe: 1 })
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(Object.prototype).not.toHaveProperty("9")
  })

  it("drops non-finite values and caps the number of pairs", () => {
    expect(decodeVarsFromParam("a~Infinity,b~NaN,c~3")).toEqual({ c: 3 })
    const many = Array.from({ length: 200 }, (_, i) => `k${i}~${i}`).join(",")
    expect(Object.keys(decodeVarsFromParam(many)).length).toBeLessThanOrEqual(64)
  })
})
