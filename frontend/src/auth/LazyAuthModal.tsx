import type { ReactElement } from "react"
import { lazy, Suspense } from "react"
import { ErrorBoundary } from "../components/ErrorBoundary"

interface LazyAuthModalProps {
  open: boolean
  onClose: () => void
  initialMode?: "login" | "register"
}

const AuthModal = lazy(() =>
  import("./AuthModal").then((module) => ({ default: module.AuthModal })),
)

export function LazyAuthModal({
  open,
  onClose,
  initialMode,
}: LazyAuthModalProps): ReactElement | null {
  if (!open) return null

  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <AuthModal open={open} onClose={onClose} initialMode={initialMode} />
      </Suspense>
    </ErrorBoundary>
  )
}
