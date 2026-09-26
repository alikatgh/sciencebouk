import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { EquationSummary } from "../../data/equationManifest"
import manifest from "../../data/content/equation-manifest-fallback.json"
import { EquationHeader } from "./EquationHeader"

vi.mock("../sceneRegistry", () => ({ prefetchEquationScene: vi.fn() }))

const equations = manifest as EquationSummary[]
const headerProps = {
  equation: equations[0]!,
  sidebarOpen: false,
  prevEquation: null,
  nextEquation: equations[1]!,
  isAuthenticated: false,
  userInitial: "",
  onOpenDrawer: vi.fn(),
  onOpenProfile: vi.fn(),
  onOpenAuth: vi.fn(),
  onSelectEquation: vi.fn(),
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("EquationHeader", () => {
  it("opens scientist information on the first click and can reopen after closing", async () => {
    render(<EquationHeader {...headerProps} />)

    fireEvent.click(screen.getByRole("button", { name: "Learn about Pythagoras" }))
    expect(await screen.findByRole("dialog", { name: "Pythagoras of Samos" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Learn about Pythagoras" }))
    expect(await screen.findByRole("dialog", { name: "Pythagoras of Samos" })).toBeInTheDocument()
  })

  it("closes scientist information when the equation changes and opens the new author", async () => {
    const { rerender } = render(<EquationHeader {...headerProps} />)
    fireEvent.click(screen.getByRole("button", { name: "Learn about Pythagoras" }))
    await screen.findByRole("dialog", { name: "Pythagoras of Samos" })

    rerender(<EquationHeader {...headerProps} equation={equations[1]!} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Learn about John Napier" }))
    expect(await screen.findByRole("dialog", { name: "John Napier of Merchiston" })).toBeInTheDocument()
  })

  it("provides one named navigation pair with the correct previous and next destinations", () => {
    render(<EquationHeader {...headerProps} equation={equations[1]!} prevEquation={equations[0]!} nextEquation={equations[2]!} />)
    const navigation = within(screen.getByRole("navigation", { name: "Equation navigation" }))
    const previous = navigation.getByRole("button", { name: "Previous equation: Pythagoras's Theorem" })
    const next = navigation.getByRole("button", { name: "Next equation: Calculus" })

    fireEvent.click(previous)
    fireEvent.click(next)

    expect(headerProps.onSelectEquation.mock.calls).toEqual([[1], [3]])
    expect(screen.getAllByRole("button", { name: /^Previous equation/ })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: /^Next equation/ })).toHaveLength(1)
  })

  it("keeps unavailable navigation directions disabled at the ends of the collection", () => {
    const { rerender } = render(<EquationHeader {...headerProps} />)
    const previous = screen.getByRole("button", { name: "Previous equation" })
    expect(previous).toBeDisabled()
    fireEvent.click(previous)
    expect(headerProps.onSelectEquation).not.toHaveBeenCalled()

    rerender(<EquationHeader {...headerProps} equation={equations[16]!} prevEquation={equations[15]!} nextEquation={null} />)
    const next = screen.getByRole("button", { name: "Next equation" })
    expect(next).toBeDisabled()
    fireEvent.click(next)
    expect(headerProps.onSelectEquation).not.toHaveBeenCalled()
  })
})
