import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LearnMorePanel } from "./LearnMorePanel"

describe("LearnMorePanel", () => {
  it("renders nothing when the equation has no learning content", () => {
    const { container } = render(<LearnMorePanel equationId={9999} />)
    expect(container.firstChild).toBeNull()
  })

  it("shows a tab per available aid and switches panels", async () => {
    render(<LearnMorePanel equationId={35} />) // Kinetic Energy: fact + worked example + check + builds-on
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Did you know?",
      "Worked example",
      "Quick check",
      "Builds on",
    ])

    // first tab active by default — the fact is visible
    expect(screen.getByText(/four times the energy/i)).toBeInTheDocument()

    // the worked example shows the substitution steps
    await userEvent.click(screen.getByRole("tab", { name: "Worked example" }))
    expect(screen.getByText(/= ½ × 10 × 100 = 500 J/)).toBeInTheDocument()

    // switching reveals the prerequisite link and hides the fact
    await userEvent.click(screen.getByRole("tab", { name: "Builds on" }))
    expect(screen.getByRole("link", { name: /Newton's Second Law/ })).toBeInTheDocument()
    expect(screen.queryByText(/four times the energy/i)).not.toBeInTheDocument()
  })
})
