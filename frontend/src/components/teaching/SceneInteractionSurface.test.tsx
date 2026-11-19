import { useEffect, useRef, useState } from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { select } from "d3-selection"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SceneInteractionSurface } from "./SceneInteractionSurface"
import { VisualizationViewport } from "./VisualizationViewport"
import type { SetEquationVariable, Variable } from "./types"

const definitions: Variable[] = [
  { name: "position", symbol: "x", latex: "x", value: 2, min: 0, max: 10, step: 0.5, color: "#3b82f6", description: "Position", unit: "m" },
  { name: "spread", symbol: "s", latex: "s", value: 0, min: -5, max: 5, step: 0.25, color: "#f59e0b", description: "Spread" },
  { name: "constant", symbol: "c", latex: "c", value: 3, min: 0, max: 10, step: 1, color: "#999999", constant: true },
  { name: "locked", symbol: "l", latex: "l", value: 4, min: 0, max: 10, step: 1, color: "#999999", locked: true },
]

interface FixtureProps {
  identity?: string
  onChange: SetEquationVariable
  onNumericClick?: () => void
  onNativeDown?: () => void
  onInterrupt?: () => void
  onNativeGestureChange?: (active: boolean) => void
  hideControls?: boolean
  initialVariables?: Variable[]
}

function Fixture({ identity = "first", onChange, onNumericClick, onNativeDown, onInterrupt, onNativeGestureChange, hideControls = true, initialVariables = definitions }: FixtureProps) {
  const [variables, setVariables] = useState(initialVariables)
  const update: SetEquationVariable = (name, value, options) => {
    onChange(name, value, options)
    setVariables((current) => current.map((variable) => variable.name === name ? { ...variable, value } : variable))
  }
  return (
    <SceneInteractionSurface variables={variables} onVariableChange={update} identity={identity} onInterrupt={onInterrupt} onNativeGestureChange={onNativeGestureChange}>
      <svg role="img" aria-label="Scientific diagram">
        <g data-drag-variable="position" aria-label="Position control">
          <rect data-testid="position-mark" width="30" height="30" />
        </g>
        <g data-drag-variable="position" data-drag-variable-y="spread" aria-label="Two dimensional control">
          <circle data-testid="dual-mark" r="15" />
        </g>
        <path data-testid="inverse-mark" data-drag-variable="position" data-drag-axis="y" data-drag-direction="-1" aria-label="Inverse height control" d="M0,0L20,20" />
        <g data-scene-drag="native" data-drag-variable="position" aria-label="Native position control" onPointerDown={onNativeDown}>
          <circle data-testid="native-mark" r="20" />
        </g>
        <g opacity={hideControls ? 0 : 1}>
          <circle data-testid="hidden-mark" data-drag-variable="position" aria-label="Hidden SVG control" r="10" />
        </g>
        <g style={{ opacity: hideControls ? 0 : 1 }}>
          <circle data-testid="hidden-style-mark" data-drag-variable="position" aria-label="Hidden styled SVG control" r="10" />
        </g>
        <rect data-testid="constant-mark" data-drag-variable="constant" aria-label="Readonly constant" width="20" height="20" />
        <rect data-testid="locked-mark" data-drag-variable="locked" aria-label="Locked input" width="20" height="20" />
        <line data-testid="reference-axis" x1="0" y1="50" x2="200" y2="50" />
      </svg>
      <button data-drag-variable="position" aria-label="Numeric value button" onClick={onNumericClick}>Position value</button>
      <div style={{ opacity: hideControls ? 0 : 1 }}>
        <button data-testid="hidden-button" data-drag-variable="position">Hidden numeric value</button>
      </div>
      <output data-testid="model-position">{variables.find((variable) => variable.name === "position")!.value}</output>
      <output data-testid="model-spread">{variables.find((variable) => variable.name === "spread")!.value}</output>
    </SceneInteractionSurface>
  )
}

const circuitVariables: Variable[] = [
  { name: "I", symbol: "I", latex: "I", value: 2, min: 0, max: 10, step: 0.1, unit: "A", description: "Current", color: "#3b82f6" },
  { name: "R", symbol: "R", latex: "R", value: 47, min: 1, max: 100, step: 1, unit: "Ω", description: "Resistance", color: "#f59e0b" },
]

