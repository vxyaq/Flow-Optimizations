import { useEffect, useMemo, useState } from "react"
import { MemoryStick } from "lucide-react"
import Modal from "./ui/modal"
import Button from "./ui/button"
import { invoke } from "@/lib/electron"
import { RAM_OPTIONS, defaultRamOptions, formatMb, nearestRamOption, pageFileForRam } from "@/lib/ram"

export interface RamApplyProfile {
  ramGb: number
  pfInitial: number
  pfMaximum: number
  keepKernel: boolean
  disableSysMain: boolean
}

interface RamModalProps {
  open: boolean
  onClose: () => void
  onApply: (profile: RamApplyProfile) => Promise<void>
  detectedRamBytes?: number | null
}

export default function RamModal({ open, onClose, onApply, detectedRamBytes }: RamModalProps) {
  const [selectedRam, setSelectedRam] = useState<number>(16)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchedBytes, setFetchedBytes] = useState<number | null>(null)

  useEffect(() => {
    if (!open || (detectedRamBytes && detectedRamBytes > 0)) return
    setFetchedBytes(null)
    invoke({ channel: "get-system-info", timeoutMs: 15_000 })
      .then((info: any) => {
        const total = info?.memory_total
        if (typeof total === "number" && total > 0) setFetchedBytes(total)
      })
      .catch(() => {})
  }, [open, detectedRamBytes])

  const ramBytes =
    detectedRamBytes && detectedRamBytes > 0 ? detectedRamBytes : fetchedBytes
  const detectedGb = useMemo(
    () => (ramBytes && ramBytes > 0 ? Math.round(ramBytes / 1024 ** 3) : null),
    [ramBytes],
  )

  useEffect(() => {
    if (!open) return
    setApplying(false)
    setError(null)
    setSelectedRam(ramBytes ? nearestRamOption(ramBytes) : 16)
  }, [open, ramBytes])

  const { initialMb, maximumMb } = useMemo(() => pageFileForRam(selectedRam), [selectedRam])
  const auto = useMemo(() => defaultRamOptions(selectedRam), [selectedRam])

  const apply = async () => {
    if (applying) return
    setApplying(true)
    setError(null)
    try {
      await onApply({
        ramGb: selectedRam,
        pfInitial: initialMb,
        pfMaximum: maximumMb,
        keepKernel: auto.keepKernel,
        disableSysMain: false,
      })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setApplying(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="bg-k3d-card border border-k3d-border rounded-2xl p-5 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-full bg-k3d-accent text-k3d-primary">
            <MemoryStick className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-k3d-text leading-tight">Optimize RAM</h3>
            <p className="text-xs text-k3d-text-secondary">
              {detectedGb !== null ? (
                <>
                  Auto-detected:{" "}
                  <span className="text-k3d-text font-medium">{detectedGb} GB</span>
                  {detectedGb !== selectedRam && (
                    <span className="text-amber-400"> · selected {selectedRam} GB</span>
                  )}
                </>
              ) : (
                "Select how much RAM this PC has"
              )}
            </p>
          </div>
        </div>

        <p className="text-xs font-medium uppercase tracking-wider text-k3d-text-secondary mt-4 mb-2">
          Memory size
        </p>
        <div className="grid grid-cols-3 gap-2">
          {RAM_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              disabled={applying}
              onClick={() => setSelectedRam(size)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all active:scale-95 ${
                selectedRam === size
                  ? "bg-k3d-primary text-white border-k3d-primary shadow-[0_4px_14px_-8px_var(--color-k3d-primary)]"
                  : "bg-k3d-accent/50 text-k3d-text-secondary border-k3d-border-secondary hover:bg-k3d-accent hover:text-k3d-text"
              }`}
            >
              {size} GB
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-k3d-text-secondary leading-relaxed rounded-xl border border-k3d-border bg-k3d-accent/40 px-3 py-2">
          App will set a fixed pagefile{" "}
          <span className="text-k3d-text font-medium tabular-nums">
            {initialMb.toLocaleString()} / {maximumMb.toLocaleString()} MB
          </span>{" "}
          ({formatMb(maximumMb)} max)
          {auto.keepKernel ? " + keep kernel in RAM" : ""}. Restart required.
        </p>

        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={applying}>
            {applying ? "Applying…" : "Apply"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
