import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SettingsProvider } from "../../settings/SettingsContext"
import { TeachableEquation } from "./TeachableEquation"
import type { LessonStep, Variable } from "./types"

vi.mock("../../hooks/useContainerSize", () => ({
  useContainerSize: () => ({ width: 390, height: 620 }),
}))
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isPro: false }),
}))

const variables: Variable[] = [{
  name: "a", symbol: "a", latex: "a", value: 3, min: 1, max: 10, step: 1,
  color: "#3b82f6", description: "Side length",
}, {
  name: "b", symbol: "b", latex: "b", value: 4, min: 1, max: 15, step: 1,
  color: "#f59e0b", description: "Horizontal side",
}]
const lessonSteps: LessonStep[] = [{
  id: "change-side", instruction: "Change the side length", highlightElements: [],
  unlockedVariables: ["a"], successCondition: { type: "variable_changed", target: "a" },
  celebration: "subtle", insight: "The triangle changes shape.",
}]

afterEach(() => vi.unstubAllGlobals())

function renderMobileEquation(viewportWidth = 390) {
  vi.stubGlobal("innerWidth", viewportWidth)
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SettingsProvider>
        <TeachableEquation
          equationId={0} hook="Explore a triangle" hookAction="Change a side"
          formula="a" variables={variables} lessonSteps={lessonSteps}
          presets={[{ label: "5-12-13", values: { a: 5, b: 12 } }]}
        >
          {({ vars }) => <><div>Triangle side: {vars.a}</div><div>Horizontal side: {vars.b}</div></>}
        </TeachableEquation>
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

describe("mobile teaching workspace", () => {
  it("keeps phone lessons visible without an expandable or hidden sheet", async () => {
    renderMobileEquation()
    expect(screen.getByRole("region", { name: "Equation workspace" })).toBeInTheDocument()
    expect(await screen.findByText("Change the side length")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Resize teaching panel" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Hide" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Open teaching panel" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enter focused visualization mode" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Guided lesson" })).not.toBeInTheDocument()
  })

  it("lets phone learners leave the lesson from its progress row", async () => {
    renderMobileEquation()
    await screen.findByText("Change the side length")
    await userEvent.click(screen.getByRole("button", { name: "Explore freely" }))
    expect(screen.getByRole("button", { name: "Explore" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByLabelText("Horizontal side: 4")).toBeEnabled()
    expect(screen.getByRole("button", { name: "5-12-13" })).toBeEnabled()
  })

  it("preserves tablet expansion with Enter and Space", async () => {
    renderMobileEquation(800)
    const resize = screen.getByRole("button", { name: "Resize teaching panel" })
    resize.focus()

    await userEvent.keyboard("{Enter}")
    expect(screen.getByText("Show more diagram")).toBeInTheDocument()
    await userEvent.keyboard(" ")
    expect(screen.getByText("Expand workspace")).toBeInTheDocument()
  })

  it("preserves tablet taps and does not toggle back after a swipe", async () => {
    renderMobileEquation(800)
    const resize = screen.getByRole("button", { name: "Resize teaching panel" })
    await userEvent.click(resize)
    expect(screen.getByText("Show more diagram")).toBeInTheDocument()
    await userEvent.click(resize)
    expect(screen.getByText("Expand workspace")).toBeInTheDocument()

    fireEvent.pointerDown(resize, { pointerId: 1, clientY: 500 })
    fireEvent.pointerUp(resize, { pointerId: 1, clientY: 400 })
    fireEvent.click(resize, { detail: 1 })
    expect(screen.getByText("Show more diagram")).toBeInTheDocument()
  })

  it("exposes the selected section and lets controls change the scene", async () => {
    renderMobileEquation()
    const controls = screen.getByRole("button", { name: "Explore" })
    expect(screen.getByRole("button", { name: "Lesson" })).toHaveAttribute("aria-pressed", "true")
    await screen.findByText("Change the side length", {}, { timeout: 5000 })
    await userEvent.click(screen.getByRole("button", { name: "Learn" }))
    expect(screen.getByRole("button", { name: "Learn" })).toHaveAttribute("aria-pressed", "true")

    await userEvent.click(controls)
    expect(controls).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Learn" })).toHaveAttribute("aria-pressed", "false")
    fireEvent.change(screen.getByLabelText("Side length: 3"), { target: { value: "5" } })
    expect(screen.getByText("Triangle side: 5")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Lesson" }))
    expect(await screen.findByText("Change the side length")).toBeInTheDocument()
  })

  it("reopens the selected tablet section in its compact state", async () => {
    renderMobileEquation(800)
    await userEvent.click(screen.getByRole("button", { name: "Lesson" }))
    await screen.findByText("Change the side length")
    await userEvent.click(screen.getByRole("button", { name: "Resize teaching panel" }))
    await userEvent.click(screen.getByRole("button", { name: "Hide" }))

    const reopen = screen.getByRole("button", { name: "Open teaching panel" })
    expect(reopen).toHaveTextContent("Show panel")
    await userEvent.click(reopen)
    expect(screen.getByText("Expand workspace")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Lesson" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("Change the side length")).toBeInTheDocument()
  })

  it("lets learners leave guided mode and apply a complete preset", async () => {
    renderMobileEquation()
    await userEvent.click(screen.getByRole("button", { name: "Explore" }))
    expect(screen.getByText("Locked for this lesson step")).toBeVisible()
    expect(screen.getByRole("button", { name: "5-12-13" })).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: "Explore freely" }))
    expect(screen.queryByText("Locked for this lesson step")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Horizontal side: 4")).toBeEnabled()
    await userEvent.click(screen.getByRole("button", { name: "5-12-13" }))
    expect(screen.getByText("Triangle side: 5")).toBeInTheDocument()
    expect(screen.getByText("Horizontal side: 12")).toBeInTheDocument()
  })
})
