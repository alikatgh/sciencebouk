import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { SettingsProvider } from "../settings/SettingsContext"
import SettingsPage from "./SettingsPage"

vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: false, isPro: false }) }))
vi.mock("./TopNav", () => ({ TopNav: () => null }))
vi.mock("./Footer", () => ({ Footer: () => null }))

describe("SettingsPage", () => {
  it("names learning controls and updates their state through accessible inputs", () => {
    render(<SettingsProvider><MemoryRouter><SettingsPage /></MemoryRouter></SettingsProvider>)
    const formulaSize = screen.getByRole("slider", { name: "Formula size" })
    fireEvent.change(formulaSize, { target: { value: "125" } })
    expect(formulaSize).toHaveValue("125")
    expect(formulaSize).toHaveAccessibleDescription("125%")

    const letters = screen.getByRole("switch", { name: "Letter formula" })
    const before = letters.getAttribute("aria-checked")
    fireEvent.click(letters)
    expect(letters).toHaveAttribute("aria-checked", before === "true" ? "false" : "true")
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument()
  })
})
