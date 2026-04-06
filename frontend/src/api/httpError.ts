export interface HttpError extends Error {
  status?: number
}

export function createHttpError(status: number, message: string): HttpError {
  const error = new Error(message) as HttpError
  error.name = "HttpError"
  error.status = status
  return error
}

export function hasHttpStatus(error: unknown, statuses: number[]): boolean {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status?: unknown }).status)
    if (statuses.includes(status)) return true
  }

  if (!(error instanceof Error)) return false

  return statuses.some((status) => {
    const pattern = new RegExp(`(?:^|\\b)(?:HTTP|API|Error)?\\s*${status}(?:\\b|:)`, "i")
    return pattern.test(error.message)
  })
}
