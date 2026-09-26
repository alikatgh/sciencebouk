import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Loader2, Sparkles, Zap, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { BILLING_ENABLED, useBillingDisabledCopy } from "../config/billing"
import { api } from "../api/client"
import { interpolateContent, useProUpgradeContent } from "../data/pageContent"
import { safeRedirect } from "../lib/safeRedirect"
import { PageFrame } from "./PageFrame"

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
  const proUpgradeContent = useProUpgradeContent()
  const FREE_FEATURES = proUpgradeContent.freeFeatures
  const PRO_FEATURES = proUpgradeContent.proFeatures
  const { isAuthenticated, isPro, loading: authLoading, refreshUser } = useAuth()

  const [loading, setLoading] = useState(false)
  const [yearly, setYearly] = useState(true)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [verificationAttempt, setVerificationAttempt] = useState(0)
  const [verificationTimedOut, setVerificationTimedOut] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!BILLING_ENABLED || mode !== "success") {
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

  useEffect(() => {
    if (!BILLING_ENABLED || mode !== "success") return
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
    } catch {
      setCheckoutError(proUpgradeContent.pricing.checkoutError)
    } finally {
      setLoading(false)
    }
  }

  if (!BILLING_ENABLED) {
    return <FreeBetaPage isPro={isPro} />
  }

  if (mode === "success") {
    if (!isPro && !verificationTimedOut) {
      return (
        <PageFrame className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-ocean" />
            <p className="mt-4 text-slate-500">
              {authLoading
                ? proUpgradeContent.states.verifying.loadingAuth
                : proUpgradeContent.states.verifying.checkingPayment}
            </p>
          </div>
        </PageFrame>
      )
    }

    if (!isPro) {
      return (
        <PageFrame className="flex items-center justify-center">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800">
            <Loader2 className="mx-auto h-10 w-10 text-ocean" />
            <h1 className="mt-4 font-display text-3xl text-slate-900 dark:text-white">
              {proUpgradeContent.states.delayed.title}
            </h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {proUpgradeContent.states.delayed.body}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setVerificationAttempt((attempt) => attempt + 1)}
                className="min-h-11 rounded-xl bg-ocean px-5 py-2.5 text-sm font-semibold text-white"
                type="button"
              >
                {proUpgradeContent.states.delayed.checkAgain}
              </button>
              <button
                onClick={() => navigate("/")}
                className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                type="button"
              >
                {proUpgradeContent.states.delayed.backToEquations}
              </button>
            </div>
          </div>
        </PageFrame>
      )
    }

    return (
      <PageFrame className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 font-display text-3xl text-slate-900 dark:text-white">
            {proUpgradeContent.states.success.title}
          </h1>
          <p className="mt-2 text-slate-500">{proUpgradeContent.states.success.body}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 min-h-11 rounded-xl bg-ocean px-6 py-2.5 text-sm font-semibold text-white"
            type="button"
          >
            {proUpgradeContent.states.success.button}
          </button>
        </div>
      </PageFrame>
    )
  }

  if (mode === "cancel") {
    return (
      <PageFrame className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800">
          <XCircle className="mx-auto h-12 w-12 text-slate-400" />
          <h1 className="mt-4 font-display text-3xl text-slate-900 dark:text-white">
            {proUpgradeContent.states.cancel.title}
          </h1>
          <p className="mt-2 text-slate-500">{proUpgradeContent.states.cancel.body}</p>
          <button
            onClick={() => navigate("/pro")}
            className="mt-6 min-h-11 rounded-xl bg-ocean px-6 py-2.5 text-sm font-semibold text-white"
            type="button"
          >
            {proUpgradeContent.states.cancel.button}
          </button>
        </div>
      </PageFrame>
    )
  }

  if (isPro) {
    return (
      <PageFrame className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800">
          <Sparkles className="mx-auto h-12 w-12 text-ocean" />
          <h1 className="mt-4 font-display text-3xl text-slate-900 dark:text-white">
            {proUpgradeContent.states.currentPro.title}
          </h1>
          <p className="mt-2 text-slate-500">{proUpgradeContent.states.currentPro.body}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 min-h-11 rounded-xl bg-ocean px-6 py-2.5 text-sm font-semibold text-white"
            type="button"
          >
            {proUpgradeContent.states.currentPro.button}
          </button>
        </div>
      </PageFrame>
    )
  }

  return (
    <PageFrame title={proUpgradeContent.pricing.title} description={proUpgradeContent.pricing.subtitle}>
      <div className="mx-auto flex max-w-4xl flex-col items-center">
        <div className="mt-6 flex w-full max-w-md items-center gap-2 rounded-full bg-white p-1 shadow-sm dark:bg-slate-800">
          <button
            onClick={() => setYearly(false)}
            aria-pressed={!yearly}
            className={`min-h-[44px] flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition ${!yearly ? "bg-ocean text-white" : "text-slate-500"}`}
            type="button"
          >
            {proUpgradeContent.pricing.monthlyLabel}
          </button>
          <button
            onClick={() => setYearly(true)}
            aria-pressed={yearly}
            className={`min-h-[44px] flex-1 rounded-full px-4 py-1.5 text-sm font-semibold transition ${yearly ? "bg-ocean text-white" : "text-slate-500"}`}
            type="button"
          >
            {proUpgradeContent.pricing.yearlyLabel} <span className="text-xs opacity-70">{proUpgradeContent.pricing.yearlySaveLabel}</span>
          </button>
        </div>

        <div className="mt-8 grid w-full gap-6 md:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900 sm:p-8">
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">{proUpgradeContent.pricing.freeCard.title}</h3>
            <p className="mt-4 font-display text-4xl font-bold text-slate-900 dark:text-white">{proUpgradeContent.pricing.freeCard.price}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{proUpgradeContent.pricing.freeCard.priceNote}</p>
            <ul className="mt-6 space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate("/")}
              className="mt-6 min-h-[46px] w-full rounded-2xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
              type="button"
            >
              {proUpgradeContent.pricing.freeCard.button}
            </button>
          </div>

          <div className="relative min-w-0 rounded-2xl border-2 border-ocean bg-white p-6 dark:bg-slate-900 sm:p-8">
            <div className="absolute -top-3 left-4 rounded-full bg-ocean px-3 py-0.5 text-xs font-bold text-white">
              {proUpgradeContent.pricing.proCard.recommendedBadge}
            </div>
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">{proUpgradeContent.pricing.proCard.title}</h3>
            <p className="mt-4 font-display text-4xl font-bold text-ocean">
              $
              {yearly
                ? proUpgradeContent.pricing.proCard.priceWholeYearly
                : proUpgradeContent.pricing.proCard.priceWholeMonthly}
              <span className="text-lg">{proUpgradeContent.pricing.proCard.priceFraction}</span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {yearly
                ? proUpgradeContent.pricing.proCard.priceNoteYearly
                : proUpgradeContent.pricing.proCard.priceNoteMonthly}
            </p>
            <ul className="mt-6 space-y-3">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-ocean" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-6 min-h-[48px] w-full rounded-2xl bg-ocean py-2.5 text-sm font-bold text-white transition hover:bg-ocean/90 disabled:opacity-50"
              type="button"
            >
              {loading
                ? "Redirecting..."
                : isAuthenticated
                ? proUpgradeContent.pricing.proCard.ctaAuthenticated
                : proUpgradeContent.pricing.proCard.ctaGuest}
            </button>
            {checkoutError && (
              <p role="alert" className="mt-3 text-center text-sm text-red-600">{checkoutError}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-8 rounded-full px-4 py-2 text-sm text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          type="button"
        >
          {proUpgradeContent.pricing.proCard.backToEquations}
        </button>
      </div>
    </PageFrame>
  )
}

interface SoftPromptProps {
  equationTitle: string
  completedCount: number
}

function FreeBetaPage({ isPro }: { isPro: boolean }): ReactElement {
  const billingDisabledCopy = useBillingDisabledCopy()
  const proUpgradeContent = useProUpgradeContent()
  const FREE_FEATURES = proUpgradeContent.freeFeatures
  const PRO_FEATURES = proUpgradeContent.proFeatures
  const navigate = useNavigate()

  return (
    <PageFrame title={isPro ? proUpgradeContent.states.beta.titleForPro : billingDisabledCopy.headline} description={isPro ? proUpgradeContent.states.beta.bodyForPro : billingDisabledCopy.body}>
      <div className="mx-auto flex max-w-4xl flex-col items-center">
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300"><CheckCircle className="h-4 w-4" />{billingDisabledCopy.badge}</span>
          <p className="text-sm leading-6 text-emerald-800/80 dark:text-emerald-300/80">{billingDisabledCopy.detail}</p>
        </div>

        <div className="mt-8 grid w-full gap-6 md:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900 sm:p-8">
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">{proUpgradeContent.states.beta.freeCardTitle}</h3>
            <p className="mt-4 font-display text-4xl font-bold text-slate-900 dark:text-white">{proUpgradeContent.states.beta.freeCardPrice}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{proUpgradeContent.states.beta.freeCardPriceNote}</p>
            <ul className="mt-6 space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate("/")}
              className="mt-6 min-h-[46px] w-full rounded-2xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
              type="button"
            >
              {proUpgradeContent.states.beta.freeCardButton}
            </button>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-6 dark:border-slate-700 dark:bg-slate-900/70 sm:p-8">
            <div className="inline-flex rounded-full bg-slate-200 px-3 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
              {proUpgradeContent.states.beta.proPausedBadge}
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{proUpgradeContent.states.beta.proCardTitle}</h3>
            <p className="mt-4 font-display text-4xl font-bold text-slate-400">
              ${proUpgradeContent.states.beta.proCardPriceWhole}
              <span className="text-lg">{proUpgradeContent.states.beta.proCardPriceFraction}</span>
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{proUpgradeContent.states.beta.proCardPriceNote}</p>
            <ul className="mt-6 space-y-3">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="mt-6 min-h-[48px] w-full rounded-2xl border border-slate-300 bg-white/80 py-2.5 text-sm font-bold text-slate-400 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-500"
              type="button"
            >
              {billingDisabledCopy.button}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">{billingDisabledCopy.detail}</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-8 rounded-full px-4 py-2 text-sm text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          type="button"
        >
          {proUpgradeContent.states.beta.backToEquations}
        </button>
      </div>
    </PageFrame>
  )
}

export function ConversionPrompt({ equationTitle, completedCount }: SoftPromptProps): ReactElement | null {
  const proUpgradeContent = useProUpgradeContent()
  const { isPro } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  if (isPro || dismissed) return null
  if (!BILLING_ENABLED) return null
  if (completedCount < 3) return null

  return (
    <div className="mt-3 flex flex-col items-stretch gap-3 rounded-[22px] border border-ocean/20 bg-ocean/5 px-4 py-3 dark:border-ocean/30 dark:bg-ocean/10 sm:flex-row sm:items-center sm:rounded-xl sm:py-2.5">
      <Sparkles className="h-4 w-4 flex-shrink-0 text-ocean" />
      <p className="flex-1 text-xs text-slate-600 dark:text-slate-300">
        {interpolateContent(proUpgradeContent.states.conversionPrompt.bodyTemplate, { equationTitle })}
      </p>
      <button onClick={() => navigate("/pro")} className="min-h-[40px] rounded-full bg-ocean px-4 py-2 text-xs font-semibold text-white sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-1" type="button">
        {proUpgradeContent.states.conversionPrompt.cta}
      </button>
      <button onClick={() => setDismissed(true)} className="rounded-full px-3 py-2 text-xs text-slate-400 transition hover:bg-white/60 hover:text-slate-600 dark:hover:bg-slate-800/60 dark:hover:text-slate-300 sm:rounded-none sm:px-0 sm:py-0 sm:hover:bg-transparent" type="button">
        {proUpgradeContent.states.conversionPrompt.dismiss}
      </button>
    </div>
  )
}
