import { useState, useEffect, useMemo, memo, useCallback } from "react"
import RootDiv from "@/components/rootdiv"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import useSystemStore from "@/store/systemInfo"
import log from "@/lib/log"
import Greeting from "@/components/greeting"
import { Wrench } from "lucide-react"
import { ChevronRight, Folder, Trash2, type LucideIcon } from "lucide-react"
import Card from "@/components/ui/Card"

const scheduleIdle = (cb: IdleRequestCallback, opts?: IdleRequestOptions) =>
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback(cb, opts)
    : (setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 1) as unknown as number)
const cancelIdle = (id: number) =>
  typeof cancelIdleCallback === 'function' ? cancelIdleCallback(id) : clearTimeout(id)

interface StatCardProps {
  icon: LucideIcon
  value: string
  label: string
  action: string
  onAction: () => void
}

const StatCard = memo(({ icon: Icon, value, label, action, onAction }: StatCardProps) => {
  return (
    <Card className="p-5 bg-k3d-card rounded-xl border border-k3d-border hover:shadow-xs">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="p-2.5 rounded-lg bg-k3d-accent ring-1 ring-inset ring-k3d-border">
          <Icon className="text-k3d-primary" size={20} />
        </div>
        <Button
          variant="secondary"
          className="gap-1 text-xs px-3 py-1.5 shrink-0"
          onClick={onAction}
        >
          {action}
          <ChevronRight size={14} />
        </Button>
      </div>
      <p className="text-3xl font-bold text-k3d-text tracking-tight">{value}</p>
      <p className="text-sm text-k3d-text-secondary mt-1">{label}</p>
    </Card>
  )
})

StatCard.displayName = 'StatCard'

function Home() {
  const setSystemInfo = useSystemStore((state) => state.setSystemInfo)
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem("k3d:systemInfo")
    } catch {
      return true
    }
  })
  const router = useNavigate()
  const [usingCache, setUsingCache] = useState(false)
  const [activeTweaks, setActiveTweaks] = useState(() => {
    try {
      const cached = localStorage.getItem("k3d:activeTweaks")
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })

  const fetchActiveTweaks = useCallback(async () => {
    try {
      const active = await invoke({ channel: "tweak:active" })
      setActiveTweaks(active)
      localStorage.setItem("k3d:activeTweaks", JSON.stringify(active))
    } catch (err) {}
  }, [])

  const [restoreCount, setRestoreCount] = useState(() => {
    const cached = localStorage.getItem("k3d:restoreCount")
    return cached ? Number(cached) || 0 : 0
  })
  const [junkSize, setJunkSize] = useState(() => {
    const cached = localStorage.getItem("k3d:junkSize")
    return cached ? Number(cached) || 0 : 0
  })

  useEffect(() => {
    const idleHandle = scheduleIdle(() => {
      invoke({ channel: "get-restore-points", timeoutMs: 30_000 })
        .then((res: any) => {
          const count = Array.isArray(res?.points) ? res.points.length : 0
          setRestoreCount(count)
          localStorage.setItem("k3d:restoreCount", String(count))
        })
        .catch(() => {})

      invoke({ channel: "cleaner:get-sizes", timeoutMs: 60_000 })
        .then((sizes: any) => {
          const total: number =
            sizes && typeof sizes === "object"
              ? Object.values(sizes as Record<string, number>).reduce((sum: number, value: any) => {
                  return sum + (Number(value) || 0)
                }, 0)
              : 0
          setJunkSize(total)
          localStorage.setItem("k3d:junkSize", String(total))
        })
        .catch(() => {})
    })

    return () => cancelIdle(idleHandle)
  }, [])

  useEffect(() => {
    const idleHandle = scheduleIdle(() => {
      const cached = localStorage.getItem("k3d:systemInfo")
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          setSystemInfo(parsed)
          setUsingCache(true)
          setLoading(false)
        } catch (err) {}
      }

      invoke({ channel: "get-system-info", timeoutMs: 30_000 })
        .then((info) => {
          useSystemStore.setState((state) => {
            const merged = { ...state.systemInfo, ...info }
            localStorage.setItem("k3d:systemInfo", JSON.stringify(merged))
            return { systemInfo: merged }
          })
          setUsingCache(false)
          log.info("Fetched system info")
        })
        .catch((err) => {
          log.error("Error fetching system info:", err)
        })
        .finally(() => setLoading(false))
    })

    return () => cancelIdle(idleHandle)
  }, [setSystemInfo])

  useEffect(() => {
    const idleHandle = scheduleIdle(() => {
      fetchActiveTweaks()
    })

    return () => cancelIdle(idleHandle)
  }, [fetchActiveTweaks])

  useEffect(() => {
    const handleExtraInfo = (_event: any, extra: Record<string, any>) => {
      useSystemStore.setState((state) => {
        const merged = { ...state.systemInfo, ...extra }
        localStorage.setItem("k3d:systemInfo", JSON.stringify(merged))
        return { systemInfo: merged }
      })
    }

    window.electron.ipcRenderer.on("system-info-extra", handleExtraInfo)
    return () => {
      window.electron.ipcRenderer.removeListener("system-info-extra", handleExtraInfo)
    }
  }, [])

  const formatBytes = useCallback((bytes: number) => {
    if (bytes === 0 || !bytes) return "0 GB"
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB"
  }, [])

  const restoreLabel = useMemo(() => 
    restoreCount === 1 ? "backup found" : "backups found",
    [restoreCount]
  )

  const formattedJunkSize = useMemo(() => formatBytes(junkSize), [junkSize, formatBytes])

  const handleBackupClick = useCallback(() => router("/backup"), [router])
  const handleTweaksClick = useCallback(() => router("/tweaks"), [router])
  const handleCleanClick = useCallback(() => router("/clean"), [router])

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-k3d-bg">
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-[3px] border-k3d-border rounded-full"></div>
            <div
              className="absolute inset-0 border-[3px] border-transparent border-t-k3d-primary rounded-full animate-spin"
              role="status"
              aria-label="loading"
            ></div>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-k3d-text-dark font-medium">Loading system information</p>
            <p className="text-k3d-text-muted text-sm">
              This may take a while depending on your system
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <RootDiv>
      <div className="max-w-[1800px] mx-auto ">
        <Greeting />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard
            icon={Folder}
            value={String(restoreCount)}
            label={restoreLabel}
            action="Create a Backup"
            onAction={handleBackupClick}
          />
          <StatCard
            icon={Wrench}
            value={String(activeTweaks.length || 0)}
            label="tweaks applied"
            action="Apply Tweaks"
            onAction={handleTweaksClick}
          />
          <StatCard
            icon={Trash2}
            value={formattedJunkSize}
            label="ready to clean"
            action="Clean System"
            onAction={handleCleanClick}
          />
        </div>

        <p className="text-xs text-k3d-text-secondary text-center mt-4">
          {usingCache ? "Loading latest system data..." : ""}
        </p>
      </div>
    </RootDiv>
  )
}

export default memo(Home)
