import type { CSSProperties, ReactElement } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowRight, CheckCircle2, RotateCcw, Trophy, Sparkles } from "lucide-react"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { useSettings } from "../../settings/SettingsContext"
import { LessonMarkdown } from "./LessonMarkdown"
import type { LessonStep, Variable, GlossaryTerm } from "./types"

interface LessonRunnerProps {
  steps: LessonStep[]
  currentStepIndex: number
  onAdvance: () => void
  onReset: () => void
  stepCompleted: boolean
  variables?: Variable[]
  onHighlight?: (name: string | null) => void
  glossary?: GlossaryTerm[]
  onTermHighlight?: (highlightClass: string | null) => void
  compact?: boolean
}

const PARTICLE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"]

function CelebrationParticles(): ReactElement {
  const particles = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      size: 4 + Math.random() * 6,
      delay: Math.random() * 0.6,
      duration: 1.2 + Math.random() * 0.8,
      drift: (Math.random() - 0.5) * 60,
    }))
  ).current

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="animate-lesson-confetti absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: `${p.x}%`,
            top: "-8px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--lesson-confetti-drift" as const]: `${p.drift}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

export function LessonRunner({ steps, currentStepIndex, onAdvance, onReset, stepCompleted, variables = [], onHighlight, glossary = [], onTermHighlight, compact = false }: LessonRunnerProps): ReactElement {
  const { settings: appSettings } = useSettings()
  const [showHint, setShowHint] = useState(false)
  const [showInsight, setShowInsight] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoAdvancedRef = useRef(false)
  const onAdvanceRef = useRef(onAdvance)
  useEffect(() => { onAdvanceRef.current = onAdvance }, [onAdvance])
  const step = steps[currentStepIndex]
  const isLastStep = currentStepIndex >= steps.length - 1
  const isAllDone = isLastStep && stepCompleted

  const highlight = useCallback((name: string | null) => { onHighlight?.(name) }, [onHighlight])
  const termHighlight = useCallback((cls: string | null) => { onTermHighlight?.(cls) }, [onTermHighlight])

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    if (insightTimerRef.current) clearTimeout(insightTimerRef.current)
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current)
  }, [])

  useEffect(() => {
    setShowHint(false); setShowInsight(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    if (step?.hint && !stepCompleted) hintTimerRef.current = setTimeout(() => setShowHint(true), 10000)
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current) }
  }, [currentStepIndex, step, stepCompleted])

  useEffect(() => {
    if (insightTimerRef.current) {
      clearTimeout(insightTimerRef.current)
      insightTimerRef.current = null
    }
    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current)
      celebrationTimerRef.current = null
    }

    if (!stepCompleted) {
      autoAdvancedRef.current = false
      setShowInsight(false)
      setShowCelebration(false)
      return
    }

    setShowHint(false)
    insightTimerRef.current = setTimeout(() => {
      insightTimerRef.current = null
      setShowInsight(true)
      if (isLastStep) {
        if (!autoAdvancedRef.current) {
          autoAdvancedRef.current = true
          onAdvanceRef.current()
        }
        celebrationTimerRef.current = setTimeout(() => {
          setShowCelebration(true)
          celebrationTimerRef.current = null
        }, 400)
      }
    }, 300)

    return () => {
      if (insightTimerRef.current) {
        clearTimeout(insightTimerRef.current)
        insightTimerRef.current = null
      }
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current)
        celebrationTimerRef.current = null
      }
    }
  }, [stepCompleted, isLastStep])

  const handleAdvance = useCallback(() => {
    if (autoAdvancedRef.current) return
    // Mark as advanced so any pending auto-advance timer (300ms after stepCompleted) skips.
    autoAdvancedRef.current = true
    setShowInsight(false)
    setShowHint(false)
    onAdvance()
  }, [onAdvance])

  if (!step) return <div />

  return (
    <div>
      {/* Progress */}
      <div className={compact ? "mb-2.5 flex items-center gap-2" : "mb-2 flex items-center gap-2"}>
        <Progress value={((currentStepIndex + (stepCompleted ? 1 : 0)) / steps.length) * 100} className="h-1 flex-1" />
        <span className={`${compact ? "text-[11px]" : "text-[10px]"} font-medium text-slate-400`}>{currentStepIndex + 1}/{steps.length}</span>
        {currentStepIndex > 0 && (
          <Button variant="ghost" size="icon-sm" onClick={onReset} className={`${compact ? "h-9 w-9" : "h-5 w-5"} text-slate-400`}>
            <RotateCcw className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>

      {/* Instruction */}
      <div
        key={step.id}
        className={compact
          ? "animate-slide-in-right rounded-[18px] border border-ocean/15 bg-ocean/5 px-3.5 py-3 dark:border-ocean/20 dark:bg-ocean/10"
          : "animate-slide-in-right rounded-lg border border-ocean/15 bg-ocean/5 px-3 py-2 dark:border-ocean/20 dark:bg-ocean/10"}
      >
        <LessonMarkdown
          content={step.instruction}
          className={`${compact ? "text-[13px]" : "text-xs"} text-slate-700 dark:text-slate-300`}
          variables={variables}
          glossary={glossary}
          onHighlight={highlight}
          onTermHighlight={termHighlight}
        />
      </div>

      {/* Hint */}
      {showHint && step.hint && !stepCompleted && appSettings.showHints && (
        <div className={compact
          ? "animate-fade-in mt-1.5 rounded-[16px] bg-slate-100 px-3.5 py-2 text-xs text-slate-400 dark:bg-slate-700"
          : "animate-fade-in mt-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] text-slate-400 dark:bg-slate-700"}>
          <LessonMarkdown
            content={step.hint}
            variables={variables}
            glossary={glossary}
            onHighlight={highlight}
            onTermHighlight={termHighlight}
          />
        </div>
      )}

      {/* Insight (mid-lesson steps) */}
      {showInsight && stepCompleted && !isAllDone && (
        <div className={compact
          ? "animate-fade-in-up mt-1.5 rounded-[18px] border border-sky-200 bg-sky-50 px-3.5 py-3 dark:border-sky-700/40 dark:bg-sky-950/30"
          : "animate-fade-in-up mt-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-700/40 dark:bg-sky-950/30"}>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" />
              <div className="flex-1">
                <LessonMarkdown
                  content={step.insight}
                  className={`${compact ? "text-[13px]" : "text-xs"} text-slate-600 dark:text-slate-300`}
                  variables={variables}
                  glossary={glossary}
                  onHighlight={highlight}
                  onTermHighlight={termHighlight}
                />
                <Button size="xs" className={`${compact ? "mt-2.5 min-h-[42px] rounded-full px-4" : "mt-2"}`} onClick={handleAdvance}>
                  Next step <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
        </div>
      )}

      {/* Lesson complete celebration */}
      {showCelebration && isAllDone && (
        <div className={compact
          ? "animate-scale-in relative mt-2 overflow-hidden rounded-[22px] border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-[18px] dark:border-emerald-600/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-sky-950/30"
          : "animate-scale-in relative mt-2 overflow-hidden rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-4 dark:border-emerald-600/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-sky-950/30"}>
            <CelebrationParticles />

            <div className="relative flex flex-col items-center text-center">
              <div
                className="animate-pop-in"
                style={{ animationDelay: "150ms" }}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                  <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              <p
                className={`animate-fade-in-up ${compact ? "text-base" : "text-sm"} font-bold text-emerald-700 dark:text-emerald-300`}
                style={{ animationDelay: "250ms" }}
              >
                Lesson complete!
              </p>

              <div
                className={`animate-fade-in mt-1.5 ${compact ? "text-[13px]" : "text-xs"} leading-relaxed text-slate-600 dark:text-slate-300`}
                style={{ animationDelay: "400ms" }}
              >
                <LessonMarkdown
                  content={step.insight}
                  variables={variables}
                  glossary={glossary}
                  onHighlight={highlight}
                  onTermHighlight={termHighlight}
                />
              </div>

              <div
                className={`animate-fade-in-up mt-3 flex ${compact ? "flex-wrap justify-center" : ""} gap-2`}
                style={{ animationDelay: "550ms" }}
              >
                <Button variant="outline" size="xs" onClick={onReset} className={`${compact ? "min-h-[42px] rounded-full px-4" : ""} gap-1 text-slate-500`}>
                  <RotateCcw className="h-3 w-3" /> Replay
                </Button>
                <Button size="xs" className={`${compact ? "min-h-[42px] rounded-full px-4" : ""} gap-1 bg-emerald-600 hover:bg-emerald-700`} onClick={() => setShowCelebration(false)}>
                  <Sparkles className="h-3 w-3" /> Keep exploring
                </Button>
              </div>
            </div>
        </div>
      )}
    </div>
  )
}
