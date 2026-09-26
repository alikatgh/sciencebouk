import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { api } from "../../api/client"
import { SettingsProvider } from "../../settings/SettingsContext"
import { TeachableEquation } from "./TeachableEquation"
import type { LessonStep, Variable } from "./types"

const progress = vi.hoisted(() => ({
  update: vi.fn(),
  explore: vi.fn(),
  value: { lessonStep: "", completed: false, timeSpentSeconds: 0 },
}))
vi.mock("../../hooks/useContainerSize", () => ({ useContainerSize: () => ({ width: 390, height: 620 }) }))
vi.mock("../../auth/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: true, isPro: true }) }))
vi.mock("../../api/hooks", () => ({ useEquation: () => ({ data: undefined }) }))
vi.mock("../../data/equationConfig", () => ({ useEquationConfig: () => undefined }))
vi.mock("../../progress/useProgress", () => ({
  useProgress: () => ({ progress: progress.value, updateProgress: progress.update, markVariableExplored: progress.explore }),
}))

const variables: Variable[] = [{
  name: "a", symbol: "a", latex: "a", value: 3, min: 1, max: 10, step: 1,
  color: "#315cdd", description: "Side length",
}]
const steps: LessonStep[] = [{
  id: "change-side", instruction: "Change the side length", highlightElements: [],
  unlockedVariables: ["a"], successCondition: { type: "variable_changed", target: "a" },
  celebration: "subtle", insight: "The triangle changes shape.",
}]

describe("lesson completion", () => {
  it("records completion once across tab remounts and again after an intentional replay", async () => {
    const logEvent = vi.spyOn(api.analytics, "logEvent").mockResolvedValue({ ok: true })
    render(
      <SettingsProvider>
        <TeachableEquation equationId={987} hook="Explore a triangle" hookAction="Change a side" formula="a" variables={variables} lessonSteps={steps}>
          {({ vars }) => <div>Triangle side: {vars.a}</div>}
        </TeachableEquation>
      </SettingsProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Lesson" }))
    await screen.findByText("Change the side length")
    fireEvent.change(screen.getByLabelText("Side length: 3"), { target: { value: "5" } })
    await screen.findByText("Lesson complete!", {}, { timeout: 3000 })
    expect(logEvent).toHaveBeenCalledWith(987, "lesson_completed", { step: 0 })
    expect(logEvent).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole("button", { name: "Learn" }))
    await userEvent.click(screen.getByRole("button", { name: "Lesson" }))
    await screen.findByText("Lesson complete!", {}, { timeout: 3000 })
    expect(logEvent).toHaveBeenCalledTimes(1)
    expect(progress.update.mock.calls.filter(([update]) => update.completed === true)).toHaveLength(1)

    await userEvent.click(screen.getByRole("button", { name: "Restart lesson" }))
    fireEvent.change(screen.getByLabelText("Side length: 3"), { target: { value: "6" } })
    await screen.findByText("Lesson complete!", {}, { timeout: 3000 })
    expect(logEvent).toHaveBeenCalledTimes(2)
    expect(progress.update.mock.calls.filter(([update]) => update.completed === true)).toHaveLength(2)
  })
})
