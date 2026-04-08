import type { ReactElement, ReactNode } from "react"
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, Sparkles, PanelRightOpen, PanelBottomOpen } from "lucide-react"
import { useDocumentVisibility } from "../../hooks/useDocumentVisibility"
import { useContainerSize } from "../../hooks/useContainerSize"
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
import { VisualizationViewport } from "./VisualizationViewport"
import { shouldUseStackedTeachingLayout } from "./layoutMode"
import { AutoFitDeferredInlineMath } from "../math/AutoFitDeferredInlineMath"

const LiveFormula = lazy(() => import("./LiveFormula").then((module) => ({ default: module.LiveFormula })))
const LessonRunner = lazy(() => import("./LessonRunner").then((module) => ({ default: module.LessonRunner })))
const TEACHING_PANEL_STORAGE_KEY = "sciencebouk-teaching-panel-width"
const TEACHING_PANEL_DEFAULT_WIDTH = 272
const TEACHING_PANEL_MIN_WIDTH = 200
const TEACHING_PANEL_MAX_WIDTH = 400

function readStoredTeachingPanelWidth(): number {
  if (typeof window === "undefined") return TEACHING_PANEL_DEFAULT_WIDTH

  try {
    const stored = localStorage.getItem(TEACHING_PANEL_STORAGE_KEY)
    const parsed = Number(stored)
    if (Number.isFinite(parsed)) {
      return Math.max(TEACHING_PANEL_MIN_WIDTH, Math.min(TEACHING_PANEL_MAX_WIDTH, parsed))
    }
  } catch {
    // Fall back to the default width if storage is unavailable.
  }

  return TEACHING_PANEL_DEFAULT_WIDTH
}

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
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef)
  const isMobile = containerWidth > 0 && containerWidth < 480

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
  const resumeAppliedRef = useRef<number | null>(null)
  const lessonModeWasToggledRef = useRef(false)

  useEffect(() => {
    if (!lessonModeWasToggledRef.current) {
      setLessonMode(appSettings.autoStartLesson)
    }
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

  const currentVariables = useMemo(
    () => initialVariables.map((v) => ({ ...v, value: vars[v.name] ?? v.value })),
    [initialVariables, vars],
  )
  const currentStep = lessonSteps[lessonStep]

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    if (!progressEnabled || !lessonMode || lessonSteps.length === 0) return
    if (resumeAppliedRef.current === resolvedId) return

    const savedStepId = progress.lessonStep
    if (!savedStepId) return

    const resumeIndex = lessonSteps.findIndex((step) => step.id === savedStepId)
    if (resumeIndex >= 0) {
      setLessonStep(resumeIndex)
      setStepCompleted(false)
    }
    resumeAppliedRef.current = resolvedId
  }, [progress.lessonStep, progressEnabled, lessonMode, lessonSteps, resolvedId])

  // Single effect owns prevVarsRef so reads and writes are always in the same
  // commit — eliminates the race condition where two sibling effects with
  // different dep arrays could read/write prevVarsRef in different renders.
  useEffect(() => {
    const previousVars = prevVarsRef.current
    prevVarsRef.current = vars  // update immediately so next run sees fresh prev

    // Track variable exploration
    if (progressEnabled) {
      for (const key of Object.keys(vars)) {
        if (previousVars[key] !== vars[key]) {
          markVariableExplored(key)
        }
      }
    }

    // Check success condition
    if (!lessonMode || stepCompleted || !currentStep) return
    const c = currentStep.successCondition
    if (c.type === "time_elapsed") return
    switch (c.type) {
      case 'variable_changed': {
        if (c.target) { const prev = previousVars[c.target]; const curr = vars[c.target]; if (prev !== undefined && curr !== undefined && prev !== curr) setStepCompleted(true) }
        break
      }
      case 'value_reached': {
        if (c.target && c.value !== undefined) { const curr = vars[c.target]; if (curr !== undefined && Math.abs(curr - c.value) <= (c.tolerance ?? 0.5)) setStepCompleted(true) }
        break
      }
    }
  }, [vars, lessonMode, currentStep, stepCompleted, progressEnabled, markVariableExplored])

  useEffect(() => {
    if (!lessonMode || stepCompleted || !currentStep) return
    const c = currentStep.successCondition
    if (c.type !== "time_elapsed") return

    const timer = setTimeout(() => setStepCompleted(true), c.duration ?? 15000)
    return () => clearTimeout(timer)
  }, [lessonMode, currentStep, stepCompleted])

  // Track time spent — tick every 5 seconds
  useEffect(() => {
    if (!progressEnabled || !isDocumentVisible) return
    const timer = setInterval(() => {
      updateProgress({ timeSpentSeconds: progressRef.current.timeSpentSeconds + 5 })
    }, 5000)
    return () => clearInterval(timer)
  }, [isDocumentVisible, progressEnabled, updateProgress])

  const advanceLesson = useCallback(() => {
    const completedStepIndex = lessonStep
    const isLastStep = lessonStep >= lessonSteps.length - 1
    const nextStepId = isLastStep ? "" : lessonSteps[completedStepIndex + 1]?.id ?? ""

    if (!isLastStep) {
      setLessonStep((p) => p + 1)
      setStepCompleted(false)
    }

    // Persist the next step to resume from, not the one just completed.
    if (progressEnabled) {
      updateProgress({
        lessonStep: nextStepId,
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
    prevVarsRef.current = r
    setVars(r)
  }, [initialVariables])

  const disableLessonMode = useCallback(() => {
    lessonModeWasToggledRef.current = true
    setLessonMode(false)
  }, [])

  const restartLessonMode = useCallback(() => {
    lessonModeWasToggledRef.current = true
    setLessonMode(true)
    resetLesson()
  }, [resetLesson])

  // lockedVarsMemo is computed above (before applyPreset) and is the single source of truth.
  const formulaVariables = useMemo(
    () => currentVariables.map((v) => ({ ...v, locked: lockedVarsMemo.has(v.name) })),
    [currentVariables, lockedVarsMemo],
  )
  const hasLessons = lessonSteps.length > 0

  const [teachingPanelOpen, setTeachingPanelOpen] = useState(true)
  const [teachingPanelWidth, setTeachingPanelWidth] = useState(readStoredTeachingPanelWidth)
  const isNarrow = shouldUseStackedTeachingLayout({
    containerWidth,
    containerHeight,
    teachingPanelOpen,
    teachingPanelWidth,
  })
  const stackedVisualizationWrapperClass = isMobile
    ? "aspect-square min-h-[18rem] max-h-[24rem]"
    : "aspect-[4/3] max-h-[56vh]"
  const formulaCardVisible = appSettings.showFormulaLetters || appSettings.showFormulaNumbers
  const introFormulaVisible = appSettings.showHookText && appSettings.showFormulaLetters && Boolean(displayFormula)
  const letterFormula = introFormulaVisible ? "" : (appSettings.showFormulaLetters ? displayFormula : "")
  const liveFormula = useMemo(
    () => appSettings.showFormulaNumbers && buildLiveFormula ? buildLiveFormula(vars) : "",
    [appSettings.showFormulaNumbers, buildLiveFormula, vars],
  )
  const resultLine = useMemo(() => buildResultLine?.(vars), [buildResultLine, vars])
  const resultNote = useMemo(
    () => appSettings.showResultNote ? describeResult?.(vars) : undefined,
    [appSettings.showResultNote, describeResult, vars],
  )

  const teachingContent = (
    <div className={`flex flex-col overflow-y-auto ${isNarrow ? "gap-2 px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]" : "h-full gap-2.5 pl-2"}`}>

        {/* Hook — conditionally shown, compact on mobile */}
        {appSettings.showHookText && (
          <div className={`rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 ${isMobile ? "px-3 py-2" : "px-4 py-3"}`}>
            {introFormulaVisible && (
              <div className="mb-3 text-center text-sm text-slate-700 dark:text-slate-200">
                <AutoFitDeferredInlineMath
                  math={displayFormula}
                  className="inline-block whitespace-nowrap"
                />
              </div>
            )}
            <p className={`font-semibold leading-snug text-slate-800 dark:text-slate-100 ${isMobile ? "text-xs" : "text-sm"}`}>{hook}</p>
            <p className="mt-1.5 text-xs font-bold text-ocean">{"\u2192"} {hookAction}</p>
          </div>
        )}

        {/* Live formula — in its own prominent rounded box */}
        {formulaCardVisible && (
          <div className={`${isMobile ? "rounded-[20px] border border-ocean/25 px-3.5 py-3" : "rounded-xl border-2 px-4 py-4"} border-ocean/30 bg-white dark:border-ocean/40 dark:bg-slate-900`}>
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
                    compact={isMobile}
                  />
                ) : displayFormula && appSettings.showFormulaLetters ? (
                  <LiveFormula
                    letterFormula={displayFormula}
                    liveFormula={displayFormula}
                    variables={formulaVariables}
                    onVariableChange={setVar}
                    compact={isMobile}
                  />
                ) : null}
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {/* Variables */}
        <Card className={isMobile ? "rounded-[20px]" : undefined}>
          <CardHeader className={isMobile ? "p-3 pb-1.5" : "p-3 pb-1"}>
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Variables</CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "px-1.5 pb-2.5" : "px-1 pb-2"}>
            <TouchableFormula
              variables={formulaVariables} onVariableChange={setVar}
              highlightedVariable={highlightedVar} onVariableHover={setHighlightedVar} formula={formula}
            />
          </CardContent>
        </Card>

        {/* Presets */}
        {presets && presets.length > 0 && (
          <div className={`flex ${isMobile ? "-mx-1 overflow-x-auto px-1 pb-1" : "flex-wrap"} gap-1.5`}>
            {presets.map((p) => (
              <Button key={p.label} variant="outline" size="xs" onClick={() => applyPreset(p)} className={`${isMobile ? "h-9 shrink-0 rounded-full px-3.5 text-[11px]" : "text-[10px]"}`}>
                {p.label}
              </Button>
            ))}
          </div>
        )}

        {/* Lesson — at bottom, after presets */}
        {hasLessons && lessonMode && (
          <Card className={`${isMobile ? "rounded-[22px]" : ""} border-ocean/30 bg-ocean/5 dark:border-ocean/40 dark:bg-ocean/10`}>
            <CardHeader className={`flex-row items-center justify-between space-y-0 ${isMobile ? "p-3.5 pb-2.5" : "p-3 pb-2"}`}>
              <CardTitle className="flex items-center gap-1.5 text-xs text-ocean">
                <BookOpen className="h-3.5 w-3.5" /> Guided lesson
              </CardTitle>
              <Button variant="ghost" size="xs" onClick={disableLessonMode} className={`${isMobile ? "min-h-[36px] rounded-full px-3 text-[11px]" : ""} text-ocean/60 hover:text-ocean`}>
                Skip
              </Button>
            </CardHeader>
            <CardContent className={isMobile ? "px-3.5 pb-3.5" : "px-3 pb-3"}>
              <ErrorBoundary fallback={<LessonFallback />}>
                <Suspense fallback={<LessonFallback />}>
                  <LessonRunner
                    steps={lessonSteps} currentStepIndex={lessonStep}
                    onAdvance={advanceLesson} onReset={resetLesson} stepCompleted={stepCompleted}
                    variables={formulaVariables} onHighlight={setHighlightedVar}
                    glossary={glossary} onTermHighlight={setHighlightedTerm}
                    compact={isMobile}
                  />
                </Suspense>
              </ErrorBoundary>
            </CardContent>
          </Card>
        )}

        {hasLessons && !lessonMode && (
          <Button variant="outline" className={`${isMobile ? "min-h-[46px] rounded-[18px]" : ""} w-full justify-start gap-2 border-dashed border-ocean/30 text-ocean`} onClick={restartLessonMode}>
            <Sparkles className="h-3.5 w-3.5" /> Restart lesson
          </Button>
        )}
      </div>
	  )

  const visualizationContent = children({ vars, setVar, highlightedVar, setHighlightedVar, highlightedTerm })

  if (isNarrow) {
    // Vertical stack: visualization on top, teaching panel below
    const panelMaxHeight = isMobile ? "min(42vh, 24rem)" : "45vh"

    return (
      <div ref={containerRef} className="flex h-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full items-start justify-center overflow-hidden px-0 pt-0.5 sm:px-0 sm:pt-0">
            <div className={`w-full max-w-full ${stackedVisualizationWrapperClass}`}>
              <VisualizationViewport>
                {visualizationContent}
              </VisualizationViewport>
            </div>
          </div>
        </div>

        {!teachingPanelOpen ? (
          <button
            onClick={() => setTeachingPanelOpen(true)}
            className="mb-1 flex-shrink-0 self-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            type="button"
            aria-label="Open teaching panel"
          >
            <span className="flex items-center gap-1.5">
              <PanelBottomOpen className="h-3.5 w-3.5" />
              {isMobile ? "Show" : "Show panel"}
            </span>
          </button>
        ) : (
          <div
            className="flex-shrink-0 rounded-t-[28px] border border-b-0 border-slate-200 bg-white shadow-[0_-10px_35px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
            style={{ maxHeight: panelMaxHeight, overflowY: "auto" }}
          >
            <button
              onClick={() => setTeachingPanelOpen(false)}
              className="sticky top-0 z-10 flex min-h-[44px] w-full items-center justify-center rounded-t-[28px] border-b border-slate-100 bg-white/92 text-[10px] font-medium text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-900/92"
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
    <div ref={containerRef} className="flex h-full gap-0">
      <div className="min-h-0 min-w-0 flex-1">
        <VisualizationViewport>
          {visualizationContent}
        </VisualizationViewport>
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
        defaultWidth={TEACHING_PANEL_DEFAULT_WIDTH}
        minWidth={TEACHING_PANEL_MIN_WIDTH}
        maxWidth={TEACHING_PANEL_MAX_WIDTH}
        open={teachingPanelOpen}
        onCollapse={() => setTeachingPanelOpen(false)}
        onWidthChange={setTeachingPanelWidth}
        storageKey={TEACHING_PANEL_STORAGE_KEY}
      >
        {teachingContent}
      </ResizablePanel>
    </div>
  )
}