/** Only this child rerenders; its D3 marks are outside React's DOM ownership. */
function ChildOnlyD3Visual() {
  const groupRef = useRef<SVGGElement>(null)
  const [cause, setCause] = useState("I")
  const [showAdded, setShowAdded] = useState(false)
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    const drawing = select(group)
    drawing.selectAll<SVGCircleElement, string>("circle.primary-cause")
      .data([cause]).join("circle").attr("class", "primary-cause")
      .attr("data-testid", "child-bound-mark").attr("data-drag-variable", cause)
      .attr("aria-label", "Child controlled cause").attr("r", 12)
    drawing.selectAll<SVGCircleElement, string>("circle.added-cause")
      .data(showAdded ? ["I"] : []).join("circle").attr("class", "added-cause")
      .attr("data-testid", "child-added-mark").attr("data-drag-variable", "I")
      .attr("aria-label", "New child D3 control").attr("r", 12)
  }, [cause, showAdded])
  return <>
    <button onClick={() => setShowAdded(true)}>Add child control</button>
    <button onClick={() => setCause("R")}>Use resistance cause</button>
    <svg role="group" aria-label="Child circuit visualization"><g ref={groupRef} /></svg>
  </>
}

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly pointerType: string
  readonly isPrimary: boolean
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 1
    this.pointerType = init.pointerType ?? "mouse"
    this.isPrimary = init.isPrimary ?? true
  }
}

const captureDescriptors = Object.fromEntries(
  ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"].map((name) => [name, Object.getOwnPropertyDescriptor(Element.prototype, name)]),
)
let captureState: WeakMap<Element, Set<number>>
let frames: Map<number, FrameRequestCallback>
let frameId: number
let setCapture: ReturnType<typeof vi.fn>
let releaseCapture: ReturnType<typeof vi.fn>

beforeEach(() => {
  captureState = new WeakMap()
  frames = new Map()
  frameId = 0
  vi.stubGlobal("PointerEvent", TestPointerEvent)
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
    const id = ++frameId
    frames.set(id, callback)
    return id
  }))
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => frames.delete(id)))
  setCapture = vi.fn(function (this: Element, id: number) {
    let pointers = captureState.get(this)
    if (!pointers) { pointers = new Set(); captureState.set(this, pointers) }
    pointers.add(id)
  })
  releaseCapture = vi.fn(function (this: Element, id: number) { captureState.get(this)?.delete(id) })
  Object.defineProperties(Element.prototype, {
    setPointerCapture: { configurable: true, value: setCapture },
    hasPointerCapture: { configurable: true, value: function (this: Element, id: number) { return captureState.get(this)?.has(id) ?? false } },
    releasePointerCapture: { configurable: true, value: releaseCapture },
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  for (const [name, descriptor] of Object.entries(captureDescriptors)) {
    if (descriptor) Object.defineProperty(Element.prototype, name, descriptor)
    else Reflect.deleteProperty(Element.prototype, name)
  }
})

function measureSurface() {
  const surface = screen.getByRole("group", { name: "Interactive visualization canvas" })
  vi.spyOn(surface, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 100))
  Object.defineProperties(surface, {
    clientWidth: { configurable: true, value: 200 },
    clientHeight: { configurable: true, value: 100 },
  })
  return surface
}

function pointer(target: Element | Window, type: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel" | "lostPointerCapture", x: number, y: number, extras: PointerEventInit = {}) {
  fireEvent[type](target, { pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, clientX: x, clientY: y, ...extras })
}

function flushFrames() {
  const batch = [...frames.values()]
  frames.clear()
  act(() => { for (const callback of batch) callback(16) })
}

function panElement(container: HTMLElement) {
  return container.querySelector("[data-scene-pan]")!
}

