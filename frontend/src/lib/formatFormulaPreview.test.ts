import { describe, expect, it } from "vitest"
import { formatFormulaPreview } from "./formatFormulaPreview"

describe("formatFormulaPreview", () => {
  it("formats simple superscripts without KaTeX", () => {
    expect(formatFormulaPreview("a^2+b^2=c^2")).toBe("a² + b² = c²")
  })

  it("formats fractions and limits into readable text", () => {
    expect(formatFormulaPreview("\\frac{df}{dt}=\\lim_{h\\to0}\\frac{f(t+h)-f(t)}{h}"))
      .toBe("(df)/(dt) = lim_(h→0)(f(t + h) - f(t))/(h)")
  })

  it("formats greek letters and inequalities", () => {
    expect(formatFormulaPreview("dS\\ge0")).toBe("dS≥0")
  })

  it("formats roots and products", () => {
    expect(formatFormulaPreview("\\sqrt{2\\pi\\sigma}")).toBe("√(2πσ)")
  })
})
