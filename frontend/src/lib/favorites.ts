/**
 * Favourite (bookmarked) equation ids, persisted to localStorage.
 * Resilient to unavailable/corrupt storage; preserves insertion order.
 */
const STORAGE_KEY = "sciencebouk-favorite-equations"

function readIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value): value is number => typeof value === "number") : []
  } catch {
    return []
  }
}

function writeIds(ids: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore unavailable storage
  }
}

export function getFavorites(): number[] {
  return readIds()
}

export function isFavorite(id: number): boolean {
  return readIds().includes(id)
}

export function toggleFavorite(id: number): number[] {
  const current = readIds()
  const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
  writeIds(next)
  return next
}
