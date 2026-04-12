export const DEFAULT_LOCALE = "en"

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "fr", label: "FR" },
  { value: "de", label: "DE" },
  { value: "ru", label: "RU" },
] as const

export type AppLocale = (typeof LANGUAGE_OPTIONS)[number]["value"]

export function normalizeLocale(locale?: string | null): string {
  const normalized = locale?.trim().toLowerCase().replace(/_/g, "-")
  return normalized || DEFAULT_LOCALE
}

export function resolveLocaleCandidates(locale?: string | null): string[] {
  const normalized = normalizeLocale(locale)
  const base = normalized.split("-")[0] ?? DEFAULT_LOCALE

  return [...new Set([normalized, base, DEFAULT_LOCALE])]
}
