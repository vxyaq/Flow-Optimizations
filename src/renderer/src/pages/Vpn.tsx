import RootDiv from "@/components/rootdiv"
import { ShieldCheck } from "lucide-react"

function Vpn() {
  return (
    <RootDiv>
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-flow-primary/15 text-flow-primary">
        <ShieldCheck size={28} />
      </div>
      <h1 className="text-xl font-semibold text-flow-text">VPN</h1>
      <p className="max-w-md text-sm text-flow-text-secondary">
        VPN is coming soon. This feature is reserved for Pro members and will be available in a
        future update.
      </p>
    </div>
    </RootDiv>
  )
}

export default Vpn
