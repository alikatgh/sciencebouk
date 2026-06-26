import { afterEach, describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LearnMorePanel } from "./LearnMorePanel"
import { onTrack, resetAnalyticsForTests } from "../../lib/analytics"

afterEach(() => resetAnalyticsForTests())

describe("LearnMorePanel", () => {
  it("renders nothing when the equation has no learning content", () => {
    const { container } = render(<LearnMorePanel equationId={9999} />)
    expect(container.firstChild).toBeNull()
  })

  it("shows a tab per available aid and switches panels", async () => {
    render(<LearnMorePanel equationId={35} />) // Kinetic Energy: what-it-means + fact + worked example + check + builds-on
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "What it means",
      "Did you know?",
      "Worked example",
      "Quick check",
      "Builds on",
    ])

    // "What it means" is the default tab; switch to the fact
    await userEvent.click(screen.getByRole("tab", { name: "Did you know?" }))
    expect(screen.getByText(/four times the energy/i)).toBeInTheDocument()

    // the worked example shows the substitution steps
    await userEvent.click(screen.getByRole("tab", { name: "Worked example" }))
    expect(screen.getByText(/= ½ × 10 × 100 = 500 J/)).toBeInTheDocument()

    // switching reveals the prerequisite link and hides the fact
    await userEvent.click(screen.getByRole("tab", { name: "Builds on" }))
    expect(screen.getByRole("link", { name: /Newton's Second Law/ })).toBeInTheDocument()
    expect(screen.queryByText(/four times the energy/i)).not.toBeInTheDocument()
  })

  it("supports arrow-key navigation between tabs (WAI-ARIA roving focus)", async () => {
    render(<LearnMorePanel equationId={35} />)
    const firstTab = screen.getByRole("tab", { name: "What it means" })
    firstTab.focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Did you know?" })).toHaveAttribute("aria-selected", "true")
    expect(firstTab).toHaveAttribute("aria-selected", "false")
    // wraps around: Left from the first tab goes to the last
    firstTab.focus()
    await userEvent.keyboard("{ArrowLeft}")
    expect(screen.getByRole("tab", { name: "Builds on" })).toHaveAttribute("aria-selected", "true")
  })

  it("emits an analytics event when a tab is switched", async () => {
    const events: Array<{ event: string; props: Record<string, unknown> }> = []
    onTrack((event, props) => events.push({ event, props }))
    render(<LearnMorePanel equationId={35} />)
    await userEvent.click(screen.getByRole("tab", { name: "Quick check" }))
    expect(events).toContainEqual({
      event: "learn_more_tab",
      props: { equationId: 35, tab: "check" },
    })
  })
})
