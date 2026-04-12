import { useMemo } from "react"
import { resolveLocaleCandidates } from "../../i18n/locales"
import { useSettings } from "../../settings/SettingsContext"
import type { LessonStep } from "./types"

type LessonCopyEntry = Pick<LessonStep, "instruction" | "hint" | "insight">

const defaultLessonFiles = import.meta.glob("../../content/lessons/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>

const localizedLessonFiles = import.meta.glob("../../content/lessons/*/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>

function fileSlugFromPath(path: string): string {
  const slug = path.match(/\/([^/]+)\.md$/)?.[1]
  if (!slug) {
    throw new Error(`Invalid lesson content path: ${path}`)
  }
  return slug
}

function localeAndSlugFromPath(path: string): { locale: string; slug: string } {
  const match = path.match(/\/([A-Za-z0-9-]+)\/([^/]+)\.md$/)
  if (!match) {
    throw new Error(`Invalid localized lesson path: ${path}`)
  }

  return {
    locale: match[1].toLowerCase(),
    slug: match[2],
  }
}

function parseLessonMarkdown(markdown: string, slug: string): Record<string, LessonCopyEntry> {
  const normalized = markdown.replace(/\r\n/g, "\n")
  const stepHeaderPattern = /^##\s+([A-Za-z0-9_-]+)\s*$/gm
  const stepHeaders = [...normalized.matchAll(stepHeaderPattern)]

  if (stepHeaders.length === 0) {
    throw new Error(`Lesson markdown "${slug}" must define at least one ## step section`)
  }

  const parsedSteps: Record<string, LessonCopyEntry> = {}

  for (let index = 0; index < stepHeaders.length; index += 1) {
    const match = stepHeaders[index]
    const stepId = match[1]?.trim()
    const bodyStart = (match.index ?? 0) + match[0].length
    const bodyEnd = stepHeaders[index + 1]?.index ?? normalized.length
    const stepBody = normalized.slice(bodyStart, bodyEnd).trim()

    if (!stepId) {
      throw new Error(`Lesson markdown "${slug}" contains an empty ## step heading`)
    }

    const fieldPattern = /^###\s+(instruction|hint|insight)\s*$/gim
    const fieldHeaders = [...stepBody.matchAll(fieldPattern)]
    if (fieldHeaders.length === 0) {
      throw new Error(`Lesson markdown "${slug}" step "${stepId}" must define ### instruction and ### insight`)
    }

    const entry: Partial<LessonCopyEntry> = {}

    for (let fieldIndex = 0; fieldIndex < fieldHeaders.length; fieldIndex += 1) {
      const fieldMatch = fieldHeaders[fieldIndex]
      const fieldName = fieldMatch[1]?.toLowerCase() as keyof LessonCopyEntry | undefined
      const contentStart = (fieldMatch.index ?? 0) + fieldMatch[0].length
      const contentEnd = fieldHeaders[fieldIndex + 1]?.index ?? stepBody.length
      const content = stepBody.slice(contentStart, contentEnd).trim()

      if (!fieldName || !content) {
        throw new Error(`Lesson markdown "${slug}" step "${stepId}" has an empty field`)
      }

      entry[fieldName] = content
    }

    if (!entry.instruction || !entry.insight) {
      throw new Error(`Lesson markdown "${slug}" step "${stepId}" is missing required copy`)
    }

    parsedSteps[stepId] = entry as LessonCopyEntry
  }

  return parsedSteps
}

function validateLessonTranslationStructure(
  baseSteps: Record<string, LessonCopyEntry>,
  translatedSteps: Record<string, LessonCopyEntry>,
  slug: string,
  locale: string,
): void {
  const baseStepIds = Object.keys(baseSteps)
  const translatedStepIds = Object.keys(translatedSteps)

  const missingStepIds = baseStepIds.filter((stepId) => !(stepId in translatedSteps))
  if (missingStepIds.length > 0) {
    throw new Error(`Lesson translation "${locale}/${slug}" is missing steps: ${missingStepIds.join(", ")}`)
  }

  const extraStepIds = translatedStepIds.filter((stepId) => !(stepId in baseSteps))
  if (extraStepIds.length > 0) {
    throw new Error(`Lesson translation "${locale}/${slug}" contains unknown steps: ${extraStepIds.join(", ")}`)
  }
}

const defaultLessonCopyBySlug = Object.fromEntries(
  Object.entries(defaultLessonFiles).map(([path, markdown]) => {
    const slug = fileSlugFromPath(path)
    return [slug, parseLessonMarkdown(markdown, slug)]
  }),
) as Record<string, Record<string, LessonCopyEntry>>

const lessonCopyByLocale = Object.entries(localizedLessonFiles).reduce<Record<string, Record<string, Record<string, LessonCopyEntry>>>>(
  (accumulator, [path, markdown]) => {
    const { locale, slug } = localeAndSlugFromPath(path)
    const translatedSteps = parseLessonMarkdown(markdown, `${locale}/${slug}`)
    const baseSteps = defaultLessonCopyBySlug[slug]

    if (!baseSteps) {
      throw new Error(`Lesson translation "${locale}/${slug}" has no English source lesson`)
    }

    validateLessonTranslationStructure(baseSteps, translatedSteps, slug, locale)

    accumulator[locale] ??= {}
    accumulator[locale][slug] = translatedSteps
    return accumulator
  },
  {},
)

export function getLessonCopy(slug: string, locale?: string | null): Record<string, LessonCopyEntry> {
  for (const candidate of resolveLocaleCandidates(locale)) {
    if (candidate === "en") {
      const englishCopy = defaultLessonCopyBySlug[slug]
      if (englishCopy) return englishCopy
      break
    }

    const localizedCopy = lessonCopyByLocale[candidate]?.[slug]
    if (localizedCopy) return localizedCopy
  }

  const fallbackCopy = defaultLessonCopyBySlug[slug]
  if (!fallbackCopy) {
    throw new Error(`No lesson markdown found for slug "${slug}"`)
  }
  return fallbackCopy
}

export function useLessonCopy(slug: string): Record<string, LessonCopyEntry> {
  const { settings } = useSettings()
  return useMemo(() => getLessonCopy(slug, settings.language), [settings.language, slug])
}
