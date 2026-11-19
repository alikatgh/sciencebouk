import type { ComponentType, ReactNode } from "react"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { SetEquationVariable, Variable } from "../teaching/types"
import { PythagorasScene } from "./PythagorasScene"
import { LogarithmScene } from "./LogarithmScene"
import { CalculusScene } from "./CalculusScene"
import { GravityScene } from "./GravityScene"
import { WaveScene } from "./WaveScene"
import { ComplexScene } from "./ComplexScene"

const state = vi.hoisted(() => ({ variables: [] as Variable[], setVar: vi.fn() }))

vi.mock("../../settings/SettingsContext", () => ({ useSettings: () => ({ settings: { language: "en" } }) }))
vi.mock("../teaching/TeachableEquation", () => ({
  TeachableEquation: ({ variables, children }: {
    variables: Variable[]
    children: (context: {
      vars: Record<string, number>
      setVar: SetEquationVariable
      highlightedVar: null
      setHighlightedVar: () => void
      highlightedTerm: null
    }) => ReactNode
  }) => {
    state.variables = variables
    return children({
      vars: Object.fromEntries(variables.map((variable) => [variable.name, variable.value])),
      setVar: state.setVar,
      highlightedVar: null,
      setHighlightedVar: () => {},
      highlightedTerm: null,
    })
  },
}))

beforeEach(() => {
  state.setVar.mockClear()
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  // Mount the real D3 elements without running the wave's animation loop.
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1))
  vi.stubGlobal("cancelAnimationFrame", vi.fn())
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, width: 800, height: 500, right: 800, bottom: 500,
    toJSON: () => ({}),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const scenes: Array<{
  name: string
  Scene: ComponentType
  nativeHandles: number
  marks: Array<[string, string, string?]>
}> = [
  { name: "Pythagoras", Scene: PythagorasScene, nativeHandles: 2, marks: [
    [".sq-a", "a"], [".sq-b", "b"], [".sq-c", "b", "a"], [".tri", "b", "a"], [".label-c", "b", "a"],
  ] },
  { name: "logarithm", Scene: LogarithmScene, nativeHandles: 3, marks: [
    [".logx-bar", "x"], [".logy-bar", "y"], [".logxy-bar", "x", "y"], [".log-curve-control", "x"], [".val-logxy", "x", "y"],
  ] },
  { name: "calculus", Scene: CalculusScene, nativeHandles: 1, marks: [
    ['g[aria-label="Point t along the function curve"]', "t"],
    ['g[aria-label="Change the distance between the secant points"]', "h"],
    ['[aria-label="Change point t to explore the slope"]', "t"],
    ['g[aria-label="Distance h between the curve points"]', "h"],
  ] },
  { name: "gravity", Scene: GravityScene, nativeHandles: 2, marks: [
    [".m1-val", "m1"], [".m2-val", "m2"], [".dist-line", "r"], [".force-label", "r"], [".arrow-r-head", "r"],
  ] },
  { name: "wave", Scene: WaveScene, nativeHandles: 1, marks: [
    [".wave1-label", "freq"], [".wave1-control", "wavelength", "amp"], [".wave2-control", "wavelength", "amp"],
    [".super-control", "wavelength", "amp"], [".amp-annotation", "amp"], [".wl-annotation", "wavelength"],
  ] },
  { name: "complex", Scene: ComplexScene, nativeHandles: 1, marks: [
    [".vector-control", "a", "b"], [".proj-a", "a"], [".proj-b", "b"], [".point-label", "a", "b"],
    [".info-mag", "a", "b"],
  ] },
]

