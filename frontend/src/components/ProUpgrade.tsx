import type { ReactElement } from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Check, Sparkles, Zap } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { AuthModal } from "../auth/AuthModal"
import { api } from "../api/client"
import { equationManifest } from "../data/equationManifest"
import { TopNav } from "./TopNav"

const EQUATION_COUNT = equationManifest.length

const FREE_FEATURES = [
  `All ${EQUATION_COUNT} interactive equations`,
  "Guided lessons & real-world hooks",
  "Drag-to-explore visualizations",
  "Dark mode",
]

const PRO_FEATURES = [
  "Everything in Free",
  "Progress sync across devices",
  "Personal notes & bookmarks",
  "Learning analytics dashboard",
  "Streak tracking",
  "Smart recommendations",
]

export function ProPricingPage(): ReactElement {
  const { isAuthenticated, isPro } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [yearly, setYearly] = useState(true)
  const navigate = useNavigate()

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      setShowAuth(true)
      return
    }
    setLoading(true)
    try {
      const { url } = await api.payments.checkout(yearly ? "yearly" : "monthly")
      window.location.href = url
    } catch {
      setLoading(false)
    }
  }

  if (isPro) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f7] dark:bg-slate-900">
        <div className="text-center">
          <Sparkles className="mx-auto h-12 w-12 text-ocean" />
          <h1 className="mt-4 font-display text-3xl text-slate-900 dark:text-white">You're Pro!</h1>
          <p className="mt-2 text-slate-500">You have access to all features.</p>
          <button onClick={() => navigate("/")} className="mt-6 rounded-xl bg-ocean px-6 py-2 text-sm font-semibold text-white" type="button">
            Back to equations
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#f3f5f7] dark:bg-slate-900">
      <TopNav showBack />
      <div className="flex flex-1 flex-col items-center px-4 py-8">
      <h1 className="font-display text-3xl tracking-tight text-slate-900 dark:text-white md:text-4xl">
        Go Pro
      </h1>
      <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        The equations are free forever. Pro adds personalization.
      </p>

      {/* Toggle */}
      <div className="mt-6 flex items-center gap-3 rounded-full bg-white p-1 shadow-sm dark:bg-slate-800">
        <button
          onClick={() => setYearly(false)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${!yearly ? "bg-ocean text-white" : "text-slate-500"}`}
          type="button"
        >
          Monthly
        </button>
        <button
          onClick={() => setYearly(true)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${yearly ? "bg-ocean text-white" : "text-slate-500"}`}
          type="button"
        >
          Yearly <span className="text-xs opacity-70">save 33%</span>
        </button>
      </div>

      {/* Cards */}
      <div className="mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
        {/* Free */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Free</h3>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">$0</p>
          <p className="text-sm text-slate-400">forever</p>
          <ul className="mt-4 space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => navigate("/")}
            className="mt-6 w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
            type="button"
          >
            Continue free
          </button>
        </div>

        {/* Pro */}
        <motion.div
          className="relative rounded-2xl border-2 border-ocean bg-white p-6 shadow-lg dark:bg-slate-800"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="absolute -top-3 left-4 rounded-full bg-ocean px-3 py-0.5 text-xs font-bold text-white">
            RECOMMENDED
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pro</h3>
          <p className="mt-1 text-3xl font-bold text-ocean">
            ${yearly ? "3" : "4"}<span className="text-lg">.99</span>
          </p>
          <p className="text-sm text-slate-400">per {yearly ? "month, billed yearly" : "month"}</p>
          <ul className="mt-4 space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-ocean" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-ocean py-2.5 text-sm font-bold text-white transition hover:bg-ocean/90 disabled:opacity-50"
            type="button"
          >
            {loading ? "Redirecting..." : isAuthenticated ? "Upgrade to Pro" : "Sign up & upgrade"}
          </button>
        </motion.div>
      </div>

        <button onClick={() => navigate("/")} className="mt-8 text-sm text-slate-400 hover:underline" type="button">
          Back to equations
        </button>

        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} initialMode="register" />
      </div>
    </main>
  )
}

interface SoftPromptProps {
  equationTitle: string
  completedCount: number
}

export function ConversionPrompt({ equationTitle, completedCount }: SoftPromptProps): ReactElement | null {
  const { isPro, isAuthenticated } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  if (isPro || dismissed) return null
  if (completedCount < 3) return null

  return (
    <motion.div
      className="mt-3 flex items-center gap-3 rounded-xl border border-ocean/20 bg-ocean/5 px-4 py-2.5 dark:border-ocean/30 dark:bg-ocean/10"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Sparkles className="h-4 w-4 flex-shrink-0 text-ocean" />
      <p className="flex-1 text-xs text-slate-600 dark:text-slate-300">
        Nice work on {equationTitle}! Track progress across devices with Pro.
      </p>
      <button onClick={() => navigate("/pro")} className="rounded-lg bg-ocean px-3 py-1 text-xs font-semibold text-white" type="button">
        Go Pro
      </button>
      <button onClick={() => setDismissed(true)} className="text-xs text-slate-400 hover:underline" type="button">
        Later
      </button>
    </motion.div>
  )
}
