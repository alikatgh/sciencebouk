import type { ReactElement } from "react"
import { useCallback, useState } from "react"
import { Volume2, VolumeX, Type, Eye, Palette, Gauge, Globe, Keyboard, RotateCcw, Trash2 } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { api } from "../api/client"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Separator } from "./ui/separator"
import { Slider } from "./ui/slider"
import { Switch } from "./ui/switch"
import { TopNav } from "./TopNav"
import { clearStoredProgress } from "../progress/useProgress"
import { useSettings, type Settings } from "../settings/SettingsContext"

function SettingRow({ label, description, children }: { label: string; description?: string; children: ReactElement }): ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function SegmentedControl({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}): ReactElement {
  return (
    <div className="flex flex-shrink-0 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
            value === opt.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function SettingsPage(): ReactElement {
  const { isAuthenticated } = useAuth()
  const { settings, update, reset } = useSettings()
  const [clearingProgress, setClearingProgress] = useState(false)

  const clearProgress = useCallback(async () => {
    if (!confirm("This will erase all your progress. Are you sure?")) return
    setClearingProgress(true)
    try {
      if (isAuthenticated) {
        await api.progress.clear()
      }
      clearStoredProgress()
    } finally {
      setClearingProgress(false)
    }
  }, [isAuthenticated])

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopNav showBack left={<span className="text-base font-bold text-slate-900 dark:text-white">Settings</span>} />

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* 2-column grid on wide screens */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Appearance */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4 text-slate-400" /> Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <SettingRow label="Theme" description="Light, dark, or follow system">
                <SegmentedControl value={settings.theme} onChange={(v) => update("theme", v as Settings["theme"])}
                  options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} />
              </SettingRow>
              <Separator />
              <SettingRow label="Font size" description="Text size across the app">
                <SegmentedControl value={settings.fontSize} onChange={(v) => update("fontSize", v as Settings["fontSize"])}
                  options={[{ value: "small", label: "S" }, { value: "medium", label: "M" }, { value: "large", label: "L" }]} />
              </SettingRow>
              <Separator />
              <SettingRow label="High contrast" description="Better readability">
                <Switch checked={settings.highContrast} onCheckedChange={(v) => update("highContrast", v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Color blind mode" description="Patterns + colors">
                <Switch checked={settings.colorBlindMode} onCheckedChange={(v) => update("colorBlindMode", v)} />
              </SettingRow>
            </CardContent>
          </Card>

          {/* Formula Display */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Type className="h-4 w-4 text-slate-400" /> Formula Display
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <SettingRow label="Formula size" description={`${settings.formulaSize}%`}>
                <Slider className="w-28" min={75} max={150} step={5}
                  value={[settings.formulaSize]} onValueChange={([v]) => update("formulaSize", v)} trackColor="#3b82f6" />
              </SettingRow>
              <Separator />
              <SettingRow label="Letter formula" description="a² + b² = c²">
                <Switch checked={settings.showFormulaLetters} onCheckedChange={(v) => update("showFormulaLetters", v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Live numbers" description="3² + 4² = 5²">
                <Switch checked={settings.showFormulaNumbers} onCheckedChange={(v) => update("showFormulaNumbers", v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Result description" description="Human explanation">
                <Switch checked={settings.showResultNote} onCheckedChange={(v) => update("showResultNote", v)} />
              </SettingRow>
            </CardContent>
          </Card>

          {/* Animation & Sound */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Gauge className="h-4 w-4 text-slate-400" /> Animation & Sound
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <SettingRow label="Reduced motion" description="Disable animations">
                <Switch checked={settings.reducedMotion} onCheckedChange={(v) => update("reducedMotion", v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Animation speed">
                <SegmentedControl value={settings.animationSpeed} onChange={(v) => update("animationSpeed", v as Settings["animationSpeed"])}
                  options={[{ value: "off", label: "Off" }, { value: "slow", label: "Slow" }, { value: "normal", label: "Normal" }, { value: "fast", label: "Fast" }]} />
              </SettingRow>
              <Separator />
              <SettingRow label="Sound effects">
                <Switch checked={settings.soundEnabled} onCheckedChange={(v) => update("soundEnabled", v)} />
              </SettingRow>
              {settings.soundEnabled && (
                <>
                  <Separator />
                  <SettingRow label="Volume" description={`${settings.soundVolume}%`}>
                    <Slider className="w-28" min={0} max={100} step={5}
                      value={[settings.soundVolume]} onValueChange={([v]) => update("soundVolume", v)} trackColor="#3b82f6" />
                  </SettingRow>
                </>
              )}
            </CardContent>
          </Card>

          {/* Learning */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-slate-400" /> Learning
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <SettingRow label="Difficulty">
                <SegmentedControl value={settings.difficulty} onChange={(v) => update("difficulty", v as Settings["difficulty"])}
                  options={[{ value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Mid" }, { value: "advanced", label: "Advanced" }]} />
              </SettingRow>
              <Separator />
              <SettingRow label="Auto-start lessons" description="Begin guided lesson on open">
                <Switch checked={settings.autoStartLesson} onCheckedChange={(v) => update("autoStartLesson", v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Show hints" description="After 10s of inactivity">
                <Switch checked={settings.showHints} onCheckedChange={(v) => update("showHints", v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Show context" description="Real-world hooks">
                <Switch checked={settings.showHookText} onCheckedChange={(v) => update("showHookText", v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Daily goal" description={`${settings.dailyGoalMinutes} min/day`}>
                <Slider className="w-28" min={5} max={60} step={5}
                  value={[settings.dailyGoalMinutes]} onValueChange={([v]) => update("dailyGoalMinutes", v)} trackColor="#10b981" />
              </SettingRow>
            </CardContent>
          </Card>

          {/* Layout & Accessibility */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-slate-400" /> Layout & Accessibility
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <SettingRow label="Language">
                <SegmentedControl value={settings.language} onChange={(v) => update("language", v)}
                  options={[{ value: "en", label: "EN" }, { value: "es", label: "ES" }, { value: "fr", label: "FR" }, { value: "de", label: "DE" }, { value: "ru", label: "RU" }]} />
              </SettingRow>
              <Separator />
              <SettingRow label="Keyboard shortcuts" description="Show hints in UI">
                <Switch checked={settings.showKeyboardShortcuts} onCheckedChange={(v) => update("showKeyboardShortcuts", v)} />
              </SettingRow>
              <Separator />
              <SettingRow label="Sidebar collapsed" description="Start with sidebar closed">
                <Switch checked={settings.sidebarCollapsed} onCheckedChange={(v) => update("sidebarCollapsed", v)} />
              </SettingRow>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <Trash2 className="h-4 w-4" /> Data
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <SettingRow label="Reset settings" description="Restore all to defaults">
                <Button variant="outline" size="sm" onClick={reset}>
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              </SettingRow>
              <Separator />
              <SettingRow label="Clear progress" description="Erase all completed equations">
                <Button variant="destructive" size="sm" onClick={clearProgress} disabled={clearingProgress}>
                  <Trash2 className="h-3 w-3" /> Clear
                </Button>
              </SettingRow>
            </CardContent>
          </Card>

        </div>

        <p className="mt-6 text-center text-xs text-slate-300 dark:text-slate-700">
          Sciencebouk v0.1.0
        </p>
      </div>
    </main>
  )
}
