import { useId, useMemo, useState } from "react"
import { formatResultValue } from "../../data/subjectResults"
import { Button } from "../ui/button"
import { createPredictionExperiment, predictionInputsKey } from "./predictionExperiment"
import type { PredictionDirection, PredictionExperiment } from "./predictionExperiment"
import type { ExperimentChange, ExperimentMeasurement, Variable } from "./types"

export interface PredictionChallengeProps {
  measurement: ExperimentMeasurement
  variables: Variable[]
  values: Record<string, number>
  onRun: (change: ExperimentChange) => boolean
}

const choices: Array<{ value: PredictionDirection; label: string }> = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
  { value: "same", label: "Stay the same" },
]

const observedChange: Record<PredictionDirection, string> = {
  increase: "increased",
  decrease: "decreased",
  same: "stayed the same",
}

function formattedPair(before: number, after: number, distinguish = true): [string, string] {
  const pair: [string, string] = [formatResultValue(before), formatResultValue(after)]
  return distinguish && before !== after && pair[0] === pair[1]
    ? [String(before), String(after)]
    : pair
}

function withUnit(value: string, unit?: string): string {
  return `${value}${unit ? ` ${unit}` : ""}`
}

export function PredictionChallenge({ measurement, variables, values, onRun }: PredictionChallengeProps) {
  const headingId = useId()
  const questionId = useId()
  const sourceKey = predictionInputsKey(variables, values)
  const [trialIndex, setTrialIndex] = useState(0)
  const [selection, setSelection] = useState<{ experiment: PredictionExperiment; direction: PredictionDirection } | null>(null)
  const [observation, setObservation] = useState<{ experiment: PredictionExperiment; prediction: PredictionDirection } | null>(null)
  const [rejectedRun, setRejectedRun] = useState(false)
  // The key covers actual values and editable-input metadata. Retaining the
  // object identity lets a new source invalidate an answer in the same render.
  const experiment = useMemo(
    () => createPredictionExperiment(measurement, variables, values, trialIndex),
    // Object recreation alone must not clear an otherwise current prediction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceKey, measurement.compute, measurement.symbol, measurement.unit, measurement.note, trialIndex],
  )
  const answer = selection?.experiment === experiment ? selection.direction : null
  const shown = observation?.experiment ?? experiment
  const sourceChanged = selection !== null && selection.experiment !== experiment

  function runExperiment() {
    if (!experiment || answer === null || observation) return
    const accepted = onRun({
      variableName: experiment.variableName,
      value: experiment.to,
      expectedValues: experiment.expectedValues,
    })
    if (!accepted) {
      setSelection(null)
      setRejectedRun(true)
      setTrialIndex((index) => index + 1)
      return
    }
    setObservation({ experiment, prediction: answer })
    setRejectedRun(false)
  }

  function tryAnother() {
    setObservation(null)
    setSelection(null)
    setRejectedRun(false)
    setTrialIndex((index) => index + 1)
  }

  const [from, to] = shown ? formattedPair(shown.from, shown.to) : ["", ""]
  const [before, after] = shown ? formattedPair(shown.before, shown.after, shown.direction !== "same") : ["", ""]

  return (
    <section aria-labelledby={headingId} className="min-w-0 border-t border-slate-200 pt-3 dark:border-slate-700">
      <h3 id={headingId} className="text-sm font-semibold text-slate-800 dark:text-slate-100">Predict, then test</h3>
      {!shown ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          A numeric prediction is not available for these values. Change an input or choose Explore freely to try another comparison.
        </p>
      ) : (
        <>
          <p id={questionId} className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            If <strong className="font-medium">{shown.variableSymbol}</strong> changes from {withUnit(from, shown.variableUnit)} to {withUnit(to, shown.variableUnit)},
            {" "}will <strong className="font-medium">{shown.measurement.symbol}</strong>{shown.measurement.unit ? ` (in ${shown.measurement.unit})` : ""} increase, decrease, or stay the same?
          </p>
          {shown.measurement.note && <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{shown.measurement.note}</p>}
          {observation ? (
            <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p role="status" className="font-medium text-slate-800 dark:text-slate-100">
                {observation.prediction === shown.direction ? "Your prediction matched." : "Your prediction did not match this result."}
              </p>
              <p className="break-words tabular-nums">{shown.measurement.symbol}: {withUnit(before, shown.measurement.unit)} → {withUnit(after, shown.measurement.unit)}.</p>
              <p className="text-xs leading-relaxed">The result {observedChange[shown.direction]}. You predicted “{choices.find((choice) => choice.value === observation.prediction)?.label}”.</p>
              <Button type="button" variant="outline" className="min-h-11 w-full whitespace-normal" onClick={tryAnother}>Try another prediction</Button>
              <p className="text-xs text-slate-500 dark:text-slate-400">The next prediction uses the current inputs.</p>
            </div>
          ) : (
            <>
              <div role="group" aria-labelledby={questionId} className="mt-3 grid grid-cols-3 gap-1.5">
                {choices.map((choice) => (
                  <Button key={choice.value} type="button" variant={answer === choice.value ? "secondary" : "outline"}
                    aria-pressed={answer === choice.value} className="min-h-11 whitespace-normal px-1 text-xs leading-tight"
                    onClick={() => {
                      if (!experiment) return
                      setSelection({ experiment, direction: choice.value })
                      setRejectedRun(false)
                    }}>
                    {choice.label}
                  </Button>
                ))}
              </div>
              {(rejectedRun || sourceChanged) && <p role="status" className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">Inputs changed. Make a new prediction using the current values.</p>}
              <Button type="button" disabled={answer === null} className="mt-2 min-h-11 w-full" onClick={runExperiment}>Run experiment</Button>
            </>
          )}
        </>
      )}
    </section>
  )
}
