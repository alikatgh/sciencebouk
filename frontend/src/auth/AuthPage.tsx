import { useCallback, useEffect, useRef, useState } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { InlineMath } from "react-katex"
import "katex/dist/katex.min.css"
import { useAuth } from "./AuthContext"
import { sanitizeNextPath } from "./navigation"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader } from "../components/ui/card"
import { SUPPORT_EMAIL } from "../config/site"

function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""
}

interface GoogleCredentialResponse {
  credential: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (r: GoogleCredentialResponse) => void }) => void
          renderButton: (el: HTMLElement, config: object) => void
          prompt: () => void
        }
      }
    }
    __formulasGoogleInitClientId?: string
  }
}

interface AuthPageProps {
  mode: "login" | "signup"
}

export default function AuthPage({ mode }: AuthPageProps) {
  const { login, register, loginWithGoogle, isAuthenticated, loading: authLoading } = useAuth()
  const googleClientId = getGoogleClientId()
  // authLoading: only redirect if fully loaded AND already authenticated; show form while loading
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextUrl = sanitizeNextPath(searchParams.get("next"))

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")
  const [confirmError, setConfirmError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const googleCallbackRef = useRef<(response: GoogleCredentialResponse) => Promise<void>>(async () => {})
  const [googleError, setGoogleError] = useState("")

  // Load Google Identity Services script once
  useEffect(() => {
    if (!googleClientId) return
    if (document.getElementById("google-gsi")) return
    const script = document.createElement("script")
    script.id = "google-gsi"
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [googleClientId])

  useEffect(() => {
    googleCallbackRef.current = async ({ credential }: GoogleCredentialResponse) => {
      setGoogleError("")
      try {
        await loginWithGoogle(credential)
        navigate(nextUrl, { replace: true })
      } catch {
        setGoogleError("Google sign-in failed. Please try again.")
      }
    }
  }, [loginWithGoogle, navigate, nextUrl])

  // Initialise Google button whenever the script loads or mode changes
  useEffect(() => {
    if (!googleClientId) return
    const init = () => {
      if (!window.google || !googleBtnRef.current) return

      if (window.__formulasGoogleInitClientId !== googleClientId) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            void googleCallbackRef.current(response)
          },
        })
        window.__formulasGoogleInitClientId = googleClientId
      }

      googleBtnRef.current.innerHTML = ""
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: googleBtnRef.current.offsetWidth || 320,
        text: mode === "login" ? "signin_with" : "signup_with",
      })
    }

    // Script may already be loaded
    if (window.google) {
      init()
    } else {
      const script = document.getElementById("google-gsi")
      if (script) script.addEventListener("load", init)
      return () => script?.removeEventListener("load", init)
    }
  }, [googleClientId, mode])

  useEffect(() => {
    emailRef.current?.focus()
  }, [mode])

  // Clear errors when switching modes
  useEffect(() => {
    setError("")
    setConfirmError("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setShowPassword(false)
    setShowConfirm(false)
  }, [mode])

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError("")
      setConfirmError("")

      if (mode === "signup" && password !== confirmPassword) {
        setConfirmError("Passwords do not match")
        return
      }

      if (mode === "signup" && password.length < 8) {
        setConfirmError("Password must be at least 8 characters")
        return
      }

      setSubmitting(true)
      try {
        if (mode === "login") {
          await login(email, password)
        } else {
          await register(email, password)
        }
        navigate(nextUrl, { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setSubmitting(false)
      }
    },
    [mode, email, password, confirmPassword, login, register, navigate, nextUrl],
  )

  if (!authLoading && isAuthenticated) {
    return <Navigate to={nextUrl} replace />
  }

  const isLogin = mode === "login"

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center pb-2 pt-8">
          <Link to="/" className="mb-1 font-display text-2xl font-bold tracking-tight text-ink dark:text-white">
            Sciencebouk
          </Link>
          <span className="text-sm text-slate-400 dark:text-slate-500" aria-hidden="true">
            <InlineMath math="E=mc^2" />
          </span>
        </CardHeader>

        <CardContent className="px-6 pb-8 pt-4">
          <h1 className="mb-6 text-center font-body text-lg font-semibold text-ink dark:text-white">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                autoComplete={isLogin ? "username" : "email"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!isLogin && (
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Must be at least 8 characters</p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (confirmError) setConfirmError("")
                    }}
                    placeholder="Re-enter your password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmError && (
                  <p className="mt-1.5 text-xs font-medium text-ember">{confirmError}</p>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-ember dark:bg-red-950/30">{error}</p>
            )}

            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign in" : "Create account"
              )}
            </Button>
          </form>

          {googleClientId && (
            <>
              <div className="relative my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-[11px] text-slate-400 dark:text-slate-500">or</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
              <div ref={googleBtnRef} className="flex justify-center" />
              {googleError && (
                <p className="mt-2 text-center text-xs font-medium text-ember">{googleError}</p>
              )}
            </>
          )}

          {isLogin && (
            <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
              Forgot password?{" "}
              <span className="text-slate-500 dark:text-slate-400">
                Contact support at {SUPPORT_EMAIL}
              </span>
            </p>
          )}

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {isLogin ? (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  to={nextUrl === "/" ? "/signup" : `/signup?next=${encodeURIComponent(nextUrl)}`}
                  className="font-medium text-ocean hover:underline"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  to={nextUrl === "/" ? "/login" : `/login?next=${encodeURIComponent(nextUrl)}`}
                  className="font-medium text-ocean hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