describe("scene parameter gestures", () => {
  it("leaves a press and motion below four physical pixels unchanged", () => {
    const change = vi.fn<SetEquationVariable>()
    render(<Fixture onChange={change} />)
    measureSurface()
    const mark = screen.getByTestId("position-mark")
    pointer(mark, "pointerDown", 20, 20)
    pointer(mark, "pointerMove", 22, 22)
    flushFrames()
    pointer(mark, "pointerUp", 22, 22)
    expect(change).not.toHaveBeenCalled()
    expect(screen.getByTestId("model-position")).toHaveTextContent("2")
    expect(mark.parentElement).toHaveAttribute("aria-valuenow", "2")
    expect(mark.parentElement).toHaveAttribute("aria-valuetext", "2 m")
    expect(mark.parentElement!.hasPointerCapture(7)).toBe(false)
  })

  for (const pointerType of ["mouse", "touch", "pen"]) {
    it(`${pointerType} updates the real input with bounded snapped learner values`, () => {
      const change = vi.fn<SetEquationVariable>()
      render(<Fixture onChange={change} />)
      measureSurface()
      const mark = screen.getByTestId("position-mark")
      pointer(mark, "pointerDown", 40, 40, { pointerType })
      pointer(mark, "pointerUp", 70, 40, { pointerType })
      expect(change.mock.calls).toEqual([["position", 3.5, { source: "learner" }]])
      expect(screen.getByTestId("model-position")).toHaveTextContent("3.5")
      expect(mark.parentElement).toHaveAttribute("aria-valuenow", "3.5")
      pointer(mark, "pointerDown", 40, 40, { pointerType })
      pointer(mark, "pointerUp", 10000, 40, { pointerType })
      expect(change).toHaveBeenLastCalledWith("position", 10, { source: "learner" })
      pointer(mark, "pointerDown", 40, 40, { pointerType })
      pointer(mark, "pointerUp", -10000, 40, { pointerType })
      expect(change).toHaveBeenLastCalledWith("position", 0, { source: "learner" })
      expect(change.mock.calls.every(([, value]) => Number.isFinite(value) && value >= 0 && value <= 10)).toBe(true)
    })
  }

  it("coalesces pointer moves and does not write the same final value again on release", () => {
    const change = vi.fn<SetEquationVariable>()
    render(<Fixture onChange={change} />)
    measureSurface()
    const mark = screen.getByTestId("position-mark")
    pointer(mark, "pointerDown", 40, 40)
    pointer(mark, "pointerMove", 60, 40)
    pointer(mark, "pointerMove", 80, 40)
    expect(frames.size).toBe(1)
    expect(change).not.toHaveBeenCalled()
    flushFrames()
    expect(change.mock.calls).toEqual([["position", 4, { source: "learner" }]])
    pointer(mark, "pointerUp", 80, 40)
    expect(change).toHaveBeenCalledTimes(1)
  })

  it("maps two-axis movement to both authored causes and respects inverse vertical controls", () => {
    const change = vi.fn<SetEquationVariable>()
    render(<Fixture onChange={change} />)
    measureSurface()
    const dual = screen.getByTestId("dual-mark")
    pointer(dual, "pointerDown", 50, 50)
    pointer(dual, "pointerUp", 70, 30)
    expect(change.mock.calls).toEqual([
      ["position", 3, { source: "learner" }],
      ["spread", 2, { source: "learner" }],
    ])
    const inverse = screen.getByTestId("inverse-mark")
    pointer(inverse, "pointerDown", 50, 50)
    pointer(inverse, "pointerUp", 50, 40)
    expect(change).toHaveBeenLastCalledWith("position", 2, { source: "learner" })
    expect(screen.getByTestId("model-spread")).toHaveTextContent("2")
  })

  it("does not snap or credit an off-grid input for orthogonal or sub-threshold movement on its own axis", () => {
    const change = vi.fn<SetEquationVariable>()
    const offGrid = definitions.map((variable) => variable.name === "position" ? { ...variable, value: 2.13 }
      : variable.name === "spread" ? { ...variable, value: 0.13 } : variable)
    render(<Fixture onChange={change} initialVariables={offGrid} />)
    measureSurface()
    const mark = screen.getByTestId("position-mark")
    for (const x of [40, 43]) {
      pointer(mark, "pointerDown", 40, 40)
      pointer(mark, "pointerUp", x, 80)
    }
    expect(change).not.toHaveBeenCalled()
    expect(screen.getByTestId("model-position")).toHaveTextContent("2.13")
    const dual = screen.getByTestId("dual-mark")
    pointer(dual, "pointerDown", 40, 40)
    pointer(dual, "pointerUp", 70, 42)
    expect(change.mock.calls).toEqual([["position", 3.5, { source: "learner" }]])
    expect(screen.getByTestId("model-spread")).toHaveTextContent("0.13")
  })

  it("preserves button clicks after a press and suppresses the compatibility click after dragging", () => {
    const change = vi.fn<SetEquationVariable>()
    const click = vi.fn()
    render(<Fixture onChange={change} onNumericClick={click} />)
    measureSurface()
    const button = screen.getByRole("button", { name: "Numeric value button" })
    pointer(button, "pointerDown", 40, 40)
    pointer(button, "pointerUp", 40, 40)
    fireEvent.click(button, { detail: 1 })
    expect(click).toHaveBeenCalledTimes(1)
    expect(change).not.toHaveBeenCalled()
    expect(button).toHaveAttribute("aria-keyshortcuts")
    expect(button).not.toHaveAttribute("role", "slider")

    pointer(button, "pointerDown", 40, 40)
    pointer(button, "pointerUp", 70, 40)
    fireEvent.click(button, { detail: 1 })
    expect(click).toHaveBeenCalledTimes(1)
    expect(change).toHaveBeenLastCalledWith("position", 3.5, { source: "learner" })
    // A keyboard activation remains available during pointer-click suppression.
    fireEvent.click(button, { detail: 0 })
    expect(click).toHaveBeenCalledTimes(2)
  })

  for (const shiftKey of [false, true]) {
    it(`keeps native drag ownership without duplicate writes or pan${shiftKey ? " while Shift is held" : ""}`, () => {
      const change = vi.fn<SetEquationVariable>()
      const native = vi.fn()
      const { container } = render(<Fixture onChange={change} onNativeDown={native} />)
      measureSurface()
      const mark = screen.getByTestId("native-mark")
      pointer(mark, "pointerDown", 40, 40, { shiftKey })
      pointer(mark, "pointerMove", 80, 60, { shiftKey })
      flushFrames()
      pointer(mark, "pointerUp", 80, 60, { shiftKey })
      expect(native).toHaveBeenCalledTimes(1)
      expect(change).not.toHaveBeenCalled()
      expect(setCapture).not.toHaveBeenCalled()
      expect(panElement(container)).toHaveAttribute("data-scene-pan", "0,0")
    })
  }
})

