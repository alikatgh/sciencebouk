import { useMemo } from "react"
import { useSettings } from "../settings/SettingsContext"
import { DEFAULT_LOCALE, resolveLocaleCandidates } from "../i18n/locales"
import sceneCopyJson from "./content/scene-copy.json"

type SceneCopyCollection = typeof sceneCopyJson

const localizedSceneCopyFiles = import.meta.glob("./content/scene-locales/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Partial<SceneCopyCollection>>

function localeFromPath(path: string): string {
  const match = path.match(/\/([A-Za-z0-9-]+)\.json$/)
  if (!match) {
    throw new Error(`Invalid localized scene copy path: ${path}`)
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

const localizedSceneCopyByLocale = Object.fromEntries(
  Object.entries(localizedSceneCopyFiles).map(([path, localizedContent]) => [
    localeFromPath(path),
    mergeLocalizedContent(sceneCopyJson, localizedContent),
  ]),
) as Record<string, SceneCopyCollection>

export const sceneCopyContent = sceneCopyJson

export function getSceneCopy<K extends keyof SceneCopyCollection>(
  sceneKey: K,
  locale?: string | null,
): SceneCopyCollection[K] {
  for (const candidate of resolveLocaleCandidates(locale)) {
    if (candidate === DEFAULT_LOCALE) return sceneCopyJson[sceneKey]

    const localized = localizedSceneCopyByLocale[candidate]
    if (localized) return localized[sceneKey]
  }

  return sceneCopyJson[sceneKey]
}

export function useSceneCopy<K extends keyof SceneCopyCollection>(
  sceneKey: K,
): SceneCopyCollection[K] {
  const { settings } = useSettings()
  return useMemo(() => getSceneCopy(sceneKey, settings.language), [sceneKey, settings.language])
}

export function interpolateSceneCopy(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = values[key]
    return value === undefined ? `{{${key}}}` : String(value)
  })
}
