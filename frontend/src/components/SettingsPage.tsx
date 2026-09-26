import type { ReactElement } from "react"
import { cloneElement, useCallback, useId, useState } from "react"
import { Palette, Gauge, RotateCcw, Trash2, GraduationCap } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { api } from "../api/client"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Separator } from "./ui/separator"
import { Slider } from "./ui/slider"
import { Switch } from "./ui/switch"
import { PageFrame } from "./PageFrame"
import "katex/dist/katex.min.css"
import { InlineMath } from "react-katex"
import { clearStoredProgress } from "../progress/useProgress"
import { LANGUAGE_OPTIONS } from "../i18n/locales"
import { useSettings, type Settings } from "../settings/SettingsContext"

const FONTS = [
  { id: "STIX Two Text",     label: "STIX Two Text",    stack: '"STIX Two Text", serif',    desc: "Nature \u00b7 Science \u00b7 APS",  category: "serif" },
  { id: "Lora",              label: "Lora",              stack: '"Lora", serif',              desc: "Editorial serif",          category: "serif" },
  { id: "Merriweather",      label: "Merriweather",      stack: '"Merriweather", serif',      desc: "Highly readable",          category: "serif" },
  { id: "EB Garamond",       label: "EB Garamond",       stack: '"EB Garamond", serif',       desc: "Classic Renaissance",      category: "serif" },
  { id: "Crimson Text",      label: "Crimson Text",      stack: '"Crimson Text", serif',      desc: "Elegant book typeface",    category: "serif" },
  { id: "Source Serif 4",    label: "Source Serif 4",    stack: '"Source Serif 4", serif',    desc: "Adobe \u00b7 clean & modern",  category: "serif" },
  { id: "Libre Baskerville", label: "Libre Baskerville", stack: '"Libre Baskerville", serif', desc: "Classic Baskerville",      category: "serif" },
  { id: "Playfair Display",  label: "Playfair Display",  stack: '"Playfair Display", serif',  desc: "Elegant high-contrast",   category: "serif" },
  { id: "Spectral",          label: "Spectral",          stack: '"Spectral", serif',          desc: "Literary & editorial",     category: "serif" },
  { id: "Inter",             label: "Inter",             stack: '"Inter", sans-serif',         desc: "Clean modern sans-serif", category: "sans" },
  { id: "IBM Plex Sans",     label: "IBM Plex Sans",     stack: '"IBM Plex Sans", sans-serif', desc: "Technical & geometric",  category: "sans" },
  { id: "DM Sans",           label: "DM Sans",           stack: '"DM Sans", sans-serif',       desc: "Friendly & contemporary",category: "sans" },
  { id: "Manrope",           label: "Manrope",           stack: '"Manrope", sans-serif',       desc: "Rounded geometric",       category: "sans" },
]

