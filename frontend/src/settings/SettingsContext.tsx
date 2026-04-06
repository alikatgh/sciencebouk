import type { ReactElement, ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export interface Settings {
  theme: "light" | "dark" | "system"
  fontSize: "small" | "medium" | "large"
  reducedMotion: boolean
  animationSpeed: "off" | "slow" | "normal" | "fast"
  soundEnabled: boolean
  soundVolume: number
  showHints: boolean
  showHookText: boolean
  autoStartLesson: boolean
  difficulty: "beginner" | "intermediate" | "advanced"
  dailyGoalMinutes: number
  showKeyboardShortcuts: boolean
  highContrast: boolean
  colorBlindMode: boolean
  language: string
  formulaSize: number
  sidebarCollapsed: boolean
  showFormulaLetters: boolean
  showFormulaNumbers: boolean
  showResultNote: boolean
  fontFamily: string
}

const DEFAULTS: Settings = {
  theme: "system",
  fontSize: "medium",
  reducedMotion: false,
  animationSpeed: "normal",
  soundEnabled: false,
  soundVolume: 50,
  showHints: true,
  showHookText: true,
  autoStartLesson: true,
  difficulty: "beginner",
  dailyGoalMinutes: 10,
  showKeyboardShortcuts: true,
  highContrast: false,
  colorBlindMode: false,
  language: "en",
  formulaSize: 100,
  sidebarCollapsed: false,
  showFormulaLetters: true,
  showFormulaNumbers: true,
  showResultNote: true,
  fontFamily: "STIX Two Text",
}

export const SETTINGS_STORAGE_KEY = "sciencebouk-settings"

const FONT_IDS = new Set([
  "STIX Two Text",
  "Lora",
  "Merriweather",
  "EB Garamond",
  "Crimson Text",
  "Source Serif 4",
  "Libre Baskerville",
  "Playfair Display",
  "Spectral",
  "Inter",
  "IBM Plex Sans",
  "DM Sans",
  "Manrope",
])

const SANS_FONT_IDS = new Set(["Inter", "IBM Plex Sans", "DM Sans", "Manrope"])

interface SettingsContextValue {
  settings: Settings
  resolvedTheme: "light" | "dark"
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider")
  return ctx
}

function load(): Settings {
  if (typeof localStorage === "undefined") return { ...DEFAULTS }

  try {
    return parseStoredSettings(localStorage.getItem(SETTINGS_STORAGE_KEY))
  } catch { return { ...DEFAULTS } }
}

function save(s: Settings) {
  if (typeof localStorage === "undefined") return

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s))
  } catch {
    // Keep the in-memory settings even if persistent storage is unavailable.
  }
}

export function parseStoredSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULTS }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const valid: Partial<Settings> = {}
    if (["light", "dark", "system"].includes(parsed.theme as string)) valid.theme = parsed.theme as Settings["theme"]
    if (["small", "medium", "large"].includes(parsed.fontSize as string)) valid.fontSize = parsed.fontSize as Settings["fontSize"]
    if (typeof parsed.reducedMotion === "boolean") valid.reducedMotion = parsed.reducedMotion
    if (["off", "slow", "normal", "fast"].includes(parsed.animationSpeed as string)) valid.animationSpeed = parsed.animationSpeed as Settings["animationSpeed"]
    if (typeof parsed.soundEnabled === "boolean") valid.soundEnabled = parsed.soundEnabled
    if (typeof parsed.soundVolume === "number" && Number.isFinite(parsed.soundVolume)) valid.soundVolume = parsed.soundVolume
    if (typeof parsed.showHints === "boolean") valid.showHints = parsed.showHints
    if (typeof parsed.showHookText === "boolean") valid.showHookText = parsed.showHookText
    if (typeof parsed.autoStartLesson === "boolean") valid.autoStartLesson = parsed.autoStartLesson
    if (["beginner", "intermediate", "advanced"].includes(parsed.difficulty as string)) valid.difficulty = parsed.difficulty as Settings["difficulty"]
    if (typeof parsed.dailyGoalMinutes === "number" && Number.isFinite(parsed.dailyGoalMinutes)) valid.dailyGoalMinutes = parsed.dailyGoalMinutes
    if (typeof parsed.showKeyboardShortcuts === "boolean") valid.showKeyboardShortcuts = parsed.showKeyboardShortcuts
    if (typeof parsed.highContrast === "boolean") valid.highContrast = parsed.highContrast
    if (typeof parsed.colorBlindMode === "boolean") valid.colorBlindMode = parsed.colorBlindMode
    if (typeof parsed.language === "string" && parsed.language.length > 0) valid.language = parsed.language
    if (typeof parsed.formulaSize === "number" && Number.isFinite(parsed.formulaSize)) valid.formulaSize = parsed.formulaSize
    if (typeof parsed.sidebarCollapsed === "boolean") valid.sidebarCollapsed = parsed.sidebarCollapsed
    if (typeof parsed.showFormulaLetters === "boolean") valid.showFormulaLetters = parsed.showFormulaLetters
    if (typeof parsed.showFormulaNumbers === "boolean") valid.showFormulaNumbers = parsed.showFormulaNumbers
    if (typeof parsed.showResultNote === "boolean") valid.showResultNote = parsed.showResultNote
    if (typeof parsed.fontFamily === "string" && FONT_IDS.has(parsed.fontFamily)) valid.fontFamily = parsed.fontFamily
    return { ...DEFAULTS, ...valid }
  } catch {
    return { ...DEFAULTS }
  }
}

export function resolveThemeMode(theme: Settings["theme"], systemDark: boolean): "light" | "dark" {
  return theme === "system"
    ? (systemDark ? "dark" : "light")
    : theme
}

export function applySettingsToDocument(root: HTMLElement, settings: Settings, resolvedTheme: "light" | "dark"): void {
  root.classList.toggle("dark", resolvedTheme === "dark")
  root.classList.toggle("reduce-motion", settings.reducedMotion)
  root.classList.toggle("high-contrast", settings.highContrast)
  root.classList.toggle("color-blind", settings.colorBlindMode)

  root.style.fontSize = { small: "14px", medium: "16px", large: "18px" }[settings.fontSize]
  root.style.setProperty("--formula-scale", String(settings.formulaSize / 100))

  const speeds = { off: "0", slow: "2", normal: "1", fast: "0.5" }
  root.style.setProperty("--animation-speed", speeds[settings.animationSpeed])

  const isSerif = !SANS_FONT_IDS.has(settings.fontFamily)
  root.style.setProperty(
    "--font-body",
    `"${settings.fontFamily}", ${isSerif ? "serif" : "sans-serif"}`,
  )
}

export function SettingsProvider({ children }: { children: ReactNode }): ReactElement {
  const [settings, setSettings] = useState(load)
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      save(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setSettings({ ...DEFAULTS })
    save(DEFAULTS)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemDark(event.matches)
    }

    setSystemDark(mediaQuery.matches)
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SETTINGS_STORAGE_KEY && event.key !== null) return
      setSettings(parseStoredSettings(event.newValue))
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const resolvedTheme = resolveThemeMode(settings.theme, systemDark)

  useEffect(() => {
    applySettingsToDocument(document.documentElement, settings, resolvedTheme)
  }, [resolvedTheme, settings])

  const value = useMemo(() => ({ settings, resolvedTheme, update, reset }), [settings, resolvedTheme, update, reset])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
