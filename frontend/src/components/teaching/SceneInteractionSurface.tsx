import type { KeyboardEvent, PointerEvent, ReactNode } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { SetEquationVariable, Variable } from "./types"
import { keyboardSceneValue, projectedSceneValue, sceneDragBindings, type DragBinding } from "./sceneManipulation"
import { useVisualizationView } from "./VisualizationViewport"

interface Props {
  children: ReactNode
  variables: Variable[]
  onVariableChange: SetEquationVariable
  identity: string | number
  onInterrupt?: () => void
  onNativeGestureChange?: (active: boolean) => void
}

interface Gesture {
  pointerId: number
  element: Element
  startX: number
  startY: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  values: Record<string, number>
  bindings: DragBinding[]
  pan: { x: number; y: number }
  moved: boolean
  identity: string | number
}

const THRESHOLD = 4

/** Delegated controls keep moving D3 marks interactive without per-frame listeners. */
export function SceneInteractionSurface({ children, variables, onVariableChange, identity, onInterrupt, onNativeGestureChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const frameRef = useRef<number | null>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const suppressClickRef = useRef(0)
  const nativePointerRef = useRef<number | null>(null)
  const nativeEndFrameRef = useRef<number | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panRef = useRef(pan)
  const contextRef = useRef({ variables, onVariableChange, identity })
  contextRef.current = { variables, onVariableChange, identity }
  const view = useVisualizationView()

  const cancelGesture = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    const gesture = gestureRef.current
    gestureRef.current = null
    lastPointerRef.current = null
    try {
      if (gesture?.element.hasPointerCapture(gesture.pointerId)) gesture.element.releasePointerCapture(gesture.pointerId)
    } catch { /* Capture can already have been lost during a scene change. */ }
  }, [])

  const resetPosition = useCallback(() => {
    cancelGesture()
    panRef.current = { x: 0, y: 0 }
    setPan(panRef.current)
  }, [cancelGesture])

  useEffect(() => view?.registerReset(resetPosition), [view, resetPosition])
  useEffect(() => view?.registerInterrupt(() => { cancelGesture(); onInterrupt?.() }), [view, cancelGesture, onInterrupt])
  useEffect(() => { view?.setPanActive(pan.x !== 0 || pan.y !== 0) }, [view, pan.x !== 0 || pan.y !== 0])
  useEffect(() => { resetPosition() }, [identity, resetPosition])
  useEffect(() => {
    const blur = () => { cancelGesture(); onInterrupt?.() }
    window.addEventListener("blur", blur)
    return () => {
      cancelGesture()
      if (nativeEndFrameRef.current !== null) cancelAnimationFrame(nativeEndFrameRef.current)
      onNativeGestureChange?.(false)
      window.removeEventListener("blur", blur)
    }
  }, [cancelGesture, onInterrupt, onNativeGestureChange])

  const decorateControls = useCallback((scope: Element) => {
    const root = rootRef.current
    if (!root) return
    if (!scope.hasAttribute("data-drag-variable") && scope.hasAttribute("data-scene-control")) {
      for (const attribute of ["tabindex", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "aria-disabled", "aria-keyshortcuts", "data-scene-control"]) scope.removeAttribute(attribute)
      if (scope.tagName.toLowerCase() !== "button") scope.removeAttribute("role")
    }
    const variables = contextRef.current.variables
    const controls = [...scope.querySelectorAll<SVGElement | HTMLElement>("[data-drag-variable]")]
    if (scope.matches("[data-drag-variable]")) controls.unshift(scope as SVGElement | HTMLElement)
    for (const element of controls) {
      const bindings = sceneDragBindings(element)
      const primary = variables.find((variable) => variable.name === bindings[0]?.name)
      if (!primary) continue
      element.setAttribute("data-scene-control", "true")
      const button = element.tagName.toLowerCase() === "button"
      let hidden = false
      for (let ancestor: Element | null = element; ancestor && ancestor !== root; ancestor = ancestor.parentElement) {
        if (ancestor.hasAttribute("hidden") || ancestor.getAttribute("aria-hidden") === "true"
          || (ancestor.hasAttribute("opacity") && Number(ancestor.getAttribute("opacity")) === 0)
          || (ancestor as HTMLElement).style?.opacity === "0") { hidden = true; break }
      }
      element.setAttribute("tabindex", hidden ? "-1" : "0")
      if (!button) {
        element.setAttribute("role", bindings.length > 1 ? "group" : "slider")
        if (bindings.length === 1) {
          element.setAttribute("aria-valuemin", String(primary.min))
          element.setAttribute("aria-valuemax", String(primary.max))
          element.setAttribute("aria-valuenow", String(primary.value))
          element.setAttribute("aria-valuetext", `${primary.value}${primary.unit ? ` ${primary.unit}` : ""}`)
        } else {
          for (const attribute of ["aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext"]) element.removeAttribute(attribute)
        }
      }
      if (!element.hasAttribute("aria-label")) element.setAttribute("aria-label", `Adjust ${primary.description || primary.symbol || primary.name}`)
      element.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight ArrowUp ArrowDown Home End")
      element.setAttribute("aria-disabled", String(Boolean(primary.constant || primary.locked)))
      const svg = element.closest("svg")
      if (svg?.getAttribute("role") === "img") svg.setAttribute("role", "group")
    }
  }, [])

  useEffect(() => {
    if (rootRef.current) decorateControls(rootRef.current)
  })

  // D3 can rebuild a child scene without rerendering this wrapper. Observe only
  // structural additions, ignore animated text/attributes, and initialize the
  // new subtree rather than scanning the entire diagram on animation frames.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new MutationObserver((records) => {
      const added = new Set<Element>()
      for (const record of records) {
        if (record.type === "attributes") { added.add(record.target as Element); continue }
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          const ancestor = node.closest("[data-drag-variable]")
          added.add(ancestor && root.contains(ancestor) ? ancestor : node)
        }
      }
      for (const element of added) if (root.contains(element)) decorateControls(element)
      const gesture = gestureRef.current
      if (gesture && !root.contains(gesture.element)) cancelGesture()
    })
    observer.observe(root, { childList: true, subtree: true, attributes: true,
      attributeFilter: ["data-drag-variable", "data-drag-variable-y"] })
    return () => observer.disconnect()
  }, [decorateControls, cancelGesture])

  const applyPointer = useCallback((x: number, y: number) => {
    const gesture = gestureRef.current
    const context = contextRef.current
    if (!gesture || gesture.identity !== context.identity) return
    const dx = x - gesture.startX
    const dy = y - gesture.startY
    if (!gesture.moved && Math.hypot(dx, dy) < THRESHOLD) return
    gesture.moved = true
    if (gesture.bindings.length === 0) {
      const width = gesture.width / gesture.scaleX
      const height = gesture.height / gesture.scaleY
      panRef.current = {
        x: Math.max(-width * .45, Math.min(width * .45, gesture.pan.x + dx / gesture.scaleX)),
        y: Math.max(-height * .45, Math.min(height * .45, gesture.pan.y + dy / gesture.scaleY)),
      }
      setPan(panRef.current)
    } else {
      for (const binding of gesture.bindings) {
        const variable = context.variables.find((entry) => entry.name === binding.name)
        if (!variable || variable.constant || variable.locked) continue
        const delta = binding.axis === "y" ? -dy : dx
        const value = Math.abs(delta) < THRESHOLD ? gesture.values[binding.name]
          : projectedSceneValue(variable, gesture.values[binding.name], delta, binding.axis === "y" ? gesture.height : gesture.width, binding.direction)
        if (!Object.is(value, variable.value)) context.onVariableChange(variable.name, value, { source: "learner" })
      }
    }
  }, [])

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.isPrimary === false) { cancelGesture(); return }
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || !(event.target instanceof Element)) return
    const target = event.target
    if (target.closest("input,select,textarea,[contenteditable=true]")) return
    const native = target.closest('[data-scene-drag="native"]')
    if (native) return
    const control = event.shiftKey ? null : target.closest("[data-drag-variable]")
    if (!control && !event.shiftKey && target.closest("button,input,select,textarea,a,summary,[role=button]")) return
    if (!control && !target.closest('svg,[data-scene-canvas],[data-scene-drag="view"]')) return
    const root = rootRef.current
    if (!root) return
    const rect = root.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const bindings = control ? sceneDragBindings(control) : []
    if (bindings.length && !bindings.some((binding) => variables.some((variable) => variable.name === binding.name && !variable.constant && !variable.locked))) return
    cancelGesture()
    suppressClickRef.current = 0
    const element = control ?? target
    gestureRef.current = {
      pointerId: event.pointerId, element, startX: event.clientX, startY: event.clientY,
      width: rect.width, height: rect.height,
      scaleX: root.clientWidth > 0 ? rect.width / root.clientWidth : 1,
      scaleY: root.clientHeight > 0 ? rect.height / root.clientHeight : 1,
      values: Object.fromEntries(variables.map((variable) => [variable.name, variable.value])),
      bindings, pan: { ...panRef.current }, moved: false, identity,
    }
    if (control) {
      try { (control as HTMLElement).focus({ preventScroll: true }) } catch { /* SVG focus is browser-dependent. */ }
      event.preventDefault()
    }
    if (event.shiftKey) event.preventDefault()
    try { element.setPointerCapture(event.pointerId) } catch { /* Tests/older hosts may not implement capture. */ }
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (gestureRef.current?.pointerId !== event.pointerId) return
    event.preventDefault()
    lastPointerRef.current = { x: event.clientX, y: event.clientY }
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const point = lastPointerRef.current
      if (point) applyPointer(point.x, point.y)
    })
  }

  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current
    if (gesture?.pointerId !== event.pointerId) return
    if (event.type === "pointerup") applyPointer(event.clientX, event.clientY)
    if (gesture.moved) suppressClickRef.current = Date.now() + 250
    cancelGesture()
  }

  function captureStart(event: PointerEvent<HTMLDivElement>) {
    if (event.isPrimary === false) { cancelGesture(); onInterrupt?.(); return }
    if (!(event.target instanceof Element) || !event.target.closest('[data-scene-drag="native"]')) return
    if (nativeEndFrameRef.current !== null) cancelAnimationFrame(nativeEndFrameRef.current)
    nativePointerRef.current = event.pointerId
    onNativeGestureChange?.(true)
  }

  const captureEnd = useCallback((event: { pointerId: number; type: string }) => {
    if (nativePointerRef.current !== event.pointerId) return
    nativePointerRef.current = null
    if (event.type === "pointercancel") { onInterrupt?.(); return }
    // D3 commits on the compatibility mouseup/touchend after pointerup. Keep
    // interruption protection until that input sequence has drained.
    nativeEndFrameRef.current = requestAnimationFrame(() => {
      nativeEndFrameRef.current = null
      onNativeGestureChange?.(false)
    })
  }, [onInterrupt, onNativeGestureChange])

  useEffect(() => {
    // D3 tracks a mouse drag on window, so its release may be outside the SVG.
    window.addEventListener("pointerup", captureEnd, true)
    window.addEventListener("pointercancel", captureEnd, true)
    return () => {
      window.removeEventListener("pointerup", captureEnd, true)
      window.removeEventListener("pointercancel", captureEnd, true)
    }
  }, [captureEnd])

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { cancelGesture(); onInterrupt?.(); return }
    if (event.ctrlKey || event.metaKey || event.altKey || !(event.target instanceof Element)) return
    if (event.target.closest("input,select,textarea,[contenteditable=true]")) return
    const control = event.target.closest("[data-drag-variable]")
    if (!control) {
      if (event.target !== event.currentTarget) return
      if (event.key === "Home") { event.preventDefault(); resetPosition(); return }
      const delta = event.shiftKey ? 40 : 10
      const x = event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0
      const y = event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0
      if (x || y) {
        event.preventDefault()
        const root = rootRef.current
        const width = root?.clientWidth || 800; const height = root?.clientHeight || 500
        panRef.current = { x: Math.max(-width * .45, Math.min(width * .45, panRef.current.x + x)), y: Math.max(-height * .45, Math.min(height * .45, panRef.current.y + y)) }
        setPan(panRef.current)
      }
      return
    }
    const bindings = sceneDragBindings(control)
    const binding = bindings.length > 1 && (event.key === "ArrowUp" || event.key === "ArrowDown") ? bindings[1] : bindings[0]
    const variable = variables.find((entry) => entry.name === binding?.name)
    if (!variable) return
    const value = keyboardSceneValue(variable, event.key, event.shiftKey)
    if (value === null) return
    event.preventDefault(); event.stopPropagation()
    if (!Object.is(value, variable.value)) onVariableChange(variable.name, value, { source: "learner" })
  }

  return (
    <div ref={rootRef} className="scene-interaction-surface relative h-full min-h-0 w-full min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ocean"
      role="group" aria-label="Interactive visualization canvas" aria-description="Drag shapes and values to adjust inputs. Drag the background to move the diagram. Hold Shift on a shared control to move the view instead. Arrow keys adjust a focused control. Reset view restores the canvas." tabIndex={0}
      style={{ touchAction: "none" }} onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerDownCapture={captureStart} onPointerUpCapture={captureEnd} onPointerCancelCapture={captureEnd}
      onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd} onKeyDown={keyDown}
      onClickCapture={(event) => { if (event.detail > 0 && Date.now() < suppressClickRef.current) { event.preventDefault(); event.stopPropagation() } }}>
      <div className="h-full min-h-0 w-full" data-scene-canvas style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }} data-scene-pan={`${pan.x},${pan.y}`}>
        {children}
      </div>
    </div>
  )
}
