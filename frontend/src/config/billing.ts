import { getPagesContent, type BillingDisabledCopy, useBillingContent } from "../data/pageContent"

export const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === "1"

export const BILLING_DISABLED_COPY = getPagesContent().billing.disabledCopy

export function getBillingDisabledCopy(locale?: string | null): BillingDisabledCopy {
  return getPagesContent(locale).billing.disabledCopy
}

export function useBillingDisabledCopy(): BillingDisabledCopy {
  return useBillingContent().disabledCopy
}
