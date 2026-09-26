import type { ReactElement, ReactNode } from "react"
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PanelBottomOpen, PanelRightOpen } from "lucide-react"
import { usePhoneLayout } from "../../hooks/usePhoneLayout"
import { useDocumentVisibility } from "../../hooks/useDocumentVisibility"
import { useContainerSize } from "../../hooks/useContainerSize"
import { useAuth } from "../../auth/AuthContext"
import { api, type EquationResponse } from "../../api/client"
import { useEquation } from "../../api/hooks"
import { useProgress } from "../../progress/useProgress"
import { useEquationId } from "./EquationContext"
import { useSettings } from "../../settings/SettingsContext"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { readStoredPanelWidth, ResizablePanel } from "../ui/resizable-panel"
import { LearnMorePanel } from "../scenes/LearnMorePanel"
import { TouchableFormula } from "./TouchableFormula"
import { useLatexFormula } from "./FormulaContext"
import type { Variable, LessonStep, GlossaryTerm } from "./types"
import { ErrorBoundary } from "../ErrorBoundary"
import { VisualizationViewport } from "./VisualizationViewport"
import { shouldUseStackedTeachingLayout } from "./layoutMode"
import { useEquationConfig } from "../../data/equationConfig"

const LiveFormula = lazy(() => import("./LiveFormula").then((module) => ({ default: module.LiveFormula })))
const LessonRunner = lazy(() => import("./LessonRunner").then((module) => ({ default: module.LessonRunner })))
const TEACHING_PANEL_STORAGE_KEY = "sciencebouk-teaching-panel-width"
const TEACHING_PANEL_DEFAULT_WIDTH = 360
const TEACHING_PANEL_MIN_WIDTH = 320
const TEACHING_PANEL_MAX_WIDTH = 520
const MOBILE_PANEL_DRAG_THRESHOLD = 36
const MOBILE_PANEL_PEEK_HEIGHT = "min(45%, 22rem)"
const MOBILE_PANEL_EXPANDED_HEIGHT = "min(64%, 40rem)"

function readStoredTeachingPanelWidth(): number {
  return readStoredPanelWidth(
    TEACHING_PANEL_STORAGE_KEY,
    TEACHING_PANEL_DEFAULT_WIDTH,
    TEACHING_PANEL_MIN_WIDTH,
    TEACHING_PANEL_MAX_WIDTH,
  )
}

export interface Preset {
  label: string
  values: Record<string, number>
}

