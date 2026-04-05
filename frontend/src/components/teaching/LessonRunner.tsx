import type { ReactElement } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, CheckCircle2, RotateCcw, Trophy, Sparkles, ArrowRightCircle } from "lucide-react"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { useSettings } from "../../settings/SettingsContext"
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
}

function linkTerms(
  text: string,
  variables: Variable[],
  glossary: GlossaryTerm[],
  onHighlight: (name: string | null) => void,
  onTermHighlight: (cls: string | null) => void,
): ReactElement {
  // Build all matchable tokens: glossary words + multi-char variable symbols
  const allTokens: Array<{ word: string; type: 'var' | 'term'; varRef?: Variable; termRef?: GlossaryTerm }> = []

  // Glossary terms (multi-word phrases like "hypotenuse", "bell curve", "force arrow")
  for (const term of glossary) {
    for (const w of term.words) {
      allTokens.push({ word: w, type: 'term', termRef: term })
    }
  }

  // Multi-char variable symbols
  const safeVars = variables.filter((v) => v.symbol.length > 1 || v.name.length > 1)
  for (const v of safeVars) {
    if (v.symbol.length > 1) allTokens.push({ word: v.symbol, type: 'var', varRef: v })
    if (v.name.length > 1 && v.name !== v.symbol) allTokens.push({ word: v.name, type: 'var', varRef: v })
  }

  if (allTokens.length === 0) return <>{text}</>

  // Sort longest first to match "force arrow" before "force"
  allTokens.sort((a, b) => b.word.length - a.word.length)

  const escaped = allTokens.map((t) => t.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi")
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) => {
        const lower = part.toLowerCase()
        const token = allTokens.find((t) => t.word.toLowerCase() === lower)
        if (!token) return <span key={i}>{part}</span>

        if (token.type === 'var' && token.varRef) {
          return (
            <span key={i} className="cursor-pointer rounded px-0.5 font-bold transition hover:ring-1 hover:ring-current"
              style={{ color: token.varRef.color }}
              onMouseEnter={() => onHighlight(token.varRef!.name)}
              onMouseLeave={() => onHighlight(null)}
            >{part}</span>
          )
        }

        if (token.type === 'term' && token.termRef) {
          return (
            <span key={i}
              className="cursor-pointer border-b border-dashed border-current font-medium transition hover:bg-slate-100 dark:hover:bg-slate-700"
              style={{ color: token.termRef.color }}
              title={token.termRef.tooltip}
              onMouseEnter={() => onTermHighlight(token.termRef!.highlightClass)}
              onMouseLeave={() => onTermHighlight(null)}
            >{part}</span>
          )
        }

        return <span key={i}>{part}</span>
      })}
    </>
  )
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
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: `${p.x}%`,
            top: "-8px",
          }}
          initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          animate={{
            opacity: [1, 1, 0],
            y: [0, 80, 160],
            x: [0, p.drift * 0.5, p.drift],
            scale: [1, 1.2, 0.6],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  )
}

export function LessonRunner({ steps, currentStepIndex, onAdvance, onReset, stepCompleted, variables = [], onHighlight, glossary = [], onTermHighlight }: LessonRunnerProps): ReactElement {
  const { settings: appSettings } = useSettings()
  const [showHint, setShowHint] = useState(false)
  const [showInsight, setShowInsight] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const step = steps[currentStepIndex]
  const isLastStep = currentStepIndex >= steps.length - 1
  const isAllDone = isLastStep && stepCompleted

  const highlight = useCallback((name: string | null) => { onHighlight?.(name) }, [onHighlight])
  const termHighlight = useCallback((cls: string | null) => { onTermHighlight?.(cls) }, [onTermHighlight])
  const renderText = useCallback((text: string) => {
    return linkTerms(text, variables, glossary, highlight, termHighlight)
  }, [variables, glossary, highlight, termHighlight])

  useEffect(() => {
    setShowHint(false); setShowInsight(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    if (step?.hint && !stepCompleted) hintTimerRef.current = setTimeout(() => setShowHint(true), 10000)
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current) }
  }, [currentStepIndex, step, stepCompleted])

  useEffect(() => {
    if (stepCompleted) {
      setShowHint(false)
      const t = setTimeout(() => {
        setShowInsight(true)
        if (isLastStep) {
          setTimeout(() => setShowCelebration(true), 400)
        }
      }, 300)
      return () => clearTimeout(t)
    }
    setShowInsight(false)
    setShowCelebration(false)
  }, [stepCompleted, isLastStep])

  const handleAdvance = useCallback(() => { setShowInsight(false); setShowHint(false); onAdvance() }, [onAdvance])

  if (!step) return <div />

  return (
    <div>
      {/* Progress */}
      <div className="mb-2 flex items-center gap-2">
        <Progress value={((currentStepIndex + (stepCompleted ? 1 : 0)) / steps.length) * 100} className="h-1 flex-1" />
        <span className="text-[10px] font-medium text-slate-400">{currentStepIndex + 1}/{steps.length}</span>
        {currentStepIndex > 0 && (
          <Button variant="ghost" size="icon-sm" onClick={onReset} className="h-5 w-5 text-slate-400">
            <RotateCcw className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>

      {/* Instruction */}
      <AnimatePresence mode="wait">
        <motion.div key={step.id}
          className="rounded-lg border border-ocean/15 bg-ocean/5 px-3 py-2 dark:border-ocean/20 dark:bg-ocean/10"
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{renderText(step.instruction)}</p>
        </motion.div>
      </AnimatePresence>

      {/* Hint */}
      <AnimatePresence>
        {showHint && step.hint && !stepCompleted && appSettings.showHints && (
          <motion.p className="mt-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] text-slate-400 dark:bg-slate-700"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >{renderText(step.hint)}</motion.p>
        )}
      </AnimatePresence>

      {/* Insight (mid-lesson steps) */}
      <AnimatePresence>
        {showInsight && stepCompleted && !isAllDone && (
          <motion.div
            className="mt-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-700/40 dark:bg-sky-950/30"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" />
              <div className="flex-1">
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{renderText(step.insight)}</p>
                <Button size="xs" className="mt-2" onClick={handleAdvance}>
                  Next step <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lesson complete celebration */}
      <AnimatePresence>
        {showCelebration && isAllDone && (
          <motion.div
            className="relative mt-2 overflow-hidden rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-4 dark:border-emerald-600/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-sky-950/30"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <CelebrationParticles />

            <div className="relative flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.15 }}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                  <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </motion.div>

              <motion.p
                className="text-sm font-bold text-emerald-700 dark:text-emerald-300"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                Lesson complete!
              </motion.p>

              <motion.p
                className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {renderText(step.insight)}
              </motion.p>

              <motion.div
                className="mt-3 flex gap-2"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <Button variant="outline" size="xs" onClick={onReset} className="gap-1 text-slate-500">
                  <RotateCcw className="h-3 w-3" /> Replay
                </Button>
                <Button size="xs" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCelebration(false)}>
                  <Sparkles className="h-3 w-3" /> Keep exploring
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
