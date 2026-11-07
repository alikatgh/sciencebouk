import { fireEvent, render, screen, within } from "@testing-library/react"
import { Link, MemoryRouter, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HomePage } from "./HomePage"
import type { EquationProgress } from "../progress/useProgress"
import pages from "../data/content/pages.json"

const state = vi.hoisted(() => ({
  progress: new Map<number, EquationProgress>(),
  completed: 0,
}))

vi.mock("../data/pageContent", () => ({
  useHomePageContent: () => pages.home,
  interpolateContent: (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`)),
}))
vi.mock("../progress/useProgress", () => ({
  useAllProgress: () => ({ completedCount: state.completed, total: 81, progressByEquation: state.progress }),
}))
vi.mock("../lib/prefetchEquationExperience", () => ({ prefetchEquationExperience: vi.fn() }))
vi.mock("./TopNav", () => ({ TopNav: () => <nav><Link to="/#subjects-section">Library</Link></nav> }))
vi.mock("./Footer", () => ({ Footer: () => <footer /> }))
vi.mock("./HeroDemo", () => ({ HeroDemo: () => <div data-testid="hero-demo" /> }))
vi.mock("./math/DeferredInlineMath", () => ({ DeferredInlineMath: ({ math }: { math: string }) => <span>{math}</span> }))

function Location() {
  return <div data-testid="route">{useLocation().pathname}</div>
}

async function renderHome() {
  const view = render(<MemoryRouter><Location /><HomePage /></MemoryRouter>)
  await screen.findByTestId("hero-demo")
  return view
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  })
  state.progress = new Map()
  state.completed = 0
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("equation discovery", () => {
  it("finds equations across subjects without duplicating shared equations", async () => {
    await renderHome()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search equations" }), { target: { value: "Bayes" } })
    expect(screen.getByRole("status")).toHaveTextContent("1 equation")
    const equation = screen.getByRole("button", { name: "Open Bayes' Theorem" })
    fireEvent.click(equation)
    expect(screen.getByTestId("route")).toHaveTextContent("/equation/21")
  })

  it("searches authors without requiring accents and recovers from empty results", async () => {
    await renderHome()
    const search = screen.getByRole("searchbox", { name: "Search equations" })
    fireEvent.change(search, { target: { value: "schrodinger" } })
    expect(screen.getByRole("status")).toHaveTextContent("1 equation")
    fireEvent.change(search, { target: { value: "not-an-equation" } })
    expect(screen.getByRole("heading", { name: "No equations found" })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "Clear search" })[0])
    expect(search).toHaveValue("")
    expect(screen.getByRole("button", { name: "Show more equations" })).toBeInTheDocument()
  })

  it("keeps the meaning visible and reveals more equations on request", async () => {
    await renderHome()
    const pythagoras = screen.getByRole("button", { name: "Open Pythagoras's Theorem" })
    expect(pythagoras).toHaveTextContent("In any right triangle")
    expect(screen.queryByRole("button", { name: "Open Relativity" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Show more equations" }))
    expect(screen.getByRole("button", { name: "Open Relativity" })).toBeInTheDocument()
  })

  it("lets a subject narrow the library and returns to all equations", async () => {
    await renderHome()
    fireEvent.click(screen.getByRole("button", { name: "Open Physics" }))
    expect(screen.getByRole("heading", { name: "Physics" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("12 equations")
    expect(screen.getByRole("button", { name: "Open Newton's Second Law" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "All subjects" }))
    expect(screen.getByRole("heading", { name: "The equation library" })).toBeInTheDocument()
  })

  it("restores the full home layout before scrolling from a subject to the library link", async () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    await renderHome()
    fireEvent.click(screen.getByRole("button", { name: "Open Physics" }))
    frames.splice(0).forEach((callback) => callback(0))
    const scroll = vi.mocked(Element.prototype.scrollIntoView)
    scroll.mockClear()

    fireEvent.click(screen.getByRole("link", { name: "Library" }))
    expect(screen.getByRole("heading", { name: "The equation library" })).toBeInTheDocument()
    expect(document.getElementById("home-title")).toBeInTheDocument()
    expect(scroll).not.toHaveBeenCalled()

    frames.splice(0).forEach((callback) => callback(0))
    expect(scroll).toHaveBeenCalledOnce()
    expect(scroll.mock.contexts[0]).toBe(document.getElementById("subjects-section"))
  })

  it("offers the latest unfinished experiment even before a lesson is completed", async () => {
    const progress = (lastViewed: string, completed = false): EquationProgress => ({
      completed, lastViewed, lessonStep: "intro", timeSpentSeconds: 15, variablesExplored: [], notes: "", bookmarked: false,
    })
    state.progress = new Map([
      [1, progress("2026-09-25T12:00:00Z")],
      [34, progress("2026-09-26T12:00:00Z")],
      [51, progress("2026-09-26T13:00:00Z", true)],
    ])
    await renderHome()
    const continuation = screen.getByRole("region", { name: "Continue learning" })
    const buttons = within(continuation).getAllByRole("button")
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toHaveTextContent("Newton's Second Law")
    fireEvent.click(buttons[0])
    expect(screen.getByTestId("route")).toHaveTextContent("/equation/34")
  })

  it("identifies the three recent unfinished cards and keeps completed and untouched cards distinct", async () => {
    const progress = (lastViewed: string, completed = false): EquationProgress => ({
      completed, lastViewed, lessonStep: "intro", timeSpentSeconds: 15, variablesExplored: [], notes: "", bookmarked: false,
    })
    state.progress = new Map([
      [1, progress("2026-11-01T12:00:00Z")],
      [2, progress("2026-11-02T12:00:00Z")],
      [3, progress("2026-11-03T12:00:00Z")],
      [4, progress("2026-11-04T12:00:00Z")],
      [5, progress("2026-11-05T12:00:00Z", true)],
    ])
    state.completed = 1
    await renderHome()

    const recent = screen.getByRole("button", { name: "Open Logarithms" })
    expect(recent).toHaveAccessibleDescription("Algebra Resume")
    for (const title of ["Logarithms", "Calculus", "Law of Gravity"]) {
      expect(within(screen.getByRole("button", { name: `Open ${title}` })).getByText("Resume")).toBeInTheDocument()
    }
    const older = screen.getByRole("button", { name: "Open Pythagoras's Theorem" })
    expect(within(older).queryByText("Resume")).not.toBeInTheDocument()
    const completed = screen.getByRole("button", { name: "Open Wave Equation" })
    expect(completed).toHaveAccessibleDescription("Physics Completed")
    expect(within(completed).queryByText("Resume")).not.toBeInTheDocument()
    const untouched = screen.getByRole("button", { name: "Open The Square Root of Minus One" })
    expect(untouched).toHaveAccessibleDescription("Complex numbers")
    expect(within(untouched).queryByText("Resume")).not.toBeInTheDocument()
    expect(within(untouched).queryByText("Completed")).not.toBeInTheDocument()

    for (const [card, id] of [[recent, 2], [completed, 5], [untouched, 6]] as const) {
      fireEvent.click(card)
      expect(screen.getByTestId("route")).toHaveTextContent(`/equation/${id}`)
    }
  })
})


describe("interactive Pythagorean preview", () => {
  it("keeps the displayed values and drawn square areas exact at every slider stop", async () => {
    const { HeroDemo } = await vi.importActual<typeof import("./HeroDemo")>("./HeroDemo")
    const { container } = render(<HeroDemo />)
    const slider = screen.getByRole("slider", { name: "Change the triangle" })
    const triples = [[3, 4, 5], [5, 12, 13], [8, 6, 10], [9, 12, 15], [20, 21, 29]]
    for (const [index, [a, b, c]] of triples.entries()) {
      fireEvent.change(slider, { target: { value: index } })
      expect(slider).toHaveAttribute("aria-valuetext", `Sides ${a}, ${b}, and ${c}`)
      expect(screen.getByLabelText("Squared side lengths")).toHaveTextContent(`${a * a} + ${b * b} = ${c * c}`)
      const areas = Array.from(container.querySelectorAll("polygon")).map((polygon) => {
        const points = polygon.getAttribute("points")!.split(" ").map((point) => point.split(",").map(Number))
        return Math.abs(points.reduce((sum, [x, y], i) => {
          const [nextX, nextY] = points[(i + 1) % points.length]
          return sum + x * nextY - y * nextX
        }, 0)) / 2
      })
      expect(areas).toHaveLength(3)
      expect(areas[0] / areas[1]).toBeCloseTo(a * a / (b * b), 5)
      expect(areas[2]).toBeCloseTo(areas[0] + areas[1], 5)
    }
    fireEvent.click(screen.getByRole("button", { name: "Next triangle" }))
    expect(slider).toHaveValue("0")
    expect(slider).toHaveAttribute("aria-valuetext", "Sides 3, 4, and 5")
  })
})
