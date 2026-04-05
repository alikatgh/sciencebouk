import React, { Suspense, lazy } from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "./auth/AuthContext"
import { SettingsProvider } from "./settings/SettingsContext"
import "katex/dist/katex.min.css"
import "./index.css"

const App = lazy(() => import("./App"))
const HomePage = lazy(() => import("./components/HomePage").then((module) => ({ default: module.HomePage })))
const ProPricingPage = lazy(() => import("./components/ProUpgrade").then((module) => ({ default: module.ProPricingPage })))
const Dashboard = lazy(() => import("./components/Dashboard"))
const ProfilePage = lazy(() => import("./components/ProfilePage"))
const SettingsPage = lazy(() => import("./components/SettingsPage"))
const AboutPage = lazy(() => import("./components/AboutPage"))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/about" element={<AboutPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
