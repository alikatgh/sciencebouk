import type { ReactElement, ReactNode } from "react"
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, PanelBottomOpen, PanelRightOpen, SlidersHorizontal, Sparkles } from "lucide-react"
import { useDocumentVisibility } from "../../hooks/useDocumentVisibility"
import { useContainerSize } from "../../hooks/useContainerSize"
import { useAuth } from "../../auth/AuthContext"
import { api, type EquationResponse } from "../../api/client"
import { useEquation } from "../../api/hooks"
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
import { useEquationConfig } from "../../data/equationConfig"

const LiveFormula = lazy(() => import("./LiveFormula").then((module) => ({ default: module.LiveFormula })))
const LessonRunner = lazy(() => import("./LessonRunner").then((module) => ({ default: module.LessonRunner })))
const TEACHING_PANEL_STORAGE_KEY = "sciencebouk-teaching-panel-width"
const TEACHING_PANEL_DEFAULT_WIDTH = 272
const TEACHING_PANEL_MIN_WIDTH = 200
const TEACHING_PANEL_MAX_WIDTH = 400
const MOBILE_PANEL_DRAG_THRESHOLD = 36
const MOBILE_PANEL_PEEK_HEIGHT = "min(38vh, 22rem)"
const MOBILE_PANEL_EXPANDED_HEIGHT = "min(72vh, 40rem)"

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
  const [mobilePanelState, setMobilePanelState] = useState<MobilePanelState>("peek")
  const [teachingPanelWidth, setTeachingPanelWidth] = useState(readStoredTeachingPanelWidth)
  const dragStartYRef = useRef<number | null>(null)
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
  const hasPresets = Boolean(localizedPresets && localizedPresets.length > 0)
  const hasLearnSurface = appSettings.showHookText || formulaCardVisible
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
  const mobileTabOrder = useMemo<MobileTeachingTab[]>(() => {
    const tabs: MobileTeachingTab[] = []
    if (hasLearnSurface) tabs.push("learn")
    tabs.push("controls")
    if (hasLessons) tabs.push("lesson")
    return tabs
  }, [hasLearnSurface, hasLessons])
  const [mobileTeachingTab, setMobileTeachingTab] = useState<MobileTeachingTab>(mobileTabOrder[0] ?? "controls")

  useEffect(() => {
    if (mobileTabOrder.includes(mobileTeachingTab)) return
    setMobileTeachingTab(mobileTabOrder[0] ?? "controls")
  }, [mobileTeachingTab, mobileTabOrder])

  useEffect(() => {
    if (!isMobile || !isNarrow || !teachingPanelOpen) return
    setMobilePanelState("peek")
  }, [isMobile, isNarrow, teachingPanelOpen, resolvedId])

  const hookBlock = appSettings.showHookText ? (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 ${isMobile ? "px-3 py-2" : "px-4 py-3"}`}>
      {introFormulaVisible && (
        <div className="mb-3 text-center text-sm text-slate-700 dark:text-slate-200">
          <AutoFitDeferredInlineMath
            math={displayFormula}
            className="inline-block whitespace-nowrap"
          />
        </div>
      )}
      <p className={`font-semibold leading-snug text-slate-800 dark:text-slate-100 ${isMobile ? "text-xs" : "text-sm"}`}>{hookCopy}</p>
      <p className="mt-1.5 text-xs font-bold text-ocean">{"\u2192"} {hookActionCopy}</p>
    </div>
  ) : null

  const formulaBlock = formulaCardVisible ? (
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
  ) : null

  const variablesBlock = (
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
  )

  const presetsBlock = hasPresets ? (
    <div className={`flex ${isMobile ? "-mx-1 overflow-x-auto px-1 pb-1" : "flex-wrap"} gap-1.5`}>
      {localizedPresets?.map((p) => (
        <Button key={p.label} variant="outline" size="xs" onClick={() => applyPreset(p)} className={`${isMobile ? "h-9 shrink-0 rounded-full px-3.5 text-[11px]" : "text-[10px]"}`}>
          {p.label}
        </Button>
      ))}
    </div>
  ) : null

  const lessonBlock = hasLessons && lessonMode ? (
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
              glossary={localizedGlossary} onTermHighlight={setHighlightedTerm}
              compact={isMobile}
            />
          </Suspense>
        </ErrorBoundary>
      </CardContent>
    </Card>
  ) : null

  const restartLessonBlock = hasLessons && !lessonMode ? (
    <Button variant="outline" className={`${isMobile ? "min-h-[46px] rounded-[18px]" : ""} w-full justify-start gap-2 border-dashed border-ocean/30 text-ocean`} onClick={restartLessonMode}>
      <Sparkles className="h-3.5 w-3.5" /> Restart lesson
    </Button>
  ) : null

  const teachingContent = isMobile && isNarrow ? (
    <div className="native-scroll flex h-full flex-col overflow-y-auto">
      <div className="flex flex-1 flex-col gap-2 px-3 py-2.5 pb-24">
        {mobileTeachingTab === "learn" && (
          <>
            {hookBlock}
            {formulaBlock}
          </>
        )}
        {mobileTeachingTab === "controls" && (
          <>
            {variablesBlock}
            {presetsBlock}
          </>
        )}
        {mobileTeachingTab === "lesson" && (
          <>
            {lessonBlock}
            {restartLessonBlock}
          </>
        )}
      </div>
      <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-2 shadow-[0_-10px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/92 dark:shadow-none">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${mobileTabOrder.length}, minmax(0, 1fr))` }}
        >
          {mobileTabOrder.map((tab) => {
            const tabMeta = tab === "learn"
              ? { label: "Learn", icon: Sparkles }
              : tab === "controls"
                ? { label: "Controls", icon: SlidersHorizontal }
                : { label: "Lesson", icon: BookOpen }
            const Icon = tabMeta.icon

            return (
              <Button
                key={tab}
                type="button"
                variant={mobileTeachingTab === tab ? "secondary" : "ghost"}
                size="sm"
                className={mobileTeachingTab === tab
                  ? "min-h-[44px] rounded-2xl bg-slate-900 text-white shadow-sm hover:bg-slate-900/95 dark:bg-white dark:text-slate-950 dark:hover:bg-white"
                  : "min-h-[44px] rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}
                onClick={() => setMobileTeachingTab(tab)}
              >
                <Icon className="h-3.5 w-3.5" />
                {tabMeta.label}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  ) : (
    <div className={`native-scroll flex flex-col overflow-y-auto ${isNarrow ? "gap-2 px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]" : "h-full gap-2.5 pl-2"}`}>
      {hookBlock}
      {formulaBlock}
      {variablesBlock}
      {presetsBlock}
      {lessonBlock}
      {restartLessonBlock}
    </div>
  )

  const visualizationContent = children({ vars, setVar, highlightedVar, setHighlightedVar, highlightedTerm })

  const handleMobilePanelGestureStart = useCallback((clientY: number) => {
    dragStartYRef.current = clientY
  }, [])

  const handleMobilePanelGestureEnd = useCallback((clientY: number) => {
    const startY = dragStartYRef.current
    dragStartYRef.current = null
    if (startY === null) return

    const deltaY = clientY - startY
    if (Math.abs(deltaY) < MOBILE_PANEL_DRAG_THRESHOLD) {
      setMobilePanelState((current) => current === "peek" ? "expanded" : "peek")
      return
    }

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

  if (isNarrow) {
    // Vertical stack: visualization on top, teaching panel below
    const panelMaxHeight = isMobile
      ? (mobilePanelState === "expanded" ? MOBILE_PANEL_EXPANDED_HEIGHT : MOBILE_PANEL_PEEK_HEIGHT)
      : "45vh"

    return (
      <div ref={containerRef} className="flex h-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full items-start justify-center overflow-hidden px-0 pt-0.5 sm:px-0 sm:pt-0">
            <div className={`w-full max-w-full ${stackedVisualizationWrapperClass}`}>
              <VisualizationViewport mobileOptimized={isMobile}>
                {visualizationContent}
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
            className="mb-1 flex-shrink-0 self-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            type="button"
            aria-label="Open teaching panel"
          >
            <span className="flex items-center gap-1.5">
              <PanelBottomOpen className="h-3.5 w-3.5" />
              {isMobile ? "Open controls" : "Show panel"}
            </span>
          </button>
        ) : (
          <div
            className="flex-shrink-0 rounded-t-[28px] border border-b-0 border-slate-200 bg-white shadow-[0_-10px_35px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
            style={{ maxHeight: panelMaxHeight, overflowY: "auto" }}
          >
            <div
              className="sticky top-0 z-10 rounded-t-[28px] border-b border-slate-100 bg-white/92 backdrop-blur dark:border-slate-800 dark:bg-slate-900/92"
              onPointerUp={(event) => handleMobilePanelGestureEnd(event.clientY)}
              onTouchEnd={(event) => handleMobilePanelGestureEnd(event.changedTouches[0]?.clientY ?? 0)}
            >
              <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
                <button
                  onPointerDown={(event) => handleMobilePanelGestureStart(event.clientY)}
                  onTouchStart={(event) => handleMobilePanelGestureStart(event.touches[0]?.clientY ?? 0)}
                  className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full py-1 text-[10px] font-medium text-slate-400"
                  type="button"
                  aria-label="Resize teaching panel"
                >
                  <span className="h-1 w-8 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
                  <span className="text-[10px] tracking-wide text-slate-400">
                    {mobilePanelState === "expanded" ? "Swipe down to tuck away" : "Swipe up for more"}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="min-h-[36px] shrink-0 rounded-full px-3 text-[11px] text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
    <div ref={containerRef} className="flex h-full gap-0">
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
