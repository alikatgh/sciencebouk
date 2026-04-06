import { describe, expect, it } from "vitest"
import { createHttpError } from "../api/httpError"
import { isAuthFailureError } from "./AuthContext"

describe("AuthContext helpers", () => {
  it("only treats 401/403 style auth failures as refresh-worthy", () => {
    expect(isAuthFailureError(createHttpError(401, "Unauthorized"))).toBe(true)
    expect(isAuthFailureError(createHttpError(403, "Forbidden"))).toBe(true)
    expect(isAuthFailureError(new Error("API 401: token_not_valid"))).toBe(true)
    expect(isAuthFailureError(new Error("Error 403"))).toBe(true)
    expect(isAuthFailureError(createHttpError(500, "Server error"))).toBe(false)
    expect(isAuthFailureError(new TypeError("Failed to fetch"))).toBe(false)
    expect(isAuthFailureError("Error 401")).toBe(false)
  })
})
