import type { ReactElement } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, CheckCircle2, RotateCcw } from "lucide-react"
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

export function LessonRunner({ steps, currentStepIndex, onAdvance, onReset, stepCompleted, variables = [], onHighlight, glossary = [], onTermHighlight }: LessonRunnerProps): ReactElement {
  const { settings: appSettings } = useSettings()
  const [showHint, setShowHint] = useState(false)
  const [showInsight, setShowInsight] = useState(false)
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
    if (stepCompleted) { setShowHint(false); const t = setTimeout(() => setShowInsight(true), 300); return () => clearTimeout(t) }
    setShowInsight(false)
  }, [stepCompleted])

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

      {/* Insight */}
      <AnimatePresence>
        {showInsight && stepCompleted && (
          <motion.div
            className={`mt-1.5 rounded-lg border px-3 py-2 ${
              isAllDone ? "border-emerald-200 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-950/30" : "border-sky-200 bg-sky-50 dark:border-sky-700/40 dark:bg-sky-950/30"
            }`}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isAllDone ? "text-emerald-500" : "text-sky-500"}`} />
              <div className="flex-1">
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{renderText(step.insight)}</p>
                {!isAllDone && (
                  <Button size="xs" className="mt-2" onClick={handleAdvance}>
                    Next step <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
                {isAllDone && <p className="mt-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">You got it!</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
