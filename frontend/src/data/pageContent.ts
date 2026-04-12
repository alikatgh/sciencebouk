import { useMemo } from "react"
import { useSettings } from "../settings/SettingsContext"
import { DEFAULT_LOCALE, resolveLocaleCandidates } from "../i18n/locales"
import pagesJson from "./content/pages.json"

type PagesContent = typeof pagesJson

const localizedPageFiles = import.meta.glob("./content/locales/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Partial<PagesContent>>

function localeFromPath(path: string): string {
  const match = path.match(/\/([A-Za-z0-9-]+)\.json$/)
  if (!match) {
    throw new Error(`Invalid localized content path: ${path}`)
  }

  return match[1].toLowerCase()
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mergeLocalizedContent<T>(fallback: T, localized: unknown): T {
  if (localized === undefined) return fallback

  if (Array.isArray(fallback)) {
    return (Array.isArray(localized) ? localized : fallback) as T
  }

  if (isPlainObject(fallback)) {
    if (!isPlainObject(localized)) return fallback

    const merged: Record<string, unknown> = { ...fallback }
    for (const [key, fallbackValue] of Object.entries(fallback)) {
      merged[key] = mergeLocalizedContent(fallbackValue, localized[key])
    }
    for (const [key, value] of Object.entries(localized)) {
      if (!(key in merged)) {
        merged[key] = value
      }
    }
    return merged as T
  }

  return localized as T
}

const localizedPagesByLocale = Object.fromEntries(
  Object.entries(localizedPageFiles).map(([path, localizedContent]) => [
    localeFromPath(path),
    mergeLocalizedContent(pagesJson, localizedContent),
  ]),
) as Record<string, PagesContent>

export const pagesContent = pagesJson
export const billingContent = pagesContent.billing
export const footerContent = pagesContent.footer
export const legalPageContent = pagesContent.legal
export const homePageContent = pagesContent.home
export const aboutPageContent = pagesContent.about
export const helpCenterContent = pagesContent.helpCenter
export const proUpgradeContent = pagesContent.proUpgrade
export const dashboardPageContent = pagesContent.dashboard
export const profilePageContent = pagesContent.profile
export const changelogContent = pagesContent.changelog

export type BillingDisabledCopy = typeof pagesJson.billing.disabledCopy
export type AboutComingSoonItem = typeof pagesJson.about.comingSoonItems[number]
export type ChangelogRelease = typeof pagesJson.changelog.releases[number]
export type ChangelogGeneralChangeType = ChangelogRelease["general"][number]["type"]
export type ChangelogEngineeringChangeType = ChangelogRelease["engineering"][number]["type"]

export function getPagesContent(locale?: string | null): PagesContent {
  for (const candidate of resolveLocaleCandidates(locale)) {
    if (candidate === DEFAULT_LOCALE) return pagesJson

    const localized = localizedPagesByLocale[candidate]
    if (localized) return localized
  }

  return pagesJson
}

export function usePagesContent(): PagesContent {
  const { settings } = useSettings()
  return useMemo(() => getPagesContent(settings.language), [settings.language])
}

export function useBillingContent(): PagesContent["billing"] {
  return usePagesContent().billing
}

export function useFooterContent(): PagesContent["footer"] {
  return usePagesContent().footer
}

export function useLegalPageContent(): PagesContent["legal"] {
  return usePagesContent().legal
}

export function useHomePageContent(): PagesContent["home"] {
  return usePagesContent().home
}

export function useAboutPageContent(): PagesContent["about"] {
  return usePagesContent().about
}

export function useHelpCenterContent(): PagesContent["helpCenter"] {
  return usePagesContent().helpCenter
}

export function useProUpgradeContent(): PagesContent["proUpgrade"] {
  return usePagesContent().proUpgrade
}

export function useDashboardPageContent(): PagesContent["dashboard"] {
  return usePagesContent().dashboard
}

export function useProfilePageContent(): PagesContent["profile"] {
  return usePagesContent().profile
}

export function useChangelogContent(): PagesContent["changelog"] {
  return usePagesContent().changelog
}

export function interpolateContent(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}
