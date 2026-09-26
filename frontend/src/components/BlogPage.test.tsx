import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, expect, it, vi } from "vitest"
import BlogPage from "./BlogPage"

vi.mock("./PageFrame", () => ({
  PageFrame: ({ children, title }: { children: React.ReactNode; title?: string }) => <main>{title && <h1>{title}</h1>}{children}</main>,
}))

afterEach(cleanup)

function openBlog(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

it("opens the release story from the blog and keeps the release notes and experiment accessible", () => {
  openBlog("/blog")
  fireEvent.click(screen.getByRole("link", { name: "Read the story" }))
  expect(screen.getByRole("heading", { level: 1, name: "A clearer way to explore science" })).toBeInTheDocument()
  expect(screen.getByText(/billing is still paused/)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Explore an equation" })).toHaveAttribute("href", "/equation/1")
  expect(screen.getByRole("link", { name: "Read the release notes" })).toHaveAttribute("href", "/changelog")
  fireEvent.click(screen.getByRole("link", { name: "All stories" }))
  expect(screen.getByRole("heading", { level: 1, name: "The Sciencebouk blog" })).toBeInTheDocument()
}, 15_000)

it("gives unknown articles a working return to the blog", () => {
  openBlog("/blog/missing-story")
  expect(screen.getByRole("heading", { name: "Article not found" })).toBeInTheDocument()
  fireEvent.click(screen.getByRole("link", { name: "Back to the blog" }))
  expect(screen.getByRole("link", { name: "Read the story" })).toBeInTheDocument()
})