function FontCard({ font, selected, onSelect }: { font: typeof FONTS[0]; selected: boolean; onSelect: () => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
        selected
          ? "border-ocean bg-ocean/5 dark:border-ocean/70 dark:bg-ocean/10"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
      }`}
    >
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200" style={{ fontFamily: font.stack }}>
        {font.label}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{font.desc}</p>
    </button>
  )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: ReactElement<{ "aria-labelledby"?: string; "aria-describedby"?: string }> }): ReactElement {
  const id = useId()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 py-4">
      <div className="min-w-0 flex-1 basis-40">
        <p id={`${id}-label`} className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
        {description && <p id={`${id}-description`} className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="max-w-full">{cloneElement(children, {
        "aria-labelledby": `${id}-label`,
        "aria-describedby": description ? `${id}-description` : undefined,
      })}</div>
    </div>
  )
}

function SegmentedControl({ value, onChange, options, label, ...aria }: {
  value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  label?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
}): ReactElement {
  return (
    <div role="group" aria-label={label} {...aria} className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
          type="button"
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function FormulaPreview({ settings }: { settings: Settings }): ReactElement {
  const scale = settings.formulaSize / 100

  return (
    <div
      className="relative overflow-x-auto rounded-xl border border-ocean/15 bg-ocean/[0.04] px-5 py-5 dark:bg-ocean/10"
      style={{ fontSize: `${scale}em` }}
    >
      <p className="mb-3 text-xs font-semibold text-ocean" style={{ fontSize: '10px' }}>
        Live preview
      </p>
      <div className="flex flex-col gap-2">
        {settings.showFormulaLetters && (
          <div className="text-slate-800 dark:text-slate-200">
            <InlineMath math="E = mc^{2}" />
          </div>
        )}
        {settings.showFormulaNumbers && (
          <div className="text-blue-700 dark:text-blue-300">
            <InlineMath math="9 \times 10^{16} = 1 \times (3 \times 10^{8})^{2}" />
          </div>
        )}
        {settings.showResultNote && (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic" style={{ fontSize: '12px' }}>
            A small amount of mass converts to an enormous amount of energy.
          </p>
        )}
        {!settings.showFormulaLetters && !settings.showFormulaNumbers && !settings.showResultNote && (
          <p className="text-xs text-slate-400 italic" style={{ fontSize: '12px' }}>All formula display options are off</p>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage(): ReactElement {
  const { isAuthenticated, isPro } = useAuth()
  const { settings, update, reset } = useSettings()
  const [clearingProgress, setClearingProgress] = useState(false)

  const clearProgress = useCallback(async () => {
    if (!confirm("This will erase all your progress. Are you sure?")) return
    setClearingProgress(true)
    try {
      if (isAuthenticated && isPro) {
        await api.progress.clear()
      }
      clearStoredProgress()
    } finally {
      setClearingProgress(false)
    }
  }, [isAuthenticated, isPro])

  return (
    <PageFrame title="Settings" description="Make the studio feel right for you. Changes save as you go.">
      <nav aria-label="Settings sections" className="mb-7 flex flex-wrap gap-2">
        {[['learning', 'Learning'], ['interaction', 'Interaction'], ['appearance', 'Appearance'], ['data', 'Your data']].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-ocean/40 hover:text-ocean dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{label}</a>
        ))}
      </nav>
      <div className="space-y-6">
        {/* ── Learning Experience — full-width hero ── */}
        <Card id="learning" className="scroll-mt-24">
          <CardHeader className="p-6 pb-0">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <GraduationCap className="h-4 w-4 text-blue-500" /> Learning Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Left: Formula Display controls + preview */}
              <div>
                <p className="mb-2 text-sm font-semibold text-ocean">
                  Formula Display
                </p>
                <SettingRow label="Formula size" description={`${settings.formulaSize}%`}>
                  <Slider className="w-full max-w-full sm:w-36" min={75} max={150} step={5}
                    value={[settings.formulaSize]} onValueChange={([v]) => update("formulaSize", v)} />
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

                <div className="mt-3">
                  <FormulaPreview settings={settings} />
                </div>
              </div>

              {/* Right: Learning behavior */}
              <div>
                <p className="mb-2 text-sm font-semibold text-ocean">
                  Guidance
                </p>
                <SettingRow label="Difficulty">
                  <SegmentedControl value={settings.difficulty} onChange={(v) => update("difficulty", v as Settings["difficulty"])}
                    options={[{ value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Intermediate" }, { value: "advanced", label: "Advanced" }]} />
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
                  <Slider className="w-full max-w-full sm:w-36" min={5} max={60} step={5}
                    value={[settings.dailyGoalMinutes]} onValueChange={([v]) => update("dailyGoalMinutes", v)} />
                </SettingRow>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Two-column middle row ── */}
        <div className="grid items-start gap-6 lg:grid-cols-2">

          {/* Interaction & Motion */}
          <Card id="interaction" className="scroll-mt-24">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Gauge className="h-4 w-4 text-slate-400" /> Interaction & Motion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-3">
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
                    <Slider className="w-full max-w-full sm:w-36" min={0} max={100} step={5}
                      value={[settings.soundVolume]} onValueChange={([v]) => update("soundVolume", v)} />
                  </SettingRow>
                </>
              )}
              <Separator />
              <SettingRow label="Language">
                <SegmentedControl value={settings.language} onChange={(v) => update("language", v)}
                  options={[...LANGUAGE_OPTIONS]} />
              </SettingRow>
              <Separator />
              <SettingRow label="Keyboard shortcuts" description="Show hints in UI">
                <Switch checked={settings.showKeyboardShortcuts} onCheckedChange={(v) => update("showKeyboardShortcuts", v)} />
              </SettingRow>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card id="appearance" className="scroll-mt-24">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Palette className="h-4 w-4 text-slate-400" /> App Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-3">
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
              <Separator />
              <div className="py-2.5">
                <p className="mb-1 text-sm font-medium text-slate-900 dark:text-white">Reading font</p>
                <p className="mb-2.5 text-xs text-slate-400 dark:text-slate-500">Used for lessons, text, and all prose</p>
                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold text-slate-500">Serif</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FONTS.filter(f => f.category === "serif").map(f => (
                      <FontCard key={f.id} font={f} selected={settings.fontFamily === f.id} onSelect={() => update("fontFamily", f.id)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">Sans-serif</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FONTS.filter(f => f.category === "sans").map(f => (
                      <FontCard key={f.id} font={f} selected={settings.fontFamily === f.id} onSelect={() => update("fontFamily", f.id)} />
                    ))}
                  </div>
                </div>
              </div>
              <Separator />
              <SettingRow label="Sidebar collapsed" description="Start with sidebar closed">
                <Switch checked={settings.sidebarCollapsed} onCheckedChange={(v) => update("sidebarCollapsed", v)} />
              </SettingRow>
            </CardContent>
          </Card>

        </div>

        {/* Data actions */}
        <Card id="data" className="scroll-mt-24">
          <CardHeader className="p-6 pb-0">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <RotateCcw className="h-4 w-4" /> Data
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-3">
            <p className="mb-4 text-sm leading-6 text-slate-500 dark:text-slate-400">Reset your preferences to their defaults, or remove your learning history. Clearing progress cannot be undone.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="h-3 w-3" /> Reset settings
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={clearProgress} disabled={clearingProgress}>
                <Trash2 className="h-3 w-3" /> Clear progress
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </PageFrame>
  )
}
