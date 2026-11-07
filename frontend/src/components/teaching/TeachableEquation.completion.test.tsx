import type { ComponentProps } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "../../api/client"
import { SettingsProvider } from "../../settings/SettingsContext"
import type { LessonRunner } from "./LessonRunner"
import { TeachableEquation } from "./TeachableEquation"
import type { ExperimentChange, ExperimentMeasurement, LessonStep, SetEquationVariable, Variable } from "./types"

type RunnerProps = ComponentProps<typeof LessonRunner>
interface SceneState {
  vars: Record<string, number>
  setVar: SetEquationVariable
  onAction: (name: string) => void
}
const state = vi.hoisted(() => ({
  runner: null as RunnerProps | null, scene: null as SceneState | null,
  runPrediction: null as ((change: ExperimentChange) => boolean) | null,
}))
const progress = vi.hoisted(() => ({
  update: vi.fn(), explore: vi.fn(),
  value: { lessonStep: "", completed: false, timeSpentSeconds: 0 },
}))
vi.mock("../../hooks/useContainerSize", () => ({ useContainerSize: () => ({ width: 390, height: 620 }) }))
vi.mock("../../auth/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: true, isPro: true }) }))
vi.mock("../../api/hooks", () => ({ useEquation: () => ({ data: undefined }) }))
vi.mock("../../data/equationConfig", () => ({ useEquationConfig: () => undefined }))
vi.mock("../../data/conceptChecks", () => ({
  getConceptCheck: (id: number) => id === 999 ? null : ({
    question: "What changed?", options: ["Nothing", "The relationship"], correctIndex: 1, explanation: "The values are related.",
  }),
}))
vi.mock("../../progress/useProgress", () => ({
  useProgress: () => ({ progress: progress.value, updateProgress: progress.update, markVariableExplored: progress.explore }),
}))
// Invoke the controller directly: a mistaken UI callback must not bypass its guards.
vi.mock("./LessonRunner", () => ({
  LessonRunner: (props: RunnerProps) => {
    state.runner = props
    return <div data-testid="lesson-controller">{props.steps[props.currentStepIndex]?.instruction}</div>
  },
}))
vi.mock("./PredictionChallenge", () => ({
  PredictionChallenge: ({ onRun }: { onRun: (change: ExperimentChange) => boolean }) => {
    state.runPrediction = onRun
    return <div>Prediction practice</div>
  },
}))

const variables: Variable[] = [{
  name: "a", symbol: "a", latex: "a", value: 3, min: 1, max: 10, step: 1,
  color: "#315cdd", description: "Side length",
}, {
  name: "b", symbol: "b", latex: "b", value: 4, min: 1, max: 10, step: 1,
  color: "#315cdd", description: "Second side",
}]
const steps: LessonStep[] = [{
  id: "change-side", instruction: "Change the side length", highlightElements: [],
  unlockedVariables: ["a"], successCondition: { type: "variable_changed", target: "a" },
  celebration: "subtle", insight: "The triangle changes shape.",
}]

function equation(equationId = 987, lessonSteps = steps, sceneVariables = variables, measurement?: ExperimentMeasurement) {
  return (
    <SettingsProvider>
      <TeachableEquation equationId={equationId} hook="Explore a triangle" hookAction="Change a side" formula="a" variables={sceneVariables} lessonSteps={lessonSteps}
        presets={[{ label: "Goal preset", values: { a: 5 } }]} experimentMeasurement={measurement}>
        {(props) => {
          state.scene = props
          return <div>Triangle side: {props.vars.a}; second side: {props.vars.b}</div>
        }}
      </TeachableEquation>
    </SettingsProvider>
  )
}

async function renderEquation(equationId = 987, lessonSteps = steps, sceneVariables = variables, measurement?: ExperimentMeasurement) {
  const view = render(equation(equationId, lessonSteps, sceneVariables, measurement))
  await screen.findByTestId("lesson-controller")
  return view
}

function runner() {
  if (!state.runner) throw new Error("Lesson runner has not rendered")
  return state.runner
}
function scene() {
  if (!state.scene) throw new Error("Equation scene has not rendered")
  return state.scene
}
function completionWrites() {
  return progress.update.mock.calls.filter(([update]) => update.completed === true)
}

beforeEach(() => {
  vi.clearAllMocks()
  progress.value = { lessonStep: "", completed: false, timeSpentSeconds: 0 }
  state.runner = null
  state.scene = null
  state.runPrediction = null
  vi.spyOn(api.analytics, "logEvent").mockResolvedValue({ ok: true })
})
afterEach(() => vi.useRealTimers())

describe("lesson completion controller", () => {
  it("requires the final hands-on condition, a correct answer, and an explicit Finish", async () => {
    await renderEquation()
    act(() => runner().onCheckAnswer(1))
    act(() => runner().onAdvance())
    expect(runner().checkPassed).toBe(false)
    expect(completionWrites()).toHaveLength(0)

    act(() => scene().setVar("a", 5))
    expect(runner().stepCompleted).toBe(true)
    expect(runner().lessonFinished).toBe(false)
    act(() => runner().onAdvance())
    expect(completionWrites()).toHaveLength(0)
    for (const answer of [0, -1, 2, 1.5, Number.NaN]) {
      act(() => runner().onCheckAnswer(answer))
      act(() => runner().onAdvance())
      expect(runner().checkPassed).toBe(false)
      expect(completionWrites()).toHaveLength(0)
    }
    act(() => runner().onCheckAnswer(1))
    expect(runner().checkPassed).toBe(true)
    expect(runner().lessonFinished).toBe(false)
    expect(completionWrites()).toHaveLength(0)
    act(() => runner().onCheckAnswer(null))
    expect(runner().checkPassed).toBe(false)
    act(() => runner().onCheckAnswer(1))
    act(() => { runner().onAdvance(); runner().onAdvance() })
    expect(runner().lessonFinished).toBe(true)
    expect(completionWrites()).toHaveLength(1)
    expect(api.analytics.logEvent).toHaveBeenCalledWith(987, "lesson_completed", { step: 0 })
  })

  it("records once across tab remounts and again after an intentional replay", async () => {
    await renderEquation()
    act(() => scene().setVar("a", 5))
    act(() => runner().onCheckAnswer(1))
    act(() => runner().onAdvance())
    fireEvent.click(screen.getByRole("button", { name: "Learn" }))
    fireEvent.click(screen.getByRole("button", { name: "Lesson" }))
    await screen.findByTestId("lesson-controller")
    expect(runner().lessonFinished).toBe(true)
    act(() => runner().onAdvance())
    expect(completionWrites()).toHaveLength(1)

    const finishedKey = runner().attemptKey
    act(() => runner().onReset())
    expect(runner().attemptKey).not.toBe(finishedKey)
    expect(runner().stepCompleted).toBe(false)
    expect(runner().checkPassed).toBe(false)
    expect(runner().lessonFinished).toBe(false)
    expect(scene().vars.a).toBe(3)
    act(() => runner().onAdvance())
    expect(completionWrites()).toHaveLength(1)
    act(() => scene().setVar("a", 6))
    act(() => runner().onCheckAnswer(1))
    act(() => runner().onAdvance())
    expect(completionWrites()).toHaveLength(2)
    expect(api.analytics.logEvent).toHaveBeenCalledTimes(2)
  })

  it("retries from a stable step snapshot and clears the check and earned condition", async () => {
    await renderEquation()
    const startValues = runner().stepStartValues
    const attemptKey = runner().attemptKey
    act(() => scene().setVar("a", 5))
    expect(runner().stepStartValues).toBe(startValues)
    act(() => runner().onCheckAnswer(1))
    act(() => runner().onRetryStep())
    expect(runner().stepStartValues).toEqual({ a: 3, b: 4 })
    expect(runner().attemptKey).not.toBe(attemptKey)
    expect(scene().vars).toEqual({ a: 3, b: 4 })
    expect(runner().stepCompleted).toBe(false)
    expect(runner().checkPassed).toBe(false)
    act(() => scene().setVar("a", 5, { source: "system" }))
    expect(runner().stepCompleted).toBe(false)
    expect(completionWrites()).toHaveLength(0)
  })

  it("guards intermediate advances and snapshots each step while preserving resume IDs", async () => {
    const multiStep = [steps[0], { ...steps[0], id: "second-side", unlockedVariables: ["b"],
      successCondition: { type: "variable_changed" as const, target: "b" } }]
    await renderEquation(987, multiStep)
    act(() => runner().onAdvance())
    expect(runner().currentStepIndex).toBe(0)
    act(() => scene().setVar("a", 5))
    act(() => runner().onCheckAnswer(1))
    expect(runner().checkPassed).toBe(false)
    act(() => runner().onAdvance())
    expect(runner().currentStepIndex).toBe(1)
    expect(progress.update).toHaveBeenCalledWith({ lessonStep: "second-side" })
    expect(runner().stepStartValues).toEqual({ a: 5, b: 4 })
    expect(runner().stepCompleted).toBe(false)
    expect(runner().checkPassed).toBe(false)
    act(() => scene().setVar("b", 7))
    act(() => runner().onCheckAnswer(1))
    act(() => runner().onRetryStep())
    expect(scene().vars).toEqual({ a: 5, b: 4 })
    expect(runner().currentStepIndex).toBe(1)
    expect(runner().stepCompleted).toBe(false)
    expect(runner().checkPassed).toBe(false)
  })

  it("does not award a value goal from initial defaults, a preset or restoration", async () => {
    const valueSteps = [{ ...steps[0], successCondition: { type: "value_reached" as const, target: "a", value: 3, tolerance: 0 } }]
    await renderEquation(987, valueSteps)
    expect(runner().stepCompleted).toBe(false)
    act(() => scene().setVar("a", 3))
    expect(runner().stepCompleted).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Explore" }))
    fireEvent.click(screen.getByRole("button", { name: "Goal preset" }))
    fireEvent.click(screen.getByRole("button", { name: "Lesson" }))
    expect(scene().vars.a).toBe(5)
    expect(runner().stepCompleted).toBe(false)
    for (const source of ["restore", "reset", "preset"] as const) {
      act(() => scene().setVar("a", 4, { source }))
      act(() => scene().setVar("a", 3, { source }))
      expect(runner().stepCompleted).toBe(false)
    }
    act(() => scene().setVar("a", 4))
    act(() => scene().setVar("a", 3))
    expect(runner().stepCompleted).toBe(true)
  })

  it("fails closed when the curated question is missing", async () => {
    await renderEquation(999)
    act(() => scene().setVar("a", 5))
    act(() => runner().onCheckAnswer(1))
    act(() => runner().onAdvance())
    expect(runner().checkPassed).toBe(false)
    expect(runner().lessonFinished).toBe(false)
    expect(completionWrites()).toHaveLength(0)
  })

  it("allows constant system outputs without awarding them until a learner changes a driver", async () => {
    const derivedSteps = [{ ...steps[0], unlockedVariables: ["b"],
      successCondition: { type: "value_reached" as const, target: "a", value: 5, tolerance: 0 } }]
    await renderEquation(987, derivedSteps, [{ ...variables[0], constant: true }, variables[1]])
    act(() => scene().setVar("a", 5, { source: "system" }))
    expect(scene().vars.a).toBe(5)
    expect(runner().stepCompleted).toBe(false)
    act(() => scene().setVar("a", 3, { source: "system" }))
    act(() => scene().setVar("b", 5))
    act(() => scene().setVar("a", 5, { source: "system" }))
    expect(runner().stepCompleted).toBe(true)
    expect(progress.explore.mock.calls).toEqual([["b"]])
  })

  it("treats durable completion as history rather than the current run state", async () => {
    progress.value.completed = true
    await renderEquation()
    expect(runner().lessonFinished).toBe(false)
    act(() => runner().onRetryStep())
    expect(progress.value.completed).toBe(true)
    expect(progress.update).not.toHaveBeenCalledWith(expect.objectContaining({ completed: false }))
  })

  it("restores a saved stable step ID without earning it", async () => {
    progress.value.lessonStep = "second-side"
    const multiStep = [steps[0], { ...steps[0], id: "second-side" }]
    await renderEquation(987, multiStep)
    expect(runner().currentStepIndex).toBe(1)
    expect(runner().stepCompleted).toBe(false)
    expect(runner().stepStartValues).toEqual({ a: 3, b: 4 })
  })

  it("resets the attempt and snapshot when the equation changes", async () => {
    const view = await renderEquation()
    act(() => scene().setVar("a", 5))
    act(() => runner().onCheckAnswer(1))
    view.rerender(equation(988, steps, [{ ...variables[0], value: 7 }, variables[1]]))
    expect(runner().equationId).toBe(988)
    expect(scene().vars.a).toBe(7)
    expect(runner().stepStartValues).toEqual({ a: 7, b: 4 })
    expect(runner().stepCompleted).toBe(false)
    expect(runner().checkPassed).toBe(false)
  })

  it("requires the exact scene action and leaves legacy timers unable to auto-complete", async () => {
    const actionStep = [{ ...steps[0], successCondition: { type: "clicked" as const, target: "measure" } }]
    const view = await renderEquation(987, actionStep)
    act(() => scene().onAction("other"))
    expect(runner().stepCompleted).toBe(false)
    act(() => scene().onAction("measure"))
    expect(runner().stepCompleted).toBe(true)
    const timerStep = [{ ...steps[0], successCondition: { type: "time_elapsed" as const, duration: 10 } }]
    view.rerender(equation(988, timerStep))
    vi.useFakeTimers()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(runner().stepCompleted).toBe(false)
    expect(completionWrites()).toHaveLength(0)
  })
})

describe("experiment controller", () => {
  const measurement: ExperimentMeasurement = { symbol: "area", compute: (values) => values.a * values.b }
  function openBench() {
    const button = screen.getByRole("button", { name: "Experiment bench" })
    if (button.getAttribute("aria-expanded") !== "true") fireEvent.click(button)
  }
  function prediction() {
    if (!state.runPrediction) throw Error("Prediction practice has not mounted")
    return state.runPrediction
  }

  it("captures and restores inputs without completing an unearned step, keeping comparison open", async () => {
    await renderEquation()
    openBench()
    fireEvent.click(screen.getByRole("button", { name: "Capture baseline" }))
    expect(scene().vars.a).toBe(3)
    expect(runner().stepCompleted).toBe(false)
    act(() => scene().setVar("a", 5, { source: "preset" }))
    expect(runner().stepCompleted).toBe(false)
    expect(screen.getByRole("table", { name: "Baseline and current values" })).toHaveTextContent("5")
    fireEvent.click(screen.getByRole("button", { name: "Restore inputs" }))
    expect(scene().vars).toEqual({ a: 3, b: 4 })
    expect(runner().stepCompleted).toBe(false)
    expect(screen.getByRole("button", { name: "Experiment bench" })).toHaveAttribute("aria-expanded", "true")
    expect(completionWrites()).toHaveLength(0)
  })

  it("preserves the captured baseline across tabs but clears it on replay and equation navigation", async () => {
    const view = await renderEquation()
    openBench()
    fireEvent.click(screen.getByRole("button", { name: "Capture baseline" }))
    fireEvent.click(screen.getByRole("button", { name: "Explore" }))
    openBench()
    expect(screen.getByRole("button", { name: "Replace baseline" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Lesson" }))
    act(() => runner().onReset())
    openBench()
    expect(screen.getByRole("button", { name: "Capture baseline" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Capture baseline" }))
    view.rerender(equation(988))
    openBench()
    expect(screen.getByRole("button", { name: "Capture baseline" })).toBeInTheDocument()
  })

  it("rejects restoring a baseline that would change an input locked by the next step", async () => {
    const multiStep = [steps[0], { ...steps[0], id: "second-side", unlockedVariables: ["b"],
      successCondition: { type: "variable_changed" as const, target: "b" } }]
    await renderEquation(987, multiStep)
    openBench()
    fireEvent.click(screen.getByRole("button", { name: "Capture baseline" }))
    act(() => scene().setVar("a", 5))
    act(() => runner().onAdvance())
    openBench()
    expect(screen.getByRole("button", { name: "Restore inputs" })).toBeDisabled()
    expect(scene().vars.a).toBe(5)
    expect(runner().stepCompleted).toBe(false)
    expect(completionWrites()).toHaveLength(0)
  })

  it("runs one fresh legal prediction and captures its baseline, without skipping the final check", async () => {
    await renderEquation(987, steps, variables, measurement)
    openBench()
    const expectedValues = { ...scene().vars }
    let accepted = true
    act(() => { accepted = prediction()({ variableName: "b", value: 5, expectedValues }) })
    expect(accepted).toBe(false)
    act(() => { accepted = prediction()({ variableName: "a", value: 5, expectedValues: { a: 3, b: 9 } }) })
    expect(accepted).toBe(false)
    expect(runner().stepCompleted).toBe(false)
    act(() => { accepted = prediction()({ variableName: "a", value: 5, expectedValues }) })
    expect(accepted).toBe(true)
    expect(scene().vars.a).toBe(5)
    expect(runner().stepCompleted).toBe(true)
    expect(screen.getByRole("button", { name: "Replace baseline" })).toBeInTheDocument()
    expect(runner().checkPassed).toBe(false)
    expect(completionWrites()).toHaveLength(0)
    act(() => runner().onAdvance())
    expect(completionWrites()).toHaveLength(0)
  })

  it("rejects an old prediction after Retry, a step change, or an equation change even when values match", async () => {
    const multiStep = [steps[0], { ...steps[0], id: "second-side", unlockedVariables: ["b"],
      successCondition: { type: "variable_changed" as const, target: "b" } }]
    const view = await renderEquation(987, multiStep, variables, measurement)
    openBench()
    const beforeRetry = prediction()
    act(() => runner().onRetryStep())
    let accepted = true
    act(() => { accepted = beforeRetry({ variableName: "a", value: 5, expectedValues: { ...scene().vars } }) })
    expect(accepted).toBe(false)
    const beforeAdvance = prediction()
    act(() => scene().setVar("a", 5))
    act(() => runner().onAdvance())
    act(() => { accepted = beforeAdvance({ variableName: "b", value: 5, expectedValues: { ...scene().vars } }) })
    expect(accepted).toBe(false)
    expect(runner().stepCompleted).toBe(false)
    openBench()
    const beforeNavigation = prediction()
    view.rerender(equation(988, multiStep, variables, measurement))
    act(() => { accepted = beforeNavigation({ variableName: "a", value: 5, expectedValues: { ...scene().vars } }) })
    expect(accepted).toBe(false)
    expect(scene().vars.a).toBe(3)
    expect(completionWrites()).toHaveLength(0)
  })
})