export function presetIsActive(preset: Preset, vars: Record<string, number>): boolean {
  return Object.entries(preset.values).every(
    ([name, value]) => Math.abs((vars[name] ?? Number.NaN) - value) < 1e-9,
  )
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

type MobileTeachingTab = "learn" | "controls" | "lesson"
type MobilePanelState = "peek" | "expanded"

type SceneVariableCopy = Pick<Variable, "name"> & Partial<Variable>
type ScenePresetCopy = Partial<Preset>
type SceneGlossaryCopy = Pick<GlossaryTerm, "highlightClass"> & Partial<GlossaryTerm>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function mapSceneVariableCopies(rawVariables: unknown[] | undefined): SceneVariableCopy[] | undefined {
  if (!rawVariables?.length) return undefined

  return rawVariables
    .filter(isRecord)
    .filter((variable): variable is Record<string, unknown> & { name: string } => typeof variable.name === "string")
    .map((variable) => ({
      name: variable.name,
      symbol: typeof variable.symbol === "string" ? variable.symbol : undefined,
      latex: typeof variable.symbol === "string" ? variable.symbol : undefined,
      description: typeof variable.description === "string" ? variable.description : undefined,
      unit: typeof variable.unit === "string" ? variable.unit : undefined,
    }))
}

function mapScenePresetCopies(rawPresets: unknown[] | undefined): ScenePresetCopy[] | undefined {
  if (!rawPresets?.length) return undefined

  return rawPresets
    .filter(isRecord)
    .map((preset) => ({
      label: typeof preset.label === "string" ? preset.label : undefined,
    }))
}

function mapSceneGlossaryCopies(rawGlossary: unknown[] | undefined): SceneGlossaryCopy[] | undefined {
  if (!rawGlossary?.length) return undefined

  return rawGlossary
    .filter(isRecord)
    .filter((term): term is Record<string, unknown> & { highlightClass: string } => typeof term.highlightClass === "string")
    .map((term) => ({
      highlightClass: term.highlightClass,
      words: Array.isArray(term.words) ? term.words.filter((word): word is string => typeof word === "string") : undefined,
      tooltip: typeof term.tooltip === "string" ? term.tooltip : undefined,
      color: typeof term.color === "string" ? term.color : undefined,
    }))
}

function isPreset(value: Partial<Preset>): value is Preset {
  return typeof value.label === "string" && typeof value.values === "object" && value.values !== null
}

function isGlossaryTerm(value: SceneGlossaryCopy): value is GlossaryTerm {
  return Array.isArray(value.words) && typeof value.color === "string"
}

function buildSceneLocalizationFromApi(equation: EquationResponse | undefined) {
  if (!equation) {
    return {
      hook: undefined,
      hookAction: undefined,
      variables: undefined,
      presets: undefined,
      glossary: undefined,
    }
  }

  return {
    hook: equation.hook || undefined,
    hookAction: equation.hook_action || undefined,
    variables: mapSceneVariableCopies(equation.variables_data),
    presets: mapScenePresetCopies(equation.presets_data),
    glossary: mapSceneGlossaryCopies(equation.glossary_data),
  }
}

function mergeSceneVariables(
  baseVariables: Variable[],
  localizedVariables?: SceneVariableCopy[],
): Variable[] {
  if (!localizedVariables?.length) return baseVariables

  const localizedByName = new Map(
    localizedVariables.map((variable) => [variable.name, variable]),
  )

  return baseVariables.map((variable) => {
    const localized = localizedByName.get(variable.name)
    if (!localized) return variable

    return {
      ...variable,
      description: localized.description ?? variable.description,
      symbol: localized.symbol ?? variable.symbol,
      latex: localized.latex ?? variable.latex,
      unit: localized.unit ?? variable.unit,
    }
  })
}

function mergeScenePresets(
  basePresets: Preset[] | undefined,
  localizedPresets?: ScenePresetCopy[],
): Preset[] | undefined {
  if (!localizedPresets?.length) return basePresets
  if (!basePresets?.length) return localizedPresets.filter(isPreset)

  return basePresets.map((preset, index) => {
    const localized = localizedPresets[index]
    if (!localized) return preset

    return {
      ...preset,
      label: localized.label ?? preset.label,
    }
  })
}

function mergeSceneGlossary(
  baseGlossary: GlossaryTerm[] | undefined,
  localizedGlossary?: SceneGlossaryCopy[],
): GlossaryTerm[] | undefined {
  if (!localizedGlossary?.length) return baseGlossary
  if (!baseGlossary?.length) return localizedGlossary.filter(isGlossaryTerm)

  const localizedByClass = new Map(
    localizedGlossary.map((term) => [term.highlightClass, term]),
  )

  return baseGlossary.map((term) => {
    const localized = localizedByClass.get(term.highlightClass)
    if (!localized) return term

    return {
      ...term,
      words: localized.words ?? term.words,
      tooltip: localized.tooltip ?? term.tooltip,
      color: localized.color ?? term.color,
    }
  })
}

export function TeachableEquation({
  equationId, hook, hookAction, formula, latexFormula,
  variables: initialVariables, lessonSteps,
  buildLiveFormula, buildResultLine, describeResult, presets, glossary, children,
}: TeachableEquationProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef)
  const isMobile = containerWidth > 0 && containerWidth < 480
  const isPhone = usePhoneLayout()

  const { isAuthenticated, isPro } = useAuth()
  const contextFormula = useLatexFormula()
  const contextEquationId = useEquationId()
  const resolvedId = equationId ?? contextEquationId
  const { data: apiEquation } = useEquation(resolvedId)
  const localizedEquationConfig = useEquationConfig(resolvedId)
  const apiSceneLocalization = useMemo(
    () => buildSceneLocalizationFromApi(apiEquation),
    [apiEquation],
  )
  const localizedVariables = useMemo(
    () => mergeSceneVariables(
      initialVariables,
      apiSceneLocalization.variables ?? localizedEquationConfig?.variables,
    ),
    [initialVariables, apiSceneLocalization.variables, localizedEquationConfig?.variables],
  )
  const localizedPresets = useMemo(
    () => mergeScenePresets(
      presets,
      apiSceneLocalization.presets ?? localizedEquationConfig?.presets,
    ),
    [presets, apiSceneLocalization.presets, localizedEquationConfig?.presets],
  )
  const localizedGlossary = useMemo(
    () => mergeSceneGlossary(
      glossary,
      apiSceneLocalization.glossary ?? localizedEquationConfig?.glossary,
    ),
    [glossary, apiSceneLocalization.glossary, localizedEquationConfig?.glossary],
  )
  const hookCopy = apiSceneLocalization.hook || localizedEquationConfig?.hook || hook
  const hookActionCopy = apiSceneLocalization.hookAction || localizedEquationConfig?.hookAction || hookAction

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
  const lessonCompletionRecordedRef = useRef(false)

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
    () => localizedVariables.map((v) => ({ ...v, value: vars[v.name] ?? v.value })),
    [localizedVariables, vars],
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
    // The lesson view can remount when switching tabs; record its final step once per run.
    if (isLastStep) {
      if (lessonCompletionRecordedRef.current) return
      lessonCompletionRecordedRef.current = true
    }
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
    lessonCompletionRecordedRef.current = false
    setLessonStep(0); setStepCompleted(false)
    const r: Record<string, number> = {}
    for (const v of initialVariables) r[v.name] = v.value
    prevVarsRef.current = r
    setVars(r)
  }, [initialVariables])

  const disableLessonMode = useCallback(() => {
    lessonModeWasToggledRef.current = true
    setLessonMode(false)
    setMobileTeachingTab("controls")
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
  const [mobilePanelState, setMobilePanelState] = useState<MobilePanelState>("peek")
  const [teachingPanelWidth, setTeachingPanelWidth] = useState(readStoredTeachingPanelWidth)
  const dragStartYRef = useRef<number | null>(null)
  const suppressPanelClickRef = useRef(false)
  const isNarrow = shouldUseStackedTeachingLayout({
    containerWidth,
    containerHeight,
    teachingPanelOpen,
    teachingPanelWidth,
  })
  const stackedVisualizationWrapperClass = "h-full min-h-0"
  const formulaCardVisible = appSettings.showFormulaLetters || appSettings.showFormulaNumbers
  const hasPresets = Boolean(localizedPresets && localizedPresets.length > 0)
  const hasLearnSurface = appSettings.showHookText || formulaCardVisible
  const letterFormula = appSettings.showFormulaLetters ? displayFormula : ""
  const liveFormula = useMemo(
    () => appSettings.showFormulaNumbers && buildLiveFormula ? buildLiveFormula(vars) : "",
    [appSettings.showFormulaNumbers, buildLiveFormula, vars],
  )
  const resultLine = useMemo(() => buildResultLine?.(vars), [buildResultLine, vars])
  const resultNote = useMemo(
    () => appSettings.showResultNote ? describeResult?.(vars) : undefined,
    [appSettings.showResultNote, describeResult, vars],
  )
  const mobileTabOrder = useMemo<MobileTeachingTab[]>(() => {
    const tabs: MobileTeachingTab[] = ["controls"]
    if (hasLearnSurface || resolvedId > 0) tabs.push("learn")
    if (hasLessons) tabs.push("lesson")
    return tabs
  }, [hasLearnSurface, hasLessons, resolvedId])
  const [mobileTeachingTab, setMobileTeachingTab] = useState<MobileTeachingTab>(
    appSettings.autoStartLesson && hasLessons ? "lesson" : "controls",
  )

  useEffect(() => {
    if (mobileTabOrder.includes(mobileTeachingTab)) return
    setMobileTeachingTab(mobileTabOrder[0] ?? "controls")
  }, [mobileTeachingTab, mobileTabOrder])

  useEffect(() => {
    if (!isMobile || !isNarrow || !teachingPanelOpen) return
    setMobilePanelState("peek")
  }, [isMobile, isNarrow, teachingPanelOpen, resolvedId])

  const learnBlock = hasLearnSurface ? (
    <div className={cn("border-b border-slate-200 dark:border-slate-800", isPhone ? "pb-3" : "pb-5")}>
      {appSettings.showHookText && (
        <>
          <p className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">{hookCopy}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{hookActionCopy}</p>
        </>
      )}
      {formulaCardVisible && (
        <div className={appSettings.showHookText ? "mt-3" : undefined}>
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
    </div>
  ) : null

  const variablesBlock = (
    <section className={isPhone ? "space-y-1" : "space-y-3"} aria-label="Adjust variables">
      <div>
        <h3 className="font-display text-sm font-bold text-slate-700 dark:text-slate-200">Variables</h3>
        {lockedVarsMemo.size > 0 && mobileTeachingTab !== "lesson" && (
          <div className="space-y-2 pt-1">
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">Some variables stay fixed during this lesson step.</p>
            <Button variant="outline" size="sm" className={isPhone ? "min-h-11" : "min-h-9"} onClick={disableLessonMode}>Explore freely</Button>
          </div>
        )}
      </div>
        <TouchableFormula
          variables={formulaVariables} onVariableChange={setVar}
          highlightedVariable={highlightedVar} onVariableHover={setHighlightedVar} formula={formula}
          phoneLayout={isPhone}
        />
    </section>
  )

  const presetsBlock = hasPresets ? (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Try a preset</p>
      <div className="flex flex-wrap gap-2">
      {localizedPresets?.map((p) => (
        <Button
          key={p.label}
          variant="outline"
          size="xs"
          onClick={() => applyPreset(p)}
          disabled={Object.entries(p.values).some(([name, value]) => lockedVarsMemo.has(name) && vars[name] !== value)}
          title={Object.entries(p.values).some(([name, value]) => lockedVarsMemo.has(name) && vars[name] !== value)
            ? "Choose Explore freely to use this preset" : undefined}
          aria-pressed={presetIsActive(p, vars)}
          className={cn(
            "shadow-none",
            "shrink-0 px-3 text-sm", isPhone ? "min-h-11" : "min-h-9",
            presetIsActive(p, vars) &&
              "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100",
          )}
        >
          {p.label}
        </Button>
      ))}
      </div>
    </div>
  ) : null

  const lessonRunner = (
    <ErrorBoundary fallback={<LessonFallback />}>
      <Suspense fallback={<LessonFallback />}>
        <LessonRunner
          steps={lessonSteps} currentStepIndex={lessonStep}
          onAdvance={advanceLesson} onReset={resetLesson} stepCompleted={stepCompleted}
          variables={formulaVariables} onHighlight={setHighlightedVar}
          glossary={localizedGlossary} onTermHighlight={setHighlightedTerm}
          compact={isMobile} phoneLayout={isPhone}
          onExploreFreely={isPhone ? disableLessonMode : undefined}
        />
      </Suspense>
    </ErrorBoundary>
  )

  const lessonBlock = hasLessons && lessonMode ? (isPhone ? lessonRunner : (
    <Card className="rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
      <CardHeader className={`flex-row items-center justify-between space-y-0 ${isMobile ? "p-3 pb-2" : "p-3 pb-2"}`}>
        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Guided lesson
        </CardTitle>
        <Button variant="ghost" size="xs" onClick={disableLessonMode} className={`${isMobile ? "min-h-[36px] rounded-full px-3 text-[11px]" : ""} text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`}>
          Explore freely
        </Button>
      </CardHeader>
      <CardContent className={isMobile ? "px-3.5 pb-3.5" : "px-3 pb-3"}>
        {lessonRunner}
      </CardContent>
    </Card>
  )) : null

  const restartLessonBlock = hasLessons && !lessonMode ? (
    <Button variant="outline" className={`${isMobile ? "min-h-[44px] rounded-xl" : ""} w-full justify-start border-dashed text-slate-600 dark:text-slate-300`} onClick={restartLessonMode}>
      Restart lesson
    </Button>
  ) : null

  // "What it means" + the other learn-more aids. Renders for every equation
  // (core and subject) that has curated content; returns null otherwise.
  const learnMoreBlock = resolvedId != null ? (
    <LearnMorePanel equationId={resolvedId} />
  ) : null

  const teachingContent = (
    <section aria-label="Equation workspace" className={cn("flex min-w-0 flex-col", !isPhone && "h-full min-h-0", !isPhone && !isNarrow && "studio-inspector")}>
      {!isPhone && !isNarrow && (
        <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-4">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Your experiment</h3>
          <Button variant="ghost" size="icon-sm" onClick={() => setTeachingPanelOpen(false)} aria-label="Hide teaching panel">
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className={cn("shrink-0 border-b border-slate-200 dark:border-slate-800", !isPhone && "px-3 py-3")} role="group" aria-label="Workspace sections">
        <div className={isPhone ? "grid" : "grid gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-950"} style={{ gridTemplateColumns: "repeat(" + mobileTabOrder.length + ", minmax(0, 1fr))" }}>
          {mobileTabOrder.map((tab) => (
            <Button
              key={tab}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={mobileTeachingTab === tab}
              className={isPhone ? cn("min-h-11 rounded-none border-b-2 px-2 text-base hover:bg-transparent", mobileTeachingTab === tab
                ? "border-ocean font-semibold text-ocean dark:border-blue-300 dark:text-blue-300"
                : "border-transparent text-slate-500 dark:text-slate-400") : cn("min-h-10 rounded-lg px-2 text-sm", mobileTeachingTab === tab
                ? "bg-white font-semibold text-ocean shadow-sm hover:bg-white dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-800"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white")}
              onClick={() => setMobileTeachingTab(tab)}
            >
              {tab === "controls" ? "Explore" : tab === "learn" ? "Learn" : "Lesson"}
            </Button>
          ))}
        </div>
      </div>
      <div key={mobileTeachingTab} className={isPhone ? "min-w-0" : "native-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"}>
        <div className={isPhone ? "space-y-3 px-1 pb-3 pt-1" : "space-y-5 p-4 sm:p-5"}>
          {mobileTeachingTab === "controls" && <>{learnBlock}{variablesBlock}{presetsBlock}</>}
          {mobileTeachingTab === "learn" && <>{learnBlock}{learnMoreBlock}</>}
          {mobileTeachingTab === "lesson" && <>{lessonBlock}{restartLessonBlock}{lessonMode && variablesBlock}</>}
        </div>
      </div>
    </section>
  )

  const visualizationContent = children({ vars, setVar, highlightedVar, setHighlightedVar, highlightedTerm })

  const handleMobilePanelGestureStart = useCallback((clientY: number) => {
    dragStartYRef.current = clientY
    suppressPanelClickRef.current = false
  }, [])

  const handleMobilePanelGestureEnd = useCallback((clientY: number) => {
    const startY = dragStartYRef.current
    dragStartYRef.current = null
    if (startY === null) return

    const deltaY = clientY - startY
    if (Math.abs(deltaY) < MOBILE_PANEL_DRAG_THRESHOLD) return
    suppressPanelClickRef.current = true

    if (deltaY < 0) {
      setMobilePanelState("expanded")
      return
    }

    if (mobilePanelState === "expanded") {
      setMobilePanelState("peek")
      return
    }

    setTeachingPanelOpen(false)
  }, [mobilePanelState])

  if (isPhone) {
    return (
      <div ref={containerRef} className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0" style={{ height: "clamp(240px, 38dvh, 340px)" }}>
          <VisualizationViewport mobileOptimized flowingPage>
            {visualizationContent}
          </VisualizationViewport>
        </div>
        {teachingContent}
      </div>
    )
  }

  if (isNarrow) {
    // Vertical stack: visualization on top, teaching panel below
    const panelHeight = mobilePanelState === "expanded" ? MOBILE_PANEL_EXPANDED_HEIGHT : MOBILE_PANEL_PEEK_HEIGHT

    return (
      <div ref={containerRef} className="flex h-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full items-start justify-center overflow-hidden px-0 pt-0.5 sm:px-0 sm:pt-0">
            <div className={`w-full max-w-full ${stackedVisualizationWrapperClass}`}>
              <VisualizationViewport mobileOptimized={isMobile}>
                <div className={containerWidth < 640 ? "h-full pt-14" : "h-full"}>
                  {visualizationContent}
                </div>
              </VisualizationViewport>
            </div>
          </div>
        </div>

        {!teachingPanelOpen ? (
          <button
            onClick={() => {
              setTeachingPanelOpen(true)
              setMobilePanelState("peek")
            }}
            className="mb-1 flex-shrink-0 self-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            type="button"
            aria-label="Open teaching panel"
          >
            <span className="flex items-center gap-1.5">
              <PanelBottomOpen className="h-3.5 w-3.5" />
              Show panel
            </span>
          </button>
        ) : (
          <div
            className="studio-inspector mt-2 flex min-h-0 flex-shrink-0 flex-col overflow-hidden transition-[height] duration-200 motion-reduce:transition-none"
            style={{ height: panelHeight, overflow: "hidden" }}
          >
            <div
              className="z-10 shrink-0 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex min-h-11 items-center justify-between gap-3 px-3">
                <button
                  onPointerDown={(event) => {
                    handleMobilePanelGestureStart(event.clientY)
                    try {
                      event.currentTarget.setPointerCapture(event.pointerId)
                    } catch {
                      // Pointer capture is not available in every browser/test runtime.
                    }
                  }}
                  onPointerUp={(event) => handleMobilePanelGestureEnd(event.clientY)}
                  onPointerCancel={() => { dragStartYRef.current = null }}
                  onClick={(event) => {
                    const suppressClick = suppressPanelClickRef.current
                    suppressPanelClickRef.current = false
                    if (suppressClick && event.detail > 0) return
                    setMobilePanelState((current) => current === "peek" ? "expanded" : "peek")
                  }}
                  style={{ touchAction: "none" }}
                  className="flex min-h-11 min-w-0 flex-1 items-center justify-start gap-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300"
                  type="button"
                  aria-label="Resize teaching panel"
                  aria-expanded={mobilePanelState === "expanded"}
                >
                  <span className="h-1 w-8 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
                  <span>
                    {mobilePanelState === "expanded" ? "Show more diagram" : "Expand workspace"}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="min-h-11 shrink-0 rounded-lg px-3 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => setTeachingPanelOpen(false)}
                >
                  Hide
                </Button>
              </div>
            </div>
            {teachingContent}
          </div>
        )}
      </div>
    )
  }

  // Desktop: side-by-side with resizable panel
  return (
    <div ref={containerRef} className="flex h-full gap-2">
      <div className="min-h-0 min-w-0 flex-1">
        <VisualizationViewport mobileOptimized={isMobile}>
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
