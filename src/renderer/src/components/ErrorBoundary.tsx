import React, { Component, type ReactNode } from "react"
import log from "electron-log/renderer"
import { invoke } from "../lib/electron"
import Button from "./ui/button"
import TitleBar from "./titlebar"

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error("React Error Boundary caught an error:", error, errorInfo)
  }

  handleOpenLogFolder = async () => {
    await invoke({ channel: "open-log-folder" })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const errorMessage =
        this.state.error instanceof Error ? this.state.error.message : String(this.state.error)
      const errorStack = this.state.error instanceof Error ? this.state.error.stack : undefined

      return (
        <div className="flex flex-col h-screen bg-flow-bg text-flow-text items-center justify-center p-8">
          <TitleBar />
          <div className="max-w-xl w-full rounded-2xl border border-flow-border bg-flow-card p-8">
            <h1 className="text-2xl font-semibold text-red-500 mb-2">Something went wrong</h1>
            <p className="text-flow-text-secondary mb-4">
              Flow Optimizations encountered an unexpected error. The log folder has been opened for reference.
            </p>
            <pre className="mb-6 p-4 rounded-lg bg-flow-accent text-xs text-flow-text overflow-x-auto overflow-y-auto max-h-40 border border-flow-border select-all">
              {errorMessage}
              {errorStack && `\n\n${errorStack}`}
            </pre>
            <div className="flex flex-wrap gap-3 mb-6">
              <Button variant="primary" onClick={this.handleOpenLogFolder} size="md">
                Open Log Folder
              </Button>
              <Button variant="secondary" onClick={this.handleRetry} size="md">
                Try Again
              </Button>
            </div>
            <p className="text-sm text-flow-text-muted">
              Restart the application if the issue persists.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
