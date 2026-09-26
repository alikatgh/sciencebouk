import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Link, MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, expect, it, vi } from "vitest"
import { PageFrame } from "./PageFrame"

vi.mock("./TopNav", () => ({ TopNav: () => null }))
vi.mock("./Footer", () => ({ Footer: () => null }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it("starts the next reading page at the top but preserves anchor and query navigation", () => {
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {})
  render(
    <MemoryRouter initialEntries={["/blog/a-clearer-way-to-explore-science"]}>
      <Routes>
        <Route path="*" element={
          <PageFrame>
            <Link to="/changelog">Release notes</Link>
            <Link to="/changelog?mode=engineering">Engineering filter</Link>
            <Link to="/help#lessons">Lesson help</Link>
          </PageFrame>
        } />
      </Routes>
    </MemoryRouter>,
  )
  scroll.mockClear()
  // Follow the article's final link after scrolling down its body.
  fireEvent.click(screen.getByRole("link", { name: "Release notes" }))
  expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 0, left: 0, behavior: "instant" })
  scroll.mockClear()
  fireEvent.click(screen.getByRole("link", { name: "Engineering filter" }))
  expect(scroll).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("link", { name: "Lesson help" }))
  expect(scroll).not.toHaveBeenCalled()
})
