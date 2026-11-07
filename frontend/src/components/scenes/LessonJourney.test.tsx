import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getConceptCheck } from "../../data/conceptChecks"
import { SETTINGS_STORAGE_KEY, SettingsProvider } from "../../settings/SettingsContext"
import { EquationIdProvider } from "../teaching/EquationContext"
import { EulerPolyhedraScene } from "./EulerPolyhedraScene"

interface SavedProgress {
  lessonStep: string
  completed: boolean
  timeSpentSeconds: number
}

const state = vi.hoisted(() => ({
  progress: { lessonStep: "", completed: false, timeSpentSeconds: 0 } as SavedProgress,
  update: vi.fn<(update: Partial<SavedProgress>) => void>(),
  explore: vi.fn(),
  logEvent: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock("../../hooks/useContainerSize", () => ({ useContainerSize: () => ({ width: 900, height: 440 }) }))
vi.mock("../../auth/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: true, isPro: true }) }))
vi.mock("../../api/hooks", () => ({ useEquation: () => ({ data: undefined, isLoading: false, isError: false }) }))
vi.mock("../../api/client", () => ({ api: { analytics: { logEvent: state.logEvent } } }))
vi.mock("../../progress/useProgress", () => ({
  useProgress: () => ({ progress: state.progress, updateProgress: state.update, markVariableExplored: state.explore }),
}))

beforeEach(() => {
  state.progress = { lessonStep: "", completed: false, timeSpentSeconds: 0 }
  state.update.mockClear()
  state.update.mockImplementation((update) => { Object.assign(state.progress, update) })
  state.explore.mockClear()
  state.logEvent.mockClear()
  localStorage.clear()
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
    autoStartLesson: true, showHints: true, language: "en",
    showFormulaLetters: false, showFormulaNumbers: false,
  }))
  // Keep the real scene's D3 controls while bounding its unrelated paint loop.
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1))
  vi.stubGlobal("cancelAnimationFrame", vi.fn())
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

function completionWrites() {
  return state.update.mock.calls.filter(([update]) => update.completed === true)
}

function workspaceSection(name: string) {
  return within(screen.getByRole("group", { name: "Workspace sections" })).getByRole("button", { name })
}

describe("real authored lesson journey", () => {
  it("requires Euler experiments, a retried correct concept answer and explicit Finish, retaining completion across tabs and replay", async () => {
    const check = getConceptCheck(7)!
    render(
      <SettingsProvider>
        <EquationIdProvider value={7}>
          <EulerPolyhedraScene />
        </EquationIdProvider>
      </SettingsProvider>,
    )

    await screen.findByRole("button", { name: "Retry this step" })
    expect(screen.getByText("1/3")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Select Cube" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: "Next step" })).not.toBeInTheDocument()
    expect(completionWrites()).toHaveLength(0)

    // The default cube and an unchanged cube selection cannot earn the first step.
    fireEvent.click(screen.getByRole("button", { name: "Select Cube" }))
    expect(screen.queryByRole("button", { name: "Next step" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Select Tetrahedron" }))
    expect(screen.queryByRole("button", { name: "Next step" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Select Cube" }))
    fireEvent.click(await screen.findByRole("button", { name: "Next step" }))

    await screen.findByText("2/3")
    expect(state.progress.lessonStep).toBe("try-others")
    expect(screen.queryByRole("button", { name: "Next step" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Select Octahedron" }))
    await screen.findByRole("button", { name: "Next step" })
    fireEvent.click(screen.getByRole("button", { name: "Retry this step" }))
    expect(screen.getByText("2/3")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Select Cube" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Select Octahedron" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.queryByRole("button", { name: "Next step" })).not.toBeInTheDocument()
    expect(completionWrites()).toHaveLength(0)
    fireEvent.click(screen.getByRole("button", { name: "Select Octahedron" }))
    fireEvent.click(await screen.findByRole("button", { name: "Next step" }))

    await screen.findByText("3/3")
    expect(state.progress.lessonStep).toBe("icosahedron")
    expect(screen.queryByRole("group", { name: "Concept check" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Select Icosahedron" }))
    const question = await screen.findByRole("group", { name: "Concept check" })
    expect(within(question).getByText(check.question)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Finish lesson" })).toBeDisabled()
    expect(completionWrites()).toHaveLength(0)

    const wrongIndex = (check.correctIndex + 1) % check.options.length
    fireEvent.click(within(question).getByRole("button", { name: check.options[wrongIndex] }))
    expect(within(question).getByRole("status")).toHaveTextContent("Not quite.")
    expect(screen.getByRole("button", { name: "Finish lesson" })).toBeDisabled()
    expect(completionWrites()).toHaveLength(0)
    fireEvent.click(within(question).getByRole("button", { name: "Try again" }))
    const correctOption = within(question).getByRole("button", { name: check.options[check.correctIndex] })
    expect(correctOption).toBeEnabled()
    fireEvent.click(correctOption)

    const finish = screen.getByRole("button", { name: "Finish lesson" })
    await waitFor(() => expect(finish).toBeEnabled())
    expect(screen.getByText("Concept check answered correctly.")).toBeInTheDocument()
    expect(screen.queryByText("Lesson complete!")).not.toBeInTheDocument()
    expect(completionWrites()).toHaveLength(0)
    fireEvent.click(finish)
    await screen.findByText("Lesson complete!")
    expect(completionWrites()).toHaveLength(1)
    expect(state.progress.completed).toBe(true)
    expect(state.logEvent.mock.calls.filter(([, event]) => event === "lesson_completed")).toEqual([
      [7, "lesson_completed", { step: 2 }],
    ])

    // Remount the runner through the real workspace tabs without starting another attempt.
    fireEvent.click(workspaceSection("Learn"))
    expect(screen.queryByText("Lesson complete!")).not.toBeInTheDocument()
    fireEvent.click(workspaceSection("Lesson"))
    await screen.findByText("Lesson complete!")
    expect(completionWrites()).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "Restart lesson" }))
    await screen.findByText("1/3")
    expect(screen.getByRole("button", { name: "Select Cube" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Select Icosahedron" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.queryByText("Lesson complete!")).not.toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Concept check" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Finish lesson" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Next step" })).not.toBeInTheDocument()
    expect(state.progress.completed).toBe(true)
    expect(state.update).not.toHaveBeenCalledWith(expect.objectContaining({ completed: false }))
    expect(completionWrites()).toHaveLength(1)
    expect(state.logEvent.mock.calls.filter(([, event]) => event === "lesson_completed")).toHaveLength(1)
  })
})
