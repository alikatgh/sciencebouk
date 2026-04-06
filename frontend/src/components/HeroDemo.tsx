import type { ReactElement } from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useDocumentVisibility } from "../hooks/useDocumentVisibility"

// Only exact Pythagorean triples — c must be a whole number. No approximations on a math product.
const PRESETS = [
  { a: 3, b: 4 },   // c = 5
  { a: 5, b: 12 },  // c = 13
  { a: 8, b: 6 },   // c = 10
  { a: 9, b: 12 },  // c = 15
  { a: 20, b: 21 }, // c = 29
]

export function HeroDemo(): ReactElement {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isVisible = useDocumentVisibility()

  const { a, b } = PRESETS[idx]
  const c = Math.round(Math.sqrt(a * a + b * b))  // always exact for our triples
  const a2 = a * a
  const b2 = b * b
  const c2 = c * c

  // Auto-cycle every 3s unless paused
  useEffect(() => {
    if (paused || !isVisible) return
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % PRESETS.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [isVisible, paused])

  useEffect(() => () => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
    }
  }, [])

  const handleClick = useCallback(() => {
    setPaused(true)
    setIdx((prev) => (prev + 1) % PRESETS.length)
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
    }
    resumeTimeoutRef.current = setTimeout(() => {
      setPaused(false)
      resumeTimeoutRef.current = null
    }, 8000)
  }, [])

  // Square sizes proportional to area (sqrt for visual), scaled to fit container
  const maxArea = 50
  const rawA = Math.max(20, Math.sqrt(a2 / maxArea) * 52)
  const rawB = Math.max(20, Math.sqrt(b2 / maxArea) * 52)
  const rawC = Math.max(20, Math.sqrt(c2 / maxArea) * 52)
  const maxTotal = 140 // fits inside w-56 (224px) minus padding and operators
  const scale = Math.min(1, maxTotal / (rawA + rawB + rawC))
  const sqA = rawA * scale
  const sqB = rawB * scale
  const sqC = rawC * scale

  return (
    <div
      className="w-56 cursor-pointer select-none overflow-hidden rounded-2xl bg-white/10 px-5 py-5 backdrop-blur transition hover:bg-white/[0.14]"
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleClick()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Click to cycle through examples"
    >
      {/* Letter formula — static */}
      <p className="text-center text-xs text-slate-500">a² + b² = c²</p>

      {/* Live numbers — animated */}
      <div className="mt-3 flex items-baseline justify-center gap-0.5 text-center text-2xl font-bold tracking-wide">
        <AnimatedNumber value={a} color="text-blue-400" />
        <span className="text-sm text-slate-500">²</span>
        <span className="mx-1.5 text-sm text-slate-500">+</span>
        <AnimatedNumber value={b} color="text-amber-400" />
        <span className="text-sm text-slate-500">²</span>
        <span className="mx-1.5 text-sm text-slate-500">=</span>
        <AnimatedNumber value={parseFloat(c.toFixed(1))} color="text-red-400" />
        <span className="text-sm text-slate-500">²</span>
      </div>

      {/* Result line — animated */}
      <motion.p
        key={`${a2}-${b2}`}
        className="mt-2 text-center text-sm font-semibold text-emerald-400"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {a2} + {b2} = {c2} ✓
      </motion.p>

      {/* Visual squares — animate size */}
      <div className="mt-4 flex items-end justify-center gap-2">
        <SquareBlock size={sqA} value={a2} label="a²" color="blue" />
        <span className="mb-3 text-[10px] text-slate-500">+</span>
        <SquareBlock size={sqB} value={b2} label="b²" color="amber" />
        <span className="mb-3 text-[10px] text-slate-500">=</span>
        <SquareBlock size={sqC} value={c2} label="c²" color="red" />
      </div>

      {/* Cycle indicator dots */}
      <div
        className="mt-3 flex justify-center gap-1.5"
        aria-live="polite"
        aria-label={`Example ${idx + 1} of ${PRESETS.length}: ${a}² + ${b}² = ${c}²`}
      >
        {PRESETS.map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={`h-1 rounded-full transition-all duration-500 ${
              i === idx ? "w-4 bg-ocean" : "w-1 bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function AnimatedNumber({ value, color }: { value: number; color: string }): ReactElement {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        className={color}
        initial={{ opacity: 0, y: -12, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.8 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {Number.isInteger(value) ? value : value.toFixed(1)}
      </motion.span>
    </AnimatePresence>
  )
}

function SquareBlock({ size, value, label, color }: {
  size: number; value: number; label: string; color: "blue" | "amber" | "red"
}): ReactElement {
  const colors = {
    blue: { bg: "bg-blue-400/20", border: "border-blue-400/40", text: "text-blue-400" },
    amber: { bg: "bg-amber-400/20", border: "border-amber-400/40", text: "text-amber-400" },
    red: { bg: "bg-red-400/20", border: "border-red-400/40", text: "text-red-400" },
  }
  const c = colors[color]

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        className={`rounded ${c.bg} border ${c.border}`}
        animate={{ width: size, height: size }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      />
      <motion.span
        key={value}
        className={`text-[9px] font-medium ${c.text}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {label} = {Number.isInteger(value) ? value : value.toFixed(1)}
      </motion.span>
    </div>
  )
}
