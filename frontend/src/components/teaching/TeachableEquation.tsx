import type { ReactElement, ReactNode } from "react"
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, FlaskConical, ListChecks, PanelBottomOpen, PanelRightOpen } from "lucide-react"
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
import type { Variable, LessonStep, GlossaryTerm, SetEquationVariable, ExperimentSnapshot, ExperimentMeasurement, ExperimentChange } from "./types"
import { ErrorBoundary } from "../ErrorBoundary"
import { VisualizationViewport } from "./VisualizationViewport"
import { SceneInteractionSurface } from "./SceneInteractionSurface"
import { shouldUseStackedTeachingLayout } from "./layoutMode"
import { useEquationConfig } from "../../data/equationConfig"
import { getConceptCheck } from "../../data/conceptChecks"
import { applyLessonAction, applyLessonVariableInteraction, createLessonAttempt, type LessonAttempt } from "./lessonInteraction"
import { ExperimentBench } from "./ExperimentBench"
import { PredictionChallenge } from "./PredictionChallenge"
import { captureExperiment, experimentChangeAllowed, experimentRestorePlan, experimentResultLine } from "./experimentComparison"

const LiveFormula = lazy(() => import("./LiveFormula").then((module) => ({ default: module.LiveFormula })))
const LessonRunner = lazy(() => import("./LessonRunner").then((module) => ({ default: module.LessonRunner })))
const TEACHING_PANEL_STORAGE_KEY = "sciencebouk-teaching-panel-width"
const TEACHING_PANEL_DEFAULT_WIDTH = 316
const TEACHING_PANEL_MIN_WIDTH = 296
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
  experimentMeasurement?: ExperimentMeasurement
  presets?: Preset[]
  phoneVisualizationHeight?: string
  glossary?: GlossaryTerm[]
  children: (props: {
    vars: Record<string, number>
    setVar: SetEquationVariable
    onAction: (name: string) => void
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
  buildLiveFormula, buildResultLine, describeResult, experimentMeasurement, presets, glossary, children,
  phoneVisualizationHeight = "clamp(240px, 38dvh, 340px)",
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

  const varsRef = useRef(vars)
  const [sceneEpoch, setSceneEpoch] = useState(0)
  const sceneEpochRef = useRef(0)
  const nativeGestureActiveRef = useRef(false)
  const setNativeGestureActive = useCallback((active: boolean) => { nativeGestureActiveRef.current = active }, [])
  const interruptScene = useCallback(() => {
    if (!nativeGestureActiveRef.current) return
    nativeGestureActiveRef.current = false
    sceneEpochRef.current += 1
    setSceneEpoch(sceneEpochRef.current)
  }, [])
  const [experimentSnapshot, setExperimentSnapshot] = useState<ExperimentSnapshot | null>(null)
  const [experimentSession, setExperimentSession] = useState(0)
  const [highlightedVar, setHighlightedVar] = useState<string | null>(null)
  const [highlightedTerm, setHighlightedTerm] = useState<string | null>(null)
  const { settings: appSettings } = useSettings()
  const isDocumentVisible = useDocumentVisibility()
  const [lessonMode, setLessonMode] = useState(appSettings.autoStartLesson)
  const [lessonAttempt, setLessonAttempt] = useState(() => createLessonAttempt(0, vars))
  const lessonAttemptRef = useRef(lessonAttempt)
  const lessonStep = lessonAttempt.stepIndex
  const stepCompleted = lessonAttempt.stepCompleted
  const progressRef = useRef(progress)
  const resumeAppliedRef = useRef<number | null>(null)
  const lessonModeWasToggledRef = useRef(false)
  const lessonCompletionRecordedRef = useRef(false)
  const equationIdentityRef = useRef(resolvedId)
  const interactionContextRef = useRef({ lessonMode, lessonSteps, resolvedId, progressEnabled, markVariableExplored })
  interactionContextRef.current = { lessonMode, lessonSteps, resolvedId, progressEnabled, markVariableExplored }

  const commitLessonAttempt = useCallback((next: LessonAttempt) => {
    if (next === lessonAttemptRef.current) return
    if (next.stepIndex !== lessonAttemptRef.current.stepIndex || next.revision !== lessonAttemptRef.current.revision) interruptScene()
    lessonAttemptRef.current = next
    setLessonAttempt(next)
  }, [interruptScene])

  useEffect(() => {
    if (!lessonModeWasToggledRef.current) {
      if (interactionContextRef.current.lessonMode !== appSettings.autoStartLesson) interruptScene()
      setLessonMode(appSettings.autoStartLesson)
    }
  }, [appSettings.autoStartLesson, interruptScene])

  const setVar = useCallback<SetEquationVariable>((name, value, options) => {
    if (!Number.isFinite(value)) return
    const source = options?.source ?? "learner"
    if (source === "preset" || source === "restore" || source === "reset") interruptScene()
    const previous = varsRef.current[name]
    const next = { ...varsRef.current, [name]: value }
    const context = interactionContextRef.current
    if (source === "learner" && !Object.is(previous, value)) resumeAppliedRef.current = context.resolvedId
    if (context.lessonMode) {
      const attempt = lessonAttemptRef.current
      commitLessonAttempt(applyLessonVariableInteraction(
        attempt, context.lessonSteps[attempt.stepIndex], name, varsRef.current, next, source,
      ))
    }
    if (Object.is(previous, value)) return
    varsRef.current = next
    setVars(next)
    if (source === "learner" && context.progressEnabled) context.markVariableExplored(name)
  }, [commitLessonAttempt, interruptScene])

  const onAction = useCallback((name: string) => {
    const context = interactionContextRef.current
    if (!context.lessonMode) return
    resumeAppliedRef.current = context.resolvedId
    const attempt = lessonAttemptRef.current
    commitLessonAttempt(applyLessonAction(attempt, context.lessonSteps[attempt.stepIndex], name))
  }, [commitLessonAttempt])

  const applyPreset = useCallback((preset: Preset) => {
    for (const [name, value] of Object.entries(preset.values)) {
      setVar(name, value, { source: "preset" })
    }
  }, [setVar])

  const currentVariables = useMemo(
    () => localizedVariables.map((v) => ({ ...v, value: vars[v.name] ?? v.value })),
    [localizedVariables, vars],
  )
  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    if (equationIdentityRef.current === resolvedId) return
    equationIdentityRef.current = resolvedId
    resumeAppliedRef.current = null
    lessonCompletionRecordedRef.current = false
    setExperimentSnapshot(null)
    const defaults = Object.fromEntries(initialVariables.map((variable) => [variable.name, variable.value]))
    varsRef.current = defaults
    setVars(defaults)
    commitLessonAttempt(createLessonAttempt(0, defaults, lessonAttemptRef.current.revision + 1))
  }, [resolvedId, initialVariables, commitLessonAttempt])

  useEffect(() => {
    if (!progressEnabled || !lessonMode || lessonSteps.length === 0) return
    if (resumeAppliedRef.current === resolvedId) return

    const savedStepId = progress.lessonStep
    if (!savedStepId) return

    const resumeIndex = lessonSteps.findIndex((step) => step.id === savedStepId)
    if (resumeIndex >= 0) {
      commitLessonAttempt(createLessonAttempt(resumeIndex, varsRef.current, lessonAttemptRef.current.revision + 1))
    }
    resumeAppliedRef.current = resolvedId
  }, [progress.lessonStep, progressEnabled, lessonMode, lessonSteps, resolvedId, commitLessonAttempt])

  // Track time spent — tick every 5 seconds
  useEffect(() => {
    if (!progressEnabled || !isDocumentVisible) return
    const timer = setInterval(() => {
      updateProgress({ timeSpentSeconds: progressRef.current.timeSpentSeconds + 5 })
    }, 5000)
    return () => clearInterval(timer)
  }, [isDocumentVisible, progressEnabled, updateProgress])

  const advanceLesson = useCallback(() => {
    const attempt = lessonAttemptRef.current
    const context = interactionContextRef.current
    if (!context.lessonMode || !attempt.stepCompleted || attempt.lessonFinished) return
    const completedStepIndex = attempt.stepIndex
    if (!lessonSteps[completedStepIndex]) return
    const isLastStep = completedStepIndex >= lessonSteps.length - 1
    resumeAppliedRef.current = resolvedId
    // The lesson view can remount when switching tabs; record its final step once per run.
    if (isLastStep) {
      if (!getConceptCheck(resolvedId) || !attempt.checkPassed) return
      if (lessonCompletionRecordedRef.current) return
      lessonCompletionRecordedRef.current = true
      commitLessonAttempt({ ...attempt, lessonFinished: true })
    }
    const nextStepId = isLastStep ? "" : lessonSteps[completedStepIndex + 1]?.id ?? ""

    if (!isLastStep) {
      commitLessonAttempt(createLessonAttempt(completedStepIndex + 1, varsRef.current, attempt.revision + 1))
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
  }, [lessonSteps, isPro, isAuthenticated, resolvedId, progressEnabled, updateProgress, commitLessonAttempt])

  const checkAnswer = useCallback((answerIndex: number | null) => {
    const attempt = lessonAttemptRef.current
    if (attempt.lessonFinished) return
    const check = getConceptCheck(resolvedId)
    const checkPassed = answerIndex !== null
      && interactionContextRef.current.lessonMode
      && attempt.stepCompleted
      && attempt.stepIndex === lessonSteps.length - 1
      && check != null
      && Number.isInteger(answerIndex)
      && answerIndex >= 0
      && answerIndex < check.options.length
      && answerIndex === check.correctIndex
    if (attempt.checkPassed !== checkPassed) commitLessonAttempt({ ...attempt, checkPassed })
  }, [resolvedId, lessonSteps.length, commitLessonAttempt])

  const retryStep = useCallback(() => {
    const attempt = lessonAttemptRef.current
    if (attempt.lessonFinished) return
    const restored = { ...attempt.stepStartValues }
    varsRef.current = restored
    setVars(restored)
    commitLessonAttempt(createLessonAttempt(attempt.stepIndex, restored, attempt.revision + 1))
  }, [commitLessonAttempt])

  const resetLesson = useCallback(() => {
    lessonCompletionRecordedRef.current = false
    setExperimentSnapshot(null)
    setExperimentSession((session) => session + 1)
    const r: Record<string, number> = {}
    for (const v of initialVariables) r[v.name] = v.value
    varsRef.current = r
    setVars(r)
    commitLessonAttempt(createLessonAttempt(0, r, lessonAttemptRef.current.revision + 1))
    resumeAppliedRef.current = resolvedId
  }, [initialVariables, resolvedId, commitLessonAttempt])

  const disableLessonMode = useCallback(() => {
    interruptScene()
    lessonModeWasToggledRef.current = true
    setLessonMode(false)
    setMobileTeachingTab("controls")
  }, [interruptScene])

  const restartLessonMode = useCallback(() => {
    lessonModeWasToggledRef.current = true
    setLessonMode(true)
    resetLesson()
  }, [resetLesson])

  // Exploration stays available during a lesson. The progress evaluator still
  // accepts only the active step's authored drivers and goal.
  const formulaVariables = useMemo(
    () => currentVariables.map((v) => ({ ...v, locked: false })),
    [currentVariables],
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
  const experimentContextRef = useRef({ variables: initialVariables, experimentMeasurement, buildResultLine, snapshot: experimentSnapshot })
  experimentContextRef.current = { variables: initialVariables, experimentMeasurement, buildResultLine, snapshot: experimentSnapshot }

  // Read current permissions and values at the click, including an advance that
  // happened before React painted the next step.
  const getExperimentControls = useCallback(() => {
    return experimentContextRef.current.variables.map((variable) => ({
      ...variable,
      value: varsRef.current[variable.name] ?? variable.value,
      locked: false,
    }))
  }, [])

  const captureBaseline = useCallback(() => {
    const id = interactionContextRef.current.resolvedId
    if (id !== resolvedId || equationIdentityRef.current !== id) return
    const context = experimentContextRef.current
    setExperimentSnapshot(captureExperiment(id, varsRef.current, context.experimentMeasurement, context.buildResultLine))
  }, [resolvedId])

  const restoreBaseline = useCallback(() => {
    const context = experimentContextRef.current
    if (context.snapshot !== experimentSnapshot || interactionContextRef.current.resolvedId !== resolvedId) return
    const plan = experimentRestorePlan(context.snapshot, interactionContextRef.current.resolvedId, getExperimentControls(), varsRef.current)
    if (plan.disabledReason) return
    for (const [name, value] of Object.entries(plan.changes)) setVar(name, value, { source: "restore" })
  }, [experimentSnapshot, resolvedId, getExperimentControls, setVar])

  const runPrediction = useCallback((change: ExperimentChange): boolean => {
    const context = experimentContextRef.current
    const id = interactionContextRef.current.resolvedId
    const attempt = lessonAttemptRef.current
    if (id !== resolvedId || equationIdentityRef.current !== id
      || attempt.stepIndex !== lessonStep || attempt.revision !== lessonAttempt.revision
      || interactionContextRef.current.lessonMode !== lessonMode
      || context.experimentMeasurement !== experimentMeasurement || !context.experimentMeasurement
      || !experimentChangeAllowed(change, getExperimentControls(), varsRef.current)) return false
    try {
      const before = context.experimentMeasurement.compute(varsRef.current)
      const after = context.experimentMeasurement.compute({ ...varsRef.current, [change.variableName]: change.value })
      if (!Number.isFinite(before) || !Number.isFinite(after)) return false
    } catch { return false }
    if (!context.snapshot || context.snapshot.equationId !== id) {
      setExperimentSnapshot(captureExperiment(id, varsRef.current, context.experimentMeasurement, context.buildResultLine))
    }
    setVar(change.variableName, change.value, { source: "learner" })
    return true
  }, [resolvedId, lessonStep, lessonAttempt.revision, lessonMode, experimentMeasurement, getExperimentControls, setVar])

  const activeSnapshot = experimentSnapshot?.equationId === resolvedId ? experimentSnapshot : null
  const restorePlan = experimentRestorePlan(activeSnapshot, resolvedId, formulaVariables, vars)
  const experimentKey = `${resolvedId}:${lessonMode ? lessonStep : "explore"}:${lessonAttempt.revision}`
  const experimentsBlock = (
    <ExperimentBench
      variables={formulaVariables} snapshot={activeSnapshot}
      currentResult={experimentResultLine(vars, experimentMeasurement, buildResultLine)}
      currentResultNote={experimentMeasurement?.note}
      onCapture={captureBaseline} onRestore={restoreBaseline} onClear={() => setExperimentSnapshot(null)}
      restoreDisabledReason={restorePlan.disabledReason} resetKey={`${resolvedId}:${lessonMode ? lessonStep : "explore"}:${experimentSession}`}
    >
      {experimentMeasurement && (
        <PredictionChallenge key={experimentKey} measurement={experimentMeasurement} variables={formulaVariables} values={vars} onRun={runPrediction} />
      )}
    </ExperimentBench>
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
        <div className={cn("studio-formula", appSettings.showHookText && "mt-4")}>
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
        {formulaVariables.some((variable) => !variable.constant && !variable.locked) && <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Drag a slider or select a value to type.</p>}
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
          equationId={resolvedId}
          steps={lessonSteps} currentStepIndex={lessonStep}
          onAdvance={advanceLesson} onReset={resetLesson} stepCompleted={stepCompleted}
          stepStartValues={lessonAttempt.stepStartValues}
          attemptKey={`${resolvedId}:${lessonAttempt.revision}`}
          onRetryStep={retryStep}
          checkPassed={lessonAttempt.checkPassed} onCheckAnswer={checkAnswer}
          lessonFinished={lessonAttempt.lessonFinished}
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
          <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white"><FlaskConical className="h-4 w-4 text-ocean dark:text-blue-300" aria-hidden="true" />Your experiment</h3>
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
              {tab === "controls" ? <FlaskConical className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : tab === "learn" ? <BookOpen className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <ListChecks className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              {tab === "controls" ? "Explore" : tab === "learn" ? "Learn" : "Lesson"}
            </Button>
          ))}
        </div>
      </div>
      <div key={mobileTeachingTab} className={isPhone ? "min-w-0" : "native-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"}>
        <div className={isPhone ? "space-y-4 px-1 pb-4 pt-4" : "space-y-5 p-4"}>
          {mobileTeachingTab === "controls" && <>{learnBlock}{variablesBlock}{experimentsBlock}{presetsBlock}</>}
          {mobileTeachingTab === "learn" && <>{learnBlock}{learnMoreBlock}</>}
          {mobileTeachingTab === "lesson" && <>{lessonBlock}{restartLessonBlock}{lessonMode && variablesBlock}{experimentsBlock}</>}
        </div>
      </div>
    </section>
  )

  const sceneIsCurrent = useCallback((revision = lessonAttempt.revision, allowBatch = false) => {
    const attempt = lessonAttemptRef.current
    return interactionContextRef.current.resolvedId === resolvedId
      && interactionContextRef.current.lessonMode === lessonMode
      && attempt.stepIndex === lessonStep && attempt.revision === revision
      && (allowBatch || sceneEpochRef.current === sceneEpoch)
  }, [resolvedId, lessonMode, lessonStep, lessonAttempt.revision, sceneEpoch])
  const sceneSetVar = useMemo<SetEquationVariable>(() => {
    // A child bulk restore may reset the attempt on each field. Follow only
    // revisions produced by this callback; unrelated Retry/Next stays stale.
    let batchRevision = lessonAttempt.revision
    return (name, value, options) => {
      const source = options?.source
      const batch = source === "preset" || source === "restore" || source === "reset"
      if (!sceneIsCurrent(batch ? batchRevision : undefined, batch)) return
      setVar(name, value, options)
      if (batch) batchRevision = lessonAttemptRef.current.revision
    }
  }, [sceneIsCurrent, setVar, lessonAttempt.revision])
  const sceneOnAction = useCallback((name: string) => {
    if (sceneIsCurrent()) onAction(name)
  }, [sceneIsCurrent, onAction])
  const sceneIdentity = `${resolvedId}:${lessonMode}:${lessonStep}:${lessonAttempt.revision}:${sceneEpoch}`
  const visualizationContent = (
    <SceneInteractionSurface variables={formulaVariables} onVariableChange={sceneSetVar}
      key={`${resolvedId}:${sceneEpoch}`} identity={sceneIdentity} onInterrupt={interruptScene} onNativeGestureChange={setNativeGestureActive}>
      {children({ vars, setVar: sceneSetVar, onAction: sceneOnAction, highlightedVar, setHighlightedVar, highlightedTerm })}
    </SceneInteractionSurface>
  )

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
        <div className="min-w-0" style={{ height: phoneVisualizationHeight }}>
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
    <div ref={containerRef} className="flex h-full gap-3">
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
