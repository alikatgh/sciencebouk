import { describe, it, expect } from "vitest"
import { api } from "./client"

describe("api client", () => {
  it("exports api object with expected methods", () => {
    expect(api.equations).toBeDefined()
    expect(api.equations.list).toBeTypeOf("function")
    expect(api.equations.get).toBeTypeOf("function")
    expect(api.equations.updateProgress).toBeTypeOf("function")
    expect(api.courses).toBeDefined()
    expect(api.courses.get).toBeTypeOf("function")
    expect(api.search).toBeTypeOf("function")
  })
})
