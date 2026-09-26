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
  state.progress = new Map()
  state.completed = 0
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => vi.restoreAllMocks())

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
})
