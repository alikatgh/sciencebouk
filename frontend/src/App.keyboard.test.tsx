import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import App from "./App"
import { toggleFavorite } from "./lib/useFavorites"
import { SETTINGS_STORAGE_KEY, SettingsProvider } from "./settings/SettingsContext"

vi.mock("./auth/AuthContext", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isPro: false, logout: vi.fn() }),
}))
vi.mock("./data/equationManifest", async (importOriginal) => {
  const original = await importOriginal<typeof import("./data/equationManifest")>()
  return {
    ...original,
    useEquationManifest: () => ({ data: original.coreEquationManifest.slice(0, 3), isLoading: false }),
  }
})
vi.mock("./progress/useProgress", () => ({
  registerEquationIds: vi.fn(),
  useAllProgress: () => ({
    completedCount: 0, totalTimeMinutes: 0, total: 3,
    progressByEquation: new Map(), localSyncSignature: "[]",
  }),
}))
vi.mock("./lib/useFavorites", () => ({ toggleFavorite: vi.fn(), useIsFavorite: () => false }))
vi.mock("./components/sceneRegistry", () => ({ prefetchEquationScene: vi.fn().mockResolvedValue(undefined) }))
vi.mock("./components/EquationVisualization", () => ({
  EquationVisualization: () => <input type="range" aria-label="Scene variable" />,
}))
vi.mock("./components/app-shell/EquationHeader", () => ({
  EquationHeader: ({ onOpenDrawer }: { onOpenDrawer: () => void }) => (
    <button onClick={onOpenDrawer}>Browse equations</button>
  ),
}))

function RouteLocation() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

function renderEquation(desktop = true) {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    matches: query === "(min-width: 1024px)" && desktop,
    media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })))
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SettingsProvider>
        <MemoryRouter initialEntries={["/equation/2"]}>
          <RouteLocation />
          <Routes><Route path="/equation/:id" element={<App />} /></Routes>
        </MemoryRouter>
      </SettingsProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  const storage = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => vi.unstubAllGlobals())

describe("equation keyboard navigation", () => {
  it.each(["metaKey", "ctrlKey", "altKey"])("preserves browser shortcuts using %s", async (modifier) => {
    renderEquation()
    await screen.findByRole("slider", { name: "Scene variable" })

    for (const key of ["r", "f", "h", "1", "j", "ArrowDown"]) {
      expect(fireEvent.keyDown(document.body, { key, [modifier]: true })).toBe(true)
      expect(screen.getByTestId("location")).toHaveTextContent("/equation/2")
    }
    expect(toggleFavorite).not.toHaveBeenCalled()

    fireEvent.keyDown(document.body, { key: "j" })
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/equation/3"))
  })

  it.each(["metaKey", "ctrlKey"])("opens collapsed desktop search with %s+K without navigating", async (modifier) => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ sidebarCollapsed: true }))
    renderEquation()
    await screen.findByRole("slider", { name: "Scene variable" })

    fireEvent.keyDown(document.body, { key: "k", [modifier]: true })
    const search = await screen.findByPlaceholderText("Search ( / )")
    await waitFor(() => expect(search).toHaveFocus())
    expect(screen.getByTestId("location")).toHaveTextContent("/equation/2")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it.each([
    { key: "/" },
    { key: "k", metaKey: true },
    { key: "k", ctrlKey: true },
  ])("opens and focuses mobile drawer search with $key", async (shortcut) => {
    renderEquation(false)
    await screen.findByRole("slider", { name: "Scene variable" })

    fireEvent.keyDown(document.body, shortcut)
    const dialog = await screen.findByRole("dialog")
    const search = within(dialog).getByRole("textbox", { name: "Search equations" })
    await waitFor(() => expect(search).toHaveFocus())
    expect(screen.getByTestId("location")).toHaveTextContent("/equation/2")

    const close = within(dialog).getByRole("button", { name: "Close menu" })
    close.focus()
    fireEvent.keyDown(close, { key: "/" })
    expect(search).toHaveFocus()
  })

  it("keeps manual mobile browsing from opening the search keyboard", async () => {
    renderEquation(false)
    fireEvent.click(screen.getByRole("button", { name: "Browse equations" }))
    const dialog = await screen.findByRole("dialog")
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Close menu" })).toHaveFocus())
  })

  it("leaves arrows on scene controls and typed letters in search alone", async () => {
    renderEquation()
    const slider = await screen.findByRole("slider", { name: "Scene variable" })
    expect(fireEvent.keyDown(slider, { key: "ArrowDown" })).toBe(true)
    expect(fireEvent.keyDown(screen.getByPlaceholderText("Search ( / )"), { key: "j" })).toBe(true)
    expect(screen.getByTestId("location")).toHaveTextContent("/equation/2")
  })

  it("keeps equation shortcuts behind an open dialog inactive", async () => {
    renderEquation()
    await screen.findByRole("slider", { name: "Scene variable" })
    fireEvent.keyDown(document.body, { key: "?" })
    const dialog = await screen.findByRole("dialog", { name: "Keyboard Shortcuts" })
    const close = within(dialog).getByRole("button", { name: "Close (Esc)" })
    for (const key of ["j", "k", "ArrowDown", "ArrowUp", "r", "f", "h", "1", "/"]) {
      fireEvent.keyDown(close, { key })
      expect(screen.getByTestId("location")).toHaveTextContent("/equation/2")
      expect(dialog).toBeInTheDocument()
    }
    expect(toggleFavorite).not.toHaveBeenCalled()
    fireEvent.keyDown(close, { key: "Escape" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
