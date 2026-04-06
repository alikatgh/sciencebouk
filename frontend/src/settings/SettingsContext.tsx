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
}

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
  try {
    const raw = localStorage.getItem("sciencebouk-settings")
    if (!raw) return { ...DEFAULTS }
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
    return { ...DEFAULTS, ...valid }
  } catch { return { ...DEFAULTS } }
}

function save(s: Settings) {
  localStorage.setItem("sciencebouk-settings", JSON.stringify(s))
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

  const resolvedTheme = settings.theme === "system"
    ? (systemDark ? "dark" : "light")
    : settings.theme

  // === APPLY THEME ===
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedTheme === "dark")
  }, [resolvedTheme])

  // === APPLY FONT SIZE ===
  useEffect(() => {
    document.documentElement.style.fontSize = { small: "14px", medium: "16px", large: "18px" }[settings.fontSize]
  }, [settings.fontSize])

  // === APPLY REDUCED MOTION ===
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", settings.reducedMotion)
  }, [settings.reducedMotion])

  // === APPLY HIGH CONTRAST ===
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", settings.highContrast)
  }, [settings.highContrast])

  // === APPLY COLOR BLIND MODE ===
  useEffect(() => {
    document.documentElement.classList.toggle("color-blind", settings.colorBlindMode)
  }, [settings.colorBlindMode])

  // === APPLY FORMULA SIZE as CSS variable ===
  useEffect(() => {
    document.documentElement.style.setProperty("--formula-scale", String(settings.formulaSize / 100))
  }, [settings.formulaSize])

  // === APPLY ANIMATION SPEED as CSS variable ===
  useEffect(() => {
    const speeds = { off: "0", slow: "2", normal: "1", fast: "0.5" }
    document.documentElement.style.setProperty("--animation-speed", speeds[settings.animationSpeed])
  }, [settings.animationSpeed])

  const value = useMemo(() => ({ settings, resolvedTheme, update, reset }), [settings, resolvedTheme, update, reset])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
