import type { ReactElement, ReactNode } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { LessonStep, SetEquationVariable, Variable } from "../teaching/types"
import { applyLessonVariableInteraction, createLessonAttempt } from "../teaching/lessonInteraction"
import { EulerPolyhedraScene } from "./EulerPolyhedraScene"
import { FluidScene } from "./FluidScene"
import { MaxwellScene } from "./MaxwellScene"
import { EntropyScene } from "./EntropyScene"
import { SchrodingerScene } from "./SchrodingerScene"

interface CapturedScene {
  variables: Variable[]
  lessonSteps: LessonStep[]
  children: (context: {
    vars: Record<string, number>
    setVar: SetEquationVariable
    onAction: (name: string) => void
  }) => ReactNode
}

const state = vi.hoisted(() => ({
  scenes: [] as CapturedScene[],
  showVisual: false,
  setVar: vi.fn<SetEquationVariable>(),
  onAction: vi.fn<(name: string) => void>(),
}))

vi.mock("../../settings/SettingsContext", () => ({ useSettings: () => ({ settings: { language: "en" } }) }))
vi.mock("../../hooks/useContainerSize", () => ({ useContainerSize: () => ({ width: 900, height: 440 }) }))
vi.mock("../teaching/TeachableEquation", () => ({
  TeachableEquation: (props: CapturedScene) => {
    state.scenes.push(props)
    return state.showVisual ? props.children({
      vars: Object.fromEntries(props.variables.map((variable) => [variable.name, variable.value])),
      setVar: state.setVar,
      onAction: state.onAction,
    }) : null
  },
}))

beforeEach(() => {
  state.scenes = []
  state.showVisual = false
  state.setVar.mockClear()
  state.onAction.mockClear()
  // Paint loops are unrelated to the interaction contract and must not run forever in tests.
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1))
  vi.stubGlobal("cancelAnimationFrame", vi.fn())
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const scenes: Array<{ name: string; Scene: () => ReactElement; stepIds: string[] }> = [
  { name: "Euler", Scene: EulerPolyhedraScene, stepIds: ["cube", "try-others", "icosahedron"] },
  { name: "Fluid", Scene: FluidScene, stepIds: ["watch-flow", "change-viscosity", "turbulence"] },
  { name: "Maxwell", Scene: MaxwellScene, stepIds: ["field-lines", "em-wave", "wavelength"] },
  { name: "Entropy", Scene: EntropyScene, stepIds: ["order", "heat", "arrow", "irreversible"] },
  { name: "Schrodinger", Scene: SchrodingerScene, stepIds: ["ground-state", "increase-n", "shrink-box"] },
]

