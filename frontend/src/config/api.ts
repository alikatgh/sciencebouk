import { SITE_DOMAIN } from "./site"

const LOCAL_API_BASE = "http://localhost:8000/api"

function normalizeApiBase(value: string): string {
  return value.replace(/\/$/, "")
}

function getRuntimeHostname(): string | null {
  if (typeof window === "undefined") return null
  return window.location.hostname || null
}

function isLocalHostname(hostname: string | null | undefined): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0"
}

function buildProductionFallbackApiBase(): string {
  const normalizedDomain = SITE_DOMAIN
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")

  const apiHost = normalizedDomain.startsWith("api.")
    ? normalizedDomain
    : `api.${normalizedDomain}`

  return `https://${apiHost}/api`
}

function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim() ?? ""
  const runtimeHostname = getRuntimeHostname()
  const runtimeIsLocal = isLocalHostname(runtimeHostname)

  if (!import.meta.env.PROD) {
    return normalizeApiBase(configured || LOCAL_API_BASE)
  }

  if (configured) {
    try {
      const parsed = new URL(configured)
      if (!isLocalHostname(parsed.hostname) || runtimeIsLocal) {
        return normalizeApiBase(configured)
      }

      console.warn(
        `[config] Ignoring local VITE_API_URL (${configured}) on public host ${runtimeHostname ?? "unknown"}.`,
      )
    } catch {
      return normalizeApiBase(configured)
    }
  }

  if (runtimeIsLocal) {
    return normalizeApiBase(configured || LOCAL_API_BASE)
  }

  const fallback = buildProductionFallbackApiBase()

  console.warn(
    `[config] Using production API fallback ${fallback}. Set VITE_API_URL explicitly in deployment for full control.`,
  )

  return normalizeApiBase(fallback)
}

export const API_BASE = resolveApiBase()

export const SITE_BASE = API_BASE.replace(/\/api\/?$/, "")
