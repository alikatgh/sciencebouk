/** Vite hashed-chunk load failures after a deploy replaced the file. */

const RELOAD_KEY = "sciencebo_stale_chunk_reload"

export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "")
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(
    message,
  )
}

export function staleChunkUrl(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "")
  const match = message.match(/https?:\/\/\S+?\.js/)
  return match?.[0] ?? "1"
}

/**
 * Full-page reload once per failed module URL. React.lazy caches a rejected
 * promise, so remounting cannot recover; the new document loads the current
 * hashed graph. Returns false when this URL already triggered a reload.
 */
export function reloadOnceForStaleChunk(
  error: unknown,
  reload: () => void = () => {
    window.location.reload()
  },
  storage: Pick<Storage, "getItem" | "setItem"> | null = typeof sessionStorage === "undefined"
    ? null
    : sessionStorage,
): boolean {
  if (!isStaleChunkError(error)) return false
  const url = staleChunkUrl(error)
  try {
    if (storage?.getItem(RELOAD_KEY) === url) return false
    storage?.setItem(RELOAD_KEY, url)
  } catch {
    // Private mode: still reload; the browser cache is the usual cause.
  }
  reload()
  return true
}
