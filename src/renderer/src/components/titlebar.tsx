import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import useSearchStore from "@/store/search"
import { close, minimize, toggleMaximize } from "../lib/electron"

function CaptionIcon({ type }: { type: "minimize" | "maximize" | "restore" | "close" }) {
  if (type === "minimize") {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" />
      </svg>
    )
  }
  if (type === "maximize") {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" />
      </svg>
    )
  }
  if (type === "restore") {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" />
        <rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function TitleBar(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const searchQuery = useSearchStore((state) => state.query)
  const setSearchQuery = useSearchStore((state) => state.setQuery)
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let mounted = true
    window.electron.ipcRenderer.invoke("window-is-maximized").then((value: boolean) => {
      if (mounted) setMaximized(Boolean(value))
    })
    const onMaximize = (): void => setMaximized(true)
    const onUnmaximize = (): void => setMaximized(false)
    window.electron.ipcRenderer.on("window-maximized", onMaximize)
    window.electron.ipcRenderer.on("window-unmaximized", onUnmaximize)
    return () => {
      mounted = false
      window.electron.ipcRenderer.removeListener("window-maximized", onMaximize)
      window.electron.ipcRenderer.removeListener("window-unmaximized", onUnmaximize)
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (location.pathname !== "/tweaks") navigate("/tweaks")
  }

  return (
    <div
      style={{ WebkitAppRegion: "drag" } as any}
      className="h-[50px] fixed top-0 left-60 right-0 flex justify-between items-center pr-2 bg-transparent z-50"
    >
      <div className="flex-1 flex items-center h-full min-w-0" />
      <div
        className="flex flex-none items-center gap-2 h-full"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <div
            className="flex items-center gap-2 h-8 w-96 max-w-[40vw] rounded-lg bg-flow-accent/60 border border-flow-border px-2.5 transition-colors hover:border-flow-border-secondary"
        >
          <Search size={14} className="text-flow-text-secondary shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search tweaks..."
            className="w-full min-w-0 bg-transparent border-none focus:outline-hidden text-sm text-flow-text placeholder:text-flow-text-secondary"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              title="Clear search"
              onClick={() => setSearchQuery("")}
              className="p-0.5 rounded hover:bg-flow-border text-flow-text-secondary transition-colors shrink-0"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div
        className="flex flex-1 h-full items-center justify-end gap-1 pl-3 pr-1"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <button
          onClick={minimize}
          title="Minimize"
          aria-label="Minimize"
          className="h-8 w-10 inline-flex items-center justify-center text-flow-text-secondary rounded-lg hover:bg-flow-accent hover:text-flow-text transition-colors"
        >
          <CaptionIcon type="minimize" />
        </button>
        <button
          onClick={toggleMaximize}
          title={maximized ? "Restore" : "Maximize"}
          aria-label={maximized ? "Restore" : "Maximize"}
          className="h-8 w-10 inline-flex items-center justify-center text-flow-text-secondary rounded-lg hover:bg-flow-accent hover:text-flow-text transition-colors"
        >
          <CaptionIcon type={maximized ? "restore" : "maximize"} />
        </button>
        <button
          onClick={close}
          title="Close"
          aria-label="Close"
          className="h-8 w-10 inline-flex items-center justify-center text-flow-text-secondary rounded-lg hover:bg-red-600 hover:text-white transition-colors"
        >
          <CaptionIcon type="close" />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