describe("authored scene practice", () => {
  for (const { name, Scene, stepIds } of scenes) {
    it(`${name} supplies stable steps with reachable actions instead of passive timers`, () => {
      render(<Scene />)
      const config = state.scenes.at(-1)!
      expect(config.lessonSteps.map((step) => step.id)).toEqual(stepIds)
      for (const step of config.lessonSteps) {
        const condition = step.successCondition
        expect(condition.type).not.toBe("time_elapsed")
        expect(condition.target).toBeTruthy()
        expect(step.instruction.length).toBeGreaterThan(20)
        if (condition.type === "clicked") continue
        const variable = config.variables.find((candidate) => candidate.name === condition.target)
        expect(variable, `${name}/${step.id} target exists`).toBeDefined()
        expect(step.unlockedVariables).toContain(condition.target)
        if (condition.type === "value_reached") {
          expect(condition.value).toBeGreaterThanOrEqual(variable!.min)
          expect(condition.value).toBeLessThanOrEqual(variable!.max)
          expect(Math.abs(variable!.value - condition.value!)).toBeGreaterThan(condition.tolerance ?? 0.5)
        }
      }
    })
  }

  it("Entropy heating requires the meaningful authored target, not a tiny change from the ordered model", () => {
    render(<EntropyScene />)
    const heat = state.scenes.at(-1)!.lessonSteps.find((step) => step.id === "heat")!
    expect(heat.instruction).toContain("50")
    expect(heat.hint).toContain("50")
    let attempt = createLessonAttempt(1, { temperature: 0 })
    let previous = { temperature: 0 }
    for (const temperature of [1, 10, 49]) {
      const values = { temperature }
      attempt = applyLessonVariableInteraction(attempt, heat, "temperature", previous, values, "learner")
      expect(attempt.stepCompleted).toBe(false)
      previous = values
    }
    expect(applyLessonVariableInteraction(attempt, heat, "temperature", previous, { temperature: 50 }, "learner").stepCompleted).toBe(true)
  })

  it("Euler synchronizes initial readouts as system input and requires a changed selection to return to the cube", () => {
    state.showVisual = true
    render(<EulerPolyhedraScene />)
    expect(state.setVar.mock.calls).toEqual([
      ["V", 8, { source: "system" }], ["E", 12, { source: "system" }], ["F", 6, { source: "system" }],
    ])
    expect(state.onAction).not.toHaveBeenCalled()
    expect(state.scenes.at(-1)!.variables.every((variable) => variable.constant)).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: "Select Cube" }))
    expect(state.onAction).not.toHaveBeenCalled()
    expect(state.setVar).toHaveBeenCalledTimes(3)

    fireEvent.click(screen.getByRole("button", { name: "Select Tetrahedron" }))
    expect(state.setVar.mock.calls.slice(-3)).toEqual([["V", 4], ["E", 6], ["F", 4]])
    expect(state.onAction).not.toHaveBeenCalled()

    fireEvent.keyDown(screen.getByRole("button", { name: "Select Cube" }), { key: "Enter" })
    expect(state.setVar.mock.calls.slice(-3)).toEqual([["V", 8], ["E", 12], ["F", 6]])
    expect(state.onAction.mock.calls).toEqual([["select-cube"]])
    expect(screen.getByRole("button", { name: "Select Cube" })).toHaveAttribute("aria-pressed", "true")
  })

  it("Maxwell reports charge movement and a real switch to the wave view only after learner input", () => {
    state.showVisual = true
    render(<MaxwellScene />)
    expect(state.onAction).not.toHaveBeenCalled()
    expect(state.setVar).not.toHaveBeenCalled()

    const positive = screen.getByRole("button", { name: /Move positive charge/ })
    const oldX = Number(positive.querySelector("circle")!.getAttribute("cx"))
    fireEvent.keyDown(positive, { key: "Enter" })
    expect(state.onAction).not.toHaveBeenCalled()
    fireEvent.keyDown(positive, { key: "ArrowRight" })
    expect(Number(screen.getByRole("button", { name: /Move positive charge/ }).querySelector("circle")!.getAttribute("cx"))).toBe(oldX + 20)
    expect(state.onAction.mock.calls).toEqual([["move-charge"]])

    fireEvent.keyDown(screen.getByRole("button", { name: "Show electromagnetic wave" }), { key: "Enter" })
    expect(state.onAction.mock.calls).toEqual([["move-charge"], ["show-em-wave"]])
    expect(screen.getByRole("button", { name: "Show electromagnetic wave" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(screen.getByRole("button", { name: "Show electromagnetic wave" }))
    expect(state.onAction).toHaveBeenCalledTimes(2)
  })

  it("Maxwell charge dragging requires a changed position, not just grabbing a charge", () => {
    state.showVisual = true
    render(<MaxwellScene />)
    const positive = screen.getByRole("button", { name: /Move positive charge/ })
    const circle = positive.querySelector("circle")!
    const x = Number(circle.getAttribute("cx"))
    const y = Number(circle.getAttribute("cy"))
    // Vitest rewrites document.defaultView to its Node global. jsdom's event
    // constructor requires the real Window, exposed by Vitest on global.jsdom.
    const view = (globalThis as unknown as { jsdom: { window: Window & typeof globalThis } }).jsdom.window
    const dispatchMouse = (target: Element | Window, type: string, clientX: number, buttons = 0) => {
      fireEvent(target, new view.MouseEvent(type, {
        bubbles: true, cancelable: true, clientX, clientY: y, buttons, view,
      }))
    }

    dispatchMouse(positive, "mousedown", x, 1)
    dispatchMouse(view, "mouseup", x)
    expect(state.onAction).not.toHaveBeenCalled()

    dispatchMouse(positive, "mousedown", x, 1)
    dispatchMouse(view, "mousemove", x + 30, 1)
    expect(Number(screen.getByRole("button", { name: /Move positive charge/ }).querySelector("circle")!.getAttribute("cx"))).toBe(x + 30)
    expect(state.onAction).not.toHaveBeenCalled()
    dispatchMouse(view, "mouseup", x + 30)
    expect(state.onAction.mock.calls).toEqual([["move-charge"]])
  })
})
