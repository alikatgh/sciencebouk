import { describe, expect, it } from "vitest"
import {
  applySettingsToDocument,
  parseStoredSettings,
  resolveThemeMode,
} from "./SettingsContext"

describe("SettingsContext helpers", () => {
  it("parses valid stored settings and ignores invalid values", () => {
    const settings = parseStoredSettings(JSON.stringify({
      theme: "dark",
      fontSize: "large",
      reducedMotion: true,
      animationSpeed: "slow",
      highContrast: true,
      colorBlindMode: true,
      fontFamily: "Inter",
      formulaSize: 120,
      sidebarCollapsed: true,
      language: "mn",
      soundVolume: 75,
      invalidKey: "ignored",
    }))

    expect(settings.theme).toBe("dark")
    expect(settings.fontSize).toBe("large")
    expect(settings.reducedMotion).toBe(true)
    expect(settings.animationSpeed).toBe("slow")
    expect(settings.highContrast).toBe(true)
    expect(settings.colorBlindMode).toBe(true)
    expect(settings.fontFamily).toBe("Inter")
    expect(settings.formulaSize).toBe(120)
    expect(settings.sidebarCollapsed).toBe(true)
    expect(settings.language).toBe("mn")
    expect(settings.soundVolume).toBe(75)

    const invalid = parseStoredSettings(JSON.stringify({
      theme: "neon",
      fontSize: "huge",
      fontFamily: "Comic Sans",
      soundVolume: Number.NaN,
    }))

    expect(invalid.theme).toBe("system")
    expect(invalid.fontSize).toBe("medium")
    expect(invalid.fontFamily).toBe("STIX Two Text")
    expect(invalid.soundVolume).toBe(50)
  })

  it("resolves theme mode from system preference", () => {
    expect(resolveThemeMode("dark", false)).toBe("dark")
    expect(resolveThemeMode("light", true)).toBe("light")
    expect(resolveThemeMode("system", true)).toBe("dark")
    expect(resolveThemeMode("system", false)).toBe("light")
  })

  it("applies document classes and CSS variables in one pass", () => {
    const root = document.createElement("div")
    const settings = parseStoredSettings(JSON.stringify({
      theme: "system",
      reducedMotion: true,
      highContrast: true,
      colorBlindMode: true,
      fontSize: "small",
      animationSpeed: "fast",
      formulaSize: 115,
      fontFamily: "Inter",
    }))

    applySettingsToDocument(root, settings, "dark")

    expect(root.classList.contains("dark")).toBe(true)
    expect(root.classList.contains("reduce-motion")).toBe(true)
    expect(root.classList.contains("high-contrast")).toBe(true)
    expect(root.classList.contains("color-blind")).toBe(true)
    expect(root.style.fontSize).toBe("14px")
    expect(root.style.getPropertyValue("--formula-scale")).toBe("1.15")
    expect(root.style.getPropertyValue("--animation-speed")).toBe("0.5")
    expect(root.style.getPropertyValue("--font-body")).toContain("\"Inter\", sans-serif")
  })
})