describe("scene camera integration", () => {
  it("pans static geometry within bounds, resets pan and zoom through the viewport, and never writes the model", () => {
    const change = vi.fn<SetEquationVariable>()
    const { container } = render(<VisualizationViewport><Fixture onChange={change} /></VisualizationViewport>)
    measureSurface()
    const axis = screen.getByTestId("reference-axis")
    const reset = screen.getByRole("button", { name: "Reset visualization view" })
    expect(reset).toBeDisabled()
    pointer(axis, "pointerDown", 30, 40)
    pointer(axis, "pointerUp", 70, 60)
    expect(panElement(container)).toHaveAttribute("data-scene-pan", "40,20")
    expect(reset).toBeEnabled()
    pointer(axis, "pointerDown", 30, 40)
    pointer(axis, "pointerUp", 1000, -1000)
    expect(panElement(container)).toHaveAttribute("data-scene-pan", "90,-45")
    fireEvent.click(screen.getByRole("button", { name: "Zoom in visualization" }))
    expect(screen.getByTestId("visualization-zoom-frame")).toHaveAttribute("data-zoom-scale", "105")
    fireEvent.click(reset)
    expect(panElement(container)).toHaveAttribute("data-scene-pan", "0,0")
    expect(screen.getByTestId("visualization-zoom-frame")).toHaveAttribute("data-zoom-scale", "100")
    expect(reset).toBeDisabled()
    expect(change).not.toHaveBeenCalled()
  })

  it("cancels a one-finger edit when the second touch arrives and lets the viewport pinch", () => {
    const change = vi.fn<SetEquationVariable>()
    const { container } = render(<VisualizationViewport mobileOptimized><Fixture onChange={change} /></VisualizationViewport>)
    measureSurface()
    const mark = screen.getByTestId("position-mark")
    pointer(mark, "pointerDown", 50, 50, { pointerId: 1, pointerType: "touch" })
    pointer(mark, "pointerMove", 60, 50, { pointerId: 1, pointerType: "touch" })
    expect(frames.size).toBe(1)
    pointer(mark, "pointerDown", 150, 50, { pointerId: 2, pointerType: "touch", isPrimary: false })
    expect(frames.size).toBe(0)
    expect(mark.parentElement!.hasPointerCapture(1)).toBe(false)
    pointer(mark, "pointerMove", 210, 50, { pointerId: 2, pointerType: "touch", isPrimary: false })
    flushFrames()
    expect(Number(screen.getByTestId("visualization-zoom-frame").getAttribute("data-zoom-scale"))).toBeGreaterThan(100)
    pointer(mark, "pointerUp", 210, 50, { pointerId: 2, pointerType: "touch", isPrimary: false })
    pointer(mark, "pointerUp", 60, 50, { pointerId: 1, pointerType: "touch" })
    expect(change).not.toHaveBeenCalled()
    expect(panElement(container)).toHaveAttribute("data-scene-pan", "0,0")
    fireEvent.click(screen.getByRole("button", { name: "Reset visualization view" }))
    expect(screen.getByTestId("visualization-zoom-frame")).toHaveAttribute("data-zoom-scale", "100")
  })
})

