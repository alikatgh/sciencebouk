import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { PHONE_LAYOUT_QUERY, usePhoneLayout } from "./usePhoneLayout"

afterEach(() => vi.unstubAllGlobals())

it("keeps a short landscape phone in flowing mode", () => {
  vi.stubGlobal("innerWidth", 844)
  vi.stubGlobal("innerHeight", 390)
  const { result } = renderHook(usePhoneLayout)
  expect(result.current).toBe(true)
})

it("responds to viewport changes and removes its media listener", () => {
  let change = () => {}
  const media = { matches: false, addEventListener: vi.fn((_event, handler) => { change = handler }), removeEventListener: vi.fn() }
  const matchMedia = vi.fn(() => media)
  vi.stubGlobal("matchMedia", matchMedia)
  const { result, unmount } = renderHook(usePhoneLayout)
  expect(matchMedia).toHaveBeenCalledWith(PHONE_LAYOUT_QUERY)
  expect(result.current).toBe(false)
  act(() => { media.matches = true; change() })
  expect(result.current).toBe(true)
  act(() => { media.matches = false; change() })
  expect(result.current).toBe(false)
  unmount()
  expect(media.removeEventListener).toHaveBeenCalledWith("change", change)
})
