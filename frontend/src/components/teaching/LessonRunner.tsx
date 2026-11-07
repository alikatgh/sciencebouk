import type { ReactElement } from "react"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { ArrowRight, CheckCircle2, RotateCcw } from "lucide-react"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { ConceptCheck } from "../scenes/ConceptCheck"
import { getConceptCheck } from "../../data/conceptChecks"
import { useSettings } from "../../settings/SettingsContext"
import { LessonMarkdown } from "./LessonMarkdown"
import type { LessonStep, Variable, GlossaryTerm } from "./types"

interface LessonRunnerProps {
  equationId: number
  steps: LessonStep[]
  currentStepIndex: number
  onAdvance: () => void
  onReset: () => void
  stepCompleted: boolean
  stepStartValues: Record<string, number>
  attemptKey: string | number
  onRetryStep: () => void
  checkPassed: boolean
  onCheckAnswer: (answerIndex: number | null) => void
  lessonFinished: boolean
  variables?: Variable[]
  onHighlight?: (name: string | null) => void
  glossary?: GlossaryTerm[]
  onTermHighlight?: (highlightClass: string | null) => void
  compact?: boolean
  phoneLayout?: boolean
  onExploreFreely?: () => void
}

function formatValue(value: number): string {
  return Number.isFinite(value) ? Number(value.toPrecision(5)).toString() : "—"
}

function valueWithUnit(value: number, variable?: Variable): string {
  return `${formatValue(value)}${variable?.unit ? ` ${variable.unit}` : ""}`
}

function valueGoals(step: LessonStep): Array<{ target: string; value: number; tolerance?: number }> {
  const condition = step.successCondition
  if (condition.type !== "value_reached") return []
  return [
    ...(condition.target && condition.value !== undefined ? [{ target: condition.target, value: condition.value, tolerance: condition.tolerance }] : []),
    ...(condition.additionalTargets ?? []),
  ]
}

function describeGoal(step: LessonStep, variables: Variable[], stepStartValues: Record<string, number>): string {
  const condition = step.successCondition
  const variable = variables.find((entry) => entry.name === condition.target)
  const label = variable?.symbol || condition.target || "the highlighted variable"

  switch (condition.type) {
    case "variable_changed": {
      const start = condition.target ? stepStartValues[condition.target] : undefined
      return start === undefined
        ? `Change ${label} and observe the visualization.`
        : `Change ${label} from ${valueWithUnit(start, variable)} and observe the visualization.`
    }
    case "value_reached": {
      const goals = valueGoals(step)
      if (goals.length === 0) return `Adjust ${label} as described above.`
      return `Set ${goals.map((goal) => {
        const goalVariable = variables.find((entry) => entry.name === goal.target)
        return `${goalVariable?.symbol || goal.target} to ${valueWithUnit(goal.value, goalVariable)} (±${valueWithUnit(goal.tolerance ?? 0.5, goalVariable)})`
      }).join(" and ")}.`
    }
    case "time_elapsed":
      return `Observe the visualization for ${formatValue((condition.duration ?? 15000) / 1000)} seconds.`
    case "clicked":
      return "Try the highlighted interaction described above."
  }
}

