import { describe, expect, it } from "vitest"
import { createHttpError, hasHttpStatus } from "./httpError"

describe("createHttpError", () => {
  it("creates an Error with the given message and status", () => {
    const err = createHttpError(404, "Not Found")
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe("Not Found")
    expect(err.status).toBe(404)
    expect(err.name).toBe("HttpError")
  })

  it("distinguishes from plain Error via name", () => {
    const err = createHttpError(500, "Server Error")
    const plain = new Error("Server Error")
    expect(err.name).toBe("HttpError")
    expect(plain.name).toBe("Error")
  })
})

describe("hasHttpStatus", () => {
  it("matches when the error object has a numeric status property", () => {
    const err = createHttpError(401, "Unauthorized")
    expect(hasHttpStatus(err, [401])).toBe(true)
    expect(hasHttpStatus(err, [400, 401, 403])).toBe(true)
    expect(hasHttpStatus(err, [403])).toBe(false)
  })

  it("matches status codes embedded in the error message", () => {
    const err = new Error("HTTP 403 Forbidden")
    expect(hasHttpStatus(err, [403])).toBe(true)
    expect(hasHttpStatus(err, [401])).toBe(false)
  })

  it("matches 'API 422' style messages", () => {
    const err = new Error("API 422: Unprocessable Entity")
    expect(hasHttpStatus(err, [422])).toBe(true)
  })

  it("returns false for non-Error primitives", () => {
    expect(hasHttpStatus(null, [404])).toBe(false)
    expect(hasHttpStatus(undefined, [404])).toBe(false)
    expect(hasHttpStatus("not an error", [404])).toBe(false)
    expect(hasHttpStatus(42, [42])).toBe(false)
  })

  it("returns false when status list is empty", () => {
    const err = createHttpError(500, "Error")
    expect(hasHttpStatus(err, [])).toBe(false)
  })

  it("coerces string status property to number", () => {
    const err = { status: "429" } as unknown
    expect(hasHttpStatus(err, [429])).toBe(true)
  })
})
