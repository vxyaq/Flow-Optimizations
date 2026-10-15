import { useEffect, useState } from "react"
import {
  RotateCw,
  PlusCircle,
  Shield,
  RotateCcw,
  Loader2,
  Trash,
} from "lucide-react"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"
import Modal from "@/components/ui/modal"
import { toast } from "react-toastify"
import log from "electron-log/renderer"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

type RestorePoint = {
  SequenceNumber: number
  Description: string
  CreationTime: string
  EventType: number
  RestorePointType: number
}

type RestorePointList = RestorePoint[]

export default function RestorePoints() {
  const [activeTab, setActiveTab] = useState<"restore" | "tweaks">("restore")
  const [restorePoints, setRestorePoints] = useState<RestorePointList>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: string | null
    restorePoint: any | null
  }>({
    isOpen: false,
    type: null,
    restorePoint: null,
  })
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [customName, setCustomName] = useState("")
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [appliedTweaks, setAppliedTweaks] = useState<{ name: string; title: string }[]>([])
  const [tweaksLoading, setTweaksLoading] = useState(false)
  const [reverting, setReverting] = useState<string | null>(null)

  const fetchRestorePoints = async () => {
    setLoading(true)
    try {
      const response = await invoke({ channel: "get-restore-points", timeoutMs: 30_000 })
      if (response.success && Array.isArray(response.points)) {
        setRestorePoints(response.points)
      } else {
        toast.error("Failed to load restore points")
      }
    } catch (error) {
      toast.error("Failed to load restore points")
      log.error("Failed to load restore points:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRestorePoints()
  }, [])

  const handleCreateRestorePoint = async () => {
    setProcessing(true)
    try {
      const res: any = await invoke({ channel: "create-flow-restore-point" })
      if (res?.success === false) throw new Error(res?.error || "Failed to create restore point")
      toast.success(res?.message || "Restore point created")
      await fetchRestorePoints()
    } catch (err) {
      toast.error("Failed to create restore point")
      log.error("Failed to create restore point:", err)
    }
    setProcessing(false)
  }

  const handleRestore = (restorePoint: any) => {
    setModalState({ isOpen: true, type: "restore", restorePoint })
  }

  const executeRestore = async () => {
    const seq = Number(modalState.restorePoint?.SequenceNumber)
    if (!Number.isInteger(seq) || seq <= 0) {
      toast.error("Invalid restore point")
      return
    }
    setProcessing(true)
    try {
      const res: any = await invoke({
        channel: "restore-restore-point",
        payload: seq,
      })
      if (res?.success === false) throw new Error(res?.error || "Failed to start system restore")
      toast.success("System restore started. Your PC may restart.")
    } catch (err) {
      toast.error("Failed to start system restore")
      log.error("Failed to start system restore:", err)
    }
    setProcessing(false)
    setModalState({ isOpen: false, type: null, restorePoint: null })
  }

  const handleCustomRestorePoint = async () => {
    if (!customName.trim()) {
      toast.error("Enter a name for the restore point")
      return
    }
    setProcessing(true)
    try {
      const res: any = await invoke({ channel: "create-restore-point", payload: customName })
      if (res?.success === false) throw new Error(res?.error || "Failed to create restore point")
      toast.success(res?.message || "Restore point created")
      setCustomModalOpen(false)
      setCustomName("")
      await fetchRestorePoints()
    } catch (err) {
      toast.error("Failed to create restore point")
      log.error("Failed to create restore point:", err)
    }
    setProcessing(false)
  }

  const handleDeleteAll = async () => {
    setProcessing(true)
    try {
      const res: any = await invoke({ channel: "delete-all-restore-points" })
      if (res?.success === false) throw new Error(res?.error || "Failed to delete restore points")
      toast.success("All restore points deleted")
      await fetchRestorePoints()
    } catch (err) {
      toast.error("Failed to delete restore points")
      log.error("Failed to delete restore points:", err)
    }
    setProcessing(false)
    setConfirmDeleteAll(false)
  }

  const fetchAppliedTweaks = async () => {
    setTweaksLoading(true)
    try {
      const [statesRaw, tweaks]: any[] = await Promise.all([
        invoke({ channel: "tweak-states:load" }),
        invoke({ channel: "tweaks:fetch" }),
      ])
      const states = JSON.parse(statesRaw ?? "{}")
      const active = (Array.isArray(tweaks) ? tweaks : [])
        .filter((t: any) => states[t.name])
        .map((t: any) => ({ name: t.name, title: t.title ?? t.name }))
      setAppliedTweaks(active)
    } catch (err) {
      log.error("Failed to load applied tweaks:", err)
    } finally {
      setTweaksLoading(false)
    }
  }

  const handleRevertTweak = async (name: string) => {
    setReverting(name)
    try {
      const res: any = await invoke({ channel: "tweak:unapply", payload: name })
      if (res?.success === false) throw new Error(res?.error || `Failed to revert ${name}`)
      toast.success("Tweak reverted")
      await fetchAppliedTweaks()
    } catch (err) {
      toast.error("Failed to revert tweak")
      log.error("Failed to revert tweak:", err)
    } finally {
      setReverting(null)
    }
  }

  const filteredRestorePoints = restorePoints

  return (
    <div className="h-full max-w-full space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab("restore")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
            activeTab === "restore"
              ? "bg-flow-primary text-white shadow"
              : "text-flow-text-secondary hover:text-flow-text bg-flow-card/50"
          }`}
        >
          <Shield size={16} className="inline mr-2" />
          Restore Points
        </button>
        <button
          onClick={() => {
            setActiveTab("tweaks")
            fetchAppliedTweaks()
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
            activeTab === "tweaks"
              ? "bg-flow-primary text-white shadow"
              : "text-flow-text-secondary hover:text-flow-text bg-flow-card/50"
          }`}
        >
          <RotateCw size={16} className="inline mr-2" />
          Revert Tweaks
        </button>
      </div>

      {activeTab === "restore" && (
        <div key="restore" className="space-y-4 transition-opacity duration-200">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="danger"
              onClick={() => setConfirmDeleteAll(true)}
              disabled={loading || processing || restorePoints.length === 0}
              className="flex items-center gap-2"
            >
              <Trash size={16} /> Delete All
            </Button>
            <Button
              variant="secondary"
              onClick={fetchRestorePoints}
              className="flex items-center gap-2"
              disabled={loading || processing}
            >
              <RotateCw size={16} /> Refresh
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRestorePoint}
              className="flex items-center gap-2"
              disabled={loading || processing}
            >
              {processing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <PlusCircle size={16} />
              )}
              Quick Restore Point
            </Button>
            <Button
              variant="primary"
              onClick={() => setCustomModalOpen(true)}
              disabled={loading || processing}
            >
              Custom Restore Point
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 size={32} className="text-flow-primary animate-spin" />
            </div>
          ) : filteredRestorePoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-flow-card border border-flow-border rounded-lg">
              <div className="p-4 bg-flow-secondary rounded-full mb-4">
                <Shield size={28} className="text-flow-text" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-flow-text">No Restore Points</h3>
              <p className="text-flow-text-secondary max-w-sm mb-4">
                Create a restore point to preserve your system state. You can restore your system to any point when needed.
              </p>
              <Button
                variant="primary"
                onClick={handleCreateRestorePoint}
                disabled={processing}
              >
                Create a Quick Restore Point
              </Button>
            </div>
          ) : (
            <Table className="max-h-96">
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-32 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRestorePoints.map((rp, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{rp.Description}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        className="!p-2 gap-2"
                        onClick={() => handleRestore(rp)}
                        disabled={processing}
                        title="Restore System"
                      >
                        <RotateCcw size={16} />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Modal
            open={modalState.isOpen}
            onClose={() => setModalState({ isOpen: false, type: null, restorePoint: null })}
          >
            {modalState.type === "restore" && modalState.restorePoint && (
              <div className="bg-flow-card border border-flow-border rounded-2xl p-4 shadow-xl max-w-lg w-full mx-4">
                <h3 className="text-lg font-medium text-flow-text mb-4">Restore System</h3>
                <p className="text-flow-text-secondary mb-4">
                  Restore your system to "{modalState.restorePoint.Description}"?
                  <br /><br />
                  Your files will not be affected, but recently installed applications and settings
                  may be lost. This will revert all changes made since this restore point was created.
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setModalState({ isOpen: false, type: null, restorePoint: null })}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={executeRestore}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Restore"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          <Modal open={customModalOpen} onClose={() => setCustomModalOpen(false)}>
            <div className="bg-flow-card border border-flow-border rounded-2xl p-4 shadow-xl max-w-lg w-full mx-4">
              <h3 className="text-lg font-medium text-flow-text mb-4">Create Custom Restore Point</h3>
              <Input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter restore point name"
                disabled={processing}
                className="w-full"
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="secondary"
                  onClick={() => setCustomModalOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCustomRestorePoint}
                  disabled={processing || !customName.trim()}
                >
                  {processing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </div>
          </Modal>

          <Modal open={confirmDeleteAll} onClose={() => !processing && setConfirmDeleteAll(false)}>
            <div className="bg-flow-card border border-flow-border rounded-2xl p-4 shadow-xl max-w-lg w-full mx-4">
              <h3 className="text-lg font-medium text-flow-text mb-4">Delete All Restore Points</h3>
              <p className="text-flow-text-secondary mb-4">
                Delete all {restorePoints.length} restore point
                {restorePoints.length !== 1 ? "s" : ""}? This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmDeleteAll(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteAll}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    `Delete All (${restorePoints.length})`
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {activeTab === "tweaks" && (
        <div key="tweaks" className="transition-opacity duration-200">
          <div className="bg-flow-card border border-flow-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-flow-text">Revert Applied Tweaks</h3>
              <Button
                variant="secondary"
                onClick={fetchAppliedTweaks}
                disabled={tweaksLoading}
                className="flex items-center gap-2"
              >
                <RotateCw size={16} className={tweaksLoading ? "animate-spin" : ""} /> Refresh
              </Button>
            </div>
            {tweaksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={28} className="text-flow-primary animate-spin" />
              </div>
            ) : appliedTweaks.length === 0 ? (
              <p className="text-flow-text-secondary text-center py-6">
                No applied tweaks. Apply tweaks first, then revert them here.
              </p>
            ) : (
              <div className="space-y-2">
                {appliedTweaks.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-flow-border px-3 py-2"
                  >
                    <span className="text-sm text-flow-text truncate">{t.title}</span>
                    <Button
                      variant="outline"
                      onClick={() => handleRevertTweak(t.name)}
                      disabled={reverting !== null}
                      className="flex items-center gap-2 shrink-0"
                    >
                      {reverting === t.name ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      Revert
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}