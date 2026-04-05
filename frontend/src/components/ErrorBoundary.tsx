import { Component } from "react"
import type { ReactNode, ErrorInfo } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <div className="text-6xl">
            {"\u222B"}
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-200">
            Something went wrong
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            This visualization encountered an error. The equation is still mathematically beautiful, even if our rendering isn't cooperating right now.
          </p>
          <p className="mt-3 rounded-xl bg-slate-100 px-4 py-2 font-mono text-xs text-slate-400 dark:bg-slate-700">
            {this.state.error?.message ?? "Unknown error"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 rounded-full bg-ocean px-5 py-2 text-sm font-semibold text-white transition hover:bg-ocean/90"
            type="button"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