describe("gesture cancellation", () => {
  for (const reason of ["pointercancel", "lost capture", "blur", "identity change", "unmount", "Escape"]) {
    it(`${reason} cancels the pending frame, releases capture and ignores a stale callback`, () => {
      const change = vi.fn<SetEquationVariable>()
      const result = render(<Fixture onChange={change} />)
      measureSurface()
      const mark = screen.getByTestId("position-mark")
      const control = mark.parentElement!
      pointer(mark, "pointerDown", 40, 40)
      pointer(mark, "pointerMove", 100, 40)
      expect(control.hasPointerCapture(7)).toBe(true)
      expect(frames.size).toBe(1)
      const [id, callback] = [...frames.entries()][0]
      if (reason === "pointercancel") pointer(mark, "pointerCancel", 100, 40)
      if (reason === "lost capture") pointer(mark, "lostPointerCapture", 100, 40)
      if (reason === "blur") fireEvent.blur(window)
      if (reason === "identity change") result.rerender(<Fixture identity="second" onChange={change} />)
      if (reason === "unmount") result.unmount()
      if (reason === "Escape") fireEvent.keyDown(control, { key: "Escape" })
      expect(cancelAnimationFrame).toHaveBeenCalledWith(id)
      expect(frames.size).toBe(0)
      expect(releaseCapture).toHaveBeenCalledWith(7)
      expect(control.hasPointerCapture(7)).toBe(false)
      act(() => callback(16))
      expect(change).not.toHaveBeenCalled()
      pointer(mark, "pointerUp", 100, 40)
      expect(change).not.toHaveBeenCalled()
    })
  }
})

