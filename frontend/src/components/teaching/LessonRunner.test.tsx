import { useState, type ComponentProps } from "react"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LessonRunner } from "./LessonRunner"
import type { LessonStep, Variable } from "./types"

const preferences = vi.hoisted(() => ({ showHints: true }))
vi.mock("../../settings/SettingsContext", () => ({
  useSettings: () => ({ settings: { showHints: preferences.showHints } }),
}))

const resistance: Variable = {
  name: "R", symbol: "R", latex: "R", value: 10,
  min: 1, max: 100, step: 1, unit: "Ω", color: "#3b82f6",
}
const step: LessonStep = {
  id: "change-resistance", instruction: "Change the resistance and watch the current.",
  hint: "Move the resistance slider to compare the current.",
  highlightElements: ["R"], unlockedVariables: ["R"],
  successCondition: { type: "variable_changed", target: "R" },
  celebration: "subtle", insight: "More resistance reduces current at the same voltage.",
}

function runnerProps(overrides: Partial<ComponentProps<typeof LessonRunner>> = {}): ComponentProps<typeof LessonRunner> {
  return {
    equationId: 37, steps: [step], currentStepIndex: 0, onAdvance: vi.fn(), onReset: vi.fn(),
    stepCompleted: false, stepStartValues: { R: 5 }, attemptKey: "attempt-1", onRetryStep: vi.fn(),
    checkPassed: false, onCheckAnswer: vi.fn(), lessonFinished: false, variables: [resistance],
    ...overrides,
  }
}

beforeEach(() => { preferences.showHints = true })
afterEach(() => { vi.useRealTimers() })

