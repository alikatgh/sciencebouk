import type { ComponentProps } from "react"
import { useState } from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ExperimentBench } from "./ExperimentBench"
import type { ExperimentSnapshot, Variable } from "./types"

// Keep this test about comparison behavior; the existing math component owns KaTeX loading.
vi.mock("../math/DeferredInlineMath", () => ({
  DeferredInlineMath: ({ math }: { math: string }) => <span role="math" aria-label={math}>Rendered math</span>,
}))

const variables: Variable[] = [{
  name: "mass", symbol: "m", latex: "m", value: 2, min: 1, max: 10, step: 1,
  color: "#3b82f6", unit: "kg", description: "Mass",
}, {
  name: "energy", symbol: "E", latex: "E", value: 8, min: 0, max: 100, step: 1,
  color: "#ef4444", unit: "J", constant: true, description: "Energy readout",
}]

type BenchProps = ComponentProps<typeof ExperimentBench>

function props(overrides: Partial<BenchProps> = {}): BenchProps {
  return {
    variables, snapshot: null, onCapture: vi.fn(), onRestore: vi.fn(), onClear: vi.fn(),
    resetKey: "equation-1", ...overrides,
  }
}

function row(name: string) {
  return screen.getByRole("row", { name: new RegExp(name) })
}

describe("ExperimentBench", () => {
  it("captures, compares changed inputs and readouts, restores, and clears controlled state", async () => {
    const capture = vi.fn()
    const restore = vi.fn()
    const clear = vi.fn()
    function ControlledBench() {
      const [mass, setMass] = useState(2)
      const [snapshot, setSnapshot] = useState<ExperimentSnapshot | null>(null)
      const currentVariables = variables.map((variable) => ({ ...variable, value: variable.name === "mass" ? mass : mass * 4 }))
      return (
        <>
          <label>Mass input<input type="number" value={mass} onChange={(event) => setMass(Number(event.target.value))} /></label>
          <ExperimentBench
            variables={currentVariables}
            snapshot={snapshot}
            currentResult={`E = ${mass * 4}`}
            resetKey="equation-1"
            onCapture={() => {
              capture()
              setSnapshot({ equationId: 1, values: { mass, energy: mass * 4 }, resultLine: `E = ${mass * 4}` })
            }}
            onRestore={() => { restore(); if (snapshot) setMass(snapshot.values.mass) }}
            onClear={() => { clear(); setSnapshot(null) }}
          />
        </>
      )
    }
    render(<ControlledBench />)
    await userEvent.click(screen.getByRole("button", { name: "Experiment bench" }))
    await userEvent.click(screen.getByRole("button", { name: "Capture baseline" }))
    expect(capture).toHaveBeenCalledOnce()
    expect(screen.getByText("Values match the baseline.")).toBeVisible()

    fireEvent.change(screen.getByRole("spinbutton", { name: "Mass input" }), { target: { value: "5" } })
    expect(within(row("Mass")).getByText("2")).toBeVisible()
    expect(within(row("Mass")).getByText("5")).toBeVisible()
    expect(within(row("Mass")).getByText("kg")).toBeVisible()
    expect(within(row("Energy readout")).getByText("8")).toBeVisible()
    expect(within(row("Energy readout")).getByText("20")).toBeVisible()
    expect(within(row("Energy readout")).getByText("J")).toBeVisible()
    expect(screen.getAllByText("Changed")).toHaveLength(2)
    expect(screen.getByText("2 values have changed.")).toBeVisible()
    expect(screen.getByRole("math", { name: "E = 8" })).toBeVisible()
    expect(screen.getByRole("math", { name: "E = 20" })).toBeVisible()
    expect(screen.queryByText("E = 20")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Restore inputs" }))
    expect(restore).toHaveBeenCalledOnce()
    expect(screen.getByRole("spinbutton", { name: "Mass input" })).toHaveValue(2)
    expect(screen.getAllByText("Unchanged")).toHaveLength(2)
    await userEvent.click(screen.getByRole("button", { name: "Clear comparison" }))
    expect(clear).toHaveBeenCalledOnce()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.getByText("No baseline captured yet.")).toBeVisible()
    expect(screen.getByRole("button", { name: "Capture baseline" })).toBeVisible()
  })

  it("requests replacement without changing a baseline controlled by its parent", async () => {
    const benchProps = props({ snapshot: { equationId: 1, values: { mass: 1, energy: 4 }, resultLine: "E = 4" } })
    render(<ExperimentBench {...benchProps} />)
    await userEvent.click(screen.getByRole("button", { name: "Experiment bench" }))
    await userEvent.click(screen.getByRole("button", { name: "Replace baseline" }))
    expect(benchProps.onCapture).toHaveBeenCalledOnce()
    expect(within(row("Mass")).getByText("1")).toBeVisible()
    expect(screen.getByRole("math", { name: "E = 4" })).toBeVisible()
  })

  it("keeps missing results and unavailable values honest", async () => {
    render(<ExperimentBench {...props({
      variables: [{ ...variables[0], value: Number.NaN }, variables[1]],
      snapshot: { equationId: 1, values: { mass: 2 } }, currentResult: "  ",
    })} />)
    await userEvent.click(screen.getByRole("button", { name: "Experiment bench" }))
    expect(screen.getByText("No result captured.")).toBeVisible()
    expect(screen.getByText("No current result available.")).toBeVisible()
    expect(screen.getAllByText("Unavailable")).toHaveLength(2)
    expect(screen.getAllByText("Cannot compare")).toHaveLength(2)
    expect(screen.getByText("No comparable values are available.")).toBeVisible()
    expect(screen.queryByText("Values match the baseline.")).not.toBeInTheDocument()
    expect(screen.queryByText("Changed")).not.toBeInTheDocument()
    expect(screen.queryByRole("math", { name: /E =/ })).not.toBeInTheDocument()
  })

  it("shows the model assumption once, preferring the current note and retaining a captured note when absent", async () => {
    const benchProps = props({
      snapshot: { equationId: 1, values: { mass: 2, energy: 8 }, resultLine: "E = 8", resultNote: "Assumes no friction." },
      currentResult: "E = 8", currentResultNote: "Uses the scene's current assumptions.",
    })
    const view = render(<ExperimentBench {...benchProps} />)
    await userEvent.click(screen.getByRole("button", { name: "Experiment bench" }))
    expect(screen.getAllByText("Uses the scene's current assumptions.")).toHaveLength(1)
    expect(screen.queryByText("Assumes no friction.")).not.toBeInTheDocument()
    view.rerender(<ExperimentBench {...benchProps} currentResultNote={undefined} />)
    expect(screen.getAllByText("Assumes no friction.")).toHaveLength(1)
  })

  it("explains a disabled restore while keeping clear available", async () => {
    const benchProps = props({
      snapshot: { equationId: 1, values: { mass: 1, energy: 4 } },
      restoreDisabledReason: "Leave the guided step to restore these inputs.",
    })
    render(<ExperimentBench {...benchProps} />)
    await userEvent.click(screen.getByRole("button", { name: "Experiment bench" }))
    const restore = screen.getByRole("button", { name: "Restore inputs" })
    expect(restore).toBeDisabled()
    expect(restore).toHaveAccessibleDescription("Leave the guided step to restore these inputs.")
    expect(screen.getByText("Leave the guided step to restore these inputs.")).toBeVisible()
    await userEvent.click(restore)
    expect(benchProps.onRestore).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Clear comparison" }))
    expect(benchProps.onClear).toHaveBeenCalledOnce()
  })

  it("supports keyboard disclosure, renders its children only when open, and closes on context change", async () => {
    const benchProps = props({ children: <button>Prediction challenge</button> })
    const view = render(<ExperimentBench {...benchProps} />)
    const disclosure = screen.getByRole("button", { name: "Experiment bench" })
    expect(disclosure).toHaveAttribute("aria-expanded", "false")
    expect(disclosure).toHaveAccessibleDescription("Predict a change, then test and compare.")
    expect(screen.queryByRole("button", { name: "Prediction challenge" })).not.toBeInTheDocument()

    disclosure.focus()
    await userEvent.keyboard("{Enter}")
    expect(disclosure).toHaveAttribute("aria-expanded", "true")
    expect(document.getElementById(disclosure.getAttribute("aria-controls")!)).toContainElement(screen.getByRole("button", { name: "Capture baseline" }))
    expect(screen.getByRole("button", { name: "Prediction challenge" })).toBeVisible()

    await userEvent.keyboard(" ")
    expect(disclosure).toHaveAttribute("aria-expanded", "false")
    await userEvent.keyboard(" ")
    expect(disclosure).toHaveAttribute("aria-expanded", "true")
    view.rerender(<ExperimentBench {...benchProps} resetKey="equation-2" />)
    expect(disclosure).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("button", { name: "Capture baseline" })).not.toBeInTheDocument()
  })
})
