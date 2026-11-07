import { afterEach, describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ConceptCheck } from "./ConceptCheck"
import { onTrack, resetAnalyticsForTests } from "../../lib/analytics"

afterEach(() => resetAnalyticsForTests())

describe("ConceptCheck", () => {
  it("renders nothing for an equation without a curated check", () => {
    const { container } = render(<ConceptCheck equationId={9999} />)
    expect(container.firstChild).toBeNull()
  })

  it("hides the explanation until the learner answers", () => {
    render(<ConceptCheck equationId={37} />) // Ohm's law
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("marks a wrong answer and reveals the explanation", async () => {
    render(<ConceptCheck equationId={37} />) // correct answer is "decreases"
    await userEvent.click(screen.getByText("increases"))
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent(/Not quite/)
    expect(status).toHaveTextContent(/I = V\/R/)
  })

  it("congratulates a correct answer", async () => {
    render(<ConceptCheck equationId={37} />)
    await userEvent.click(screen.getByText("decreases"))
    expect(screen.getByRole("status")).toHaveTextContent(/Correct/)
  })

  it("emits an analytics event recording the equation and correctness", async () => {
    const events: Array<{ event: string; props: Record<string, unknown> }> = []
    onTrack((event, props) => events.push({ event, props }))
    render(<ConceptCheck equationId={37} />)
    await userEvent.click(screen.getByText("decreases")) // correct
    expect(events).toContainEqual({
      event: "concept_check_answered",
      props: { equationId: 37, correct: true },
    })
  })

  it("keeps the correct lesson answer and explanation hidden after a wrong selection", async () => {
    const onAnswer = vi.fn()
    render(<ConceptCheck equationId={37} variant="lesson" onAnswer={onAnswer} />)
    await userEvent.click(screen.getByRole("button", { name: "increases" }))

    expect(onAnswer).toHaveBeenLastCalledWith(0)
    expect(screen.getByRole("status")).toHaveTextContent(/Not quite/)
    expect(screen.getByRole("status")).toHaveTextContent(/try another answer/)
    expect(screen.getByRole("status")).not.toHaveTextContent(/I = V\/R/)
    const rightAnswer = screen.getByRole("button", { name: "decreases" })
    expect(rightAnswer).toBeDisabled()
    expect(rightAnswer).not.toHaveTextContent("✓")
    expect(rightAnswer.className).not.toMatch(/emerald/)
  })

  it("clears a wrong answer on retry and reports the cleared answer before a new selection", async () => {
    const onAnswer = vi.fn()
    render(<ConceptCheck equationId={37} variant="lesson" onAnswer={onAnswer} />)
    await userEvent.click(screen.getByRole("button", { name: "increases" }))
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onAnswer).toHaveBeenLastCalledWith(null)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "increases" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "decreases" })).toBeEnabled()

    await userEvent.click(screen.getByRole("button", { name: "decreases" }))
    expect(onAnswer).toHaveBeenLastCalledWith(1)
    expect(screen.getByRole("status")).toHaveTextContent(/Correct.*I = V\/R/)
  })

  it("resets an answered question when the attempt key changes", async () => {
    const { rerender } = render(<ConceptCheck equationId={37} variant="lesson" resetKey="first" />)
    await userEvent.click(screen.getByRole("button", { name: "decreases" }))
    expect(screen.getByRole("status")).toHaveTextContent(/Correct/)
    rerender(<ConceptCheck equationId={37} variant="lesson" resetKey="second" />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "decreases" })).toHaveAttribute("aria-pressed", "false")
  })

  it("resets answer exposure when navigating to a different equation without remounting the parent", async () => {
    const { rerender } = render(<ConceptCheck equationId={37} />)
    await userEvent.click(screen.getByRole("button", { name: "decreases" }))
    rerender(<ConceptCheck equationId={35} />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "quadruples" })).toHaveAttribute("aria-pressed", "false")
  })

  it("supports a keyboard answer and retry in a lesson", async () => {
    const user = userEvent.setup()
    render(<ConceptCheck equationId={37} variant="lesson" />)
    await user.tab()
    expect(screen.getByRole("button", { name: "increases" })).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(screen.getByRole("status")).toHaveTextContent(/Not quite/)
    await user.tab()
    expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "increases" })).toHaveFocus()
  })
})
