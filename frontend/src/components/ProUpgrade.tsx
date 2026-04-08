import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Loader2, Sparkles, Zap, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { BILLING_DISABLED_COPY, BILLING_ENABLED } from "../config/billing"

import { api } from "../api/client"
import { equationManifest } from "../data/equationManifest"
import { safeRedirect } from "../lib/safeRedirect"
import { TopNav } from "./TopNav"
import { Footer } from "./Footer"

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
  "Learning analytics dashboard",
  "Streak tracking",
  "Smart recommendations",
]

export function ProPricingPage(): ReactElement {
  return <ProPricingPageContent mode="pricing" />
}

export function ProSuccessPage(): ReactElement {
  return <ProPricingPageContent mode="success" />
}

export function ProCancelPage(): ReactElement {
  return <ProPricingPageContent mode="cancel" />
}

function ProPricingPageContent({ mode }: { mode: "pricing" | "success" | "cancel" }): ReactElement {
  const { isAuthenticated, isPro, loading: authLoading, refreshUser } = useAuth()

  const [loading, setLoading] = useState(false)
  const [yearly, setYearly] = useState(true)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [verificationAttempt, setVerificationAttempt] = useState(0)
  const [verificationTimedOut, setVerificationTimedOut] = useState(false)
  const navigate = useNavigate()

  if (!BILLING_ENABLED) {
    return <FreeBetaPage isPro={isPro} />
  }

  // Refresh immediately and keep a bounded wait window so /pro/success
  // never spins forever when the Stripe webhook is delayed or misconfigured.
  useEffect(() => {
    if (mode !== "success") {
      setVerificationTimedOut(false)
      return
    }
    if (isPro) {
      setVerificationTimedOut(false)
      return
    }

    setVerificationTimedOut(false)
    void refreshUser()
    const followUp = setTimeout(() => {
      void refreshUser()
    }, 2000)
    const timeout = setTimeout(() => {
      void refreshUser()
      setVerificationTimedOut(true)
    }, 12000)

    return () => {
      clearTimeout(followUp)
      clearTimeout(timeout)
    }
  }, [mode, refreshUser, isPro, verificationAttempt])

  // M15: redirect unauthenticated visitors away from the success page.
  useEffect(() => {
    if (mode !== "success") return
    if (authLoading) return
    if (!isAuthenticated) navigate("/", { replace: true })
  }, [mode, authLoading, isAuthenticated, navigate])

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      navigate("/signup?next=/pro")
      return
    }
    setLoading(true)
    setCheckoutError(null)
    try {
      const { url } = await api.payments.checkout(yearly ? "yearly" : "monthly")
      safeRedirect(url)
      // safeRedirect may no-op if the URL is invalid; always clear loading so
      // the button doesn't stay stuck in "Redirecting..." state indefinitely.
    } catch {
      setCheckoutError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (mode === "success") {
    if (!isPro && !verificationTimedOut) {
      return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-ocean" />
            <p className="mt-4 text-slate-500">
              {authLoading ? "Loading your account..." : "Verifying payment..."}
            </p>
          </div>
        </main>
      )
    }

    if (!isPro) {
      return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="max-w-md text-center">
            <Loader2 className="mx-auto h-10 w-10 text-ocean" />
            <h1 className="mt-4 font-display text-3xl text-slate-900 dark:text-white">Still checking your subscription</h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Your payment may have gone through, but the confirmation has not reached us yet.
              Try checking again in a moment. If this keeps happening, the webhook may need attention.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setVerificationAttempt((attempt) => attempt + 1)}
                className="rounded-xl bg-ocean px-5 py-2 text-sm font-semibold text-white"
                type="button"
              >
                Check again
              </button>
              <button
                onClick={() => navigate("/")}
                className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                type="button"
              >
                Back to equations
              </button>
            </div>
          </div>
        </main>
      )
    }

    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 font-display text-3xl text-slate-900 dark:text-white">Payment successful!</h1>
          <p className="mt-2 text-slate-500">Your Pro subscription is now active. Welcome aboard.</p>
          <button onClick={() => navigate("/dashboard")} className="mt-6 rounded-xl bg-ocean px-6 py-2 text-sm font-semibold text-white" type="button">
            Go to Dashboard
          </button>
        </div>
      </main>
    )
  }

  if (mode === "cancel") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-slate-400" />
          <h1 className="mt-4 font-display text-3xl text-slate-900 dark:text-white">Payment cancelled</h1>
          <p className="mt-2 text-slate-500">No charge was made. You can upgrade whenever you're ready.</p>
          <button onClick={() => navigate("/pro")} className="mt-6 rounded-xl bg-ocean px-6 py-2 text-sm font-semibold text-white" type="button">
            Back to pricing
          </button>
        </div>
      </main>
    )
  }

  if (isPro) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-900">
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
    <main className="flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-900">
      <TopNav showBack />
      <div className="flex flex-1 flex-col items-center px-4 py-6 sm:py-8">
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
        <div className="relative rounded-2xl border-2 border-ocean bg-white p-6 shadow-lg dark:bg-slate-800">
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
          {checkoutError && (
            <p className="mt-2 text-center text-xs text-red-500">{checkoutError}</p>
          )}
        </div>
      </div>

        <button onClick={() => navigate("/")} className="mt-8 text-sm text-slate-400 hover:underline" type="button">
          Back to equations
        </button>

      </div>
      <Footer />
    </main>
  )
}

