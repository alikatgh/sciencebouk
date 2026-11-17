import { describe, expect, it } from "vitest"
import { tokenizeFormattedMath } from "./tokenizeFormattedMath"

describe("tokenizeFormattedMath", () => {
  it("formats plain latex into readable tokens", () => {
    expect(tokenizeFormattedMath("a^2+b^2=c^2")).toEqual([
      { text: "a² + b² = c²" },
    ])
  })

  it("extracts and preserves colored values", () => {
    expect(tokenizeFormattedMath("\\log({\\color{#3b82f6}20} \\times {\\color{#f59e0b}5})")).toEqual([
      { text: "log(" },
      { text: "20", color: "#3b82f6" },
      { text: " × " },
      { text: "5", color: "#f59e0b" },
      { text: ")" },
    ])
  })

  it("supports the alternate color command form", () => {
    expect(tokenizeFormattedMath("\\color{#ef4444}{12.5}")).toEqual([
      { text: "12.5", color: "#ef4444" },
    ])
  })
})
