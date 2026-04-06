import type { ReactElement, ReactNode } from "react"
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, Sparkles, PanelRightOpen, PanelBottomOpen } from "lucide-react"
import { useDocumentVisibility } from "../../hooks/useDocumentVisibility"
import { useNarrow } from "../../hooks/useMediaQuery"
import { useAuth } from "../../auth/AuthContext"
import { api } from "../../api/client"
import { useProgress } from "../../progress/useProgress"
import { useEquationId } from "./EquationContext"
import { useSettings } from "../../settings/SettingsContext"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { ResizablePanel } from "../ui/resizable-panel"
import { TouchableFormula } from "./TouchableFormula"
import { useLatexFormula } from "./FormulaContext"
import type { Variable, LessonStep, GlossaryTerm } from "./types"
import { ErrorBoundary } from "../ErrorBoundary"

const LiveFormula = lazy(() => import("./LiveFormula").then((module) => ({ default: module.LiveFormula })))
const LessonRunner = lazy(() => import("./LessonRunner").then((module) => ({ default: module.LessonRunner })))

export interface Preset {
  label: string
  values: Record<string, number>
}

interface TeachableEquationProps {
  equationId?: number
  hook: string
  hookAction: string
  formula: string
  latexFormula?: string
  variables: Variable[]
  lessonSteps: LessonStep[]
  buildLiveFormula?: (vars: Record<string, number>) => string
  buildResultLine?: (vars: Record<string, number>) => string
  describeResult?: (vars: Record<string, number>) => string
  presets?: Preset[]
  glossary?: GlossaryTerm[]
  children: (props: {
    vars: Record<string, number>
    setVar: (name: string, value: number) => void
    highlightedVar: string | null
    setHighlightedVar: (name: string | null) => void
    highlightedTerm: string | null
  }) => ReactNode
}

function FormulaFallback(): ReactElement {
  return (
    <div className="h-12 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
  )
}

