import { useCallback, useEffect, useRef, useState } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, MoveHorizontal } from "lucide-react"
import { InlineMath } from "react-katex"
import "katex/dist/katex.min.css"
import { useAuth } from "./AuthContext"
import { sanitizeNextPath } from "./navigation"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent } from "../components/ui/card"
import { SITE_NAME, SUPPORT_EMAIL } from "../config/site"

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
  const [inviteCode, setInviteCode] = useState("")
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
        await loginWithGoogle(credential, mode === "signup" ? inviteCode : "")
        navigate(nextUrl, { replace: true })
      } catch {
        setGoogleError(mode === "signup" ? "Google sign-up failed. Check your invite code and try again." : "Google sign-in failed. Please try again.")
      }
    }
  }, [inviteCode, loginWithGoogle, mode, navigate, nextUrl])

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
    setInviteCode("")
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
          await register(email, password, inviteCode)
        }
        navigate(nextUrl, { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setSubmitting(false)
      }
    },
    [mode, email, password, confirmPassword, inviteCode, login, register, navigate, nextUrl],
  )

  if (!authLoading && isAuthenticated) {
    return <Navigate to={nextUrl} replace />
  }

  const isLogin = mode === "login"

  return (
    <main
      className="min-h-[100dvh] bg-[#f3f6fb] px-4 text-ink dark:bg-slate-950 sm:px-8"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
    >
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="inline-flex min-h-11 items-center gap-3 rounded-lg font-display text-xl font-bold tracking-tight text-ink dark:text-white">
          <ArrowLeft className="h-4 w-4 text-slate-500" /> {SITE_NAME}
        </Link>
        <div className="grid items-center gap-10 py-6 sm:py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-14">
          <section className="hidden min-w-0 lg:block" aria-label="Explore science with ScienceBouk">
            <h2 className="max-w-lg font-display text-5xl font-bold leading-[1.12] tracking-tight dark:text-white">A little curiosity.<br />A whole new understanding.</h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-slate-600 dark:text-slate-400">Move a variable. Watch what happens. Build an intuition for the equations that explain our world.</p>
            <div className="mt-9 overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">One relationship. Endless discoveries.</p>
                <MoveHorizontal className="h-5 w-5 shrink-0 text-ocean" aria-hidden="true" />
              </div>
              <svg viewBox="0 0 360 155" className="mt-6 w-full" aria-hidden="true">
                <path d="M35 125H320 M35 125V20" stroke="#d8e1ef" strokeWidth="1.5" />
                <path d="M35 125 L300 25" fill="none" stroke="#315cdd" strokeWidth="3" />
                <path d="M225 125V53" stroke="#a7badf" strokeDasharray="4 5" />
                <circle cx="225" cy="53" r="7" fill="#315cdd" stroke="white" strokeWidth="3" />
                <text x="214" y="149" fontSize="13" fill="#64748b">mass</text>
                <text x="45" y="29" fontSize="13" fill="#64748b">energy</text>
              </svg>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
                <span className="text-xl text-ocean" aria-hidden="true"><InlineMath math="E = mc^2" /></span>
                <span className="text-sm text-slate-500">Discover through doing</span>
              </div>
            </div>
            <Link to="/equation/1" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ocean hover:underline">Try an equation first <ArrowRight className="h-4 w-4" /></Link>
          </section>
          <Card className="mx-auto w-full max-w-lg rounded-3xl border-slate-200 bg-white shadow-[0_16px_50px_-25px_rgba(23,33,58,0.2)] dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-6 sm:p-9">
              <div className="mb-7">
                <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Free beta</span>
                <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink dark:text-white sm:text-3xl">{isLogin ? "Welcome back" : "Create your account"}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{isLogin ? "Sign in to pick up where your curiosity left off." : "Join with your invite code. Core access stays free."}</p>
              </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                className="min-h-12"
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
                  className="min-h-12 pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!isLogin && (
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Must be at least 8 characters</p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="inviteCode" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Invite code
                </label>
                <Input
                  id="inviteCode"
                  type="text"
                  autoComplete="one-time-code"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="SCB-XXXX-XXXX-XXXX"
                  className="min-h-12"
                />
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  We are opening accounts through invites first.
                </p>
              </div>
            )}

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
                    className="min-h-12 pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmError && (
                  <p role="alert" className="mt-1.5 text-sm font-medium text-ember">{confirmError}</p>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-ember dark:bg-red-950/30">{error}</p>
            )}

            <Button type="submit" disabled={submitting} className="min-h-[48px] w-full rounded-2xl" size="lg">
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
              <div ref={googleBtnRef} className="flex min-h-[44px] justify-center overflow-hidden rounded-2xl" />
              {googleError && (
                <p role="alert" className="mt-2 text-center text-sm font-medium text-ember">{googleError}</p>
              )}
            </>
          )}

          {isLogin && (
            <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
              Forgot your password? <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-ocean hover:underline">Contact support</a>
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
            <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <Link to="/privacy" className="hover:text-ocean hover:underline">Privacy policy</Link>
              <span aria-hidden="true" className="mx-3">/</span>
              <Link to="/terms" className="hover:text-ocean hover:underline">Terms of service</Link>
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </main>
  )
}
