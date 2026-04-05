import { createContext, useContext } from "react"

const FormulaContext = createContext<string>("")

export const FormulaProvider = FormulaContext.Provider

export function useLatexFormula(): string {
  return useContext(FormulaContext)
}
