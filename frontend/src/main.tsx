import React, { Suspense, lazy } from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider, useAuth } from "./auth/AuthContext"
import { SettingsProvider } from "./settings/SettingsContext"
import { ErrorBoundary } from "./components/ErrorBoundary"
import "./index.css"

const App = lazy(() => import("./App"))
const HomePage = lazy(() => import("./components/HomePage").then((module) => ({ default: module.HomePage })))
const ProPricingPage = lazy(() => import("./components/ProUpgrade").then((module) => ({ default: module.ProPricingPage })))
const Dashboard = lazy(() => import("./components/Dashboard"))
const ProfilePage = lazy(() => import("./components/ProfilePage"))
const SettingsPage = lazy(() => import("./components/SettingsPage"))
const AboutPage = lazy(() => import("./components/AboutPage"))
const PrivacyPage = lazy(() => import("./components/PrivacyPage"))
const TermsPage = lazy(() => import("./components/TermsPage"))
const ChangelogPage = lazy(() => import("./components/ChangelogPage"))

function RequirePro({ children }: { children: React.ReactElement }): React.ReactElement {
  const { isAuthenticated, isPro, loading } = useAuth()
  const location = useLocation()
  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-400 dark:bg-slate-950 dark:text-slate-500">Loading...</main>
  if (!isAuthenticated) return <Navigate to={`/?next=${encodeURIComponent(location.pathname)}`} replace />
  if (!isPro) return <Navigate to="/pro" replace />
  return children
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const rootErrorFallback = (
  <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-center dark:bg-slate-950">
    <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Something went wrong. Reload the page.</p>
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="rounded-full bg-ocean px-5 py-2 text-sm font-semibold text-white transition hover:bg-ocean/90"
    >
      Reload
    </button>
  </main>
)

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary fallback={rootErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-400 dark:bg-slate-950 dark:text-slate-500">Loading...</main>}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/equation/:id" element={<App />} />
                  <Route path="/pro" element={<ProPricingPage />} />
                  <Route path="/pro/success" element={<ProPricingPage />} />
                  <Route path="/pro/cancel" element={<ProPricingPage />} />
                  <Route path="/dashboard" element={<RequirePro><Dashboard /></RequirePro>} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/changelog" element={<ChangelogPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
