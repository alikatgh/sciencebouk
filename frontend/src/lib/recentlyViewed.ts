/**
 * Most-recently-viewed equation ids, persisted to localStorage.
 * Newest first, de-duplicated, capped — and resilient to unavailable/corrupt
 * storage (every path degrades to an empty list rather than throwing).
 */
const STORAGE_KEY = "sciencebouk-recent-equations"
const MAX_RECENT = 12

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

export function getRecentlyViewed(): number[] {
  return readIds()
}

export function pushRecentlyViewed(id: number): number[] {
  const next = [id, ...readIds().filter((value) => value !== id)].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — keep the in-memory order for the caller
  }
  return next
}

export function clearRecentlyViewed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
