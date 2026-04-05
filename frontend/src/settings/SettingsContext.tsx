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
    const raw = localStorage.getItem("formulas-settings")
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch { return { ...DEFAULTS } }
}

function save(s: Settings) {
  localStorage.setItem("formulas-settings", JSON.stringify(s))
}

export function SettingsProvider({ children }: { children: ReactNode }): ReactElement {
  const [settings, setSettings] = useState(load)

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

  // === APPLY THEME ===
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === "dark") {
      root.classList.add("dark")
    } else if (settings.theme === "light") {
      root.classList.remove("dark")
    } else {
      root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches)
    }
  }, [settings.theme])

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

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
