import { createRef, useState } from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { EquationLibrarySearch } from "./EquationSidebarShared"

afterEach(cleanup)

function SearchHarness({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const inputRef = createRef<HTMLInputElement>()
  return <EquationLibrarySearch inputRef={inputRef} searchQuery={query} onSearchChange={setQuery} onClearSearch={() => setQuery("")} />
}

describe("EquationLibrarySearch", () => {
  it("reveals and focuses search from its header action, then keeps it open when cleared", () => {
    render(<SearchHarness />)
    const open = screen.getByRole("button", { name: "Search equations" })
    expect(open).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(open)
    const search = screen.getByRole("searchbox", { name: "Search equations" })
    expect(search).toHaveFocus()
    expect(screen.getByRole("button", { name: "Close equation search" })).toHaveAttribute("aria-expanded", "true")

    fireEvent.change(search, { target: { value: "Newton" } })
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect(search).toHaveValue("")
    expect(search).toHaveFocus()
    expect(screen.getByRole("button", { name: "Close equation search" })).toHaveAttribute("aria-expanded", "true")
  })

  it("clears the active query on Escape and returns focus to the collapsed search action", () => {
    render(<SearchHarness initialQuery="Newton" />)
    const search = screen.getByRole("searchbox", { name: "Search equations" })
    expect(screen.getByRole("button", { name: "Close equation search" })).toHaveAttribute("aria-expanded", "true")

    fireEvent.keyDown(search, { key: "Escape" })

    expect(search).toHaveValue("")
    const open = screen.getByRole("button", { name: "Search equations" })
    expect(open).toHaveAttribute("aria-expanded", "false")
    expect(open).toHaveFocus()
  })

  it("reveals search when the existing keyboard shortcut focuses its input ref", () => {
    const inputRef = createRef<HTMLInputElement>()
    render(<EquationLibrarySearch inputRef={inputRef} searchQuery="" onSearchChange={() => {}} onClearSearch={() => {}} />)

    act(() => inputRef.current?.focus())

    expect(screen.getByRole("button", { name: "Close equation search" })).toHaveAttribute("aria-expanded", "true")
    expect(inputRef.current).toHaveFocus()
  })

  it("clears the active query when closing search with its header action", () => {
    render(<SearchHarness initialQuery="Newton" />)

    fireEvent.click(screen.getByRole("button", { name: "Close equation search" }))

    expect(screen.getByRole("searchbox", { name: "Search equations" })).toHaveValue("")
    expect(screen.getByRole("button", { name: "Search equations" })).toHaveAttribute("aria-expanded", "false")
  })
})
