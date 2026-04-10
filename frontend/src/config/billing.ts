import { billingContent } from "../data/pageContent"

export const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === "1"

export const BILLING_DISABLED_COPY = billingContent.disabledCopy
