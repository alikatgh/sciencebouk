import { createContext, useContext } from "react"
import type { ReactNode } from "react"

const EquationIdContext = createContext<number>(0)

export function EquationIdProvider({
  value,
  children,
}: {
  value: number
  children: ReactNode
}) {
  return <EquationIdContext.Provider value={value}>{children}</EquationIdContext.Provider>
}

export function useEquationId(): number {
  return useContext(EquationIdContext)
}
