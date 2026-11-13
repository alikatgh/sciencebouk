import type { ReactElement, ReactNode } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { LessonStep, SetEquationVariable, Variable } from "../teaching/types"
import { EulerPolyhedraScene } from "./EulerPolyhedraScene"
import { NormalDistributionScene } from "./NormalDistributionScene"
import { FourierScene } from "./FourierScene"
import { FluidScene } from "./FluidScene"
import { MaxwellScene } from "./MaxwellScene"
import { EntropyScene } from "./EntropyScene"

interface CapturedScene {
  variables: Variable[]
  lessonSteps: LessonStep[]
  children: (context: {
    vars: Record<string, number>
    setVar: SetEquationVariable
    onAction: (name: string) => void
    highlightedVar: string | null
    setHighlightedVar: (name: string | null) => void
  }) => ReactNode
}

const state = vi.hoisted(() => ({
  config: null as CapturedScene | null,
  setVar: vi.fn<SetEquationVariable>(),
  onAction: vi.fn<(name: string) => void>(),
  highlight: vi.fn<(name: string | null) => void>(),
}))

vi.mock("../../settings/SettingsContext", () => ({ useSettings: () => ({ settings: { language: "en" } }) }))
vi.mock("../../hooks/useContainerSize", () => ({ useContainerSize: () => ({ width: 900, height: 440 }) }))
vi.mock("../teaching/TeachableEquation", () => ({
  TeachableEquation: (props: CapturedScene) => {
    state.config = props
    return props.children({
      vars: Object.fromEntries(props.variables.map((variable) => [variable.name, variable.value])),
      setVar: state.setVar,
      onAction: state.onAction,
      highlightedVar: null,
      setHighlightedVar: state.highlight,
    })
  },
}))

