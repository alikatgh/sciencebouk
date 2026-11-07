import { useState } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { subjectResults } from "../../data/subjectResults"
import { PredictionChallenge } from "./PredictionChallenge"
import type { ExperimentChange, Variable } from "./types"

const variables: Variable[] = [
  { name: "I", symbol: "I", latex: "I", unit: "A", value: 2, min: 0, max: 10, step: 1, color: "#315cdd" },
  { name: "R", symbol: "R", latex: "R", unit: "Ω", value: 10, min: 0, max: 20, step: 1, color: "#315cdd" },
]
const initialValues = { I: 2, R: 10 }

describe("PredictionChallenge", () => {
  it("requires an answer and an explicit run before changing any input", () => {
    const onRun = vi.fn(() => true)
    render(<PredictionChallenge measurement={subjectResults[37]} variables={variables} values={initialValues} onRun={onRun} />)
    const run = screen.getByRole("button", { name: "Run experiment" })
    expect(run).toBeDisabled()
    fireEvent.click(run)
    expect(onRun).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Increase" }))
    expect(screen.getByRole("button", { name: "Increase" })).toHaveAttribute("aria-pressed", "true")
    expect(run).toBeEnabled()
    expect(onRun).not.toHaveBeenCalled()
    fireEvent.click(run)
    expect(onRun).toHaveBeenCalledExactlyOnceWith({ variableName: "I", value: 3, expectedValues: { I: 2, R: 10 } })
    expect(screen.getByRole("status")).toHaveTextContent("Your prediction matched.")
    expect(screen.getByText("V: 20 V → 30 V.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Run experiment" })).not.toBeInTheDocument()
  })

  it("shows factual feedback after an incorrect prediction and permits another trial", () => {
    const onRun = vi.fn(() => true)
    render(<PredictionChallenge measurement={subjectResults[37]} variables={variables} values={initialValues} onRun={onRun} />)
    fireEvent.click(screen.getByRole("button", { name: "Decrease" }))
    fireEvent.click(screen.getByRole("button", { name: "Run experiment" }))
    expect(screen.getByRole("status")).toHaveTextContent("Your prediction did not match this result.")
    expect(screen.getByText("The result increased. You predicted “Decrease”.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try another prediction" }))
    expect(screen.getByRole("button", { name: "Run experiment" })).toBeDisabled()
    expect(screen.getByText(/changes from 10 Ω to 11 Ω/)).toHaveTextContent("If R changes")
    expect(onRun).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/lesson complete/i)).not.toBeInTheDocument()
  })

  it("keeps an accepted observation frozen, then starts again from current inputs", () => {
    const onRun = vi.fn(() => true)
    const view = render(<PredictionChallenge measurement={subjectResults[37]} variables={variables} values={initialValues} onRun={onRun} />)
    fireEvent.click(screen.getByRole("button", { name: "Increase" }))
    fireEvent.click(screen.getByRole("button", { name: "Run experiment" }))
    view.rerender(<PredictionChallenge measurement={subjectResults[37]} variables={variables.map((entry) => ({ ...entry, value: entry.name === "I" ? 7 : 10 }))} values={{ I: 7, R: 10 }} onRun={onRun} />)
    expect(screen.getByText("V: 20 V → 30 V.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try another prediction" }))
    fireEvent.click(screen.getByRole("button", { name: "Increase" }))
    fireEvent.click(screen.getByRole("button", { name: "Run experiment" }))
    expect(onRun).toHaveBeenLastCalledWith({ variableName: "R", value: 11, expectedValues: { I: 7, R: 10 } })
    expect(screen.getByText("V: 70 V → 77 V.")).toBeInTheDocument()
  })

  it("invalidates the answer immediately when an input changes before the run", () => {
    const onRun = vi.fn(() => true)
    const view = render(<PredictionChallenge measurement={subjectResults[37]} variables={variables} values={initialValues} onRun={onRun} />)
    fireEvent.click(screen.getByRole("button", { name: "Increase" }))
    view.rerender(<PredictionChallenge measurement={subjectResults[37]} variables={variables} values={{ I: 4, R: 10 }} onRun={onRun} />)
    expect(screen.getByRole("button", { name: "Run experiment" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Increase" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("status")).toHaveTextContent("Inputs changed")
    fireEvent.click(screen.getByRole("button", { name: "Run experiment" }))
    expect(onRun).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Increase" }))
    fireEvent.click(screen.getByRole("button", { name: "Run experiment" }))
    expect(onRun).toHaveBeenCalledExactlyOnceWith({ variableName: "I", value: 5, expectedValues: { I: 4, R: 10 } })
  })

  it("invalidates a selection when a variable becomes locked", () => {
    const onRun = vi.fn(() => true)
    const view = render(<PredictionChallenge measurement={subjectResults[37]} variables={variables} values={initialValues} onRun={onRun} />)
    fireEvent.click(screen.getByRole("button", { name: "Increase" }))
    view.rerender(<PredictionChallenge measurement={subjectResults[37]} variables={[{ ...variables[0], locked: true }, variables[1]]} values={initialValues} onRun={onRun} />)
    expect(screen.getByRole("button", { name: "Run experiment" })).toBeDisabled()
    expect(screen.getByText(/changes from 10 Ω to 11 Ω/)).toHaveTextContent("If R changes")
    fireEvent.click(screen.getByRole("button", { name: "Run experiment" }))
    expect(onRun).not.toHaveBeenCalled()
  })

  it("does not claim a rejected run happened and retries with the latest inputs", () => {
    const calls = vi.fn()
    function Harness() {
      const [values, setValues] = useState(initialValues)
      const onRun = (change: ExperimentChange) => {
        calls(change)
        if (calls.mock.calls.length === 1) {
          setValues({ I: 6, R: 10 })
          return false
        }
        return true
      }
      return <PredictionChallenge measurement={subjectResults[37]} variables={variables} values={values} onRun={onRun} />
    }
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Increase" }))
    fireEvent.click(screen.getByRole("button", { name: "Run experiment" }))
    expect(calls).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("status")).toHaveTextContent("Inputs changed")
    expect(screen.queryByText(/Your prediction matched/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Your prediction did not match/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Run experiment" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Increase" }))
    fireEvent.click(screen.getByRole("button", { name: "Run experiment" }))
    expect(calls).toHaveBeenLastCalledWith({ variableName: "R", value: 11, expectedValues: { I: 6, R: 10 } })
    expect(screen.getByText("V: 60 V → 66 V.")).toBeInTheDocument()
  })

  it("preserves a selection across harmless prop object recreation", () => {
    const onRun = vi.fn(() => true)
    const view = render(<PredictionChallenge measurement={subjectResults[37]} variables={variables} values={initialValues} onRun={onRun} />)
    fireEvent.click(screen.getByRole("button", { name: "Stay the same" }))
    view.rerender(<PredictionChallenge measurement={{ ...subjectResults[37] }} variables={variables.map((entry) => ({ ...entry }))} values={{ ...initialValues }} onRun={onRun} />)
    expect(screen.getByRole("button", { name: "Stay the same" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Run experiment" })).toBeEnabled()
  })

  it("shows assumptions and an honest unchanged outcome", () => {
    const onRun = vi.fn(() => true)
    render(<PredictionChallenge measurement={subjectResults[45]} variables={[
      { ...variables[0], name: "p", symbol: "p", unit: undefined, value: 0.25, min: 0.25, max: 0.75, step: 0.5 },
    ]} values={{ p: 0.25 }} onRun={onRun} />)
    expect(screen.getByText("heterozygote fraction")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Stay the same" }))
    fireEvent.click(screen.getByRole("button", { name: "Run experiment" }))
    expect(screen.getByRole("status")).toHaveTextContent("Your prediction matched.")
    expect(screen.getByText("2pq: 0.375 → 0.375.")).toBeInTheDocument()
    expect(screen.getByText("The result stayed the same. You predicted “Stay the same”.")).toBeInTheDocument()
  })

  it("offers no run when all inputs are locked or the current result is nonfinite", () => {
    const onRun = vi.fn(() => true)
    const view = render(<PredictionChallenge measurement={subjectResults[37]} variables={variables.map((entry) => ({ ...entry, locked: true }))} values={initialValues} onRun={onRun} />)
    expect(screen.getByText(/A numeric prediction is not available for these values/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Run experiment" })).not.toBeInTheDocument()
    view.rerender(<PredictionChallenge measurement={subjectResults[79]} variables={[{ ...variables[0], name: "s2", value: 0 }]} values={{ s1: 5, s2: 0 }} onRun={onRun} />)
    expect(screen.queryByRole("button", { name: "Run experiment" })).not.toBeInTheDocument()
    expect(onRun).not.toHaveBeenCalled()
  })
})