export function LessonRunner({
  equationId, steps, currentStepIndex, onAdvance, onReset, stepCompleted,
  stepStartValues, attemptKey, onRetryStep, checkPassed, onCheckAnswer, lessonFinished,
  variables = [], onHighlight, glossary = [], onTermHighlight,
  compact = false, phoneLayout = false, onExploreFreely,
}: LessonRunnerProps): ReactElement {
  const { settings: appSettings } = useSettings()
  const [showHint, setShowHint] = useState(false)
  const hintId = useId()
  const finishHelpId = useId()
  const finishButtonRef = useRef<HTMLButtonElement>(null)
  const previousCheckPassedRef = useRef(checkPassed)
  const step = steps[currentStepIndex]
  const isLastStep = currentStepIndex >= steps.length - 1

  const highlight = useCallback((name: string | null) => { onHighlight?.(name) }, [onHighlight])
  const termHighlight = useCallback((cls: string | null) => { onTermHighlight?.(cls) }, [onTermHighlight])

  useEffect(() => {
    setShowHint(false)
  }, [attemptKey, currentStepIndex, equationId])

  useEffect(() => {
    if (checkPassed && !previousCheckPassedRef.current) finishButtonRef.current?.focus()
    previousCheckPassedRef.current = checkPassed
  }, [checkPassed])

  if (!step) return <div />

  const goals = valueGoals(step)
  const targetNames = new Set([step.successCondition.target, ...goals.map((goal) => goal.target)])
  const targetVariables = variables.filter((variable) => targetNames.has(variable.name))
  const comparisonVariables = targetVariables.length > 0
    ? targetVariables
    : variables.filter((variable) => step.unlockedVariables.includes(variable.name))
  const comparableVariables = comparisonVariables.filter((variable) => stepStartValues[variable.name] !== undefined)
  const startsAtGoal = goals.length > 0 && goals.every((goal) => {
    const start = stepStartValues[goal.target]
    const current = variables.find((variable) => variable.name === goal.target)?.value
    return start !== undefined && current !== undefined
      && Math.abs(start - goal.value) <= (goal.tolerance ?? 0.5)
      && Math.abs(current - goal.value) <= (goal.tolerance ?? 0.5)
  })
  const markdownProps = { variables, glossary, onHighlight: highlight, onTermHighlight: termHighlight }
  const passedCheck = checkPassed ? getConceptCheck(equationId) : undefined
  const textClass = `${phoneLayout ? "text-base leading-6 [&_p]:leading-6" : "text-sm leading-relaxed"} text-slate-700 dark:text-slate-300`
  // The concept check is a separate stage; the final experiment alone does not
  // represent a finished lesson.
  const progress = lessonFinished ? 100 : ((currentStepIndex + (stepCompleted ? 1 : 0)) / (steps.length + 1)) * 100

  const handleAdvance = () => {
    if (!stepCompleted || lessonFinished || (isLastStep && !checkPassed)) return
    setShowHint(false)
    onAdvance()
  }

  return (
    <div>
      <div className={phoneLayout ? "flex min-h-11 items-center gap-2" : compact ? "mb-2.5 flex items-center gap-2" : "mb-2 flex items-center gap-2"}>
        <Progress value={progress} aria-label="Lesson progress" className="h-1 flex-1" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{currentStepIndex + 1}/{steps.length}</span>
        {currentStepIndex > 0 && !lessonFinished && (
          <Button variant="ghost" size="icon-sm" aria-label="Restart lesson" onClick={onReset} className="h-11 w-11 shrink-0 text-slate-500 dark:text-slate-400">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        {onExploreFreely && (
          <Button variant="ghost" size="sm" onClick={onExploreFreely} className="min-h-11 shrink-0 px-2 text-sm text-slate-600 dark:text-slate-300">
            Explore freely
          </Button>
        )}
      </div>

      {lessonFinished ? (
        <div className="py-2">
          <p role="status" className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-ocean" aria-hidden="true" />
            Lesson complete!
          </p>
          <LessonMarkdown content={step.insight} className={`mt-2 ${textClass}`} {...markdownProps} />
          <Button variant="outline" size="sm" aria-label="Restart lesson" onClick={onReset} className="mt-3 min-h-11 gap-1.5 px-3">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Replay
          </Button>
        </div>
      ) : (
        <>
          <LessonMarkdown content={step.instruction} className={`py-1 ${textClass}`} {...markdownProps} />

          <p role="status" aria-live="polite" className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">{stepCompleted ? "Goal reached. " : "Goal: "}</span>
            {describeGoal(step, variables, stepStartValues)}
          </p>
          {startsAtGoal && !stepCompleted && (
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">You are starting at the goal. Try another value, then return to the target to test the relationship.</p>
          )}

          {comparableVariables.length > 0 && (
            <table aria-label="Experiment values" className="mt-2 w-full border-collapse text-left text-xs tabular-nums text-slate-600 dark:text-slate-300">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400">
                  <th scope="col" className="pb-1 pr-3 font-normal">Variable</th>
                  <th scope="col" className="pb-1 pr-3 text-right font-normal">Start</th>
                  <th scope="col" className="pb-1 text-right font-normal">Now</th>
                </tr>
              </thead>
              <tbody>
                {comparableVariables.map((variable) => (
                  <tr key={variable.name}>
                    <th scope="row" className="py-1 pr-3 font-medium">{variable.symbol || variable.name}</th>
                    <td className="py-1 pr-3 text-right">{valueWithUnit(stepStartValues[variable.name], variable)}</td>
                    <td className="py-1 text-right font-medium text-slate-800 dark:text-slate-100">{valueWithUnit(variable.value, variable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-3">
            {step.hint && appSettings.showHints && (
              <Button
                variant="ghost" size="sm" aria-expanded={showHint} aria-controls={hintId}
                className="min-h-11 px-0 text-xs text-slate-600 dark:text-slate-300"
                onClick={() => setShowHint((visible) => !visible)}
              >
                {showHint ? "Hide hint" : "Show hint"}
              </Button>
            )}
            <Button
              variant="ghost" size="sm" className="min-h-11 gap-1.5 px-0 text-xs text-slate-600 dark:text-slate-300"
              onClick={() => { setShowHint(false); onRetryStep() }}
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" /> Retry this step
            </Button>
          </div>

          {showHint && step.hint && appSettings.showHints && (
            <div id={hintId} className="pb-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <LessonMarkdown content={step.hint} {...markdownProps} />
            </div>
          )}

          {stepCompleted && (
            <div className="mt-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ocean" aria-hidden="true" />
                <LessonMarkdown content={step.insight} className={textClass} {...markdownProps} />
              </div>

              {isLastStep ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Check your understanding</p>
                  {checkPassed ? (
                    <div role="group" aria-label="Concept check">
                      <p role="status" className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-200">Concept check answered correctly.</p>
                      {passedCheck && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{passedCheck.explanation}</p>
                      )}
                    </div>
                  ) : (
                    <ConceptCheck equationId={equationId} variant="lesson" resetKey={attemptKey} onAnswer={onCheckAnswer} />
                  )}
                  <p id={finishHelpId} className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {checkPassed ? "Finish when you are ready." : "Answer the concept check correctly to finish this lesson."}
                  </p>
                  <Button ref={finishButtonRef} size="sm" className="mt-2 min-h-11 px-4" onClick={handleAdvance} disabled={!checkPassed} aria-describedby={finishHelpId}>
                    Finish lesson <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="mt-3 min-h-11 px-4" onClick={handleAdvance}>
                  Next step <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