function LessonFallback(): ReactElement {
  return (
    <div className="space-y-2">
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

export function TeachableEquation({
  equationId, hook, hookAction, formula, latexFormula,
  variables: initialVariables, lessonSteps,
  buildLiveFormula, buildResultLine, describeResult, presets, glossary, children,
}: TeachableEquationProps): ReactElement {
  const { isAuthenticated, isPro } = useAuth()
  const contextFormula = useLatexFormula()
  const contextEquationId = useEquationId()
  const resolvedId = equationId ?? contextEquationId

  // Progress tracking — writes to localStorage (and server for Pro)
  const { progress, updateProgress, markVariableExplored } = useProgress(resolvedId)
  const progressEnabled = resolvedId > 0
  const displayFormula = latexFormula || contextFormula

  const [vars, setVars] = useState<Record<string, number>>(() => {
    const r: Record<string, number> = {}
    for (const v of initialVariables) r[v.name] = v.value
    return r
  })

  const [highlightedVar, setHighlightedVar] = useState<string | null>(null)
  const [highlightedTerm, setHighlightedTerm] = useState<string | null>(null)
  const { settings: appSettings } = useSettings()
  const isDocumentVisible = useDocumentVisibility()
  const [lessonMode, setLessonMode] = useState(appSettings.autoStartLesson)
  const [lessonStep, setLessonStep] = useState(0)
  const [stepCompleted, setStepCompleted] = useState(false)
  const prevVarsRef = useRef(vars)
  const progressRef = useRef(progress)

  useEffect(() => {
    setLessonMode(appSettings.autoStartLesson)
  }, [appSettings.autoStartLesson])

  const setVar = useCallback((name: string, value: number) => { setVars((p) => ({ ...p, [name]: value })) }, [])

  // Compute lockedVars early (as a stable Set) so applyPreset can reference it.
  // This mirrors the same logic used later for formulaVariables — kept in sync via useMemo.
  const lockedVarsMemo = useMemo<Set<string>>(() => {
    const locked = new Set<string>()
    if (lessonMode && lessonSteps[lessonStep]) {
      const unlocked = new Set(lessonSteps[lessonStep].unlockedVariables)
      for (const v of initialVariables) {
        if (!v.constant && !unlocked.has(v.name)) locked.add(v.name)
      }
    }
    return locked
  }, [lessonMode, lessonStep, lessonSteps, initialVariables])

  const applyPreset = useCallback((preset: Preset) => {
    setVars((p) => {
      const filtered = Object.fromEntries(
        Object.entries(preset.values).filter(([k]) => !lockedVarsMemo.has(k))
      )
      return { ...p, ...filtered }
    })
  }, [lockedVarsMemo])

  const currentVariables = initialVariables.map((v) => ({ ...v, value: vars[v.name] ?? v.value }))

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    if (!lessonMode || stepCompleted) return
    const step = lessonSteps[lessonStep]
    if (!step) return
    const c = step.successCondition
    const previousVars = prevVarsRef.current
    switch (c.type) {
      case 'variable_changed': {
        if (c.target) { const prev = previousVars[c.target]; const curr = vars[c.target]; if (prev !== undefined && curr !== undefined && prev !== curr) setStepCompleted(true) }
        break
      }
      case 'value_reached': {
        if (c.target && c.value !== undefined) { const curr = vars[c.target]; if (curr !== undefined && Math.abs(curr - c.value) <= (c.tolerance ?? 0.5)) setStepCompleted(true) }
        break
      }
      case 'time_elapsed': {
        const timer = setTimeout(() => setStepCompleted(true), c.duration ?? 15000)
        return () => clearTimeout(timer)
      }
    }
  }, [vars, lessonMode, lessonStep, lessonSteps, stepCompleted])

  // Track time spent — tick every 5 seconds
  useEffect(() => {
    if (!progressEnabled || !isDocumentVisible) return
    const timer = setInterval(() => {
      updateProgress({ timeSpentSeconds: progressRef.current.timeSpentSeconds + 5 })
    }, 5000)
    return () => clearInterval(timer)
  }, [isDocumentVisible, progressEnabled, updateProgress])

  // Track variable exploration
  useEffect(() => {
    if (!progressEnabled) return
    const previousVars = prevVarsRef.current
    for (const key of Object.keys(vars)) {
      if (previousVars[key] !== vars[key]) {
        markVariableExplored(key)
      }
    }
    prevVarsRef.current = vars
  }, [vars, progressEnabled, markVariableExplored])

  const advanceLesson = useCallback(() => {
    const completedStepIndex = lessonStep
    const isLastStep = lessonStep >= lessonSteps.length - 1

    if (!isLastStep) {
      setLessonStep((p) => p + 1)
      setStepCompleted(false)
    }

    // Update progress with current lesson step
    if (progressEnabled) {
      updateProgress({
        lessonStep: lessonSteps[completedStepIndex]?.id ?? "",
        ...(isLastStep ? { completed: true } : {}),
      })
    }

    // Log event for Pro users
    if (isPro && isAuthenticated && resolvedId > 0) {
      api.analytics.logEvent(resolvedId, isLastStep ? 'lesson_completed' : 'lesson_step_completed', { step: completedStepIndex }).catch(() => {})
    }
  }, [lessonStep, lessonSteps, isPro, isAuthenticated, resolvedId, progressEnabled, updateProgress])

  const resetLesson = useCallback(() => {
    setLessonStep(0); setStepCompleted(false)
    const r: Record<string, number> = {}
    for (const v of initialVariables) r[v.name] = v.value
    setVars(r)
  }, [initialVariables])

  // lockedVarsMemo is computed above (before applyPreset) and is the single source of truth.
  const formulaVariables = currentVariables.map((v) => ({ ...v, locked: lockedVarsMemo.has(v.name) }))
  const hasLessons = lessonSteps.length > 0

  const [teachingPanelOpen, setTeachingPanelOpen] = useState(true)
  const isNarrow = useNarrow(900)
  const isMobile = useNarrow(480)
  const formulaCardVisible = appSettings.showFormulaLetters || appSettings.showFormulaNumbers
  const letterFormula = appSettings.showFormulaLetters ? displayFormula : ""
  const liveFormula = appSettings.showFormulaNumbers && buildLiveFormula ? buildLiveFormula(vars) : ""
  const resultLine = buildResultLine?.(vars)
  const resultNote = appSettings.showResultNote ? describeResult?.(vars) : undefined

  const teachingContent = (
    <div className={`flex flex-col gap-2 overflow-y-auto ${isNarrow ? "px-2 py-1.5" : "h-full pl-2"}`}>

        {/* Hook — conditionally shown, compact on mobile */}
        {appSettings.showHookText && (
          <div className={`rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 ${isMobile ? "px-3 py-2" : "px-4 py-3"}`}>
            <p className={`font-semibold leading-snug text-slate-800 dark:text-slate-100 ${isMobile ? "text-xs" : "text-sm"}`}>{hook}</p>
            <p className="mt-1.5 text-xs font-bold text-ocean">{"\u2192"} {hookAction}</p>
          </div>
        )}

        {/* Live formula — respects settings */}
        {formulaCardVisible && (
          <Card>
            <CardContent className="p-3">
              <ErrorBoundary fallback={<FormulaFallback />}>
                <Suspense fallback={<FormulaFallback />}>
                  {buildLiveFormula ? (
                    <LiveFormula
                      letterFormula={letterFormula}
                      liveFormula={liveFormula}
                      resultLine={resultLine}
                      resultNote={resultNote}
                      variables={formulaVariables}
                      onVariableChange={setVar}
                    />
                  ) : displayFormula && appSettings.showFormulaLetters ? (
                    <LiveFormula
                      letterFormula={displayFormula}
                      liveFormula={displayFormula}
                      variables={formulaVariables}
                      onVariableChange={setVar}
                    />
                  ) : null}
                </Suspense>
              </ErrorBoundary>
            </CardContent>
          </Card>
        )}

        {/* Variables */}
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Variables</CardTitle>
          </CardHeader>
          <CardContent className="px-1 pb-2">
            <TouchableFormula
              variables={formulaVariables} onVariableChange={setVar}
              highlightedVariable={highlightedVar} onVariableHover={setHighlightedVar} formula={formula}
            />
          </CardContent>
        </Card>

        {/* Presets */}
        {presets && presets.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <Button key={p.label} variant="outline" size="xs" onClick={() => applyPreset(p)} className="text-[10px]">
                {p.label}
              </Button>
            ))}
          </div>
        )}

        {/* Lesson — at bottom, after presets */}
        {hasLessons && lessonMode && (
          <Card className="border-ocean/30 bg-ocean/5 dark:border-ocean/40 dark:bg-ocean/10">
            <CardHeader className="flex-row items-center justify-between space-y-0 p-3 pb-2">
              <CardTitle className="flex items-center gap-1.5 text-xs text-ocean">
                <BookOpen className="h-3.5 w-3.5" /> Guided lesson
              </CardTitle>
              <Button variant="ghost" size="xs" onClick={() => setLessonMode(false)} className="text-ocean/60 hover:text-ocean">
                Skip
              </Button>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <ErrorBoundary fallback={<LessonFallback />}>
                <Suspense fallback={<LessonFallback />}>
                  <LessonRunner
                    steps={lessonSteps} currentStepIndex={lessonStep}
                    onAdvance={advanceLesson} onReset={resetLesson} stepCompleted={stepCompleted}
                    variables={formulaVariables} onHighlight={setHighlightedVar}
                    glossary={glossary} onTermHighlight={setHighlightedTerm}
                  />
                </Suspense>
              </ErrorBoundary>
            </CardContent>
          </Card>
        )}

        {hasLessons && !lessonMode && (
          <Button variant="outline" className="w-full justify-start gap-2 border-dashed border-ocean/30 text-ocean" onClick={() => { setLessonMode(true); resetLesson() }}>
            <Sparkles className="h-3.5 w-3.5" /> Restart lesson
          </Button>
        )}
      </div>
  )

  if (isNarrow) {
    // Vertical stack: visualization on top, teaching panel below
    // On mobile (<480px), panel is max 35vh and starts collapsed
    const panelMaxHeight = isMobile ? "35vh" : "45vh"

    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1 flex items-center justify-center overflow-hidden">
          <div className={`w-full ${isMobile ? "max-h-[50vh]" : "h-full"}`} style={isMobile ? { aspectRatio: "4/3", maxWidth: "100%" } : undefined}>
            {children({ vars, setVar, highlightedVar, setHighlightedVar, highlightedTerm })}
          </div>
        </div>

        {!teachingPanelOpen ? (
          <button
            onClick={() => setTeachingPanelOpen(true)}
            className="flex-shrink-0 self-center rounded-t-lg border border-b-0 border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800"
            type="button"
            aria-label="Open teaching panel"
          >
            <span className="flex items-center gap-1.5">
              <PanelBottomOpen className="h-3.5 w-3.5" />
              {isMobile ? "Show" : "Show panel"}
            </span>
          </button>
        ) : (
          <div className="flex-shrink-0 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" style={{ maxHeight: panelMaxHeight, overflowY: "auto" }}>
            <button
              onClick={() => setTeachingPanelOpen(false)}
              className="sticky top-0 z-10 flex min-h-[44px] w-full items-center justify-center border-b border-slate-100 bg-white/90 text-[10px] font-medium text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"
              type="button"
              aria-label="Collapse teaching panel"
            >
              <span className="h-1 w-8 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
            </button>
            {teachingContent}
          </div>
        )}
      </div>
    )
  }

  // Desktop: side-by-side with resizable panel
  return (
    <div className="flex h-full gap-0">
      <div className="min-h-0 min-w-0 flex-1">
        {children({ vars, setVar, highlightedVar, setHighlightedVar, highlightedTerm })}
      </div>

      {!teachingPanelOpen && (
        <button
          onClick={() => setTeachingPanelOpen(true)}
          className="flex-shrink-0 self-start rounded-l-lg border border-r-0 border-slate-200 bg-white px-1.5 py-3 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800"
          type="button"
          aria-label="Open teaching panel"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      )}

      <ResizablePanel
        edge="left"
        defaultWidth={272}
        minWidth={200}
        maxWidth={400}
        open={teachingPanelOpen}
        onCollapse={() => setTeachingPanelOpen(false)}
        storageKey="sciencebouk-teaching-panel-width"
      >
        {teachingContent}
      </ResizablePanel>
    </div>
  )
}
