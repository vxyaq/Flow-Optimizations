import Modal from "./ui/modal"
import Button from "./ui/button"

function NoAdmin({
  open,
  onClose,
  platform,
}: {
  open: boolean
  onClose: () => void
  platform?: string | null
}) {
  const isWindows = !platform || platform === "win32"

  return (
    <Modal open={open} onClose={onClose}>
      <div className="bg-flow-card p-4 rounded-2xl border border-flow-border text-flow-text w-[90vw] max-w-md">
        <h1 className="text-lg font-semibold mb-2">
          {isWindows ? "Flow Optimizations Not Running as Admin" : "Flow Optimizations Not Running as Root"}
        </h1>
        <p className="text-sm mb-4">
          {isWindows
            ? "Flow Optimizations is not running with administrator privileges. Some features may not work correctly."
            : "Flow Optimizations is not running as root. System-level changes will fail until it is started with elevated privileges."}
        </p>
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

export default NoAdmin
