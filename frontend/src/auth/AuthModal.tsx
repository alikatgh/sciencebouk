import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { useAuth } from "./AuthContext"

interface AuthModalProps {
  open: boolean
  onClose: () => void
  initialMode?: 'login' | 'register'
}

export function AuthModal({ open, onClose, initialMode = 'login' }: AuthModalProps): ReactElement {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { login, register } = useAuth()

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setEmail("")
    setPassword("")
    setError("")
    setSubmitting(false)
  }, [open, initialMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password)
      onClose()
      setEmail("")
      setPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? 'Welcome back' : 'Create your account'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Input
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoFocus
          />
          <Input
            type="password" placeholder="Password (8+ characters)" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={8}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "..." : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          {mode === 'login' ? "No account? " : "Already have one? "}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError("") }}
            className="font-semibold text-ocean hover:underline" type="button"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  )
}