describe("LessonRunner", () => {
  it("makes an optional hint available immediately and lets the learner close it", async () => {
    render(<LessonRunner {...runnerProps()} />)
    const show = screen.getByRole("button", { name: "Show hint" })
    expect(show).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText(step.hint!)).not.toBeInTheDocument()

    await userEvent.click(show)
    expect(screen.getByText(step.hint!)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Hide hint" })).toHaveAttribute("aria-expanded", "true")
    await userEvent.click(screen.getByRole("button", { name: "Hide hint" }))
    expect(screen.queryByText(step.hint!)).not.toBeInTheDocument()
  })

  it("respects the hints preference", () => {
    preferences.showHints = false
    render(<LessonRunner {...runnerProps()} />)
    expect(screen.queryByRole("button", { name: "Show hint" })).not.toBeInTheDocument()
    expect(screen.queryByText(step.hint!)).not.toBeInTheDocument()
  })

  it("shows real starting and current values with the authored target and an exact zero tolerance", () => {
    const targetStep: LessonStep = { ...step, successCondition: { type: "value_reached", target: "R", value: 10, tolerance: 0 } }
    const props = runnerProps({ steps: [targetStep] })
    const { rerender } = render(<LessonRunner {...props} />)
    expect(screen.getByRole("status")).toHaveTextContent("Goal: Set R to 10 Ω (±0 Ω).")
    const values = screen.getByRole("table", { name: "Experiment values" })
    expect(within(values).getByRole("columnheader", { name: "Start" })).toBeInTheDocument()
    expect(within(values).getByText("5 Ω")).toBeInTheDocument()
    expect(within(values).getByText("10 Ω")).toBeInTheDocument()

    rerender(<LessonRunner {...props} variables={[{ ...resistance, value: 12 }]} />)
    expect(within(values).getByText("12 Ω")).toBeInTheDocument()
    expect(within(values).getByText("5 Ω")).toBeInTheDocument()
  })

  it("shows all authored compound targets and explains a goal that is already at the starting values", () => {
    const voltage = { ...resistance, name: "V", symbol: "V", value: 12, unit: "V" }
    const targetStep: LessonStep = {
      ...step, unlockedVariables: ["R", "V"],
      successCondition: { type: "value_reached", target: "R", value: 10, tolerance: 0, additionalTargets: [{ target: "V", value: 12, tolerance: 0.1 }] },
    }
    render(<LessonRunner {...runnerProps({ steps: [targetStep], variables: [resistance, voltage], stepStartValues: { R: 10, V: 12 } })} />)
    expect(screen.getByRole("status")).toHaveTextContent("Set R to 10 Ω (±0 Ω) and V to 12 V (±0.1 V).")
    expect(screen.getByText(/Try another value, then return to the target/)).toBeInTheDocument()
    expect(screen.getByRole("table", { name: "Experiment values" })).toHaveTextContent("V")
    expect(screen.queryByText(/Goal reached/)).not.toBeInTheDocument()
  })

  it("does not invent a current scalar value for a derived target absent from the variables", () => {
    const derivedStep: LessonStep = { ...step, successCondition: { type: "value_reached", target: "current", value: 2, tolerance: 0.1 } }
    render(<LessonRunner {...runnerProps({ steps: [derivedStep] })} />)
    expect(screen.getByRole("status")).toHaveTextContent("Set current to 2 (±0.1).")
    const values = screen.getByRole("table", { name: "Experiment values" })
    expect(within(values).queryByRole("rowheader", { name: "current" })).not.toBeInTheDocument()
    expect(within(values).getByRole("rowheader", { name: "R" })).toBeInTheDocument()
  })

  it("shows success immediately but never advances automatically after the final hands-on step", () => {
    vi.useFakeTimers()
    const props = runnerProps()
    const { rerender } = render(<LessonRunner {...props} />)
    expect(screen.queryByRole("button", { name: "Finish lesson" })).not.toBeInTheDocument()
    rerender(<LessonRunner {...props} stepCompleted />)
    expect(screen.getByText(step.insight)).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Concept check" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Finish lesson" })).toBeDisabled()
    act(() => { vi.advanceTimersByTime(20000) })
    expect(props.onAdvance).not.toHaveBeenCalled()
    expect(screen.queryByText("Lesson complete!")).not.toBeInTheDocument()
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow", "100")
  })

  it("keeps Finish disabled after a wrong answer, then requires an explicit Finish after a correct retry", async () => {
    const props = runnerProps({ stepCompleted: true })
    function LessonWithAnswerState() {
      const [checkPassed, setCheckPassed] = useState(false)
      return <LessonRunner {...props} checkPassed={checkPassed} onCheckAnswer={(index) => { props.onCheckAnswer(index); setCheckPassed(index === 1) }} />
    }
    render(<LessonWithAnswerState />)
    await userEvent.click(screen.getByRole("button", { name: "increases" }))
    await userEvent.click(screen.getByRole("button", { name: "Finish lesson" }))
    expect(props.onCheckAnswer).toHaveBeenLastCalledWith(0)
    expect(props.onAdvance).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Finish lesson" })).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(props.onCheckAnswer).toHaveBeenLastCalledWith(null)
    await userEvent.click(screen.getByRole("button", { name: "decreases" }))
    expect(screen.getByRole("button", { name: "Finish lesson" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Finish lesson" })).toHaveFocus()
    expect(props.onAdvance).not.toHaveBeenCalled()
    expect(screen.queryByText("Lesson complete!")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Finish lesson" }))
    expect(props.onAdvance).toHaveBeenCalledOnce()
  })

  it("clears the final answer when the retry callback starts another attempt", async () => {
    const props = runnerProps({ stepCompleted: true })
    const { rerender } = render(<LessonRunner {...props} />)
    await userEvent.click(screen.getByRole("button", { name: "decreases" }))
    const question = screen.getByRole("group", { name: "Concept check" })
    expect(within(question).getByRole("status")).toHaveTextContent("Correct")
    await userEvent.click(screen.getByRole("button", { name: "Retry this step" }))
    expect(props.onRetryStep).toHaveBeenCalledOnce()

    rerender(<LessonRunner {...props} attemptKey="attempt-2" />)
    expect(within(screen.getByRole("group", { name: "Concept check" })).queryByRole("status")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "decreases" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "Finish lesson" })).toBeDisabled()
  })

  it("waits for the engine's finished state before showing the final banner", () => {
    const props = runnerProps({ stepCompleted: true, checkPassed: true })
    const { rerender } = render(<LessonRunner {...props} />)
    expect(screen.queryByText("Lesson complete!")).not.toBeInTheDocument()
    rerender(<LessonRunner {...props} lessonFinished />)
    expect(screen.getByRole("status")).toHaveTextContent("Lesson complete!")
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
    expect(screen.queryByRole("button", { name: "Finish lesson" })).not.toBeInTheDocument()
  })

  it("shows the passed check after a lesson remount and restores the quiz for a new attempt", async () => {
    const props = runnerProps({ stepCompleted: true })
    const initial = render(<LessonRunner {...props} />)
    await userEvent.click(screen.getByRole("button", { name: "decreases" }))
    expect(props.onCheckAnswer).toHaveBeenLastCalledWith(1)
    initial.unmount()

    const resumed = render(<LessonRunner {...props} checkPassed />)
    const passedCheck = screen.getByRole("group", { name: "Concept check" })
    expect(within(passedCheck).getByRole("status")).toHaveTextContent("Concept check answered correctly.")
    expect(passedCheck).toHaveTextContent("I = V/R")
    expect(within(passedCheck).queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Finish lesson" })).toBeEnabled()
    expect(props.onAdvance).not.toHaveBeenCalled()
    expect(screen.queryByText("Lesson complete!")).not.toBeInTheDocument()

    resumed.rerender(<LessonRunner {...props} attemptKey="new-attempt" checkPassed={false} />)
    expect(screen.getByRole("button", { name: "decreases" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "Finish lesson" })).toBeDisabled()
    expect(screen.queryByText("Concept check answered correctly.")).not.toBeInTheDocument()
  })

  it("keeps next-step progression and free exploration explicit and keyboard accessible", () => {
    const props = runnerProps({ steps: [step, { ...step, id: "next" }], stepCompleted: true, onExploreFreely: vi.fn() })
    render(<LessonRunner {...props} />)
    const next = screen.getByRole("button", { name: "Next step" })
    next.focus()
    expect(next).toHaveFocus()
    fireEvent.click(next)
    expect(props.onAdvance).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole("button", { name: "Explore freely" }))
    expect(props.onExploreFreely).toHaveBeenCalledOnce()
  })
})
