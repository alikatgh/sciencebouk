import { afterEach, describe, it, expect } from "vitest"
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
})
