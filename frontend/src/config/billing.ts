export const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === "1"

export const BILLING_DISABLED_COPY = {
  badge: "Free beta",
  headline: "Pro is coming after the beta",
  body:
    "We are validating the core learning experience first. Sync, dashboard, streaks, and billing stay built but unavailable until the beta ends.",
  button: "Pro later",
  detail: "No subscriptions yet. Everything core stays free while we test.",
} as const
