export function sanitizeNextPath(rawPath: string | null | undefined): string {
  if (!rawPath) return "/"
  if (!rawPath.startsWith("/") || rawPath.startsWith("//")) return "/"

  try {
    const parsed = new URL(rawPath, "http://sciencebouk.local")
    if (parsed.origin !== "http://sciencebouk.local") return "/"
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/"
  } catch {
    return "/"
  }
}
