import { describe, expect, it } from "vitest"
import { sanitizeNextPath } from "./navigation"

describe("sanitizeNextPath", () => {
  it("keeps safe relative app paths", () => {
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard")
    expect(sanitizeNextPath("/profile?tab=progress#stats")).toBe("/profile?tab=progress#stats")
  })

  it("falls back to root for missing or external targets", () => {
    expect(sanitizeNextPath(null)).toBe("/")
    expect(sanitizeNextPath("https://evil.com")).toBe("/")
    expect(sanitizeNextPath("//evil.com")).toBe("/")
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/")
  })
})