interface SoftPromptProps {
  equationTitle: string
  completedCount: number
}

function FreeBetaPage({ isPro }: { isPro: boolean }): ReactElement {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-900">
      <TopNav showBack />
      <div className="flex flex-1 flex-col items-center px-4 py-6 sm:py-8">
        <span className="rounded-full bg-ocean/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-ocean">
          {BILLING_DISABLED_COPY.badge}
        </span>
        <h1 className="mt-4 font-display text-center text-3xl tracking-tight text-slate-900 dark:text-white md:text-4xl">
          {isPro ? "Your Pro access stays active" : BILLING_DISABLED_COPY.headline}
        </h1>
        <p className="mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {isPro
            ? "You already have Pro access. New purchases are paused while the free beta is running."
            : BILLING_DISABLED_COPY.body}
        </p>

        <div className="mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Free beta</h3>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">$0</p>
            <p className="text-sm text-slate-400">for everyone right now</p>
            <ul className="mt-4 space-y-2">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate("/")}
              className="mt-6 w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
              type="button"
            >
              Continue exploring
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-6 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="inline-flex rounded-full bg-slate-200 px-3 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
              Paused for beta
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Pro later</h3>
            <p className="mt-1 text-3xl font-bold text-slate-400">
              ${"4"}<span className="text-lg">.99</span>
            </p>
            <p className="text-sm text-slate-400">subscriptions will return after launch</p>
            <ul className="mt-4 space-y-2">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="mt-6 w-full rounded-xl border border-slate-300 bg-white/80 py-2.5 text-sm font-bold text-slate-400 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-500"
              type="button"
            >
              {BILLING_DISABLED_COPY.button}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">{BILLING_DISABLED_COPY.detail}</p>
          </div>
        </div>

        <button onClick={() => navigate("/")} className="mt-8 text-sm text-slate-400 hover:underline" type="button">
          Back to equations
        </button>
      </div>
      <Footer />
    </main>
  )
}

export function ConversionPrompt({ equationTitle, completedCount }: SoftPromptProps): ReactElement | null {
  const { isPro } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  if (isPro || dismissed) return null
  if (!BILLING_ENABLED) return null
  if (completedCount < 3) return null

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-ocean/20 bg-ocean/5 px-4 py-2.5 dark:border-ocean/30 dark:bg-ocean/10">
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
    </div>
  )
}
