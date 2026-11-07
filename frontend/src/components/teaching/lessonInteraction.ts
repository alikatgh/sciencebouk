import type { EquationVariableSource, LessonStep } from "./types"

export interface LessonAttempt {
  stepIndex: number
  stepStartValues: Record<string, number>
  learnerVariables: string[]
  stepCompleted: boolean
  checkPassed: boolean
  lessonFinished: boolean
  revision: number
}

export function createLessonAttempt(
  stepIndex: number,
  values: Record<string, number>,
  revision = 0,
): LessonAttempt {
  return {
    stepIndex,
    stepStartValues: { ...values },
    learnerVariables: [],
    stepCompleted: false,
    checkPassed: false,
    lessonFinished: false,
    revision,
  }
}

/** Evaluate an input event, never merely a value found during render/hydration. */
export function applyLessonVariableInteraction(
  attempt: LessonAttempt,
  step: LessonStep | undefined,
  name: string,
  previousValues: Record<string, number>,
  values: Record<string, number>,
  source: EquationVariableSource,
): LessonAttempt {
  if (!step || attempt.stepCompleted || attempt.lessonFinished) return attempt

  if (source === "preset" || source === "reset" || source === "restore") {
    return { ...attempt, learnerVariables: [], checkPassed: false, revision: attempt.revision + 1 }
  }
  const previous = previousValues[name]
  const value = values[name]
  if (previous === undefined || Object.is(previous, value) || !Number.isFinite(value)) return attempt

  const relevantLearner = source === "learner" && step.unlockedVariables.includes(name)
  const learnerVariables = relevantLearner && !attempt.learnerVariables.includes(name)
    ? [...attempt.learnerVariables, name]
    : attempt.learnerVariables
  // Derived outputs can satisfy a target only after an unlocked driver was
  // deliberately changed in this attempt. A scene's mount effect cannot do so.
  const purposeful = relevantLearner || (source === "system" && learnerVariables.length > 0)
  const condition = step.successCondition
  const targets = [
    { target: condition.target, value: condition.value, tolerance: condition.tolerance },
    ...(condition.additionalTargets ?? []),
  ]
  const stepCompleted = purposeful && (
    (condition.type === "variable_changed" && condition.target === name)
    || (condition.type === "value_reached"
      && targets.some((target) => target.target === name)
      && targets.every((target) => target.target !== undefined && target.value !== undefined
        && Number.isFinite(target.value) && Number.isFinite(values[target.target])
        && Math.abs(values[target.target] - target.value) <= (target.tolerance ?? 0.5)))
  )

  return learnerVariables === attempt.learnerVariables && !stepCompleted
    ? attempt
    : { ...attempt, learnerVariables, stepCompleted }
}

export function applyLessonAction(
  attempt: LessonAttempt,
  step: LessonStep | undefined,
  name: string,
): LessonAttempt {
  if (attempt.stepCompleted || attempt.lessonFinished || !name
    || step?.successCondition.type !== "clicked"
    || step.successCondition.target !== name) return attempt
  return { ...attempt, stepCompleted: true }
}
