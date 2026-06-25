import { describe, expect, it } from "vitest"
import { buildShareCardSvg } from "./shareCard"

describe("buildShareCardSvg", () => {
  it("produces a valid SVG containing the title, result and attribution", () => {
    const svg = buildShareCardSvg({ title: "Ohm's Law", resultLabel: "V = 21 V", author: "Georg Ohm", year: "1827" })
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true)
    expect(svg).toContain("Ohm&apos;s Law") // title present, apostrophe XML-escaped
    expect(svg).toContain("V = 21 V")
    expect(svg).toContain("Georg Ohm, 1827")
  })

  it("escapes XML-significant characters to stay well-formed", () => {
    const svg = buildShareCardSvg({ title: "A < B & C", resultLabel: "x > 1" })
    expect(svg).toContain("A &lt; B &amp; C")
    expect(svg).toContain("x &gt; 1")
    expect(svg).not.toContain("A < B & C")
  })

  it("omits the result and attribution lines when not provided", () => {
    const svg = buildShareCardSvg({ title: "Just a title" })
    expect(svg).toContain("Just a title")
    expect(svg).not.toContain("monospace") // no result line
  })
})