describe("native gesture lifecycle", () => {
  it("signals native ownership in capture before the target handler and retains it until release drains", () => {
    const change = vi.fn<SetEquationVariable>()
    const order: string[] = []
    const active = vi.fn((value: boolean) => { order.push(`active:${value}`) })
    const native = vi.fn(() => { order.push("native target") })
    const interrupt = vi.fn()
    render(<Fixture onChange={change} onNativeDown={native} onNativeGestureChange={active} onInterrupt={interrupt} />)
    measureSurface()
    const mark = screen.getByTestId("native-mark")
    pointer(mark, "pointerDown", 40, 40)
    expect(order).toEqual(["active:true", "native target"])
    pointer(mark, "pointerUp", 70, 40)
    expect(active.mock.calls).toEqual([[true]])
    expect(frames.size).toBe(1)
    flushFrames()
    expect(active.mock.calls).toEqual([[true], [false]])
    expect(interrupt).not.toHaveBeenCalled()
    expect(change).not.toHaveBeenCalled()
  })

  it("drains native ownership when the pointer is released outside the Surface on window", () => {
    const change = vi.fn<SetEquationVariable>()
    const active = vi.fn<(value: boolean) => void>()
    const interrupt = vi.fn()
    render(<Fixture onChange={change} onNativeGestureChange={active} onInterrupt={interrupt} />)
    measureSurface()
    pointer(screen.getByTestId("native-mark"), "pointerDown", 40, 40)
    expect(active.mock.calls).toEqual([[true]])
    pointer(window, "pointerUp", 400, 300)
    expect(active.mock.calls).toEqual([[true]])
    flushFrames()
    expect(active.mock.calls).toEqual([[true], [false]])
    expect(interrupt).not.toHaveBeenCalled()
    expect(change).not.toHaveBeenCalled()
  })

  for (const reason of ["second touch", "pointercancel", "window pointercancel", "blur"]) {
    it(`${reason} interrupts an active native gesture instead of leaving its commit eligible`, () => {
      const change = vi.fn<SetEquationVariable>()
      const active = vi.fn<(value: boolean) => void>()
      const interrupt = vi.fn()
      render(<Fixture onChange={change} onNativeGestureChange={active} onInterrupt={interrupt} />)
      measureSurface()
      const mark = screen.getByTestId("native-mark")
      pointer(mark, "pointerDown", 40, 40, { pointerType: "touch" })
      expect(active).toHaveBeenCalledWith(true)
      if (reason === "second touch") pointer(mark, "pointerDown", 140, 40, { pointerId: 8, pointerType: "touch", isPrimary: false })
      if (reason === "pointercancel") pointer(mark, "pointerCancel", 40, 40, { pointerType: "touch" })
      if (reason === "window pointercancel") pointer(window, "pointerCancel", 400, 300, { pointerType: "touch" })
      if (reason === "blur") fireEvent.blur(window)
      expect(interrupt).toHaveBeenCalledTimes(1)
      expect(change).not.toHaveBeenCalled()
    })
  }

  it("interrupts native input when a second touch begins on blank viewport space outside the Surface", () => {
    const change = vi.fn<SetEquationVariable>()
    const active = vi.fn<(value: boolean) => void>()
    const interrupt = vi.fn()
    render(<VisualizationViewport mobileOptimized>
      <Fixture onChange={change} onNativeGestureChange={active} onInterrupt={interrupt} />
    </VisualizationViewport>)
    measureSurface()
    pointer(screen.getByTestId("native-mark"), "pointerDown", 40, 40, { pointerId: 1, pointerType: "touch" })
    expect(active).toHaveBeenCalledWith(true)
    const frame = screen.getByTestId("visualization-zoom-frame")
    const scrollArea = frame.parentElement!
    pointer(scrollArea, "pointerDown", 140, 40, { pointerId: 2, pointerType: "touch", isPrimary: false })
    expect(interrupt).toHaveBeenCalledTimes(1)
    pointer(scrollArea, "pointerMove", 200, 40, { pointerId: 2, pointerType: "touch", isPrimary: false })
    expect(Number(frame.getAttribute("data-zoom-scale"))).toBeGreaterThan(100)
    expect(change).not.toHaveBeenCalled()
  })
})

