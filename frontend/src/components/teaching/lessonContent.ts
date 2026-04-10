import type { LessonStep } from "./types"

type LessonCopyEntry = Pick<LessonStep, "instruction" | "hint" | "insight">

const lessonFiles = import.meta.glob("../../content/lessons/*.md", {
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

const lessonCopyBySlug = Object.fromEntries(
  Object.entries(lessonFiles).map(([path, markdown]) => {
    const slug = fileSlugFromPath(path)
    return [slug, parseLessonMarkdown(markdown, slug)]
  }),
) as Record<string, Record<string, LessonCopyEntry>>

export function getLessonCopy(slug: string): Record<string, LessonCopyEntry> {
  const copy = lessonCopyBySlug[slug]
  if (!copy) {
    throw new Error(`No lesson markdown found for slug "${slug}"`)
  }
  return copy
}