beforeEach(() => {
  state.config = null
  state.setVar.mockClear()
  state.onAction.mockClear()
  state.highlight.mockClear()
  // The tests inspect real created marks without starting recurring animation.
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

const numericScenes: Array<{ name: string; Scene: () => ReactElement; wave?: boolean }> = [
  { name: "Normal distribution", Scene: NormalDistributionScene },
  { name: "Fourier", Scene: FourierScene },
  { name: "Fluid", Scene: FluidScene },
  { name: "Maxwell wave", Scene: MaxwellScene, wave: true },
  { name: "Entropy", Scene: EntropyScene },
]

function dragVariable(element: Element | null): string | null {
  expect(element).not.toBeNull()
  return element!.closest("[data-drag-variable]")?.getAttribute("data-drag-variable") ?? null
}

describe("middle scene direct manipulation coverage", () => {
  for (const { name, Scene, wave } of numericScenes) {
    it(`${name} connects actual visual marks only to authored adjustable inputs`, () => {
      const { container } = render(<Scene />)
      if (wave) fireEvent.click(screen.getByRole("button", { name: "Show electromagnetic wave" }))
      const variables = state.config!.variables.filter((variable) => !variable.constant)
      const editable = new Set(variables.map((variable) => variable.name))
      const mapped = new Set<string>()
      const controls = container.querySelectorAll("[data-drag-variable]")
      expect(controls.length).toBeGreaterThan(0)
      for (const control of controls) {
        for (const attribute of ["data-drag-variable", "data-drag-variable-y"]) {
          const name = control.getAttribute(attribute)
          if (name == null) continue
          expect(editable.has(name), `${name} must be an authored adjustable input`).toBe(true)
          mapped.add(name)
        }
      }
      for (const variable of variables) expect(mapped.has(variable.name), `${variable.name} has visual coverage`).toBe(true)
      expect(container.querySelector("svg [data-drag-variable]")).not.toBeNull()
      expect(state.setVar).not.toHaveBeenCalled()
    })
  }

  it("normal curve, probability regions, markers and readouts remain individually reachable", () => {
    const { container } = render(<NormalDistributionScene />)
    const center = container.querySelector('[aria-label="Move bell curve center"]')!
    expect(dragVariable(center.querySelector("path"))).toBe("mu")
    for (const count of ["one", "two", "three"]) {
      expect(dragVariable(container.querySelector(`path[aria-label="Adjust ${count} standard deviation region"]`))).toBe("sigma")
    }
    expect(container.querySelector('[aria-label="Adjust left standard deviation marker"]')).toHaveAttribute("data-drag-direction", "-1")
    expect(dragVariable(container.querySelector('[aria-label="Move mean label"]'))).toBe("mu")
    expect(dragVariable(container.querySelector('[aria-label="Adjust bell curve peak by changing spread"]'))).toBe("sigma")
    expect(container.querySelector(".absolute.inset-0.z-10")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Adjust bell curve spread" }))
    expect(screen.getByRole("spinbutton")).toHaveValue(1)
  })

  it("Fourier harmonic curves, names, amplitudes, bars and native handles share the matching amplitude", () => {
    const { container } = render(<FourierScene />)
    for (let index = 0; index < 4; index++) {
      const variable = `a${index + 1}`
      for (const selector of [`.harmonic-path-${index}`, `.harmonic-label-${index} text`, `.amp-text-${index}`, `.spectrum-bar-${index}`, `.spectrum-knob-${index}`]) {
        expect(dragVariable(container.querySelector(selector))).toBe(variable)
      }
      expect(container.querySelector(`.spectrum-handle-${index}`)).toHaveAttribute("data-scene-drag", "native")
      expect(container.querySelector(`.harmonic-curve-${index}`)).toHaveAttribute("data-drag-axis", "y")
    }
    expect(dragVariable(container.querySelector(".composite-path"))).toBe("a1")
    expect(dragVariable(container.querySelector(".equation-readout"))).toBe("a1")
    expect(screen.getByRole("button", { name: "Play or pause Fourier animation" })).not.toHaveAttribute("data-drag-variable")
  })

  it("fluid vectors and particles adjust their causes while the obstacle keeps bounded native movement", () => {
    const { container } = render(<FluidScene />)
    const arrows = container.querySelector(".arrows-group")!
    const particles = container.querySelector(".particles-group")!
    expect(dragVariable(arrows.querySelector("line"))).toBe("flowSpeed")
    expect(arrows).toHaveAttribute("data-drag-variable-y", "viscosity")
    expect(dragVariable(particles.querySelector("circle"))).toBe("flowSpeed")
    expect(particles).toHaveAttribute("data-drag-variable-y", "viscosity")
    expect(dragVariable(container.querySelector(".velocity-legend text"))).toBe("flowSpeed")
    const obstacle = screen.getByRole("button", { name: "Move flow obstacle with arrow keys or drag" })
    expect(obstacle).toHaveAttribute("data-scene-drag", "native")
    const before = obstacle.getAttribute("transform")
    fireEvent.keyDown(obstacle, { key: "ArrowRight" })
    expect(obstacle.getAttribute("transform")).not.toBe(before)
    expect(state.setVar).not.toHaveBeenCalled()
  })

  it("entropy particles, ghost arrangements, chamber and heat indicator all control temperature", () => {
    const { container } = render(<EntropyScene />)
    expect(container.querySelectorAll('[aria-label^="Adjust temperature from particle "]')).toHaveLength(24)
    expect(container.querySelectorAll('[aria-label^="Adjust temperature from ordered particle "]')).toHaveLength(24)
    expect(dragVariable(container.querySelector('[aria-label="Adjust temperature from particle 1"] circle'))).toBe("temperature")
    expect(dragVariable(container.querySelector('[aria-label^="Adjust temperature from possible arrangement"] circle'))).toBe("temperature")
    expect(dragVariable(container.querySelector('[aria-label="Adjust particle chamber temperature"]'))).toBe("temperature")
    expect(dragVariable(container.querySelector('[aria-label="Adjust heat indicator temperature"]'))).toBe("temperature")
  })

  it("Euler rotates actual faces, edges, vertices and readouts without changing readonly topology", () => {
    const { container } = render(<EulerPolyhedraScene />)
    const rotation = container.querySelector(".polyhedron-rotation")!
    state.setVar.mockClear()
    fireEvent.keyDown(rotation, { key: "ArrowRight" })
    for (const selector of [".faces-group polygon", ".edges-group line", ".verts-group circle", ".v-label", ".e-label", ".f-label", ".shape-name", ".euler-result"]) {
      const mark = container.querySelector(selector)
      expect(mark).not.toBeNull()
      expect(mark!.closest('[data-scene-drag="native"]')).toBe(rotation)
    }
    const before = container.querySelector(".faces-group polygon")!.getAttribute("points")
    fireEvent.keyDown(rotation, { key: "ArrowUp" })
    expect(container.querySelector(".faces-group polygon")!.getAttribute("points")).not.toBe(before)
    expect(state.config!.variables.every((variable) => variable.constant)).toBe(true)
    expect(container.querySelector("[data-drag-variable]")).toBeNull()
    expect(state.setVar).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Select Cube" }).closest('[data-scene-drag="native"]')).toBeNull()
  })

  it("Maxwell field geometry moves a real source charge and the wave controls its wavelength", () => {
    const { container } = render(<MaxwellScene />)
    const fields = container.querySelector(".field-lines")!
    expect(fields).toHaveAttribute("data-scene-drag", "native")
    expect(fields.querySelectorAll("path").length).toBeGreaterThan(0)
    const positive = container.querySelector(".charge-1 circle")!
    const before = Number(positive.getAttribute("cx"))
    fireEvent.keyDown(fields, { key: "ArrowRight" })
    expect(Number(container.querySelector(".charge-1 circle")!.getAttribute("cx"))).toBe(before + 20)
    expect(state.onAction.mock.calls).toEqual([["move-charge"]])
    expect(state.setVar).not.toHaveBeenCalled()
    expect(container.querySelector(".charge-1")).toHaveAttribute("data-scene-drag", "native")
    expect(container.querySelector(".charge-2")).toHaveAttribute("data-scene-drag", "native")

    fireEvent.click(screen.getByRole("button", { name: "Show electromagnetic wave" }))
    for (const selector of [".e-wave", ".b-wave", ".e-area", ".b-area", ".wl-line", ".wl-text", ".wl-knob"]) {
      expect(dragVariable(container.querySelector(selector))).toBe("wavelength")
    }
    expect(container.querySelector(".wl-handle")).toHaveAttribute("data-scene-drag", "native")
    expect(screen.getByRole("button", { name: "Show electromagnetic wave" })).not.toHaveAttribute("data-drag-variable")
    fireEvent.click(screen.getByRole("button", { name: "Show electric field lines" }))
    expect(container.querySelector(".wave-mode")).not.toHaveAttribute("data-drag-variable")
  })
})