describe("child-only D3 updates", () => {
  it("decorates a newly added child control without rerendering its Surface parent", async () => {
    const change = vi.fn<SetEquationVariable>()
    const hostRender = vi.fn()
    function Host() {
      hostRender()
      return <SceneInteractionSurface variables={circuitVariables} onVariableChange={change} identity="circuit">
        <ChildOnlyD3Visual />
      </SceneInteractionSurface>
    }
    render(<Host />)
    measureSurface()
    expect(screen.queryByTestId("child-added-mark")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Add child control" }))
    const added = screen.getByTestId("child-added-mark")
    await waitFor(() => {
      expect(added).toHaveAttribute("tabindex", "0")
      expect(added).toHaveAttribute("role", "slider")
      expect(added).toHaveAttribute("aria-valuemin", "0")
      expect(added).toHaveAttribute("aria-valuemax", "10")
      expect(added).toHaveAttribute("aria-valuenow", "2")
      expect(added).toHaveAttribute("aria-valuetext", "2 A")
    })
    expect(hostRender).toHaveBeenCalledTimes(1)
    expect(change).not.toHaveBeenCalled()
    fireEvent.keyDown(added, { key: "ArrowRight" })
    expect(change).toHaveBeenLastCalledWith("I", 2.1, { source: "learner" })
  })

  it("refreshes range, value and unit after a child rebinds the same D3 mark from current to resistance", async () => {
    const change = vi.fn<SetEquationVariable>()
    const hostRender = vi.fn()
    function Host() {
      hostRender()
      return <SceneInteractionSurface variables={circuitVariables} onVariableChange={change} identity="circuit">
        <ChildOnlyD3Visual />
      </SceneInteractionSurface>
    }
    render(<Host />)
    const mark = screen.getByTestId("child-bound-mark")
    expect(mark).toHaveAttribute("data-drag-variable", "I")
    expect(mark).toHaveAttribute("aria-valuemin", "0")
    expect(mark).toHaveAttribute("aria-valuemax", "10")
    expect(mark).toHaveAttribute("aria-valuenow", "2")
    expect(mark).toHaveAttribute("aria-valuetext", "2 A")
    fireEvent.click(screen.getByRole("button", { name: "Use resistance cause" }))
    expect(screen.getByTestId("child-bound-mark")).toBe(mark)
    await waitFor(() => {
      expect(mark).toHaveAttribute("data-drag-variable", "R")
      expect(mark).toHaveAttribute("aria-valuemin", "1")
      expect(mark).toHaveAttribute("aria-valuemax", "100")
      expect(mark).toHaveAttribute("aria-valuenow", "47")
      expect(mark).toHaveAttribute("aria-valuetext", "47 Ω")
    })
    expect(hostRender).toHaveBeenCalledTimes(1)
    expect(change).not.toHaveBeenCalled()
    fireEvent.keyDown(mark, { key: "ArrowRight" })
    expect(change).toHaveBeenLastCalledWith("R", 48, { source: "learner" })
  })
})

describe("keyboard and focus behavior", () => {
  it("updates single or two-axis causes with arrows, Shift, and exact Home/End bounds", () => {
    const change = vi.fn<SetEquationVariable>()
    render(<Fixture onChange={change} />)
    measureSurface()
    const position = screen.getByTestId("position-mark").parentElement!
    expect(position).toHaveAttribute("role", "slider")
    expect(position).toHaveAttribute("tabindex", "0")
    fireEvent.keyDown(position, { key: "ArrowRight" })
    expect(change).toHaveBeenLastCalledWith("position", 2.5, { source: "learner" })
    fireEvent.keyDown(position, { key: "ArrowRight", shiftKey: true })
    expect(change).toHaveBeenLastCalledWith("position", 7.5, { source: "learner" })
    fireEvent.keyDown(position, { key: "End" })
    expect(change).toHaveBeenLastCalledWith("position", 10, { source: "learner" })
    fireEvent.keyDown(position, { key: "Home" })
    expect(change).toHaveBeenLastCalledWith("position", 0, { source: "learner" })
    const dual = screen.getByTestId("dual-mark").parentElement!
    expect(dual).toHaveAttribute("role", "group")
    fireEvent.keyDown(dual, { key: "ArrowUp" })
    expect(change).toHaveBeenLastCalledWith("spread", 0.25, { source: "learner" })
    fireEvent.keyDown(dual, { key: "ArrowRight" })
    expect(change).toHaveBeenLastCalledWith("position", 0.5, { source: "learner" })
  })

  it("denies pointer and keyboard writes to readonly constants and genuinely locked controls", () => {
    const change = vi.fn<SetEquationVariable>()
    render(<Fixture onChange={change} />)
    measureSurface()
    for (const id of ["constant-mark", "locked-mark"]) {
      const mark = screen.getByTestId(id)
      expect(mark).toHaveAttribute("aria-disabled", "true")
      pointer(mark, "pointerDown", 40, 40)
      pointer(mark, "pointerUp", 140, 40)
      for (const key of ["ArrowRight", "ArrowUp", "Home", "End"]) fireEvent.keyDown(mark, { key, shiftKey: true })
    }
    expect(change).not.toHaveBeenCalled()
    expect(setCapture).not.toHaveBeenCalled()
  })

  it("keeps opacity-hidden SVG controls and numeric buttons out of the tab order, restoring visible controls", () => {
    const change = vi.fn<SetEquationVariable>()
    const result = render(<Fixture onChange={change} hideControls />)
    for (const id of ["hidden-mark", "hidden-style-mark", "hidden-button"]) {
      expect(screen.getByTestId(id)).toHaveAttribute("tabindex", "-1")
    }
    result.rerender(<Fixture onChange={change} hideControls={false} />)
    for (const id of ["hidden-mark", "hidden-style-mark"]) {
      expect(screen.getByTestId(id)).toHaveAttribute("tabindex", "0")
    }
    expect(screen.getByTestId("hidden-button").tabIndex).toBe(0)
    expect(screen.getByTestId("hidden-button")).not.toHaveAttribute("role", "slider")
  })
})
