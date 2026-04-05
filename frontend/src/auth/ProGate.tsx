import type { ReactElement, ReactNode } from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { AuthModal } from "./AuthModal"

interface ProGateProps {
  children: ReactNode
  feature: string
}

export function ProGate({ children, feature }: ProGateProps): ReactElement {
  const navigate = useNavigate()
  const { isAuthenticated, isPro } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  if (isPro) return <>{children}</>

  return (
    <>
      <motion.div
        className="relative cursor-pointer rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60"
        onClick={() => {
          if (isAuthenticated) {
            navigate("/pro")
            return
          }
          setShowAuth(true)
        }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean/10">
            <Lock className="h-4 w-4 text-ocean" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {feature}
            </p>
            <p className="text-xs text-slate-400">
              {isAuthenticated ? "Upgrade to Pro" : "Sign in to unlock"}
            </p>
          </div>
        </div>
      </motion.div>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} initialMode="register" />
    </>
  )
}
