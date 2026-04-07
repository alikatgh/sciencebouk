if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  throw new Error(
    "[config] VITE_API_URL is not set. Add it to your .env.production or build environment. " +
    "Example: VITE_API_URL=https://scienbo.uk/api"
  )
}

export const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(/\/$/, "")

export const SITE_BASE = API_BASE.replace(/\/api\/?$/, "")