describe("direct manipulation on the core scene marks", () => {
  it.each(scenes)("maps $name marks to editable causes and preserves native drag ownership", ({ Scene, marks, nativeHandles }) => {
    const { container } = render(<Scene />)
    expect(container.querySelectorAll('[data-scene-drag="native"]')).toHaveLength(nativeHandles)
    for (const [selector, variable, variableY] of marks) {
      const mark = container.querySelector(selector)
      expect(mark, selector).not.toBeNull()
      expect(mark).toHaveAttribute("data-drag-variable", variable)
      if (variableY) expect(mark).toHaveAttribute("data-drag-variable-y", variableY)
    }
    const editableNames = new Set(state.variables.filter((variable) => !variable.constant && variable.max > variable.min).map((variable) => variable.name))
    const exposedNames = new Set<string>()
    for (const target of container.querySelectorAll("[data-drag-variable]")) {
      for (const name of [target.getAttribute("data-drag-variable"), target.getAttribute("data-drag-variable-y")]) {
        if (name == null) continue
        expect(editableNames.has(name), `${target.tagName} must change an authored editable cause, not a derived result`).toBe(true)
        exposedNames.add(name)
      }
    }
    expect(exposedNames).toEqual(editableNames)
  })

  it("keeps the complex point's native two-axis D3 drag working", () => {
    const { container } = render(<ComplexScene />)
    const point = container.querySelector(".point-group")!
    const eventWindow = point.ownerDocument.defaultView!
    function mouse(target: Window | Element, type: string, clientX: number, clientY: number, buttons: number) {
      const event = new eventWindow.MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, button: 0, buttons })
      // jsdom can reject cross-realm Window objects in UIEventInit; D3 needs the
      // owning window, so attach it after the event has been constructed.
      Object.defineProperty(event, "view", { value: eventWindow })
      fireEvent(target, event)
    }
    mouse(point, "mousedown", 416, 210, 1)
    mouse(eventWindow, "mousemove", 496, 170, 1)
    mouse(eventWindow, "mouseup", 496, 170, 0)
    expect(state.setVar).toHaveBeenCalledWith("a", 2)
    expect(state.setVar).toHaveBeenCalledWith("b", 1)
    expect(container.querySelector(".vector-hit")?.getAttribute("x2")).toBe(container.querySelector(".vector-line")?.getAttribute("x2"))
    expect(container.querySelector(".angle-hit")?.getAttribute("d")).toBe(container.querySelector(".angle-arc")?.getAttribute("d"))
  })

  it("gives calculus points separate touch targets so the native t drag cannot intercept h", () => {
    const { container } = render(<CalculusScene />)
    const tHandle = container.querySelector('g[data-scene-drag="native"]')!
    const hHandle = container.querySelector('g[aria-label="Distance h between the curve points"]')!
    expect(tHandle.querySelector('circle[fill="transparent"]')).toHaveAttribute("r", "22")
    expect(hHandle.querySelector('circle[fill="transparent"]')).toHaveAttribute("r", "22")
    expect(hHandle.closest('[data-scene-drag="native"]')).toBeNull()
    expect(tHandle.parentElement?.closest('[data-scene-drag="native"]')).toBeNull()
  })

  it("keeps wave playback controls as actions and force output controlled through distance", () => {
    const wave = render(<WaveScene />)
    for (const selector of [".play-btn", ".reset-btn"]) {
      expect(wave.container.querySelector(selector)).not.toHaveAttribute("data-drag-variable")
    }
    wave.unmount()
    const gravity = render(<GravityScene />)
    expect(gravity.container.querySelector(".force-label")).toHaveAttribute("data-drag-variable", "r")
    expect(gravity.container.querySelector(".force-label")).toHaveAttribute("data-drag-direction", "-1")
  })

  it("tracks wave curves with precise touch strokes while leaving native handles on top", () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { frames.push(callback); return frames.length }))
    const { container } = render(<WaveScene />)
    const firstFrame = frames.shift()
    expect(firstFrame).toBeDefined()
    act(() => firstFrame!(performance.now() + 16))
    for (const name of ["wave1", "wave2", "super"]) {
      const visible = container.querySelector(`.${name}-path`)!
      const hit = container.querySelector(`.${name}-hit`)!
      expect(hit).toHaveAttribute("stroke-width", "24")
      expect(hit).toHaveStyle({ pointerEvents: "stroke" })
      expect(hit.getAttribute("d")).toBe(visible.getAttribute("d"))
      expect(hit.getAttribute("d")).toMatch(/^M/)
      expect(hit.closest("[data-drag-variable]")).toBe(visible.closest("[data-drag-variable]"))
    }
    expect(container.querySelector(".amp-handle")).toHaveAttribute("data-scene-drag", "native")
  })
})
